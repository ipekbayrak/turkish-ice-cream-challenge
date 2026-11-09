import {DynamicDrawUsage,TubeGeometry,Vector3} from 'three';

const scratch=new WeakMap();
/** Fixed topology, UVs and sample counts; only the animated surface is uploaded. */
export function createDeformingTube(curve,segments,radius,radialSegments){
  const geometry=new TubeGeometry(curve,segments,radius,radialSegments,false);
  geometry.attributes.position.setUsage(DynamicDrawUsage);
  geometry.attributes.normal.setUsage(DynamicDrawUsage);
  return geometry;
}

/** Matches Three's TubeGeometry sampling and normal construction. Reusing its
 * GPU buffers avoids allocating/discarding three tube meshes on every frame. */
export function updateDeformingTube(geometry,curve,radius){
  const {tubularSegments:segments,radialSegments}=geometry.parameters;
  let state=scratch.get(geometry);
  if(!state){
    state={point:new Vector3(),normal:new Vector3(),sin:[],cos:[]};
    for(let j=0;j<=radialSegments;j++){const v=j/radialSegments*Math.PI*2;state.sin.push(Math.sin(v));state.cos.push(-Math.cos(v));}
    scratch.set(geometry,state);
  }
  // The same CatmullRom nodes move; its arc-length cache must be refreshed.
  curve.needsUpdate=true;
  const frames=curve.computeFrenetFrames(segments,false);
  geometry.tangents=frames.tangents;geometry.normals=frames.normals;geometry.binormals=frames.binormals;
  const position=geometry.attributes.position,normal=geometry.attributes.normal;let index=0;
  for(let i=0;i<=segments;i++){
    curve.getPointAt(i/segments,state.point);const n=frames.normals[i],b=frames.binormals[i];
    for(let j=0;j<=radialSegments;j++){
      const cos=state.cos[j],sin=state.sin[j],p=state.point,v=state.normal;
      v.set(cos*n.x+sin*b.x,cos*n.y+sin*b.y,cos*n.z+sin*b.z).normalize();
      normal.setXYZ(index,v.x,v.y,v.z);position.setXYZ(index,p.x+radius*v.x,p.y+radius*v.y,p.z+radius*v.z);index++;
    }
  }
  geometry.parameters.path=curve;geometry.parameters.radius=radius;
  position.needsUpdate=true;normal.needsUpdate=true;
  geometry.computeBoundingSphere();
  if(geometry.boundingBox)geometry.computeBoundingBox();
}
