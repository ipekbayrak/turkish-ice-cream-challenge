import { Vector3 } from 'three';

export const STRETCH_CUT_COPY = {
  tr: 'HIZLICA DİK KES', en: 'SWIPE QUICKLY ACROSS', de: 'SCHNELL QUER SCHNEIDEN',
  ar: 'اقطع عرضيًا بسرعة', ru: 'БЫСТРО РЕЖЬ ПОПЕРЁК', ja: 'すばやく直角に切る',
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const minus=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const MAX_CUT_STROKE_SECONDS=.18;
export const cutSwipeSpeed = ({width,height}) => clamp(Math.min(width,height)*.70,220,480);
export function cutViewport(world) {
  const rect=world.canvas?.getBoundingClientRect?.();
  return {width:Math.max(1,rect?.width||world.canvas?.clientWidth||globalThis.window?.innerWidth||800),height:Math.max(1,rect?.height||world.canvas?.clientHeight||globalThis.window?.innerHeight||600)};
}
function nearestPoint(point,a,b) {
  const ab=minus(b,a),len=dot(ab,ab),t=len?clamp(dot(minus(point,a),ab)/len,0,1):0;
  const p={x:a.x+ab.x*t,y:a.y+ab.y*t};return {distance:distance(point,p),t,point:p};
}
function segmentHit(a,b,c,d) {
  const ab=minus(b,a),cd=minus(d,c),den=cross(ab,cd);
  if(Math.abs(den)>1e-7){const ca=minus(c,a),t=cross(ca,cd)/den,u=cross(ca,ab)/den;if(t>=0&&t<=1&&u>=0&&u<=1)return {distance:0,t,u};}
  const candidates=[{...nearestPoint(a,c,d),stroke:0},{...nearestPoint(b,c,d),stroke:1}];
  for(const [p,u]of [[c,0],[d,1]]){const n=nearestPoint(p,a,b);candidates.push({distance:n.distance,t:u,stroke:n.t});}
  candidates.sort((x,y)=>x.distance-y.distance);const best=candidates[0];return {distance:best.distance,t:best.stroke,u:best.t};
}
function worldNormal(world, normal) {
  const result=new Vector3(normal.x,-normal.y,0);
  if(world.camera)result.applyQuaternion(world.camera.quaternion);
  return result.normalize();
}
function roomAlong(point, direction, viewport) {
  let room=Infinity;
  const limits={left:14,right:viewport.width-14,top:65,bottom:viewport.height-70};
  if(direction.x>1e-6)room=Math.min(room,(limits.right-point.x)/direction.x);
  if(direction.x< -1e-6)room=Math.min(room,(limits.left-point.x)/direction.x);
  if(direction.y>1e-6)room=Math.min(room,(limits.bottom-point.y)/direction.y);
  if(direction.y< -1e-6)room=Math.min(room,(limits.top-point.y)/direction.y);
  return Math.max(0,room);
}

/** Actual rendered polyline and an across-strand guide, not a fixed horizontal cue. */
export function stretchCutGuide(world) {
  const source=world.stretchyStrand?.nodes||[];
  const nodes=source.length===2?[source[0],source[0].clone().lerp(source[1],.5),source[1]]:source;
  if(nodes.length<2)return null;
  const viewport=cutViewport(world),points=nodes.map(p=>world.projectToScreen(p));
  let selected=Math.floor((nodes.length-1)/2),best=Infinity;
  for(let i=1;i<nodes.length-1;i++){
    const p=points[i],t=i/(nodes.length-1);
    if(t<.25||t>.78)continue;
    const outside=p.x<24||p.x>viewport.width-24||p.y<65||p.y>viewport.height-60;
    const score=distance(p,{x:viewport.width*.5,y:viewport.height*.57})+(outside?10000:0)+Math.abs(t-.5)*viewport.width*.2;
    if(score<best){best=score;selected=i;}
  }
  const before=Math.max(0,selected-1),after=Math.min(nodes.length-1,selected+1);
  const tangent=minus(points[after],points[before]),length=Math.hypot(tangent.x,tangent.y)||1;
  tangent.x/=length;tangent.y/=length;
  const normal={x:-tangent.y,y:tangent.x};if(normal.x<0){normal.x*=-1;normal.y*=-1;}
  const center=points[selected],desiredSpan=clamp(Math.min(viewport.width,viewport.height)*.15,45,95);
  let forwardRoom=roomAlong(center,normal,viewport),backRoom=roomAlong(center,{x:-normal.x,y:-normal.y},viewport);
  // Outer tubs can put the strand at a phone edge. Point into usable space and
  // shorten only the off-edge lead-in, never the required physical cut distance.
  if(forwardRoom<desiredSpan&&backRoom>forwardRoom){normal.x*=-1;normal.y*=-1;[forwardRoom,backRoom]=[backRoom,forwardRoom];}
  const span=Math.min(desiredSpan,forwardRoom),backSpan=Math.min(desiredSpan,backRoom);
  return {viewport,camera:world.camera,nodes,points,index:selected,center,worldPoint:nodes[selected].clone(),tangent,normal,worldNormal:worldNormal(world,normal),span,
    from:{x:center.x-normal.x*backSpan,y:center.y-normal.y*backSpan},to:{x:center.x+normal.x*span,y:center.y+normal.y*span}};
}

/** Deliberate raw movement must cross the actual ice near-perpendicularly.
 * Camera drift, an attracted hand, taps and accumulated jitter cannot cut. */
export class StretchCutGesture {
  constructor(){this.time=0;this.history=[];this.epoch=null;this.cancel=null;this.pending=null;this.completed=false;this.pressure=0;this.contactStart=null;this.last=null;}
  update(state,dt,guide){
    // Input timing is real time, independent of game tempo and capped physics dt.
    this.time=Number.isFinite(state.frameTime)?Math.max(this.time,state.frameTime):this.time+Math.max(0,dt);
    if(!guide)return {contact:false,cut:false};
    if(this.completed)return {contact:false,cut:false};
    if(this.pending && (state.cancelEpoch||0)!==this.cancel){this.pending=null;this.history=[];this.pressure=0;return {contact:false,cut:false};}
    if(this.pending){this.pending.age+=dt;if(this.pending.age>=.10){this.completed=true;return {...this.pending,cut:true,contact:true,pressure:1};}return {...this.pending,cut:false,contact:true,pressure:1};}
    const {width,height}=guide.viewport,active=Boolean(state.isPointerDown||state.isMouseHover);
    const epoch=state.pointerEpoch||0,cancel=state.cancelEpoch||0;
    const raw={x:(state.normX+1)*width*.5,y:(1-state.normY)*height*.5};
    const point={x:((state.aimNormX??state.normX)+1)*width*.5,y:(1-(state.aimNormY??state.normY))*height*.5};
    if(!active||this.epoch!==epoch||this.cancel!==cancel){this.history=[];this.contactStart=null;}
    this.epoch=epoch;this.cancel=cancel;
    if(!active){this.pressure=Math.max(0,this.pressure-dt*6);return {contact:false,cut:false,pressure:this.pressure};}
    const previous=this.history.at(-1),sample={point,raw,time:this.time};
    this.history.push(sample);this.history=this.history.filter(s=>this.time-s.time<=.42);
    let closest={distance:Infinity};
    for(let i=1;i<guide.points.length;i++){
      const n=nearestPoint(point,guide.points[i-1],guide.points[i]);
      const parameter=(i-1+n.t)/(guide.points.length-1);
      if(parameter>.1&&parameter<.9&&n.distance<closest.distance)closest={...n,index:i,parameter};
    }
    const contactRadius=clamp(Math.min(width,height)*.045,16,28),contact=closest.distance<contactRadius;
    if(contact){
      this.contactStart??={raw:{...raw},point:guide.nodes[closest.index-1].clone().lerp(guide.nodes[closest.index],closest.t)};
      this.pressure=Math.min(1,this.pressure+dt*9);
    }else {this.pressure=Math.max(0,this.pressure-dt*6);if(this.pressure===0)this.contactStart=null;}
    let result={contact,cut:false,pressure:this.pressure,parameter:closest.parameter??.5,point:closest.index?guide.nodes[closest.index-1].clone().lerp(guide.nodes[closest.index],closest.t):guide.worldPoint.clone(),direction:guide.worldNormal.clone()};
    if(this.contactStart){
      const push=new Vector3((raw.x-this.contactStart.raw.x)*.0011,-(raw.y-this.contactStart.raw.y)*.0011,-.025);
      if(guide.worldNormal.lengthSq()>0&&push.length()>.12)push.setLength(.12);
      result.push=push.multiplyScalar(this.pressure);
    }
    const minStroke=clamp(Math.min(width,height)*.08,32,60);
    // A moving strand must never intersect an old approach and cut under a
    // resting hand. Pressure is still allowed; only a fresh swing can sever it.
    if(!previous||distance(raw,previous.raw)<.5)return result;
    const minSpeed=cutSwipeSpeed(guide.viewport);
    const frameAge=this.time-previous.time;
    const recent=(this.history.find(s=>s!==sample&&this.time-s.time<=.06)||previous),recentAge=this.time-recent.time;
    const recentTravel=distance(raw,recent.raw);
    if(frameAge<=0||distance(raw,previous.raw)/frameAge<minSpeed||recentAge<=0||
       recentTravel<minStroke*.25||recentTravel/recentAge<minSpeed)return result;
    for(const start of this.history){
      const age=this.time-start.time;if(age<=0||age>MAX_CUT_STROKE_SECONDS)continue;
      const rawMove=minus(raw,start.raw),move=minus(point,start.point),travel=Math.hypot(move.x,move.y);
      const rawTravel=Math.hypot(rawMove.x,rawMove.y);
      if(rawTravel<minStroke||rawTravel/age<minSpeed||travel<minStroke*.85)continue;
      for(let i=1;i<guide.points.length;i++){
        const parameter=(i-.5)/(guide.points.length-1);if(parameter<.12||parameter>.88)continue;
        const a=guide.points[i-1],b=guide.points[i],axis=minus(b,a),axisLength=Math.hypot(axis.x,axis.y);if(axisLength<1)continue;
        // At least 65 degrees across the local strand; either stroke direction is valid.
        if(Math.abs(dot(move,axis))/(travel*axisLength)>.43)continue;
        if(Math.abs(dot(rawMove,axis))/(rawTravel*axisLength)>.43)continue;
        const hit=segmentHit(start.point,point,a,b);if(hit.distance>contactRadius*.8)continue;
        const normal={x:-axis.y/axisLength,y:axis.x/axisLength};
        const startSide=dot(minus(start.point,a),normal),endSide=dot(minus(point,a),normal);
        if(startSide*endSide>0&&Math.abs(startSide)>contactRadius*.35)continue;
        // Merely arriving at the center is not a swing. Cross and exit the ice,
        // or flick out after deliberately pressing it.
        if(Math.abs(endSide)<Math.max(contactRadius*.5,minStroke*.25))continue;
        if(Math.abs(endSide-startSide)<minStroke*.75)continue;
        const cutPoint=guide.nodes[i-1].clone().lerp(guide.nodes[i],hit.u);
        const direction=worldNormal({camera:guide.camera},{x:move.x/travel,y:move.y/travel});
        this.pending={age:0,point:cutPoint,direction,parameter:(i-1+hit.u)/(guide.points.length-1),push:direction.clone().multiplyScalar(.10)};
        return {...result,...this.pending,contact:true,pressure:1};
      }
    }
    this.last=sample;return result;
  }
}
