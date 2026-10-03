import OBR from './vendor/obr-sdk.js';
import {BOOK_MODAL} from './owlbear-bridge.js';

export function mountOwlbearBook({beforeClose,onError}) {
  if(!OBR.isAvailable)return;
  OBR.onReady(()=>{
    const button=document.createElement('button');
    button.className='text-button';button.textContent='返回枭熊';button.id='return-owlbear';
    button.onclick=async()=>{if(!beforeClose())return;try{await OBR.modal.close(BOOK_MODAL);}catch{onError('未能返回枭熊，请使用外层关闭按钮。');}};
    document.querySelector('.header-actions').prepend(button);
    document.body.classList.add('owlbear-book');
  });
}
