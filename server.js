import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,rename,stat,readdir} from 'node:fs/promises';
import {resolve,join,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {validateData} from './dist/domain.js';
import {assetKeys,IMAGE_TYPES} from './dist/media-domain.js';
import {mergeCampaign,ConflictError} from './dist/shared-merge.js';

const root=dirname(fileURLToPath(import.meta.url));
const hash=s=>createHash('sha256').update(s).digest('hex');
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const fail=(status,message)=>Object.assign(new Error(message),{status});
function validateCampaign(c){
 const nextSequence=Math.max(0,...c.entries.map(e=>e.sequence))+1;
 validateData({version:1,memberId:'server_member',campaigns:[c],currentCampaignId:c.id,currentCharacterByCampaign:{},nextSequence});
 return c;
}
function imageType(b){
 if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'image/png';
 if(b[0]===255&&b[1]===216&&b[2]===255)return'image/jpeg';
 if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return'image/webp';
 return null;
}
async function body(req,limit){let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>limit)throw fail(413,'内容过大');chunks.push(chunk);}return Buffer.concat(chunks);}
async function readJSON(req){try{return JSON.parse((await body(req,16*1024*1024)).toString(),(key,value)=>{if(['__proto__','prototype','constructor'].includes(key))throw new Error();return value;});}catch(e){if(e.status)throw e;throw fail(400,'内容格式无效');}}

export async function createJournalServer({dataDir=join(root,'data'),distDir=join(root,'dist'),maxRooms=100}={}){
 await mkdir(dataDir,{recursive:true});
 const rooms=new Map(),locks=new Map(),streams=new Set(),streamBuffers=new WeakMap();
 let roomCount=(await readdir(dataDir,{withFileTypes:true})).filter(x=>x.isDirectory()&&/^[a-f0-9]{24}$/.test(x.name)).length;
 async function load(id){
  if(!/^[a-f0-9]{24}$/.test(id))throw fail(404,'房间不存在');
  if(!rooms.has(id)){try{const r=JSON.parse(await readFile(join(dataDir,id,'room.json'),'utf8'));validateCampaign(r.campaign);rooms.set(id,{...r,listeners:new Set()});}catch(e){if(e.code==='ENOENT')throw fail(404,'房间不存在');throw e;}}
  return rooms.get(id);
 }
 const snapshot=r=>({campaign:r.campaign,revision:r.revision,applied:r.receipts});
 async function save(r){const file=join(dataDir,r.id,'room.json'),temp=file+'.tmp';const {listeners,...disk}=r;await writeFile(temp,JSON.stringify(disk));await rename(temp,file);}
 async function locked(id,fn){const previous=locks.get(id)??Promise.resolve();let release;const hold=new Promise(r=>release=r),tail=previous.catch(()=>{}).then(()=>hold);locks.set(id,tail);await previous.catch(()=>{});try{return await fn();}finally{release();if(locks.get(id)===tail)locks.delete(id);}}
 function authenticated(req,r){const secret=req.headers.authorization?.replace(/^Bearer /,'')??'';return secret.length<=100&&timingSafeEqual(Buffer.from(hash(secret),'hex'),Buffer.from(r.tokenHash,'hex'));}
 function sendEvent(res,message){const state=streamBuffers.get(res);if(state.busy){state.pending=message;return;}state.busy=!res.write(message);}
 function notify(r){const message='data: '+JSON.stringify(snapshot(r))+'\n\n';for(const res of r.listeners)sendEvent(res,message);}
 function requireAssets(r,c){for(const ref of assetKeys([c]))if(!r.media[ref.slice(5)])throw fail(400,'图片尚未上传，请重新选择图片');}
 const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"frame-ancestors 'self' https://www.owlbear.rodeo https://owlbear.rodeo");
  try{
   const url=new URL(req.url,'http://localhost'),path=url.pathname;
   if(path.startsWith('/api/')&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw fail(403,'只接受本站请求');
   if(path==='/api/health'&&req.method==='GET'){json(res,200,{shared:true});return;}
   if(path==='/api/rooms'&&req.method==='POST'){
    const {campaign}=await readJSON(req);validateCampaign(campaign);
    // A room starts with uploaded assets added by its creator before inviting players.
    if(roomCount>=maxRooms)throw fail(503,'暂时无法创建更多房间');roomCount++;
    const id=randomBytes(12).toString('hex'),token=randomBytes(32).toString('base64url');
    const r={id,tokenHash:hash(token),revision:0,campaign,media:{},receipts:[],listeners:new Set()};
    await mkdir(join(dataDir,id),{recursive:true});await save(r);rooms.set(id,r);json(res,201,{id,token,...snapshot(r)});return;
   }
   const route=path.match(/^\/api\/rooms\/([a-f0-9]{24})(?:\/(events|changes|assets)(?:\/([a-zA-Z0-9_-]{1,110}))?)?$/);
   if(route){
    const [,id,part,key]=route,r=await load(id);if(!authenticated(req,r))throw fail(403,'邀请链接无效或已失效');
    if(!part&&req.method==='GET'){json(res,200,snapshot(r));return;}
    if(part==='events'&&req.method==='GET'){
     if(r.listeners.size>=40)throw fail(429,'房间连接过多');
     res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
     streamBuffers.set(res,{busy:false,pending:null});res.on('drain',()=>{const state=streamBuffers.get(res);state.busy=false;if(state.pending){const message=state.pending;state.pending=null;sendEvent(res,message);}});
     sendEvent(res,'data: '+JSON.stringify(snapshot(r))+'\n\n');r.listeners.add(res);streams.add(res);
     const heartbeat=setInterval(()=>{if(!streamBuffers.get(res).busy)res.write(': keepalive\n\n');},20000);heartbeat.unref();res.on('close',()=>{clearInterval(heartbeat);r.listeners.delete(res);streams.delete(res);});return;
    }
    if(part==='changes'&&req.method==='POST'){
     const change=await readJSON(req);
     if(typeof change.id!=='string'||!/^[a-zA-Z0-9_-]{1,120}$/.test(change.id))throw fail(400,'保存编号无效');
     await locked(id,async()=>{
      if(r.receipts.includes(change.id)){json(res,200,snapshot(r));return;}
      try{
       const candidate=mergeCampaign(change.base,change.desired,r.campaign),known=new Set(r.campaign.entries.map(e=>e.id));
       let sequence=Math.max(0,...r.campaign.entries.map(e=>e.sequence))+1;
       for(const entry of candidate.entries){if(!known.has(entry.id))entry.sequence=sequence++;else if(entry.sequence!==r.campaign.entries.find(e=>e.id===entry.id).sequence)throw fail(400,'已有篇次不可更改');}
       validateCampaign(candidate);requireAssets(r,candidate);
       const next={...r,campaign:candidate,revision:r.revision+1,receipts:[...r.receipts.slice(-999),change.id]};
       await save(next);Object.assign(r,next);json(res,200,snapshot(r));notify(r);
      }catch(e){if(e instanceof ConflictError){json(res,409,{error:'有人同时修改了同一项。你的待同步内容仍保留在此设备。',path:e.path,...snapshot(r)});}else throw e;}
     });return;
    }
    if(part==='assets'&&key&&req.method==='PUT'){
     if(!/^(map|image)_[a-zA-Z0-9_-]{1,100}$/.test(key))throw fail(400,'图片编号无效');
     const bytes=await body(req,12*1024*1024),type=imageType(bytes);if(!type||!IMAGE_TYPES.includes(req.headers['content-type'])||type!==req.headers['content-type'])throw fail(400,'请选择有效的 PNG、JPG 或 WebP 图片');
     await locked(id,async()=>{
      const digest=hash(bytes),old=r.media[key];if(old){if(old.hash!==digest)throw fail(409,'图片编号已被使用');json(res,200,{saved:true});return;}
      const used=Object.values(r.media).reduce((n,x)=>n+x.size,0);if(used+bytes.length>160*1024*1024)throw fail(413,'房间图片已达到 160 MB，请导出备份后整理图片');
      await writeFile(join(dataDir,id,key),bytes);const next={...r,media:{...r.media,[key]:{type,size:bytes.length,hash:digest}}};await save(next);Object.assign(r,next);json(res,201,{saved:true});
     });return;
    }
    if(part==='assets'&&key&&req.method==='GET'){
     const meta=r.media[key];if(!meta)throw fail(404,'图片不存在');const bytes=await readFile(join(dataDir,id,key));res.writeHead(200,{'Content-Type':meta.type,'Cache-Control':'private, max-age=86400'});res.end(bytes);return;
    }
    throw fail(405,'不支持的操作');
   }
   if(path.startsWith('/api/'))throw fail(404,'接口不存在');
   const extensionPublic=path==='/manifest.json'||path==='/assets/owlbear-book-v13.svg';
   if(extensionPublic){res.setHeader('Access-Control-Allow-Origin','*');if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, HEAD','Access-Control-Max-Age':'600'});res.end();return;}}
   if(!['GET','HEAD'].includes(req.method))throw fail(405,'不支持的操作');
   let decoded;try{decoded=decodeURIComponent(path);}catch{throw fail(400,'地址无效');}
   const filename=resolve(distDir,'.'+(decoded==='/'?'/index.html':decoded));
   if(!filename.startsWith(resolve(distDir)+ '\\')&&!filename.startsWith(resolve(distDir)+'/'))throw fail(404,'文件不存在');
   const meta=await stat(filename);if(!meta.isFile())throw fail(404,'文件不存在');
   const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json;charset=utf-8','.txt':'text/plain;charset=utf-8'};
   res.writeHead(200,{'Content-Type':types[extname(filename)]??'application/octet-stream','Cache-Control':extname(filename)==='.html'||path==='/manifest.json'?'no-cache':'public, max-age=3600'});res.end(req.method==='HEAD'?undefined:await readFile(filename));
  }catch(e){if(res.headersSent){res.destroy();return;}json(res,e.status??(e.code==='ENOENT'?404:400),{error:e.status||e.code==='ENOENT'?e.message:'内容无效：'+e.message});}
 });
 server.headersTimeout=30000;server.requestTimeout=60000;
 server.on('close',()=>{for(const res of streams)res.destroy();});
 server.closeRooms=()=>{for(const res of streams)res.destroy();};
 return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=await createJournalServer({dataDir:process.env.DATA_DIR?resolve(process.env.DATA_DIR):undefined});
 const host=process.env.HOST??'127.0.0.1',port=Number(process.env.PORT??4173);
 server.listen(port,host,()=>console.log(`远征手记 http://${host}:${port}`));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.closeRooms();server.close(()=>process.exit(0));});
}
