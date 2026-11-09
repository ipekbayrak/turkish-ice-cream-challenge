import {Matrix4,Mesh,NormalBlending} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Bake only explicitly static, opaque mesh pieces into their existing root.
 * Callers must exclude every animated or explorable subtree. Those roots stay
 * in place. Material objects, UVs, normals,
 * shadow flags and layers are retained; transparent geometry is never batched.
 * Call at construction, before rendering. No source geometries are disposed:
 * they may also be used by an instanced or separately owned object.
 */
export function batchStaticMeshes(root,{exclude=[],preserveNames=[]}={}){
 const excluded=new Set(exclude),names=new Set(preserveNames),batches=new Map();
 root.updateWorldMatrix(true,true);const inverse=new Matrix4().copy(root.matrixWorld).invert();
 const visit=node=>{
  if(excluded.has(node)||!node.visible)return;
  if(node.isMesh&&!node.isInstancedMesh&&!node.isSkinnedMesh&&node.children.length===0&&!names.has(node.name)&&!Object.keys(node.userData).length){
   const g=node.geometry,m=node.material;
   if(!Array.isArray(m)&&!m.transparent&&m.depthWrite&&m.blending===NormalBlending&&!node.customDepthMaterial&&!node.customDistanceMaterial&&!Object.keys(g.morphAttributes).length&&!Object.values(g.attributes).some(a=>a.isInterleavedBufferAttribute)&&g.drawRange.start===0&&g.drawRange.count===Infinity){
    const layout=Object.entries(g.attributes).map(([name,a])=>`${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).sort().join('|');
    const key=[m.uuid,node.castShadow,node.receiveShadow,node.renderOrder,node.layers.mask,node.frustumCulled,layout].join(';');
    const list=batches.get(key)||[];list.push(node);batches.set(key,list);
   }
  }
  for(const child of node.children)visit(child);
 };
 for(const child of root.children)visit(child);
 let before=0,after=0;
 for(const meshes of batches.values()){
  if(meshes.length<2)continue;
  // Negative scale needs a winding/tangent policy; leave those rare pieces alone.
  const items=meshes.map(mesh=>({mesh,matrix:new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld)})).filter(({matrix})=>matrix.determinant()>0);
  if(items.length<2)continue;
  const indexed=items.every(({mesh})=>mesh.geometry.index!==null);
  const geometries=items.map(({mesh,matrix})=>{let g=mesh.geometry.clone();if(!indexed&&g.index){const flat=g.toNonIndexed();g.dispose();g=flat;}g.applyMatrix4(matrix);return g;});
  const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!geometry)continue;
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const source=items[0].mesh,batch=new Mesh(geometry,source.material);batch.name=`static-batch-${root.name||'geometry'}-${after}`;
  batch.castShadow=source.castShadow;batch.receiveShadow=source.receiveShadow;batch.renderOrder=source.renderOrder;batch.layers.mask=source.layers.mask;batch.frustumCulled=source.frustumCulled;
  for(const{mesh}of items)mesh.removeFromParent();root.add(batch);before+=items.length;after++;
 }
 return{before,after,saved:before-after};
}

/** Only the cart's fixed architecture and each bell's rigid subassembly.
 * All logical/physical anchors, food motion and individual bell pivots survive.
 * The authored basin tilt is static; future movable basins need their own batch
 * root instead of baking their fixed pieces into cart-local coordinates. */
export function batchIceCreamCart(world){
 const results=[batchStaticMeshes(world.cartGroup,{
  exclude:[world.coneRack,...world.tubMeshes,...world.tubIceGroups.map(t=>t.group),...world.bells.map(b=>b.pivot)],
  preserveNames:['counter-steel-deck','counter-rear-rail'],
 })];
 for(const bell of world.bells){
  results.push(batchStaticMeshes(bell.pivot,{exclude:[bell.clapperPivot,bell.shimmerRing]}));
  if(bell.clapperPivot)results.push(batchStaticMeshes(bell.clapperPivot));
 }
 return results.reduce((sum,r)=>({before:sum.before+r.before,after:sum.after+r.after,saved:sum.saved+r.saved}),{before:0,after:0,saved:0});
}
