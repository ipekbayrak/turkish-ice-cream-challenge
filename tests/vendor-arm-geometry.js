import {MathUtils,Matrix4,Vector3} from 'three';

/** Test/preview inspector for actual rendered sleeve, cuff and forearm side
 * surfaces, including intermediate rings absent from CylinderGeometry. */
export function insideVendorClothing(p){
 if(p.y<.002||p.y>.558)return false;
 const radius=.2+.03*p.y/.56;
 if(Math.hypot(p.x,p.z)<radius-.002)return true;
 if(p.y>.032&&p.y<.548&&Math.abs(p.x)<.208&&p.z>-.118&&p.z<.218)return true;
 return Math.abs(Math.abs(p.x)-.04)<.014&&p.y>.029&&p.y<.551&&p.z>-.121&&p.z<.229;
}
export function inspectVendorArmSurfaces(world,rig){
 world.scene.updateMatrixWorld(true);let hits=0,first=null;
 const inverse=new Matrix4().copy(world.vendorTorso.matrixWorld).invert(),matrix=new Matrix4(),point=new Vector3();
 for(const[upper,group]of[[true,rig.upperGroup],[false,rig.lowerGroup]]){
  for(const mesh of group.children.filter(o=>o.geometry?.type==='CylinderGeometry')){
   const{height,radiusTop,radiusBottom}=mesh.geometry.parameters;
   matrix.multiplyMatrices(inverse,mesh.matrixWorld);
   for(let slice=0;slice<=18;slice++){
    const t=slice/18;if(upper&&t*group.scale.z<.065)continue;
    const radius=MathUtils.lerp(radiusBottom,radiusTop,t);
    for(let ring=0;ring<18;ring++){
     const angle=ring/18*Math.PI*2;
     point.set(Math.cos(angle)*radius,(t-.5)*height,Math.sin(angle)*radius).applyMatrix4(matrix);
     if(insideVendorClothing(point)){hits++;first||={upper,point:point.toArray()};}
    }
   }
  }
 }
 return{hits,first};
}

/** HandRig-only skin geometry; held food and scene props are excluded. */
export function inspectVendorHandSurfaces(world,rig){
 world.scene.updateMatrixWorld(true);let hits=0,vertices=0,first=null;
 const inverse=new Matrix4().copy(world.vendorTorso.matrixWorld).invert(),matrix=new Matrix4(),point=new Vector3();
 rig.handRig?.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry?.attributes?.position)return;
  for(let p=mesh;p&&p!==rig.handGroup;p=p.parent)if(!p.visible)return;
  const positions=mesh.geometry.attributes.position;
  matrix.multiplyMatrices(inverse,mesh.matrixWorld);
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).applyMatrix4(matrix);vertices++;
   if(insideVendorClothing(point)){hits++;first||={part:mesh.name||mesh.geometry.type,point:point.toArray()};}
  }
 });
 return{hits,vertices,first};
}
