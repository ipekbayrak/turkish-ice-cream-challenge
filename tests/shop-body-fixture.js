import * as THREE from 'three';
import {GameWorld} from '../src/world.js';
import {SpringVec3} from '../src/physics.js';
import {shopCameraProfile} from '../src/shop-interior.js';

export function shopBodyFixture(width=390,height=844,cartOptions={}){
 const w=Object.create(GameWorld.prototype);
 w.scene=new THREE.Scene();w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();w.bells=[];w.frostMotes=[];
 w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w.leftPropSpring=new SpringVec3(.24,1.22,-.25,88,16);
 w._buildIceCreamCart(cartOptions);w._buildVendor();
 const p=shopCameraProfile(width,height);w.camera=new THREE.PerspectiveCamera(p.fov,width/height,.05,40);
 w.camera.position.fromArray(p.position);w.baseCamPos=w.camera.position.clone();w.camera.lookAt(new THREE.Vector3(...p.target));w.camera.updateMatrixWorld(true);w.scene.updateMatrixWorld(true);
 return w;
}
