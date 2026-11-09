import { Box3, MathUtils, Matrix4, Vector3 } from 'three';

/** Conservative clothing volume in vendorTorso coordinates. Limb radii are
 * included separately; the first few cm of an upper arm join the shoulder. */
export const VENDOR_TORSO_BOUNDS = Object.freeze({min:[-.235,0,-.235],max:[.235,.56,.24]});
export const VENDOR_ARM_LENGTHS = Object.freeze({upper:.37,lower:.35});
const TAU=Math.PI*2;
const V=()=>new Vector3();
const AXES=['x','y','z'];
// The authored search still visits the same40 angles in the same order.
const ELBOW_ANGLES=Array.from({length:40},(_,i)=>i/40*TAU);
const ELBOW_COS=ELBOW_ANGLES.map(Math.cos),ELBOW_SIN=ELBOW_ANGLES.map(Math.sin);
// This synchronous scalar helper never retains or exposes its scratch array.
const SEGMENT_CUTS=new Float64Array(8);
function pointBoxDistanceSquared(p,box){
 const x=Math.max(box.min.x-p.x,0,p.x-box.max.x),y=Math.max(box.min.y-p.y,0,p.y-box.max.y),z=Math.max(box.min.z-p.z,0,p.z-box.max.z);
 return x*x+y*y+z*z;
}
/** Exact minimum of the piecewise-quadratic segment-to-box distance. */
export function segmentBoxDistanceSquared(a,d,box){
 const cuts=SEGMENT_CUTS;cuts[0]=0;cuts[1]=1;let count=2;
 for(const axis of AXES)if(Math.abs(d[axis])>1e-10){
  const lo=(box.min[axis]-a[axis])/d[axis],hi=(box.max[axis]-a[axis])/d[axis];
  if(lo>0&&lo<1)cuts[count++]=lo;if(hi>0&&hi<1)cuts[count++]=hi;
 }
 for(let i=1;i<count;i++){const value=cuts[i];let j=i-1;while(j>=0&&cuts[j]>value){cuts[j+1]=cuts[j];j--;}cuts[j+1]=value;}
 let best=Infinity;
 for(let i=0;i<count-1;i++){
  const lo=cuts[i],hi=cuts[i+1],middle=(lo+hi)*.5;let aa=0,bb=0;
  for(const axis of AXES){
   const value=a[axis]+d[axis]*middle;
   if(value>=box.min[axis]&&value<=box.max[axis])continue;
   const offset=a[axis]-(value<box.min[axis]?box.min[axis]:box.max[axis]);
   aa+=d[axis]*d[axis];bb+=offset*d[axis];
  }
  const t=aa>1e-12?MathUtils.clamp(-bb/aa,lo,hi):middle;
  const px=a.x+d.x*t,py=a.y+d.y*t,pz=a.z+d.z*t;
  const x=Math.max(box.min.x-px,0,px-box.max.x),y=Math.max(box.min.y-py,0,py-box.max.y),z=Math.max(box.min.z-pz,0,pz-box.max.z);
  best=Math.min(best,x*x+y*y+z*z);if(best===0)return 0;
 }
 return best;
}
function boxDepth(a,d,box){
 let enter=0,leave=1;
 for(const axis of AXES){
  const origin=a[axis],direction=d[axis],lo=box.min[axis],hi=box.max[axis];
  if(Math.abs(direction)<1e-9){if(origin<lo||origin>hi)return 0;continue;}
  let start=(lo-origin)/direction,end=(hi-origin)/direction;
  if(start>end)[start,end]=[end,start];enter=Math.max(enter,start);leave=Math.min(leave,end);if(enter>=leave)return 0;
 }
 const t=(enter+leave)*.5,x=a.x+d.x*t,y=a.y+d.y*t,z=a.z+d.z*t;
 return Math.max(0,Math.min(x-box.min.x,box.max.x-x,y-box.min.y,box.max.y-y,z-box.min.z,box.max.z-z));
}
function cylinderDepth(a,d,radius,minY,maxY){
 let enter=0,leave=1;
 if(Math.abs(d.y)<1e-9){if(a.y<=minY||a.y>=maxY)return 0;}
 else{let lo=(minY-a.y)/d.y,hi=(maxY-a.y)/d.y;if(lo>hi)[lo,hi]=[hi,lo];enter=Math.max(enter,lo);leave=Math.min(leave,hi);}
 const aa=d.x*d.x+d.z*d.z,bb=2*(a.x*d.x+a.z*d.z),cc=a.x*a.x+a.z*a.z-radius*radius;
 if(aa<1e-12){if(cc>=0)return 0;}
 else{const discriminant=bb*bb-4*aa*cc;if(discriminant<=0)return 0;const root=Math.sqrt(discriminant);enter=Math.max(enter,(-bb-root)/(2*aa));leave=Math.min(leave,(-bb+root)/(2*aa));}
 if(enter>=leave)return 0;
 const t=(enter+leave)*.5,y=a.y+d.y*t;
 return Math.max(0,Math.min(radius-Math.hypot(a.x+d.x*t,a.z+d.z*t),y-minY,maxY-y));
}

export class VendorArmSolver {
  constructor(torso,{presentation=false,counter=false}={}){
    this.torso=torso;this.inverse=new Matrix4();this.box=new Box3();
    this.presentation=presentation;
    this.counterBox=presentation&&counter?new Box3(new Vector3(-.64,.79,-.56),new Vector3(.64,1.045,.065)):null;
    this.counterMargin=this.counterBox?.clone().expandByScalar(.025);
    this.counterStart=V();this.counterDelta=V();
    this.vestBox=new Box3();this.trimBox=new Box3();
    this.a=V();this.b=V();this.delta=V();this.local=V();this.axis=V();this.u=V();this.v=V();this.center=V();this.candidate=V();
    this.originLocal=V();this.wristLocal=V();this.candidateLocal=V();this.segmentStart=V();this.segmentEnd=V();
    this.scale=V();this.clearance=.044;
  }
  prepare(){
    if(!this.torso){this.inverse.identity();this.box.makeEmpty();return this;}
    this.torso.updateWorldMatrix(true,false);this.inverse.copy(this.torso.matrixWorld).invert();
    this.torso.getWorldScale(this.scale);
    // The widest displayed upper sleeve is54mm; include a1mm contact margin.
    // The54mm upper sleeve is the widest rendered arm section, plus1mm clearance.
    this.clearance=.055/Math.max(.8,Math.min(this.scale.x,this.scale.y,this.scale.z));
    this.box.min.fromArray(VENDOR_TORSO_BOUNDS.min).addScalar(-this.clearance);
    this.box.max.fromArray(VENDOR_TORSO_BOUNDS.max).addScalar(this.clearance);
    const r=this.clearance;
    this.chestRadius=.23+r;this.chestMinY=-r;this.chestMaxY=.56+r;
    this.vestBox.min.set(-.21,.03,-.12);this.vestBox.max.set(.21,.55,.22);
    this.trimBox.min.set(-.056,.027,-.123);this.trimBox.max.set(.056,.553,.231);
    return this;
  }
  /** Exact segment/slab intersection against expanded clothing. No per-vertex
   * sampling in the animation loop, including a fast shoulder-join exclusion. */
  penetration(start,end,shoulderJoin=false){
    if(!this.torso)return 0;
    this.segmentStart.copy(start).applyMatrix4(this.inverse);this.segmentEnd.copy(end).applyMatrix4(this.inverse);
    const skip=shoulderJoin?Math.min(.4,.065/Math.max(.01,start.distanceTo(end))):0;
    return this._localPenetration(this.segmentStart,this.segmentEnd,skip);
  }
  _localPenetration(start,end,skip=0){
    if(!this.torso)return 0;
    this.a.copy(start).lerp(end,skip);this.delta.subVectors(end,this.a);
    if(boxDepth(this.a,this.delta,this.box)===0)return 0;
    // The broad box includes empty shoulder/front corners. Refine against the
    // actual chest cylinder, vest panels and trim before rejecting an elbow.
    const chest=cylinderDepth(this.a,this.delta,this.chestRadius,this.chestMinY,this.chestMaxY);
    // Each box term is at most clearance. A deeper chest/vest intersection
    // therefore determines the exact maximum without evaluating the other box.
    if(chest>=this.clearance)return chest;
    const depth=Math.max(chest,this.clearance-Math.sqrt(segmentBoxDistanceSquared(this.a,this.delta,this.vestBox)),0);
    if(depth===this.clearance)return depth;
    return Math.max(depth,this.clearance-Math.sqrt(segmentBoxDistanceSquared(this.a,this.delta,this.trimBox)),0);
  }
  pointBlocked(point){
    if(this.counterBox?.containsPoint(point))return true;
    if(!this.torso)return false;
    this.local.copy(point).applyMatrix4(this.inverse);const p=this.local;
    const radial=Math.max(0,Math.hypot(p.x,p.z)-.23),vertical=Math.max(-p.y,0,p.y-.56),r2=this.clearance*this.clearance;
    return radial*radial+vertical*vertical<r2||pointBoxDistanceSquared(p,this.vestBox)<r2||pointBoxDistanceSquared(p,this.trimBox)<r2;
  }
  routeHandWaypoint(start,target,side=1){
    if(!this.torso||this.penetration(start,target)<1e-6)return target;
    const from=start.clone().applyMatrix4(this.inverse),to=target.clone().applyMatrix4(this.inverse),gate=to.clone();
    const front=this.box.max.z+.045;
    // Rise in front of the collar or go around the outside shoulder before
    // moving to a pole grip. A straight free-wrist chord can cut through a vest.
    gate.z=Math.max(front,from.z);
    if(to.z<this.box.min.z&&to.y<this.box.max.y&&to.y>this.box.min.y&&Math.abs(to.x)<this.box.max.x){
      gate.x=side*(this.box.max.x+.075);
      if(side*from.x>this.box.max.x+.04)gate.z=to.z;
    }
    return this.torso.localToWorld(gate);
  }
  solve(shoulder,target,{side=-1,mode='front',previous=null,clampReach=true,shoulderTravel=true,fast=false,gripAxis=null}={}){
    const origin=shoulder.clone(),wrist=target.clone();
    const upper=VENDOR_ARM_LENGTHS.upper,lower=VENDOR_ARM_LENGTHS.lower,max=upper+lower-.004;
    this.axis.subVectors(wrist,origin);let distance=this.axis.length();
    if(distance<.001)this.axis.set(0,-1,0);else this.axis.divideScalar(distance);
    // Small shoulder-girdle travel, bounded by the sleeve cap, not rubber arms.
    const shift=Math.min(.04,Math.max(0,distance-max));
    origin.addScaledVector(this.axis,shift);distance-=shift;
    if(clampReach&&distance>max){wrist.copy(origin).addScaledVector(this.axis,max);distance=max;}
    const d=Math.max(.03,distance),along=MathUtils.clamp((upper*upper+d*d-lower*lower)/(2*d),0,upper);
    const radius=Math.sqrt(Math.max(0,upper*upper-along*along));
    this.center.copy(origin).addScaledVector(this.axis,along);
    // A side/down elbow pole avoids the old backward elbow through the ribs.
    this.u.set(side,-.65,mode==='back'?-.20:.40);
    if(this.torso)this.u.transformDirection(this.torso.matrixWorld);
    this.u.addScaledVector(this.axis,-this.u.dot(this.axis));
    if(this.u.lengthSq()<1e-6){this.u.set(0,1,0).addScaledVector(this.axis,-this.axis.y);}
    this.u.normalize();this.v.crossVectors(this.axis,this.u).normalize();
    let bestScore=Infinity,bestPen=Infinity,bestAngle=0;const elbow=V(),sideAxis=new Vector3(side,0,0),frontAxis=new Vector3(0,0,mode==='back'?-1:1);
    if(this.torso)sideAxis.transformDirection(this.torso.matrixWorld);
    if(this.torso)frontAxis.transformDirection(this.torso.matrixWorld);
    // Shoulder and wrist are constant during this40-candidate search; each
    // elbow is shared by its upper/lower segment. Transform each point once.
    this.originLocal.copy(origin).applyMatrix4(this.inverse);this.wristLocal.copy(wrist).applyMatrix4(this.inverse);
    const continuous=this.presentation&&!fast&&previous;
    const previousOffset=continuous?previous.clone().sub(this.center):null;
    const previousAngle=continuous?Math.atan2(previousOffset.dot(this.v),previousOffset.dot(this.u)):0;
    for(let i=continuous?-1:0;i<40;i++){
      const angle=i<0?previousAngle:ELBOW_ANGLES[i],cos=i<0?Math.cos(angle):ELBOW_COS[i];
      this.candidate.copy(this.center).addScaledVector(this.u,cos*radius).addScaledVector(this.v,(i<0?Math.sin(angle):ELBOW_SIN[i])*radius);
      this.candidateLocal.copy(this.candidate).applyMatrix4(this.inverse);
      const skip=Math.min(.4,.065/Math.max(.01,origin.distanceTo(this.candidate)));
      let pen=this._localPenetration(this.originLocal,this.candidateLocal,skip)+this._localPenetration(this.candidateLocal,this.wristLocal);
      let counterApproach=0;
      if(this.counterBox){
        this.counterStart.copy(origin).lerp(this.candidate,skip);this.counterDelta.subVectors(this.candidate,this.counterStart);
        pen+=boxDepth(this.counterStart,this.counterDelta,this.counterBox);
        this.counterDelta.subVectors(wrist,this.candidate);pen+=boxDepth(this.candidate,this.counterDelta,this.counterBox);
        // Anticipate the table before the hard collision threshold switches
        // the elbow to a distant solution. The grasping wrist keeps its contact.
        if(!fast){this.counterDelta.multiplyScalar(.82);counterApproach=boxDepth(this.candidate,this.counterDelta,this.counterMargin);}
      }
      const continuity=previous?this.candidate.distanceToSquared(previous):0;
      const preference=(1-cos)*.012;
      const axial=gripAxis?Math.abs(this.local.copy(wrist).sub(this.candidate).normalize().dot(gripAxis)):0;
      const wristPreference=gripAxis?Math.max(0,axial-.30)**2*.8:0;
      // The mirrored neutral-wrist solutions include an elbow raised beside
      // the head. Prefer an elbow below a low grip/shoulder and on its own side;
      // an actual overhead reach still lifts freely. Clothing clearance wins.
      const elevation=Math.max(0,this.candidate.y-Math.max(origin.y,wrist.y)+.015);
      const crossing=Math.max(0,-this.local.copy(this.candidate).sub(origin).dot(sideAxis)-.04);
      const elbowPreference=elevation*elevation*3+crossing*crossing*.3;
      const outside=this.presentation?Math.max(0,.07-this.local.copy(this.candidate).sub(origin).dot(sideAxis)):0;
      const low=this.presentation?Math.max(0,(mode==='back'?.96:1.08)-this.candidate.y):0;
      const raised=this.presentation?Math.max(0,this.candidate.y-Math.max(origin.y,wrist.y)-.035):0;
      const drop=this.presentation?this.candidate.y-(Math.min(origin.y,wrist.y)-.15):0;
      const wide=this.presentation?Math.max(0,this.local.copy(this.candidate).sub(origin).dot(sideAxis)-.22):0;
      const behind=this.presentation?Math.max(0,.12-this.local.copy(this.candidate).sub(origin).dot(frontAxis)):0;
      const score=(pen>1e-8?1000+pen*10000:0)+counterApproach*counterApproach*80+continuity*(this.presentation?1.8:.7)+preference+wristPreference+elbowPreference+outside*outside*1.8+low*low*12+raised*raised*40+drop*drop*2+wide*wide*3+behind*behind*.8;
      if(score<bestScore){bestScore=score;bestPen=pen;bestAngle=angle;elbow.copy(this.candidate);}
      if(fast&&pen<1e-8)break;
    }
    let result={shoulder:origin,elbow,wrist,penetration:bestPen,reachable:distance<=max+1e-6,angle:bestAngle,upperLength:origin.distanceTo(elbow),lowerLength:elbow.distanceTo(wrist)};
    if(bestPen>.00001&&shoulderTravel&&this.torso){
      const facing=mode==='back'?-1:1;
      // Cross-body reach needs protraction, not more lateral shoulder width.
      // Bounded protraction or lateral travel uses the same connected7.5cm
      // shoulder sleeve, without stretching either arm bone.
      for(const [direction,limit]of[
        [new Vector3(0,0,facing),.075],
        [new Vector3(-side*.045,-.015,facing*.06),.075],
        [new Vector3(-side*.045,.015,facing*.06),.075],
        [new Vector3(0,.025,facing*.065),.075],
        [new Vector3(side*.05,.025,facing*.06),.075],
      ]){
        direction.transformDirection(this.torso.matrixWorld).multiplyScalar(limit);
        for(const amount of[.35,.65,1]){
          const moved=shoulder.clone().addScaledVector(direction,amount);
          const alternate=this.solve(moved,target,{side,mode,previous,clampReach,shoulderTravel:false,fast,gripAxis});
          if(alternate.penetration<result.penetration)result=alternate;
          if(result.penetration<1e-6)break;
        }
        if(result.penetration<1e-6)break;
      }
    }
    return result;
  }
  /** Continue the last safe displayed bend without relaxing bone or obstacle constraints. */
  solveContinuous(shoulder,target,options,previous,dt=1/60){
    const result=this.solve(shoulder,target,options);
    if(!previous||!this.presentation)return result;
    const cost=pose=>pose.elbow.distanceToSquared(previous.elbow)+pose.shoulder.distanceToSquared(previous.shoulder)*.5;
    if(result.elbow.distanceToSquared(previous.elbow)<.0004&&result.shoulder.distanceToSquared(previous.shoulder)<.0001)return result;
    // The shoulder search used to alternate between the rest shoulder and a
    // protracted shoulder at the clothing boundary. Retain the last safe girdle
    // offset, easing it home only when the same bones still clear the clothing.
    const offset=previous.shoulder.clone().sub(previous.base).clampLength(0,.11);
    let best=result,bestCost=cost(result);
    const shoulderChanged=result.shoulder.distanceToSquared(shoulder.clone().add(offset))>.0004;
    const weights=offset.lengthSq()>1e-8&&shoulderChanged?[Math.exp(-Math.max(0,dt)*8)]:[];
    for(const weight of weights){
      const candidate=this.solve(shoulder.clone().addScaledVector(offset,weight),target,{...options,shoulderTravel:false});
      if(candidate.penetration>1e-6||!candidate.reachable||candidate.lowerLength>.351||candidate.wrist.distanceToSquared(result.wrist)>.000004)continue;
      const score=cost(candidate);
      if(best.penetration>1e-6||score<bestCost){best=candidate;bestCost=score;}
    }
    if(best.penetration>1e-6)return best;
    const axis=best.wrist.clone().sub(best.shoulder).normalize(),center=best.shoulder.clone().addScaledVector(axis,best.elbow.clone().sub(best.shoulder).dot(axis));
    const goal=best.elbow.clone().sub(center),old=previous.elbow.clone().sub(center);old.addScaledVector(axis,-old.dot(axis));
    if(old.lengthSq()<1e-8||goal.lengthSq()<1e-8)return best;
    old.setLength(goal.length());
    const angle=Math.atan2(axis.dot(old.clone().cross(goal)),old.dot(goal)),limit=Math.max(0,dt)*4;
    if(Math.abs(angle)<=limit)return best;
    const elbow=old.applyAxisAngle(axis,Math.sign(angle)*limit).add(center);
    let pen=this.penetration(best.shoulder,elbow,true)+this.penetration(elbow,best.wrist);
    if(this.counterBox){
      this.counterStart.copy(best.shoulder).lerp(elbow,Math.min(.4,.065/best.upperLength));this.counterDelta.subVectors(elbow,this.counterStart);pen+=boxDepth(this.counterStart,this.counterDelta,this.counterBox);
      this.counterDelta.subVectors(best.wrist,elbow);pen+=boxDepth(elbow,this.counterDelta,this.counterBox);
    }
    // Only use an interpolated bend when both rigid bones remain clear.
    return pen<1e-6?{...best,elbow,penetration:pen}:best;
  }

  /** Search actual shaft contacts, favouring continuity over a nominal grip. */
  shaftGrip(tip,backward,shoulder,min,max,preferred,{side=-1,mode='front',wristOffset=new Vector3()}={}){
    const low=Math.max(.10,Math.min(min,max)),high=Math.max(low,max);
    const distances=[0,.012,-.012,.025,-.025,.05,-.05].map(delta=>MathUtils.clamp(preferred+delta,low,high));
    for(let i=0;i<24;i++)distances.push(MathUtils.lerp(low,high,i/23));
    const evaluate=(distance,full)=>{
      const offset=typeof wristOffset==='function'?wristOffset(distance):wristOffset;
      const target=tip.clone().addScaledVector(backward,distance).add(offset),reach=shoulder.distanceTo(target);
      const blocked=this.pointBlocked(target)||this.counterMargin?.containsPoint(target)?1:0;
      // No elbow search can rescue a wrist inside clothing, nor a contact
      // beyond the bones plus the explicitly bounded shoulder travel.
      if(blocked||reach>(full ? .835 : .76))return{distance,reachable:false,safe:false,score:200+blocked*100+reach*30,wrist:target};
      const pose=this.solve(shoulder,target,{side,mode,clampReach:false,shoulderTravel:full,fast:true});
      const safe=!blocked&&pose.penetration<1e-6&&pose.reachable;
      const score=(safe?0:100+blocked*100+pose.penetration*1000+(pose.reachable?0:100)+Math.max(0,reach-.68)*30)+Math.abs(distance-preferred)*.12;
      return{distance,reachable:pose.reachable,safe,score,wrist:target};
    };
    let best=evaluate(distances[0],true);
    if(best.safe)return best;
    const unresolved=[],seen=new Set([distances[0]]);
    for(const distance of distances.slice(1)){
      if(seen.has(distance))continue;seen.add(distance);
      const candidate=evaluate(distance,false);
      if(candidate.score<best.score)best=candidate;
      if(!candidate.safe)unresolved.push(candidate);
    }
    if(best.safe)return best;
    // Full protraction is bounded to the three most promising alternatives,
    // instead of recursively testing every shoulder pose at every shaft point.
    unresolved.sort((a,b)=>a.score-b.score);
    for(const candidate of unresolved.slice(0,3)){
      const full=evaluate(candidate.distance,true);
      if(full.score<best.score)best=full;
    }
    return best;
  }
}
