import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {presets} from '../presets.js';
const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
// Run the real app event handlers with DOM/camera/analysis boundaries replaced.
// No live image, browser permission or external network is used by these tests.
function boot({analyzeScene,photoBlob=async()=>new Blob(['photo'])}) {
  const nodes=new Map(),draws=[],renders=[];
  function element(){return {style:{},dataset:{},innerHTML:'<svg/>',textContent:'',clientWidth:400,classList:{toggle(){},add(){},remove(){}},setAttribute(){},addEventListener(){},focus(){},append(){},click(){}};}
  const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
  const styles=[0,1,2].map(style=>Object.assign(element(),{dataset:{style:String(style)}}));
  const ratios=['4/5','9/16','1/1'].map(ratio=>Object.assign(element(),{dataset:{ratio}}));
  const document={getElementById:get,querySelector:()=>element(),addEventListener(){},
    querySelectorAll:selector=>selector==='[data-style]'?styles:selector==='[data-ratio]'?ratios:[],
    createElement(tag){const node=element();if(tag==='canvas'){node.getContext=()=>({drawImage:(...args)=>draws.push(args),fillRect(){},fillText(){}});node.toBlob=callback=>callback(new Blob(['png']));}return node;}};
  class LocalURL extends URL {static createObjectURL(){return 'blob:local-test';}static revokeObjectURL(){}}
  const context={document,location:{search:''},navigator:{userAgent:'test'},window:{innerHeight:800,addEventListener(){},scrollTo(){}},
    URLSearchParams,URL:LocalURL,Blob,console,setTimeout:()=>1,clearTimeout(){},presets,
    createDebugMode:()=>data=>renders.push(data),
    Camera:class {stop(){} async start(){return false;}},cameraError:()=>'',
    loadImage:async()=>({naturalWidth:640,naturalHeight:800}),photoBlob,backgroundBlob:async()=>new Blob(),analyzeScene,
    buildShotPlans:()=>presets.map(p=>({...p,x:27})),poseMarkup:()=>'<svg/>'};
  vm.runInNewContext(app.replace(/^import .*;\n/gm,''),context,{filename:'app.js'});
  return {get,styles,ratios,draws,renders};
}
test('late analysis cannot change shooting guide or reset selected composition',async()=>{
  const started=deferred(),result=deferred();
  const ui=boot({analyzeScene:()=>{started.resolve();return result.promise;}});
  const pending=ui.get('choose-scene').onclick();await started.promise;
  ui.styles[1].onclick();await ui.get('use-plan').onclick();
  const before={...ui.get('person-guide').style};
  result.resolve({objects:[],inferenceMs:1});await pending;
  assert.deepEqual(ui.get('person-guide').style,before);
  assert.equal(ui.renders.at(-1).stage,2);assert.equal(ui.renders.at(-1).style,1);
  assert.equal(ui.renders.at(-1).source,'fixed');
});
test('model failure falls back with diagnostic details and shooting remains available',async()=>{
  const error=new Error('offline');error.diagnostics={phase:'model'};
  const ui=boot({analyzeScene:async()=>{throw error;}});
  await ui.get('choose-scene').onclick();
  assert.equal(ui.renders.at(-1).status,'error');assert.equal(ui.renders.at(-1).source,'fixed');assert.equal(ui.renders.at(-1).error,error);
  await ui.get('normal-shoot').onclick();assert.equal(ui.renders.at(-1).stage,2);assert.equal(ui.get('person-guide').hidden,true);
});
test('saving a concept freezes ratio and person placement before async encoding',async()=>{
  const encoding=deferred();let usedRatio;
  const ui=boot({analyzeScene:async()=>({objects:[]}),photoBlob:(_,ratio)=>{usedRatio=ratio;return encoding.promise;}});
  const pending=ui.get('save-concept').onclick();await Promise.resolve();
  ui.styles[1].onclick();ui.ratios[1].onclick();encoding.resolve(new Blob(['photo']));await pending;
  assert.equal(usedRatio,'4/5');
  const personDraw=ui.draws[1];assert.equal(personDraw[4],800*presets[0].height/100);
});
