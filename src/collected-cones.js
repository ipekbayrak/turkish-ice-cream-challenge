import {Group,Vector3,Quaternion} from 'three';

export const COLLECTED_CONE_LIMIT=18;
export const CONE_DEPOSIT_HAND=new Vector3(-.28,1.18,-.28);
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const STACK_ROTATION=new Quaternion();
const STACK_SCALE=V(.82,.82,.82);

function ensureCounterConeRack(world){
 if(world.coneRack)return world.coneRack;
 let cart=world.cartGroup;
 if(!cart&&world.scene){
  cart=new Group();cart.name='ice-cream-cart';cart.position.set(0,0,-.38);
  world.scene.add(cart);world.cartGroup=cart;
 }
 const rack=new Group();rack.name='eight-row-cone-hopper';rack.position.set(-.55,.90,-.55);
 (cart||world.scene)?.add(rack);world.coneRack=rack;
 return rack;
}

/** Counter-side cone rack stack: shared wafer resources, bounded mesh pool, no
 * saves or scoring. Collected empty wafers rest in the rack well above existing stock. */
export class CollectedCones {
 constructor(world){
  this.world=world;this.root=new Group();this.root.name='counter-cone-rack-stack';
  const rack=ensureCounterConeRack(world);
  rack.add(this.root);
  // Local well (-0.075, -0.21) in coneRack; y=0.298 is top of the 7-cone nested stock.
  this.root.position.set(-.075,.298,-.21);this.root.rotation.set(0,0,0);this.root.visible=false;
  this.pool=[];this.seen=new Set();this.count=0;this.reusing=null;
 }
 collect(source,key){
  if(!source?.visible||this.seen.has(key))return false;
  this.seen.add(key);this.count++;
  const index=(this.count-1)%COLLECTED_CONE_LIMIT;
  let slot=this.pool[index];
  if(slot&&this.reusing?.slot===slot){
   this.reusing.slot.mesh.visible=false;this.root.add(this.reusing.slot.mesh);
   if(this.reusing.target)this.reusing.target.visible=true;
   this.reusing=null;
  }
  if(!slot){
   // The canonical wafer is reusable by later tricks. Its display clone shares
   // all geometry/materials; never dispose those resources on reset.
   const template=this.world.outerConeGroup||source,mesh=template.clone(false);
   for(const child of template.children){
    if(child!==this.world.servingNapkin&&child!==this.world.scoopStackGroup)mesh.add(child.clone(true));
   }
   mesh.visible=true;
   this.root.add(mesh);slot={mesh,age:0,from:V(),rotation:new Quaternion(),scale:V(),target:V()};this.pool[index]=slot;
  }else if(slot.mesh.parent!==this.root){
   this.root.add(slot.mesh);
  }
  const {mesh}=slot;this.world.scene.updateMatrixWorld(true);
  source.getWorldPosition(slot.from);this.root.worldToLocal(slot.from);
  source.getWorldQuaternion(slot.rotation);slot.rotation.premultiply(this.root.getWorldQuaternion(new Quaternion()).invert());
  source.getWorldScale(slot.scale);slot.scale.divide(this.root.getWorldScale(V()));
  slot.target.set(0,.018+index*.018,0);
  slot.age=0;mesh.position.copy(slot.from);mesh.quaternion.copy(slot.rotation);mesh.scale.copy(slot.scale);mesh.visible=true;
  this.root.visible=true;return true;
 }
 take(target){
  if(this.count<=0||this.reusing||!target)return false;
  const slot=this.pool[(this.count-1)%COLLECTED_CONE_LIMIT];if(!slot?.mesh.visible)return false;
  this.world.scene.updateMatrixWorld(true);this.count--;
  const from=slot.mesh.getWorldPosition(V()),rotation=slot.mesh.getWorldQuaternion(new Quaternion()),scale=slot.mesh.getWorldScale(V());
  slot.age=.5;
  this.world.scene.attach(slot.mesh);slot.mesh.position.copy(from);slot.mesh.quaternion.copy(rotation);slot.mesh.scale.copy(scale);
  this.reusing={slot,target,age:0,from,rotation,scale};target.visible=false;return true;
 }
 update(dt){
  const step=Math.max(0,dt);
  if(this.reusing){
   const r=this.reusing;r.age=Math.min(.30,r.age+step);this.world.scene.updateMatrixWorld(true);
   const u=r.age/.30,t=u*u*(3-2*u);
   r.slot.mesh.position.copy(r.from).lerp(r.target.getWorldPosition(V()),t);
   r.slot.mesh.position.y+=Math.sin(Math.PI*u)*.08;
   r.slot.mesh.quaternion.copy(r.rotation).slerp(r.target.getWorldQuaternion(new Quaternion()),t);
   r.slot.mesh.scale.copy(r.scale).lerp(r.target.getWorldScale(V()),t);
   r.target.visible=false;
   if(u>=1){
    r.slot.mesh.visible=false;this.root.attach(r.slot.mesh);r.target.visible=true;this.reusing=null;
    if(this.count<=0)this.root.visible=false;
   }
  }
  for(const s of this.pool){
   if(!s.mesh.visible||s.age>=.5||this.reusing?.slot===s)continue;
   s.age=Math.min(.5,s.age+step);const t=s.age/.5,u=t*t*(3-2*t);
   s.mesh.position.copy(s.from).lerp(s.target,u);s.mesh.position.y+=Math.sin(Math.PI*t)*.12;
   s.mesh.quaternion.copy(s.rotation).slerp(STACK_ROTATION,u);
   s.mesh.scale.copy(s.scale).lerp(STACK_SCALE,u);
  }
 }
 reset(){
  if(this.reusing){
   this.reusing.slot.mesh.visible=false;this.root.add(this.reusing.slot.mesh);
   this.reusing=null;
  }
  this.count=0;this.seen.clear();this.root.visible=false;
  for(const s of this.pool){
   if(s.mesh.parent!==this.root)this.root.add(s.mesh);
   s.mesh.visible=false;s.age=.5;
  }
 }
}
