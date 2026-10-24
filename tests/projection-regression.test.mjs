import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makePlans,projectPoint} from '../composition-engine.js';
import {coverRect} from '../image.js';
import {debugSnapshot,createDebugMode} from '../debug-mode.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('object projection matches image cover drawing for portrait/landscape and all ratios',()=>{
  for(const [sw,sh] of [[1920,1080],[1080,1920],[4032,3024]])for(const ratio of ['4/5','9/16','1/1']){
    const [rw,rh]=ratio.split('/').map(Number),fw=900*rw/rh,fh=900;
    const [ox,oy,dw,dh]=coverRect(sw,sh,fw,fh);
    for(const [x,y] of [[0,0],[.1,.2],[.5,.5],[1,1]]){
      const p=projectPoint(x,y,sw,sh,ratio);near(p.x,(ox+x*dw)/fw);near(p.y,(oy+y*dh)/fh);near(p.sx,dw/fw);near(p.sy,dh/fh);
    }
  }
});
test('cropped-out objects do not move plans or change poses',()=>{
  const empty={width:1920,height:1080,objects:[],grid:[]};
  const outside={...empty,objects:[{label:'chair',x:0,y:.1,w:.05,h:.8,confidence:.99}]};
  for(const ratio of ['4/5','9/16','1/1']){
    const a=makePlans(empty,ratio),b=makePlans(outside,ratio);
    assert.deepEqual(b.map(p=>[p.x,p.score,p.pose]),a.map(p=>[p.x,p.score,p.pose]));
  }
});
test('full body remains inside narrow frame; ranking deterministic and breakdown sums to score',()=>{
  const scene={width:640,height:480,grid:[],objects:[{label:'person',x:.3,y:0,w:.3,h:1,confidence:.99}]};
  for(const ratio of ['4/5','9/16','1/1']){
    const plans=makePlans(scene,ratio);assert.deepEqual(plans,makePlans(scene,ratio));
    const [rw,rh]=ratio.split('/').map(Number),p=plans[1],half=p.height/100*(240/620)*(rh/rw)/2;
    assert.ok(p.x/100-half>=0&&p.x/100+half<=1);
    for(const plan of plans){const {total,...costs}=plan.scoreBreakdown;near(total,plan.score);near(total,-Object.values(costs).reduce((a,b)=>a+b,0));}
  }
});
test('debug is opt-in, reports projected objects/scores/errors, does not include photo source',()=>{
  assert.doesNotThrow(()=>createDebugMode(false)({}));
  const scene={width:640,height:480,objects:[{label:'person',x:.5,y:.2,w:.1,h:.3,confidence:.9}],grid:[],inferenceMs:12,modelLoadMs:30,totalMs:44};
  const snapshot=debugSnapshot({scene,plans:makePlans(scene),ratio:'4/5',style:0,source:'ai',status:'complete'});
  assert.equal(snapshot.objects[0].label,'person');assert.ok(snapshot.objects[0].frame.w>0);assert.equal(snapshot.timings.inferenceMs,12);assert.ok(snapshot.plans[0].breakdown);
  assert.ok(!JSON.stringify(snapshot).includes('blob:'));
  const error=new Error('offline');error.diagnostics={phase:'model',totalMs:20000};
  assert.equal(debugSnapshot({scene:null,plans:[],error,ratio:'4/5'}).error.phase,'model');
});
