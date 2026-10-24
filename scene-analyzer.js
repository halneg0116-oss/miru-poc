import {createDetectorLoader} from './detector-loader.js';
// Single-image, on-device analysis. MediaPipe fetches code/WASM/model from a CDN,
// but image pixels are processed locally; no photo is uploaded by miru.
const VERSION = '1.1.1';
const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + VERSION;
const MODEL = 'https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite';
export const modelInfo = Object.freeze({version:VERSION, module:CDN+'/vision_bundle.mjs', wasm:CDN+'/wasm', model:MODEL, delegate:'CPU'});
const detector = createDetectorLoader(async () => {
  const {ObjectDetector, FilesetResolver} = await import(modelInfo.module);
  const vision = await FilesetResolver.forVisionTasks(modelInfo.wasm);
  return ObjectDetector.createFromOptions(vision, {
    baseOptions:{modelAssetPath:MODEL, delegate:'CPU'},
    scoreThreshold:0.38, maxResults:15, runningMode:'IMAGE'
  });
});
function imageTexture(canvas) {
  // An inexpensive image feature, not a learned saliency model.
  const tiny=document.createElement('canvas');tiny.width=60;tiny.height=60;
  const t=tiny.getContext('2d',{willReadFrequently:true});
  t.drawImage(canvas,0,0,60,60);
  const bytes=t.getImageData(0,0,60,60).data;
  const grid=[],cols=12,rows=12;
  let globalLight=0;
  function lum(x,y) {
    const i=(Math.min(59,y)*60+Math.min(59,x))*4;
    return (bytes[i]*.2126+bytes[i+1]*.7152+bytes[i+2]*.0722)/255;
  }
  for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
    let energy=0,light=0;
    for(let y=gy*5;y<gy*5+5;y++)for(let x=gx*5;x<gx*5+5;x++){
      const l=lum(x,y);light+=l;
      energy+=Math.abs(l-lum(Math.min(59,x+1),y))+Math.abs(l-lum(x,Math.min(59,y+1)));
    }
    globalLight+=light;
    grid.push({x:(gx+.5)/cols,y:(gy+.5)/rows,busy:Math.min(1,energy/25*3)});
  }
  return {grid,brightness:globalLight/(60*60)};
}
export function createSceneAnalyzer(loadDetector = detector) {
  return async function analyzeScene(image, progress=()=>{}) {
    const totalStart=performance.now();
    let phase='image', modelLoadMs=null, inferenceMs=null;
    try {
      const sw=image.naturalWidth||image.videoWidth,sh=image.naturalHeight||image.videoHeight;
      if(!sw||!sh)throw new Error('背景画像を読み込めません');
      const s=Math.min(1,640/Math.max(sw,sh));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(sw*s)); canvas.height=Math.max(1,Math.round(sh*s));
      canvas.getContext('2d',{willReadFrequently:true}).drawImage(image,0,0,canvas.width,canvas.height);
      const visual=imageTexture(canvas);
      phase='model';progress('端末内AIのモデルを読み込んでいます…');
      const modelStart=performance.now();
      const task=await loadDetector();
      modelLoadMs=Math.round(performance.now()-modelStart);
      phase='inference';progress('端末内AIが物体を認識しています…');
      const start=performance.now();
      const result=task.detect(canvas);
      inferenceMs=Math.round(performance.now()-start);
      const objects=(result.detections||[]).filter(d=>d.boundingBox && d.categories?.length).map(d=>({
        label:d.categories[0].categoryName,
        confidence:d.categories[0].score,
        x:d.boundingBox.originX/canvas.width,
        y:d.boundingBox.originY/canvas.height,
        w:d.boundingBox.width/canvas.width,
        h:d.boundingBox.height/canvas.height
      }));
      return {width:canvas.width,height:canvas.height,objects, ...visual,inferenceMs,modelLoadMs,totalMs:Math.round(performance.now()-totalStart),source:'mediapipe'};
    } catch(error) {
      error.diagnostics={phase,modelLoadMs,inferenceMs,totalMs:Math.round(performance.now()-totalStart)};
      throw error;
    }
  };
}
export const analyzeScene = createSceneAnalyzer();
