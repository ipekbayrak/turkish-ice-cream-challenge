import {CylinderGeometry,Group,MathUtils,Mesh,MeshStandardMaterial,SphereGeometry,BoxGeometry,Vector3,Quaternion} from 'three';
import {SHOP_FLOOR_Y} from './shop-interior.js';

const Y=new Vector3(0,1,0),smooth=t=>{const p=MathUtils.clamp(t,0,1);return p*p*(3-2*p);};
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const UPPER=.44,LOWER=.42,ANKLE_Y=.12;

/** Grounded lower body. It reads the existing upper-body pose; never moves
 * vendorGroup, hands, tool, input targets or torso collision geometry. */
export class VendorBody {
 constructor(world){
  this.world=world;this.group=new Group();this.group.name='vendor-complete-body';world.vendorGroup.add(this.group);
  const trousers=new MeshStandardMaterial({color:0x26363b,roughness:.85});
  const shoes=new MeshStandardMaterial({color:0x2c211b,roughness:.55});
  const soles=new MeshStandardMaterial({color:0x131516,roughness:.95});
  const sash=new MeshStandardMaterial({color:0x78382e,roughness:.82});
  const add=(geometry,material,parent=this.group)=>{const m=new Mesh(geometry,material);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
  this.hips=add(new SphereGeometry(.17,18,12),trousers);this.hips.scale.set(1.18,.62,.83);
  // The sash wraps over the existing box-shaped cepken, rather than hiding
  // inside its front panels. Its shape follows those panels' cross-section.
  this.waist=add(new BoxGeometry(.45,1,.39).translate(0,0,.04),sash);
  this.buckle=add(new BoxGeometry(.035,.025,.012),new MeshStandardMaterial({color:0xbba477,metalness:.55,roughness:.5}));
  this.legs=[-1,1].map(side=>{
   const thigh=add(new CylinderGeometry(.064,.052,1,12),trousers),shin=add(new CylinderGeometry(.050,.036,1,12),trousers),knee=add(new SphereGeometry(.053,12,10),trousers);
   const foot=new Group();foot.name=side<0?'vendor-right-shoe':'vendor-left-shoe';this.group.add(foot);
   const sole=add(new BoxGeometry(.132,.025,.285),soles,foot);sole.position.set(0,SHOP_FLOOR_Y+.0125,.012);
   const upper=add(new SphereGeometry(1,16,10),shoes,foot);upper.scale.set(.067,.043,.14);upper.position.set(0,.058,.025);
   const ankleCuff=add(new CylinderGeometry(.040,.044,.06,12),trousers,foot);ankleCuff.position.set(0,.112,-.038);
   return{side,thigh,shin,knee,foot,plant:V(side*.14,0,0),from:V(),to:V(),age:1,duration:.28,stepping:false,hip:V(),kneePoint:V(),ankle:V()};
  });
  this.top=V();this.bottom=V();this.axis=V();this.bend=V();this.hipCenter=V();this.waistYaw=new Quaternion();this.stepCount=0;
  this.update(0,0);
 }
 span(mesh,a,b){this.axis.copy(a).sub(b);const length=this.axis.length();mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(Y,this.axis.normalize());mesh.scale.y=length;}
 update(time,dt){
  const w=this.world,torso=w.vendorTorso;if(!torso)return;
  w.vendorGroup.updateWorldMatrix(true,false);
  const scale=torso.scale.x||1,yaw=torso.rotation.y*.55,delta=torso.position.y-.94;
  this.hipCenter.set(torso.position.x,.96+Math.min(0,delta)*.72+Math.max(0,delta)*.04,torso.position.z*.35);
  const active=this.legs.some(leg=>leg.stepping);
  if(!active){
   const candidates=this.legs.map(leg=>({leg,goal:this.hipCenter.x+leg.side*.14,distance:Math.abs(this.hipCenter.x+leg.side*.14-leg.plant.x)})).sort((a,b)=>b.distance-a.distance);
   if(candidates[0].distance>.10){const{leg,goal}=candidates[0];leg.from.copy(leg.plant);leg.to.set(MathUtils.clamp(goal,-.7,.7),0,this.hipCenter.z);leg.age=0;leg.stepping=true;this.stepCount++;}
  }
  for(const leg of this.legs){
   if(leg.stepping){leg.age=Math.min(1,leg.age+Math.max(0,dt)/leg.duration);leg.foot.position.copy(leg.from).lerp(leg.to,smooth(leg.age));leg.foot.position.y=Math.sin(Math.PI*leg.age)*.042;
    if(leg.age===1){leg.plant.copy(leg.to);leg.stepping=false;leg.foot.position.copy(leg.plant);}}
   else leg.foot.position.copy(leg.plant);
   leg.foot.rotation.y=MathUtils.lerp(leg.foot.rotation.y,yaw*.6,1-Math.exp(-Math.max(0,dt)*10));
   leg.ankle.set(0,ANKLE_Y,-.038).applyAxisAngle(Y,leg.foot.rotation.y).add(leg.foot.position);
   const horizontal=Math.hypot(this.hipCenter.x+leg.side*.115*scale-leg.ankle.x,this.hipCenter.z-leg.ankle.z);
   const maxHip=leg.ankle.y+Math.sqrt(Math.max(.01,(UPPER+LOWER-.003)**2-horizontal*horizontal));
   this.hipCenter.y=Math.min(this.hipCenter.y,maxHip);
  }
  this.hips.position.copy(this.hipCenter).add(V(0,-.045,0));this.hips.rotation.y=yaw;this.hips.scale.x=1.18*scale;
  this.top.set(0,.10,0);torso.localToWorld(this.top);w.vendorGroup.worldToLocal(this.top);
  this.top.y=Math.min(this.top.y,this.hipCenter.y+.085);
  this.bottom.copy(this.hipCenter);this.bottom.y=Math.min(this.top.y-.012,this.hipCenter.y+.035);
  this.span(this.waist,this.top,this.bottom);this.waist.scale.x=this.waist.scale.z=scale;
  this.waist.quaternion.multiply(this.waistYaw.setFromAxisAngle(Y,torso.rotation.y));
  this.buckle.position.set(0,-.012,.245*scale).applyQuaternion(this.waist.quaternion).add(this.top);this.buckle.quaternion.copy(this.waist.quaternion);
  for(const leg of this.legs){
   leg.hip.set(leg.side*.115*scale,0,0).applyAxisAngle(Y,yaw).add(this.hipCenter);
   const direction=this.axis.copy(leg.ankle).sub(leg.hip),distance=direction.length();direction.normalize();
   const along=(UPPER*UPPER+distance*distance-LOWER*LOWER)/(2*Math.max(.001,distance));
   const bend=Math.sqrt(Math.max(0,UPPER*UPPER-along*along));
   this.bend.set(leg.side*.12,0,1).addScaledVector(direction,-this.bend.dot(direction)).normalize();
   leg.kneePoint.copy(leg.hip).addScaledVector(direction,along).addScaledVector(this.bend,bend);
   this.span(leg.thigh,leg.hip,leg.kneePoint);this.span(leg.shin,leg.kneePoint,leg.ankle);leg.knee.position.copy(leg.kneePoint);
  }
  this.group.updateWorldMatrix(true,true);
 }
}
