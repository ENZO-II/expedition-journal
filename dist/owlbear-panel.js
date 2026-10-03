import OBR from './vendor/obr-sdk.js';
import {OwlbearBridge,journalURL} from './owlbear-bridge.js?v=20261003-13d';
import {escapeHtml as h} from './domain.js?v=20261003-13d';

const content=document.querySelector('#extension-content'),notice=document.querySelector('#extension-notice');
const bridge=new OwlbearBridge(OBR,{origin:location.origin,onChange:render});
let busy=false,switching=false,latest=null,dirty=false;

function render(state) {
  latest=state;
  document.querySelector('#host-state').textContent=state.role==='GM'?'主持人 · 房间手记':'玩家 · 房间手记';
  if (dirty && document.querySelector('#binding-link')) {
    notice.textContent='房间设置已更新。你填写的链接仍保留，确认后可以重新绑定。';
    return;
  }
  const binding=state.binding,isGM=state.role==='GM';
  content.innerHTML=binding&&!switching?
    '<div class="bound-book"><span class="book-access">共享</span><h2>'+h(binding.name)+'</h2><p>手记、地图与物品属于这段远征。</p><button class="book-open" id="open-book">翻开手记</button><a class="browser-open" href="'+h(journalURL(binding))+'" target="_blank" rel="noopener noreferrer">在浏览器中打开</a></div>'+(isGM?'<button class="rubric-action" id="change-binding">更换绑定</button><button class="rubric-action" id="remove-binding">解除绑定</button>':''):
    '<div class="unbound-book"><h2>'+(switching?'更换房间的远征':'本房间的远征')+'</h2><p>'+(isGM?'粘贴共享远征的邀请链接，房间里的同伴就能从这里翻开同一本手记。':'主持人绑定共享远征后，就可以从这里打开。')+'</p></div>'+(isGM?'<form id="bind-form"><label for="binding-link">共享远征邀请链接</label><input type="url" id="binding-link" name="invite" required placeholder="粘贴完整邀请链接" maxlength="1000"><div class="binding-actions"><button class="book-open">'+(switching?'更换绑定':'绑定远征')+'</button>'+(switching?'<button type="button" class="rubric-action" id="cancel-binding">取消</button>':'')+'</div><p class="small-note">房间内的玩家会获得这段共享远征的共同编辑权限。</p></form>':'');
  const open=document.querySelector('#open-book');if(open)open.onclick=()=>run(open,()=>bridge.open());
  const change=document.querySelector('#change-binding');if(change)change.onclick=()=>{switching=true;render(latest);document.querySelector('#binding-link')?.focus();};
  const remove=document.querySelector('#remove-binding');if(remove)remove.onclick=()=>{
    content.innerHTML='<h2>解除房间绑定</h2><p>手记、图片与物品仍保留在原远征中。</p><div class="binding-actions"><button class="book-open" id="confirm-unbind">解除绑定</button><button class="rubric-action" id="cancel-unbind">取消</button></div>';
    document.querySelector('#confirm-unbind').onclick=e=>run(e.currentTarget,()=>bridge.unbind());
    document.querySelector('#cancel-unbind').onclick=()=>render(latest);
  };
  const cancel=document.querySelector('#cancel-binding');if(cancel)cancel.onclick=()=>{dirty=false;switching=false;render(latest);};
  const input=document.querySelector('#binding-link');if(input)input.oninput=()=>{dirty=Boolean(input.value);};
  const form=document.querySelector('#bind-form');if(form)form.onsubmit=e=>{
    e.preventDefault();const link=input.value.trim(),button=form.querySelector('button');
    run(button,async()=>{await bridge.bind(link);dirty=false;switching=false;render(latest);notice.textContent='房间已绑定共享远征。';});
  };
}

async function run(button,action) {
  if(busy)return;busy=true;button.disabled=true;notice.textContent='正在处理…';
  try{await action();if(notice.textContent==='正在处理…')notice.textContent='';}
  catch(error){notice.textContent=error.name==='TimeoutError'?'连接超时，请稍后重试。':error instanceof TypeError?'暂时连接不上远征网站，请稍后重试。':error.message;}
  finally{busy=false;if(button.isConnected)button.disabled=false;}
}

try{await bridge.start();}
catch(error){
  document.querySelector('#host-state').textContent='枭熊扩展';
  content.innerHTML='<h2>从枭熊房间打开</h2><p>'+h(error.message)+'</p><p>在枭熊的扩展管理中添加本网站的安装链接，再进入房间。</p><label for="manifest-link">安装链接</label><input id="manifest-link" readonly value="'+h(location.origin+'/manifest.json')+'"><a class="browser-open" href="https://extensions.owlbear.rodeo/guide" target="_blank" rel="noopener noreferrer">查看安装步骤</a>';
}
window.addEventListener('pagehide',()=>bridge.stop(),{once:true});
