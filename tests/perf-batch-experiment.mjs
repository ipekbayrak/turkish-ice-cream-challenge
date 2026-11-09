import {perfSceneFixture,sceneStats} from './perf-scene-stats.mjs';
import {batchIceCreamCart,batchStaticMeshes} from '../src/static-batch.js';
const w=perfSceneFixture(390,844,{batchGeometry:false});
const before=sceneStats(w.scene,w.camera),cartBefore=sceneStats(w.cartGroup,w.camera);
const cartBatch=batchIceCreamCart(w);w.scene.updateMatrixWorld(true);
const after=sceneStats(w.scene,w.camera),cartAfter=sceneStats(w.cartGroup,w.camera);
console.log(JSON.stringify({before,cartBefore,cartBatch,after,cartAfter},null,2));
// Read-only prototype: back display has dynamic material changes, but its rigid
// geometry can share a material batch. Keep each narrative prop root intact.
const decorBefore=sceneStats(w.stallDecor.root,w.camera);
const decorBatch=batchStaticMeshes(w.stallDecor.root,{exclude:Object.values(w.stallDecor.props).map(p=>p.group).concat(Object.values(w.stallDecor.themeProps))});
w.scene.updateMatrixWorld(true);console.log(JSON.stringify({decorBefore,decorBatch,decorAfter:sceneStats(w.stallDecor.root,w.camera)},null,2));
console.log(JSON.stringify({furnitureAlreadyBatchedAtConstruction:sceneStats(w.culturalScene.furniture,w.camera)},null,2));
