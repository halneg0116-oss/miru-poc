import {makePlans} from './composition-engine.js';
import {poseLabels} from './pose-library.js';
export function buildShotPlans(scene,ratio) {
  return makePlans(scene,ratio).map(plan=>({...plan,poseLabel:poseLabels[plan.pose]||'自然に立つ'}));
}
