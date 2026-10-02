export class ConflictError extends Error{constructor(path){super('同一项已有新的修改：'+path);this.name='ConflictError';this.path=path;}}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const keyed=v=>Array.isArray(v)&&v.every(x=>object(x)&&typeof x.id==='string');
// Apply only the fields changed by this writer, retaining unrelated room changes.
export function mergeCampaign(base,desired,current){
 function merge(b,d,c,path){
  if(equal(b,d))return structuredClone(c);
  if(equal(b,c))return structuredClone(d);
  if(keyed(b)&&keyed(d)&&keyed(c)){
   const bm=new Map(b.map(x=>[x.id,x])),dm=new Map(d.map(x=>[x.id,x])),cm=new Map(c.map(x=>[x.id,x]));
   if(bm.size!==b.length||dm.size!==d.length||cm.size!==c.length)throw new Error('重复编号');
   const result=[];
   for(const item of c){
    if(!bm.has(item.id)){result.push(structuredClone(item));continue;}
    if(!dm.has(item.id)){if(!equal(item,bm.get(item.id)))throw new ConflictError(path+'.'+item.id);continue;}
    result.push(merge(bm.get(item.id),dm.get(item.id),item,path+'.'+item.id));
   }
   for(const item of d)if(!bm.has(item.id)){
    if(cm.has(item.id))throw new ConflictError(path+'.'+item.id);
    result.push(structuredClone(item));
   }
   for(const item of d)if(bm.has(item.id)&&!cm.has(item.id)&&!equal(item,bm.get(item.id)))throw new ConflictError(path+'.'+item.id);
   return result;
  }
  if(object(b)&&object(d)&&object(c)){
   const result=structuredClone(c);
   for(const key of new Set([...Object.keys(b),...Object.keys(d)])){
    if(['__proto__','constructor','prototype'].includes(key))throw new Error('无效字段');
    if(!Object.hasOwn(d,key)){
     if(Object.hasOwn(b,key)){if(!equal(b[key],c[key]))throw new ConflictError(path+'.'+key);delete result[key];}
    }else if(key==='updatedAt'&&Number.isFinite(Date.parse(d[key]))&&Number.isFinite(Date.parse(c[key]))){result[key]=Date.parse(d[key])>Date.parse(c[key])?d[key]:c[key];}
    else result[key]=merge(b[key],d[key],c[key],path+'.'+key);
   }
   return result;
  }
  // Identical stock decrements from two writers must still conflict.
  throw new ConflictError(path);
 }
 if(base.id!==desired.id||base.id!==current.id)throw new Error('房间战役编号不一致');
 return merge(base,desired,current,'远征');
}
