import * as THREE from 'three';
const V=()=>new THREE.Vector3();

/** Shared by Node and browser QA: projected surface samples are visible only
 * when the actual body mesh is the first hit before any part of the real cart. */
export function sampleBodyVisibility(world,width,height){
 world.scene.updateMatrixWorld(true);world.camera.updateMatrixWorld(true);
 const body=world.vendorBody,camera=world.camera,ray=new THREE.Raycaster(),point=V(),ndc=V(),direction=V();
 const targets=[['hips',body.hips],['waist',body.waist],...body.legs.flatMap((leg,i)=>[[`calf${i}`,leg.shin],[`shoe${i}`,leg.foot.children[1]]])];
 const result={};
 for(const[name,mesh]of targets){
  const vertices=mesh.geometry.attributes.position;let visible=0,inFrame=0,minY=Infinity,maxY=-Infinity;
  for(let n=0;n<vertices.count;n+=Math.max(1,Math.floor(vertices.count/72))){
   point.fromBufferAttribute(vertices,n);mesh.localToWorld(point);ndc.copy(point).project(camera);
   const py=(1-ndc.y)*height*.5;minY=Math.min(minY,py);maxY=Math.max(maxY,py);
   if(Math.abs(ndc.x)>.98||Math.abs(ndc.y)>.98||ndc.z<0||ndc.z>1)continue;
   inFrame++;direction.copy(point).sub(camera.position);ray.set(camera.position,direction.normalize());ray.far=point.distanceTo(camera.position)+.005;
   const hit=ray.intersectObjects([world.cartGroup,world.vendorGroup],true)[0];if(hit?.object===mesh)visible++;
  }
  result[name]={visible,inFrame,minY,maxY};
 }
 return result;
}
