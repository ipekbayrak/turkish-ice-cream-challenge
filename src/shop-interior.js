import {BoxGeometry,CanvasTexture,Color,Group,InstancedMesh,MathUtils,Mesh,MeshStandardMaterial,Object3D,SRGBColorSpace} from 'three';

export const SHOP_FLOOR_Y=.008;
export const SHOP_WALK_SPACE=Object.freeze({left:-1.28,right:1.28,front:-.65,back:-1.65});

/** Stable player framing. Grounded feet fit above the bottom game panels. */
export function shopCameraProfile(width,height){
 const aspect=width/Math.max(1,height);
 if(aspect<.75){
  // Preserve the horizontal room around the pole even on very tall phones.
  const distance=-.50+2.55*Math.max(1,.46/aspect);
  return{fov:MathUtils.clamp(64+(.75-aspect)*14,64,68),position:[0,1.45,distance],target:[0,height<=650?.96:1.0,-.8]};
 }
 return{fov:height<500?70:58,position:[0,1.48,1.8],target:[0,height<500?.62:.90,-.8]};
}

function plaqueTexture(){
 if(typeof document==='undefined')return null;
 const c=document.createElement('canvas');c.width=1024;c.height=112;const x=c.getContext('2d');
 x.fillStyle='#3b1810';x.fillRect(0,0,1024,112);x.strokeStyle='#c99a4c';x.lineWidth=4;x.strokeRect(8,8,1008,96);
 x.fillStyle='#f1d38b';x.font='bold 53px Georgia';x.textAlign='center';x.textBaseline='middle';x.fillText('MEŞHUR MARAŞ DONDURMASI',512,58);
 const texture=new CanvasTexture(c);texture.colorSpace=SRGBColorSpace;return texture;
}

/** Open service table: no opaque cabinet or hanging sign in the leg sightline.
 * Four tubs, the basin transform and the front strike rail keep their anchors. */
export function buildOpenCounterBase(copper,brass,wood){
 const group=new Group();group.name='open-service-counter';
 const box=(w,h,d,x,y,z,material)=>{const m=new Mesh(new BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;};
 for(const x of[-.51,.51])for(const z of[-.135,.275]){
  box(.065,.78,.065,x,.39,z,wood).name='counter-leg';
  box(.074,.065,.074,x,.045,z,brass);
  box(.073,.09,.073,x,.72,z,copper);
 }
 for(const x of[-.51,.51])box(.035,.045,.41,x,.22,.07,brass);
 // The cone hopper keeps its authored position on a narrow return at the side.
 // Its floor supports remain outside the vendor's central stepping corridor.
 box(.40,.032,.70,-.55,.871,-.50,wood).name='cone-rack-return';
 for(const x of[-.69,-.41])box(.045,.86,.045,x,.43,-.80,wood);
 // The shallow apron covers only the underside of the refrigerated well.
 box(1.10,.105,.045,0,.835,.315,copper).name='counter-apron';
 const sign=box(1.04,.087,.008,0,.834,.342,new MeshStandardMaterial({map:plaqueTexture(),color:0xffffff,roughness:.55}));
 sign.name='counter-nameplate';
 group.userData.opening={minX:-.46,maxX:.46,minY:.08,maxY:.78};
 return group;
}

/** Quiet architectural context, leaving the center and both aisles unoccupied. */
export function buildShopInterior(){
 const group=new Group();group.name='shop-work-bay';
 const tileMaterial=new MeshStandardMaterial({color:0xffffff,roughness:.78});
 const columns=14,rows=7,tileW=.28,tileD=.25;
 const floor=new InstancedMesh(new BoxGeometry(tileW-.009,SHOP_FLOOR_Y,tileD-.009),tileMaterial,columns*rows);
 floor.name='shop-tiled-floor';floor.receiveShadow=true;
 const transform=new Object3D(),color=new Color();let i=0;
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  transform.position.set((col-(columns-1)/2)*tileW,SHOP_FLOOR_Y*.5,-.48-row*tileD);transform.updateMatrix();floor.setMatrixAt(i,transform.matrix);
  color.setHex((col+row)%2?0xe5d8bd:0xcabca0);floor.setColorAt(i++,color);
 }
 floor.instanceMatrix.needsUpdate=true;floor.instanceColor.needsUpdate=true;group.add(floor);
 const plaster=new MeshStandardMaterial({color:0xc6b18c,roughness:.94});
 const teal=new MeshStandardMaterial({color:0x42625b,roughness:.76});
 const timber=new MeshStandardMaterial({color:0x493126,roughness:.7});
 const box=(w,h,d,x,y,z,material)=>{const m=new Mesh(new BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;};
 for(const side of[-1,1]){
  box(.09,2.65,1.9,side*1.98,1.325,-1.37,plaster).name='shop-side-wall';
  box(.012,.82,1.88,side*1.928,.42,-1.37,teal);
  box(.025,.055,1.88,side*1.912,.85,-1.37,timber);
  box(.035,.075,1.88,side*1.904,.05,-1.37,timber);
 }
 box(3.82,.075,.035,0,.05,-2.205,timber);
 group.userData.walkSpace={...SHOP_WALK_SPACE};
 return group;
}
