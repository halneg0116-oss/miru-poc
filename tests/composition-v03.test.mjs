import assert from 'node:assert/strict';
import test from 'node:test';
import {makePlans,projectPoint} from '../composition-engine.js';
const frame={width:640,height:480,objects:[],grid:[]};
test('three distinct picture plans produced',()=>{
  const plans=makePlans(frame,'4/5');
  assert.equal(plans.length,3);
  assert.deepEqual(plans.map(x=>x.name),['背景重視','全身','寄り']);
  for(const p of plans)assert.ok(Number.isFinite(p.x) && p.x>=0 && p.x<=100);
});
test('projection centers original image',()=>{
  const p=projectPoint(.5,.5,640,480,'4/5');
  assert.ok(Math.abs(p.x-.5)<.001);
  assert.ok(Math.abs(p.y-.5)<.001);
});
test('detected obstacle can change suggested subject position',()=>{
  const baseline=makePlans(frame,'4/5')[0].x;
  const withObstacle={...frame,objects:[{label:'person',x:.56,y:.15,w:.33,h:.82,confidence:.99}]};
  const chosen=makePlans(withObstacle,'4/5')[0].x;
  assert.notEqual(chosen,baseline);
});
test('different aspect ratios are supported',()=>{
  for(const ratio of ['4/5','9/16','1/1'])assert.equal(makePlans(frame,ratio).length,3);
});