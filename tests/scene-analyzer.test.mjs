import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDetectorLoader} from '../detector-loader.js';
import {createSceneAnalyzer} from '../scene-analyzer.js';

test('model initialization is cached; rejection permits retry',async()=>{
  let calls=0;
  const task={detect(){}};
  const load=createDetectorLoader(async()=>{calls++;if(calls===1)throw new Error('offline');return task;});
  await assert.rejects(load(),/offline/);
  const [a,b]=await Promise.all([load(),load()]);assert.equal(a,task);assert.equal(b,task);assert.equal(calls,2);
});
test('timeout releases cache and closes late model without poisoning retry',async()=>{
  let resolve,closed=0,calls=0;const fresh={};
  const load=createDetectorLoader(()=>++calls===1?new Promise(r=>resolve=r):fresh,5);
  await assert.rejects(load(),{name:'TimeoutError'});
  assert.equal(await load(),fresh);
  resolve({close(){closed++;}});await Promise.resolve();await Promise.resolve();
  assert.equal(closed,1);assert.equal(await load(),fresh);
});
test('analysis normalizes detections from the actual resized input and records timings',async()=>{
  const previous=globalThis.document;
  let input;
  globalThis.document={createElement(){return {width:0,height:0,getContext(){return {drawImage(){},getImageData(){return {data:new Uint8ClampedArray(60*60*4)};}};}};}};
  try {
    const analyze=createSceneAnalyzer(async()=>({detect(canvas){input=canvas;return {detections:[{boundingBox:{originX:64,originY:48,width:128,height:96},categories:[{categoryName:'person',score:.9}]}]};}}));
    const result=await analyze({naturalWidth:1920,naturalHeight:1440});
    assert.equal(input.width,640);assert.equal(input.height,480);
    assert.deepEqual(result.objects,[{label:'person',confidence:.9,x:.1,y:.1,w:.2,h:.2}]);
    assert.equal(result.grid.length,144);
    for(const key of ['modelLoadMs','inferenceMs','totalMs'])assert.ok(Number.isFinite(result[key])&&result[key]>=0);
    const broken=createSceneAnalyzer(async()=>{throw new Error('network offline');});
    await assert.rejects(broken({naturalWidth:640,naturalHeight:480}),e=>e.diagnostics.phase==='model'&&/offline/.test(e.message));
    const badInference=createSceneAnalyzer(async()=>({detect(){throw new Error('WASM error');}}));
    await assert.rejects(badInference({naturalWidth:640,naturalHeight:480}),e=>e.diagnostics.phase==='inference');
  }finally {globalThis.document=previous;}
});
