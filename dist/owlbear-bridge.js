export const ROOM_KEY = 'com.enzo.expedition-journal/room';
export const BOOK_MODAL = 'com.enzo.expedition-journal/book';

export function manifestURL(origin) {
  const url=new URL(origin);
  // Owlbear's development installer accepts localhost, not the numeric loopback alias.
  if(url.hostname==='127.0.0.1')url.hostname='localhost';
  return url.origin+'/manifest.json';
}

function sameJournalOrigin(left,right) {
  if(left===right)return true;
  const a=new URL(left),b=new URL(right),loopback=['localhost','127.0.0.1'];
  return loopback.includes(a.hostname)&&loopback.includes(b.hostname)&&a.protocol===b.protocol&&a.port===b.port;
}

export function parseBinding(value, origin) {
  if (!value || value.version !== 1 || value.origin !== origin ||
      typeof value.roomId !== 'string' || !/^[a-f0-9]{24}$/.test(value.roomId) ||
      typeof value.token !== 'string' || !/^[a-zA-Z0-9_-]{43}$/.test(value.token) ||
      typeof value.name !== 'string' || value.name.length > 100) return null;
  return {version:1, origin, roomId:value.roomId, token:value.token, name:value.name};
}

export function parseRoomLink(input, origin) {
  let url;
  try { url = new URL(input); } catch { throw new Error('请粘贴完整的远征邀请链接。'); }
  if (!sameJournalOrigin(url.origin,origin)) throw new Error('邀请来自另一个网站。请在同一网站安装扩展和创建共享远征。');
  const match = url.hash.match(/^#room=([a-f0-9]{24})\.([a-zA-Z0-9_-]{43})$/);
  if (!match) throw new Error('邀请链接不完整，请重新复制。');
  return {roomId:match[1], token:match[2]};
}

export function journalURL(binding, embedded = false) {
  const url = new URL('/index.html', binding.origin);
  if (embedded) url.searchParams.set('embed','owlbear');
  url.hash = 'room=' + binding.roomId + '.' + binding.token;
  return url.href;
}

export class OwlbearBridge {
  constructor(sdk, {origin, fetcher = (...args) => fetch(...args), onChange = () => {}}) {
    this.sdk = sdk;
    this.origin = origin;
    this.fetcher = fetcher;
    this.onChange = onChange;
    this.binding = null;
    this.role = 'PLAYER';
    this.cleanup = [];
    this.generation = 0;
    this.stopped = false;
  }

  async start() {
    if (!this.sdk.isAvailable) throw new Error('请从 Owlbear 房间的扩展菜单打开此页。');
    if (!this.sdk.isReady) {
      await new Promise((resolve,reject) => {
        const timer = setTimeout(() => reject(new Error('未能连接枭熊，请关闭后重新打开扩展。')),12000);
        this.sdk.onReady(() => {clearTimeout(timer);resolve();});
      });
    }
    if (this.stopped) return;
    this.cleanup.push(this.sdk.room.onMetadataChange(metadata => this.accept(metadata)));
    this.cleanup.push(this.sdk.player.onChange(player => {
      if (this.stopped) return;
      this.role=player.role;
      this.onChange(this.snapshot());
    }));
    const generation=this.generation;
    const [role, metadata] = await Promise.all([this.sdk.player.getRole(),this.sdk.room.getMetadata()]);
    if (this.stopped) return;
    this.role=role;
    if (generation===this.generation) this.accept(metadata);
    else this.onChange(this.snapshot());
  }

  snapshot() {return {role:this.role, binding:this.binding, roomId:this.sdk.room.id};}
  accept(metadata) {
    if (this.stopped) return;
    this.generation++;
    this.binding=parseBinding(metadata?.[ROOM_KEY],this.origin);
    this.onChange(this.snapshot());
  }
  async requireGM() {
    const role=await this.sdk.player.getRole();
    if (role !== 'GM') throw new Error('由主持人设置本房间的远征。');
  }

  async bind(input) {
    await this.requireGM();
    const invitation=parseRoomLink(input,this.origin),generation=this.generation;
    const response=await this.fetcher('/api/rooms/'+invitation.roomId,{
      headers:{Authorization:'Bearer '+invitation.token},signal:AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(response.status===403?'邀请已失效，请重新复制。':'未能打开共享远征，请检查网站连接。');
    const data=await response.json();
    if (typeof data.campaign?.name !== 'string' || data.campaign.name.length>100) throw new Error('远征内容格式无效。');
    if (this.stopped) return;
    if (generation !== this.generation) throw new Error('房间绑定已经改变，请查看最新版本后再设置。');
    await this.requireGM();
    const binding={version:1,origin:this.origin,...invitation,name:data.campaign.name};
    await this.sdk.room.setMetadata({[ROOM_KEY]:binding});
    this.accept(await this.sdk.room.getMetadata());
    return binding;
  }

  async unbind() {
    await this.requireGM();
    await this.sdk.room.setMetadata({[ROOM_KEY]:null});
    this.accept(await this.sdk.room.getMetadata());
  }

  async open() {
    const metadata=await this.sdk.room.getMetadata();
    this.accept(metadata);
    if (!this.binding) throw new Error('本房间还没有绑定共享远征。');
    await this.sdk.modal.open({id:BOOK_MODAL,url:journalURL(this.binding,true),fullScreen:true,hidePaper:true});
  }
  stop() {
    this.stopped=true;
    for (const dispose of this.cleanup) if (typeof dispose==='function') dispose();
    this.cleanup=[];
  }
}
