import {test} from 'node:test';
import assert from 'node:assert/strict';
import {coverRect} from '../image.js';
import {Camera,cameraError} from '../camera.js';
import {presets} from '../presets.js';
test('center crop matches visible cover frame in every ratio',()=>{
  for(const [rw,rh] of [[4,5],[9,16],[1,1]]) {
    const w=1080,h=w*rh/rw;const [x,y,dw,dh]=coverRect(1920,1080,w,h);
    assert.ok(dw>=w && dh>=h);assert.ok(Math.abs(x*2+dw-w)<1e-8);assert.ok(Math.abs(y*2+dh-h)<1e-8);
  }
});
test('full body template stays within frame',()=>{assert.ok(presets[1].height+presets[1].bottom<=100);assert.equal(presets.length,3);});
test('late camera permission result is stopped after leaving screen',async()=>{
  globalThis.window={isSecureContext:true};let resolve,stopped=0;
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(r=>resolve=r)}}});
  const camera=new Camera();const pending=camera.start({});camera.stop();resolve({getTracks:()=>[{stop:()=>stopped++}]});
  assert.equal(await pending,false);assert.equal(stopped,1);assert.equal(camera.stream,null);
});
test('camera stops on failed playback and gives permission fallback',async()=>{
  let stopped=0;const track={stop:()=>stopped++};
  navigator.mediaDevices.getUserMedia=async()=>({getTracks:()=>[track]});
  const camera=new Camera();await assert.rejects(camera.start({style:{},play:async()=>{throw new Error('play failed');}}));
  assert.equal(stopped,1);assert.equal(camera.stream,null);
  assert.match(cameraError({name:'NotAllowedError'}),/標準カメラ/);
  window.isSecureContext=false;await assert.rejects(camera.start({}),/HTTPS/);
});
