// Node-only scene census and CPU microbenchmark. No production mutations, GPU,
// browser, texture drawing, device FPS claims, or gameplay behavior changes.
import * as THREE from 'three';
import {performance} from 'node:perf_hooks';
import {GameWorld} from '../src/world.js';
import {SpringVec3,StretchyDondurmaStrand,RigidBodyManager} from '../src/physics.js';
import {StallEffects} from '../src/stall-effects.js';
import {buildStallDecor} from '../src/stall-decor.js';
import {CulturalScene} from '../src/cultural-scene.js';
import {CULTURAL_DETAILS} from '../src/cultural-details.js';
import {VENUES} from '../src/venues.js';
import {shopCameraProfile} from '../src/shop-interior.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),textureFactory=()=>new THREE.Texture();

export function perfSceneFixture(width=390,height=844,cartOptions={}){
 const w=Object.create(GameWorld.prototype),profile=shopCameraProfile(width,height);
 w.scene=new THREE.Scene();w.scene.background=new THREE.Color();w.scene.fog=new THREE.FogExp2();
 w.camera=new THREE.PerspectiveCamera(profile.fov,width/height,.05,40);w.camera.position.fromArray(profile.position);w.camera.lookAt(V(...profile.target));w.camera.updateMatrixWorld(true);
 w.baseCamPos=w.camera.position.clone();w.baseCamTarget=V(...profile.target);w.canvas={clientWidth:width,clientHeight:height};
 for(const key of ['waffleTexture','outerWaffleTexture','floorTexture','cartSignTexture'])w[key]=textureFactory();
 for(const key of ['bells','lanterns','particles','frostMotes','spectators','tubMeshes'])w[key]=[];
 w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w.coneSpring=new SpringVec3(0,1.24,.22,72,15);w.scoopJiggleSpring=new SpringVec3(0,0,0,220,14);w.leftPropSpring=new SpringVec3(.24,1.22,-.25,88,16);w.prevConePos=V(0,1.24,.22);
 w.blinkTimer=2.5;w.isBlinking=false;w.vendorMood='smile';w.spectatorReactionTimer=0;w.spectatorReactionType='idle';
 w._setupLights();w._buildBazaarEnvironment();w._buildIceCreamCart(cartOptions);w._buildPaddleAndCones();w._buildVendor();w._buildBazaarSpectators();w._buildTouristPOVHand();w._buildDiegetic3DCues();
 w.stretchyStrand=new StretchyDondurmaStrand(w.scene,14);w.rigidBodies=new RigidBodyManager(w.scene);w.stallDecor=buildStallDecor(w.scene,{textureFactory});w.stallEffects=new StallEffects(w);w.culturalScene=new CulturalScene(w,CULTURAL_DETAILS,{textureFactory});w.setNarrativeState({});w.setVenue(VENUES[0]);w.scene.updateMatrixWorld(true);
 return w;
}

export function sceneStats(root,camera){
 let nodes=0,meshes=0,visibleMeshes=0,frustumMeshes=0,triangles=0,frustumTriangles=0,shadowMeshes=0,frustumDrawEstimate=0;
 const geometries=new Set(),materials=new Set(),textures=new Set(),frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 root.traverse(o=>{nodes++;if(!o.isMesh)return;meshes++;geometries.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material]){materials.add(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);}});
 root.traverseVisible(o=>{if(!o.isMesh)return;visibleMeshes++;if(o.castShadow)shadowMeshes++;
  const tris=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);triangles+=tris;
  if(!o.frustumCulled||frustum.intersectsObject(o)){frustumMeshes++;frustumTriangles+=tris;const mats=Array.isArray(o.material)?o.material:[o.material];frustumDrawEstimate+=mats.reduce((sum,m)=>sum+(m.transparent&&m.side===THREE.DoubleSide&&!m.forceSinglePass?2:1),0);}
 });
 return{nodes,meshes,visibleMeshes,frustumMeshes,triangles:Math.round(triangles),frustumTriangles:Math.round(frustumTriangles),frustumDrawEstimate,shadowMeshes,uniqueGeometries:geometries.size,uniqueMaterials:materials.size,uniqueTextures:textures.size};
}

function measure(fn,iterations=240){for(let i=0;i<30;i++)fn(i);const times=[];for(let i=0;i<iterations;i++){const a=performance.now();fn(i);times.push(performance.now()-a);}times.sort((a,b)=>a-b);return{medianMs:+times[Math.floor(times.length*.5)].toFixed(4),p95Ms:+times[Math.floor(times.length*.95)].toFixed(4)};}
function matrixCensus(fn){let matrixWorld=0,worldMatrix=0,compose=0;const p=THREE.Object3D.prototype,a=p.updateMatrixWorld,b=p.updateWorldMatrix,c=p.updateMatrix;
 p.updateMatrixWorld=function(...args){matrixWorld++;return a.apply(this,args);};p.updateWorldMatrix=function(...args){worldMatrix++;return b.apply(this,args);};p.updateMatrix=function(...args){compose++;return c.apply(this,args);};
 try{fn();}finally{p.updateMatrixWorld=a;p.updateWorldMatrix=b;p.updateMatrix=c;}return{matrixWorld,worldMatrix,compose};
}

if(import.meta.url===new URL(process.argv[1],'file:').href){
 const started=performance.now(),w=perfSceneFixture();const createdMs=performance.now()-started;
 console.log(JSON.stringify({createdMs:Math.round(createdMs),whole:sceneStats(w.scene,w.camera),cart:sceneStats(w.cartGroup,w.camera),vendor:sceneStats(w.vendorGroup,w.camera),shop:sceneStats(w.shopInterior,w.camera),culture:sceneStats(w.culturalScene.root,w.camera),activeCulture:w.culturalScene.getStats(),backDecor:sceneStats(w.stallDecor.root,w.camera)},null,2));
 const wholeMatrices=measure(()=>w.scene.updateMatrixWorld(true)),census=matrixCensus(()=>w.scene.updateMatrixWorld(true));
 const hidden=[...w.culturalScene.venueGroups.values()].filter(g=>!g.visible);hidden.forEach(g=>g.removeFromParent());
 const detachedMatrices=measure(()=>w.scene.updateMatrixWorld(true)),detachedCensus=matrixCensus(()=>w.scene.updateMatrixWorld(true));hidden.forEach(g=>w.culturalScene.root.add(g));
 const idleEnv=measure(i=>w.updateEnvironmentAnimations(i/60,1/60));
 const idleCensus=matrixCensus(()=>w.updateEnvironmentAnimations(0,1/60));
 const body=measure(i=>w.vendorBody.update(i/60,1/60)),loreIdle=measure(()=>w.culturalScene.update(1/60)),decor=measure(i=>w.stallDecor.update(i/60));
 console.log(JSON.stringify({wholeMatrices,census,detachedMatrices,detachedCensus,idleEnv,idleCensus,body,loreIdle,decor},null,2));
}
