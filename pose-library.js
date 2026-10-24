// Stylized original pose guides. They illustrate posture, not a photoreal prediction.
export const poseLabels={stand:'自然に立つ',look:'景色を見る',turn:'振り返る',walk:'歩く'};
function figure({headX=118,bodyTilt=0,armLeft='M88 190L57 310',armRight='M151 190L177 315',legLeft='M104 345L87 565',legRight='M132 345L149 565',face=true}) {
  return '<svg viewBox="0 0 240 620" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
  '<ellipse cx="120" cy="604" rx="75" ry="11" fill="#30282122"/>'+
  '<path d="'+legLeft+'" fill="none" stroke="#354d5b" stroke-width="44" stroke-linecap="round"/>'+
  '<path d="'+legRight+'" fill="none" stroke="#304352" stroke-width="44" stroke-linecap="round"/>'+
  '<path d="M64 573h52v30H59q-8-14 5-30 M120 573h52q15 14 5 30h-56Z" fill="#f3efea"/>'+
  '<g transform="rotate('+bodyTilt+' 118 249)">'+
  '<path d="'+armLeft+'" stroke="#d8b49b" stroke-width="25" stroke-linecap="round" fill="none"/>'+
  '<path d="'+armRight+'" stroke="#d8b49b" stroke-width="25" stroke-linecap="round" fill="none"/>'+
  '<path d="M89 172Q119 156 147 171L164 339H79Z" fill="#ded3c7"/>'+
  '<path d="M118 169v164" stroke="#f6f2e9" stroke-width="4"/>'+
  '</g>'+
  '<path d="M107 145L107 180H135L134 143Z" fill="#ddb69d"/>'+
  '<path d="M92 84q-4-43 35-43t35 44v65q-17 27-43 15-38 0-27-81" fill="#382b29"/>'+
  '<ellipse cx="'+headX+'" cy="107" rx="29" ry="44" fill="#e3b99f"/>'+
  (face?'<path d="M108 112h6M127 112h6M116 135q9 5 16-1" fill="none" stroke="#75504a" stroke-width="2" stroke-linecap="round"/>':'<path d="M129 112h6" stroke="#75504a" stroke-width="2" />')+
  '<path d="M91 98Q91 41 129 43q37 3 36 54-14-28-29-30-20 30-45 31" fill="#382b29"/>'+
  '</svg>';
}
export function poseMarkup(id,originalStandMarkup) {
  if(id==='stand')return originalStandMarkup;
  if(id==='walk')return figure({bodyTilt:-5,armLeft:'M88 190L55 290',armRight:'M151 190L197 250',legLeft:'M104 345L63 566',legRight:'M132 345L165 566'});
  if(id==='look')return figure({headX:130,face:false,bodyTilt:4,armLeft:'M88 190L72 306',armRight:'M151 190L165 311',legLeft:'M104 345L96 565',legRight:'M132 345L145 565'});
  if(id==='turn')return figure({headX:107,bodyTilt:-10,armLeft:'M88 190L56 306',armRight:'M151 190L168 292',legLeft:'M104 345L85 565',legRight:'M132 345L153 565'});
  return originalStandMarkup;
}
