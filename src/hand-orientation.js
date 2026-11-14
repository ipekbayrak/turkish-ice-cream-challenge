import { Matrix4, Quaternion, Vector3 } from 'three';

export const RIGHT_HAND_SIDE=-1;
export const LEFT_HAND_SIDE=1;
const X=new Vector3(1,0,0),Y=new Vector3(0,1,0),Z=new Vector3(0,0,1);

/** Hand-local +Y goes from wrist to knuckles, -Z is the palm/curl surface.
 * Therefore a right hand has its thumb on -X when the back faces the player. */
export function handSide(handedness){return handedness==='left'?LEFT_HAND_SIDE:RIGHT_HAND_SIDE;}

export function canonicalPoleHandRotation(side,out=new Quaternion()){
  return out.setFromAxisAngle(Y,-side*Math.PI/2);
}

const _fx=new Vector3(),_fy=new Vector3(),_fz=new Vector3(),_fMat=new Matrix4();
function frameAcrossAxis(side,axis,approach,roll,out){
  const x=_fx.copy(axis).normalize().multiplyScalar(side);
  const y=_fy.copy(approach).addScaledVector(x,-approach.dot(x));
  if(y.lengthSq()<1e-6){y.copy(Y).addScaledVector(x,-Y.dot(x));}
  if(y.lengthSq()<1e-6){y.copy(Z).addScaledVector(x,-Z.dot(x));}
  y.normalize();if(roll)y.applyAxisAngle(axis,roll);
  const z=_fz.crossVectors(x,y).normalize();y.crossVectors(z,x).normalize();
  return out.setFromRotationMatrix(_fMat.makeBasis(x,y,z));
}

const _pApproach=new Vector3();
/** Full hand frame, with thumb along the shaft and wrist pointing from the
 * forearm toward the grip. Roll is pronation, never an up/down wrist fold. */
export function poleHandRotation(side,shaftDirection,contact,elbow,roll=0,out=new Quaternion()){
  const approach=elbow?_pApproach.copy(contact).sub(elbow):_pApproach.copy(Y);
  // Rear/right grip is overhand: thumb toward the handle, knuckles above
  // the rod. The front/left support keeps its existing underhand direction.
  return frameAcrossAxis(side<0?-side:side,shaftDirection,approach,roll,out);
}

const _cAxis=new Vector3(),_cPrevY=new Vector3(),_cTargetY=new Vector3(),_cCross=new Vector3(),_cCanon=new Quaternion();
/** The contact root carries this outer rotation; the HandRig retains the
 * canonical local pole frame. Prediction and rendering use this same result. */
export function poleContactRotation(side,shaftDirection,contact,elbow,roll=0,out=new Quaternion(),previousHand=null,maxTwist=Infinity){
  poleHandRotation(side,shaftDirection,contact,elbow,roll,out);
  // Near a straight forearm/shaft alignment the projected approach can reverse
  // in a single frame. Keep the shaft axis exact, but turn the palm continuously
  // about it. The immutable frame-start reference is shared by all candidates.
  if(previousHand&&Number.isFinite(maxTwist)){
    const axis=_cAxis.copy(shaftDirection).normalize(),previousY=_cPrevY.copy(Y).applyQuaternion(previousHand);
    previousY.addScaledVector(axis,-previousY.dot(axis));
    if(previousY.lengthSq()>1e-6){
      previousY.normalize();const targetY=_cTargetY.copy(Y).applyQuaternion(out);
      const angle=Math.atan2(axis.dot(_cCross.crossVectors(previousY,targetY)),previousY.dot(targetY));
      if(Math.abs(angle)>maxTwist){
        const limited=previousY.applyAxisAngle(axis,Math.sign(angle)*maxTwist);
        frameAcrossAxis(side<0?-side:side,axis,limited,0,out);
      }
    }
  }
  return out.multiply(canonicalPoleHandRotation(side,_cCanon).invert());
}

export function coneHandRotation(side,approach,axis=Y,out=new Quaternion()){
  return frameAcrossAxis(side,axis,approach,0,out);
}

const _rY=new Vector3(),_rZ=new Vector3(),_rX=new Vector3(),_rMat=new Matrix4(),_pCone=new Vector3();
/** Empty resting hands continue the forearm, with palms toward the body and
 * thumbs up when reaching forward. Authored pointing/waving use their own frame. */
export function restHandRotation(side,forearm,bodyRight=X,out=new Quaternion()){
  const y=_rY.copy(forearm).normalize(),z=_rZ.copy(bodyRight).multiplyScalar(side);
  z.addScaledVector(y,-z.dot(y));
  if(z.lengthSq()<1e-6){z.copy(Z).negate().addScaledVector(y,y.dot(Z));}
  z.normalize();const x=_rX.crossVectors(y,z).normalize();z.crossVectors(x,y).normalize();
  return out.setFromRotationMatrix(_rMat.makeBasis(x,y,z));
}

/** Palm toward the player, thumb above the cone, forearm entering from its
 * anatomical side. Chirality and screen-side entry are independent choices. */
export function playerConeRotation(side,out=new Quaternion()){
  return coneHandRotation(side,_pCone.copy(X).multiplyScalar(side),Y,out);
}

/** Customer faces the vendor: right forearm enters from screen-right, thumb
 * stays up and palm faces inward, like an offered handshake. */
const customerApproach=new Vector3(),customerRight=new Vector3(-1,0,0);
export function playerFreeHandRotation(x=0,y=1.2,time=0,out=new Quaternion()){
  customerApproach.set(-.30+x*.15,.12+(y-1.2)*.12+Math.sin(time*1.8)*.008,-.90).normalize();
  return restHandRotation(-1,customerApproach,customerRight,out);
}
