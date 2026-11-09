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

function frameAcrossAxis(side,axis,approach,roll,out){
  const x=axis.clone().normalize().multiplyScalar(side);
  const y=approach.clone().addScaledVector(x,-approach.dot(x));
  if(y.lengthSq()<1e-6){y.copy(Y).addScaledVector(x,-Y.dot(x));}
  if(y.lengthSq()<1e-6){y.copy(Z).addScaledVector(x,-Z.dot(x));}
  y.normalize();if(roll)y.applyAxisAngle(axis,roll);
  const z=new Vector3().crossVectors(x,y).normalize();y.crossVectors(z,x).normalize();
  return out.setFromRotationMatrix(new Matrix4().makeBasis(x,y,z));
}

/** Full hand frame, with thumb along the shaft and wrist pointing from the
 * forearm toward the grip. Roll is pronation, never an up/down wrist fold. */
export function poleHandRotation(side,shaftDirection,contact,elbow,roll=0,out=new Quaternion()){
  const approach=elbow?contact.clone().sub(elbow):Y.clone();
  // Rear/right grip is overhand: thumb toward the handle, knuckles above
  // the rod. The front/left support keeps its existing underhand direction.
  return frameAcrossAxis(side<0?-side:side,shaftDirection,approach,roll,out);
}

/** The contact root carries this outer rotation; the HandRig retains the
 * canonical local pole frame. Prediction and rendering use this same result. */
export function poleContactRotation(side,shaftDirection,contact,elbow,roll=0,out=new Quaternion(),previousHand=null,maxTwist=Infinity){
  poleHandRotation(side,shaftDirection,contact,elbow,roll,out);
  // Near a straight forearm/shaft alignment the projected approach can reverse
  // in a single frame. Keep the shaft axis exact, but turn the palm continuously
  // about it. The immutable frame-start reference is shared by all candidates.
  if(previousHand&&Number.isFinite(maxTwist)){
    const axis=shaftDirection.clone().normalize(),previousY=Y.clone().applyQuaternion(previousHand);
    previousY.addScaledVector(axis,-previousY.dot(axis));
    if(previousY.lengthSq()>1e-6){
      previousY.normalize();const targetY=Y.clone().applyQuaternion(out);
      const angle=Math.atan2(axis.dot(new Vector3().crossVectors(previousY,targetY)),previousY.dot(targetY));
      if(Math.abs(angle)>maxTwist){
        const limited=previousY.applyAxisAngle(axis,Math.sign(angle)*maxTwist);
        frameAcrossAxis(side<0?-side:side,axis,limited,0,out);
      }
    }
  }
  return out.multiply(canonicalPoleHandRotation(side,new Quaternion()).invert());
}

export function coneHandRotation(side,approach,axis=Y,out=new Quaternion()){
  return frameAcrossAxis(side,axis,approach,0,out);
}

/** Empty resting hands continue the forearm, with palms toward the body and
 * thumbs up when reaching forward. Authored pointing/waving use their own frame. */
export function restHandRotation(side,forearm,bodyRight=X,out=new Quaternion()){
  const y=forearm.clone().normalize(),z=bodyRight.clone().multiplyScalar(side);
  z.addScaledVector(y,-z.dot(y));
  if(z.lengthSq()<1e-6){z.copy(Z).negate().addScaledVector(y,y.dot(Z));}
  z.normalize();const x=new Vector3().crossVectors(y,z).normalize();z.crossVectors(x,y).normalize();
  return out.setFromRotationMatrix(new Matrix4().makeBasis(x,y,z));
}

/** Palm toward the player, thumb above the cone, forearm entering from its
 * anatomical side. Chirality and screen-side entry are independent choices. */
export function playerConeRotation(side,out=new Quaternion()){
  return coneHandRotation(side,X.clone().multiplyScalar(side),Y,out);
}

/** Customer faces the vendor: right forearm enters from screen-right, thumb
 * stays up and palm faces inward, like an offered handshake. */
const customerApproach=new Vector3(),customerRight=new Vector3(-1,0,0);
export function playerFreeHandRotation(x=0,y=1.2,time=0,out=new Quaternion()){
  customerApproach.set(-.30+x*.15,.12+(y-1.2)*.12+Math.sin(time*1.8)*.008,-.90).normalize();
  return restHandRotation(-1,customerApproach,customerRight,out);
}
