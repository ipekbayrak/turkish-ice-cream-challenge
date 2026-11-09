import test from 'node:test';import assert from 'node:assert/strict';import{Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3}from'three';import{createBucketDeckGeometry}from'../src/tub-mold.js';import{ICE_CREAM_FLAVORS}from'../src/flavors.js';
test('all four bucket openings are truly open while the surrounding steel deck remains solid',()=>{
 const deck=new Mesh(createBucketDeckGeometry(),new MeshBasicMaterial({side:DoubleSide}));deck.rotation.x=-Math.PI/2;deck.position.set(0,-.031,.075);deck.updateMatrixWorld(true);
 const hits=(x,z)=>new Raycaster(new Vector3(x,.5,z),new Vector3(0,-1,0)).intersectObject(deck);
 for(const f of ICE_CREAM_FLAVORS){assert.equal(hits(f.xOffset,.01).length,0);assert.equal(hits(f.xOffset+.07,.01).length,0);}
 assert.ok(hits(0,.22).length>0);assert.ok(hits(.51,.01).length>0);
 deck.geometry.dispose();deck.material.dispose();
});
