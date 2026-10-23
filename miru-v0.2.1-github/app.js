import {presets} from './presets.js';
import {Camera, cameraError} from './camera.js';
import {loadImage, photoBlob, backgroundBlob} from './image.js';
const $ = id => document.getElementById(id);
const camera = new Camera();
const state = {stage:0, bg:'assets/scene.jpg', sample:true, style:0, ratio:'4/5', guide:true, result:null, resultBlob:null};
let importToken = 0;
const figure = $('figure-template').innerHTML;
['person-preview','person-guide'].forEach(id => $(id).innerHTML = figure);
function toast(message) { $('alert').textContent=message; $('alert').classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('alert').classList.remove('show'),3500); }
function stop() {camera.stop(); $('camera-action').textContent='カメラを起動する →'; $('start-scene-camera').textContent='カメラで背景を見る';}
function go(stage) {stop(); state.stage=stage; document.querySelectorAll('.screen').forEach((screen,i)=>screen.classList.toggle('active',i===stage)); layout(); window.scrollTo(0,0);}
function layout() {
  ['bg-first','bg-preview','bg-guide'].forEach(id=>$(id).src=state.bg);
  $('scene-label').textContent=camera.stream && state.stage===0?'背景を映しています':state.sample?'サンプル背景':'あなたの背景写真';
  const p=presets[state.style];
  for(const id of ['person-preview','person-guide']) Object.assign($(id).style,{left:p.x+'%',height:p.height+'%',bottom:p.bottom+'%'});
  $('guide-label').textContent=state.guide?'半透明ガイド':'通常撮影';
  $('person-guide').hidden=!state.guide; $('guide-hint').hidden=!state.guide;
  $('guide-hint').textContent=p.hint; $('toggle-guide').textContent=state.guide?'ガイドをオフ':'ガイドをオン';
  $('next-guide').textContent='構図：'+p.name+' ↻';
  document.querySelectorAll('[data-style]').forEach(b=>{const yes=+b.dataset.style===state.style;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',yes);});
  document.querySelectorAll('[data-ratio]').forEach(b=>{const yes=b.dataset.ratio===state.ratio;b.classList.toggle('sel',yes);b.setAttribute('aria-pressed',yes);});
  const [rw,rh]=state.ratio.split('/').map(Number), w=Math.min(document.querySelector('.app').clientWidth-40,window.innerHeight*.50*rw/rh);
  ['preview-container','guide-container','result-container'].forEach(id=>Object.assign($(id).style,{aspectRatio:state.ratio,width:w+'px',maxHeight:'none'}));
  $('preview-ratio-label').textContent=state.ratio.replace('/',':');
}
function replaceBg(url) {if(state.bg.startsWith('blob:')) URL.revokeObjectURL(state.bg);state.bg=url;state.sample=false;layout();}
async function pickBackground(e) {
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  const token=++importToken;
  const url=URL.createObjectURL(file);
  try {if(file.size>25*1024*1024)throw new Error('25MB以下の写真を選んでください');await loadImage(url);if(token!==importToken){URL.revokeObjectURL(url);return;}stop();replaceBg(url);toast('背景を読み込みました');}
  catch {URL.revokeObjectURL(url);toast('写真を開けません。25MB以下のJPEG・PNGなどを選んでください');}
}
['input-camera-bg','input-file-bg'].forEach(id=>$(id).onchange=pickBackground);
async function startCamera(video,button,status) {
  button.disabled=true; status.textContent='カメラの許可・起動を待っています…';
  try {if(await camera.start(video,()=>{status.textContent='カメラが停止しました。再起動できます。';stop();})) {status.textContent='';button.textContent=state.stage===0?'カメラを再起動':'● シャッターを切る';layout();}}
  catch(error){status.textContent=cameraError(error);stop();}
  finally {button.disabled=false;}
}
$('start-scene-camera').onclick=()=>startCamera($('scene-camera'),$('start-scene-camera'),$('scene-status'));
$('choose-scene').onclick=async()=>{
  if(camera.stream && state.stage===0) {try {replaceBg(URL.createObjectURL(await backgroundBlob($('scene-camera'))));}catch {toast('背景の準備中です。もう一度押してください');return;}}
  go(1);
};
$('back-scene').onclick=()=>go(0);$('back-preview').onclick=()=>go(1);
document.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{state.style=+b.dataset.style;layout();});
document.querySelectorAll('[data-ratio]').forEach(b=>b.onclick=()=>{state.ratio=b.dataset.ratio;layout();});
function shoot(guide) {state.guide=guide;go(2);startCamera($('camera-view'),$('camera-action'),$('cam-note'));}
$('normal-from-scene').onclick=()=>shoot(false);
$('use-plan').onclick=()=>shoot(true);$('normal-shoot').onclick=()=>shoot(false);
$('toggle-guide').onclick=()=>{state.guide=!state.guide;layout();};
$('next-guide').onclick=()=>{state.style=(state.style+1)%presets.length;layout();};
function showResult(blob,native=false) {
  if(state.result)URL.revokeObjectURL(state.result);
  state.resultBlob=blob;state.result=URL.createObjectURL(blob);$('result-image').src=state.result;
  $('result-status').textContent=native?'標準カメラの写真を選択比率で中央トリミングしました。':'';go(3);
}
$('camera-action').onclick=async()=>{
  if(!camera.stream)return startCamera($('camera-view'),$('camera-action'),$('cam-note'));
  try {showResult(await photoBlob($('camera-view'),state.ratio));}catch{toast('映像の準備中です。もう一度お試しください');}
};
$('native-capture').onchange=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  const url=URL.createObjectURL(file);
  try {if(file.size>25*1024*1024)throw new Error();const image=await loadImage(url);showResult(await photoBlob(image,state.ratio),true);}
  catch{toast('写真を開けません。25MB以下のJPEG・PNGなどをお試しください');}finally{URL.revokeObjectURL(url);}
};
$('save-result').onclick=async()=>{
  if(!state.resultBlob)return;
  const file=new File([state.resultBlob],'miru-photo.jpg',{type:'image/jpeg'});
  if(navigator.canShare?.({files:[file]})) {
    try {await navigator.share({files:[file]});return;}catch(e){if(e.name==='AbortError')return;}
  }
  const a=document.createElement('a');a.href=state.result;a.download=file.name;a.click();
  $('result-status').textContent='保存を開始しました。保存先はブラウザのダウンロードをご確認ください。写真は長押しでも保存できます。';
};
$('save-concept').onclick=async()=>{
  try {
    const bg=await loadImage(state.bg), blob=await photoBlob(bg,state.ratio), url=URL.createObjectURL(blob), image=await loadImage(url);
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);URL.revokeObjectURL(url);
    const figureUrl=URL.createObjectURL(new Blob([figure.trim()],{type:'image/svg+xml'}));
    let person;try {person=await loadImage(figureUrl);}finally{URL.revokeObjectURL(figureUrl);}
    const p=presets[state.style], h=canvas.height*p.height/100,w=h*240/620;
    ctx.drawImage(person,canvas.width*p.x/100-w/2,canvas.height*(1-p.bottom/100)-h,w,h);
    ctx.fillStyle='white';ctx.fillRect(8,canvas.height-30,220,24);ctx.fillStyle='#554b47';ctx.font='14px sans-serif';ctx.fillText('miru. · テンプレート構図イメージ',14,canvas.height-13);
    canvas.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='miru-composition.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),60000);});
  }catch{toast('構図画像を保存できませんでした');}
};
$('another-shot').onclick=()=>shoot(state.guide);$('restart').onclick=()=>go(0);
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('resize',layout);layout();
// Release browser camera before handing control to the system camera/photo picker.
['native-capture','input-camera-bg','input-file-bg'].forEach(id=>$(id).addEventListener('click',stop));
