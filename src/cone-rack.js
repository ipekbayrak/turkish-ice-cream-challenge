import * as THREE from 'three';
import {batchStaticMeshes} from './static-batch.js';

/** Eight separate wells, each holding seven visibly nested, hollow wafers. */
export function buildConeRack(waffleTexture) {
  const root = new THREE.Group();root.name='eight-row-cone-hopper';
  const steel=new THREE.MeshStandardMaterial({color:0xaeb9b8,metalness:.82,roughness:.31});
  const trim=new THREE.MeshStandardMaterial({color:0xd3a159,metalness:.72,roughness:.34});
  const wood=new THREE.MeshStandardMaterial({color:0x542b19,roughness:.72});
  const dark=new THREE.MeshStandardMaterial({color:0x201a12,roughness:.95});
  const outer=new THREE.MeshStandardMaterial({map:waffleTexture,bumpMap:waffleTexture,bumpScale:.0012,color:0xc49358,roughness:.74});
  const inner=new THREE.MeshStandardMaterial({map:waffleTexture,bumpMap:waffleTexture,bumpScale:.0008,color:0x8c6038,roughness:.91,side:THREE.BackSide});
  const lip=new THREE.MeshStandardMaterial({color:0xd6a66a,roughness:.72});
  const mesh=(geometry,material,x,y,z)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);root.add(m);m.receiveShadow=true;return m;};
  // Recessed floor and raised side panels; no opaque lid through the cones.
  mesh(new THREE.BoxGeometry(.31,.022,.55),dark,0,0,0);
  for(const x of [-.163,.163])mesh(new THREE.BoxGeometry(.022,.105,.58),wood,x,.041,0);
  for(const z of [-.282,.282])mesh(new THREE.BoxGeometry(.35,.105,.022),wood,0,.041,z);
  for(const x of [-.151,.151])mesh(new THREE.BoxGeometry(.008,.079,.55),steel,x,.041,0);
  for(const z of [-.271,.271])mesh(new THREE.BoxGeometry(.30,.079,.008),steel,0,.041,z);
  for(const x of [-.168,.168])mesh(new THREE.BoxGeometry(.014,.012,.59),trim,x,.1,0);
  for(const z of [-.288,.288])mesh(new THREE.BoxGeometry(.35,.012,.014),trim,0,.1,z);
  // Thin dividing rails make the eight wells clear from the playing camera.
  mesh(new THREE.BoxGeometry(.009,.085,.55),steel,0,.04,0);
  for(const z of [-.14,0,.14])mesh(new THREE.BoxGeometry(.30,.075,.009),steel,0,.036,z);
  const count=56,outerGeometry=new THREE.ConeGeometry(.052,.18,24,1,true);
  const innerGeometry=new THREE.ConeGeometry(.048,.174,24,1,true);
  const rimGeometry=new THREE.TorusGeometry(.051,.0024,6,24);
  const cones=new THREE.InstancedMesh(outerGeometry,outer,count),linings=new THREE.InstancedMesh(innerGeometry,inner,count),rims=new THREE.InstancedMesh(rimGeometry,lip,count);
  cones.name='nested-wafer-shells';linings.name='hollow-wafer-linings';rims.name='individual-wafer-rims';
  const transform=new THREE.Object3D(),wellCenters=[];let index=0;
  for(let row=0;row<4;row++)for(let column=0;column<2;column++){
    const x=(column-.5)*.15,z=(row-1.5)*.14;
    wellCenters.push(new THREE.Vector3(x,.19+6*.018,z));
    for(let layer=0;layer<7;layer++){
      transform.position.set(x,.10+layer*.018,z);transform.rotation.set(Math.PI,0,(column-.5)*.025);transform.updateMatrix();
      cones.setMatrixAt(index,transform.matrix);linings.setMatrixAt(index,transform.matrix);
      transform.position.y=.19+layer*.018;transform.rotation.set(Math.PI/2,0,0);transform.updateMatrix();rims.setMatrixAt(index,transform.matrix);index++;
    }
  }
  for(const instance of [cones,linings,rims]){instance.instanceMatrix.needsUpdate=true;instance.castShadow=true;instance.receiveShadow=true;root.add(instance);}
  // Side-mounted supports rather than a hovering container.
  for(const z of [-.20,.20]){mesh(new THREE.BoxGeometry(.065,.22,.035),steel,.11,-.10,z);mesh(new THREE.BoxGeometry(.12,.025,.035),steel,.07,-.20,z);}
  root.userData={wellCount:8,conesPerWell:7,totalCones:count,wellCenters};
  batchStaticMeshes(root);
  return root;
}
