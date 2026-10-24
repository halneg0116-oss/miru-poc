// Pure composition ranking (not a trained aesthetic-quality model).
// All position coordinates refer to the visible frame AFTER CSS object-fit:cover.
export function projectPoint(x,y,sourceWidth,sourceHeight,ratio) {
  const [rw,rh]=ratio.split('/').map(Number),frameW=rw/rh;
  const scale=Math.max(frameW/sourceWidth,1/sourceHeight);
  const offX=(frameW-sourceWidth*scale)/2,offY=(1-sourceHeight*scale)/2;
  return {x:(x*sourceWidth*scale+offX)/frameW,y:y*sourceHeight*scale+offY,
    sx:sourceWidth*scale/frameW,sy:sourceHeight*scale};
}
function overlap(a,b){
  const width=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
  const height=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  return width*height;
}
function scorePosition(scene,ratio,candidate,style) {
  const [rw,rh]=ratio.split('/').map(Number),subjectWidth=candidate.height*(240/620)*(rh/rw);
  const body={x:candidate.x-subjectWidth/2, y:1-candidate.bottom-candidate.height,w:subjectWidth,h:candidate.height};
  const visible={x:Math.max(0,body.x),y:Math.max(0,body.y),
    w:Math.min(1,body.x+body.w)-Math.max(0,body.x),
    h:Math.min(1,body.y+body.h)-Math.max(0,body.y)};
  let clutter=0,collisions=0;
  for(const cell of scene.grid||[]){
    const p=projectPoint(cell.x,cell.y,scene.width,scene.height,ratio);
    if(p.x>=visible.x&&p.x<=visible.x+visible.w&&p.y>=visible.y&&p.y<=visible.y+visible.h)
      clutter+=cell.busy;
  }
  for(const o of scene.objects||[]){
    const p=projectPoint(o.x,o.y,scene.width,scene.height,ratio);
    const r={x:p.x,y:p.y,w:o.w*p.sx,h:o.h*p.sy};
    collisions+=overlap(visible,r)*Math.max(.2,o.confidence||0);
  }
  const center=style===0?.67:.5;
  const centerPenalty=Math.abs(candidate.x-center)*2.1;
  return -(clutter*.058+collisions*25+centerPenalty);
}
export function makePlans(scene,ratio='4/5') {
  const xCandidates=[.27,.34,.50,.66,.73],plans=[];
  const kinds=[
    {name:'背景重視',height:66,bottom:3,pose:'look',hint:'背景も入れて、景色を活かそう。'},
    {name:'全身',height:87,bottom:3,pose:'stand',hint:'頭から足元まで入れてね。'},
    {name:'寄り',height:150,bottom:-55,pose:'turn',hint:'顔と表情を主役に。'}
  ];
  for(let style=0;style<kinds.length;style++){
    const p=kinds[style],candidates=xCandidates.map(x=>({
      x,height:p.height/100,bottom:p.bottom/100
    }));
    candidates.sort((a,b)=>scorePosition(scene,ratio,b,style)-scorePosition(scene,ratio,a,style));
    const best=candidates[0];
    const x=Math.round(best.x*100);
    let pose=p.pose;
    if(style===1 && (scene.objects||[]).some(o=>o.label==='bench'||o.label==='chair'))pose='turn';
    else if(style===1 && x!==50 && (scene.objects||[]).length===0)pose='walk';
    plans.push({
      name:p.name,x,height:p.height,bottom:p.bottom,pose,hint:p.hint,
      reason:(scene.objects||[]).length
        ? '検出した物体との重なりと余白を考慮'
        : '画像の明暗・細部の分布と余白を考慮',
      score:scorePosition(scene,ratio,best,style)
    });
  }
  return plans;
}
