import {projectPoint} from './composition-engine.js';
import {modelInfo} from './scene-analyzer.js';
// Diagnostics contain numbers/labels only, never pixels, blob URLs or image data.
export function debugSnapshot({scene,plans,ratio,style,source,error,status}) {
  return {status,source,ratio,selected:style,model:modelInfo,
    timings:scene ? {modelLoadMs:scene.modelLoadMs,inferenceMs:scene.inferenceMs,totalMs:scene.totalMs} : error?.diagnostics,
    objects:(scene?.objects||[]).map(o=>{
      const p=projectPoint(o.x,o.y,scene.width,scene.height,ratio);
      return {...o,frame:{x:p.x,y:p.y,w:o.w*p.sx,h:o.h*p.sy}};
    }),
    plans:plans.map(p=>({name:p.name,x:p.x,height:p.height,bottom:p.bottom,pose:p.pose,score:p.score??null,breakdown:p.scoreBreakdown??null})),
    error:error?{name:error.name,message:error.message,phase:error.diagnostics?.phase}:null};
}
export function createDebugMode(enabled) {
  if(!enabled)return ()=>{};
  const panel=document.createElement('details');panel.id='developer-debug';panel.open=true;
  const title=document.createElement('summary');title.textContent='開発者デバッグ（端末内のみ）';
  const pre=document.createElement('pre');pre.setAttribute('aria-live','polite');
  panel.append(title,pre);document.querySelector('main').append(panel);
  return data=>{panel.hidden=data.stage!==1;pre.textContent=JSON.stringify(debugSnapshot(data),null,2);};
}
