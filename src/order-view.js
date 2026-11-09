import {Vector3} from 'three';
import { ICE_CREAM_FLAVORS } from './protocol.js';

export const ORDER_COPY = {
 tr:{ask:'Hangisinden olsun?',confirm:n=>`Tamam, ${n} top.`,empty:'Bir sade hazırlayayım.'},
 en:{ask:'Which flavors?',confirm:n=>`All right, ${n} ${n===1?'scoop':'scoops'}.`,empty:'One scoop, then.'},
 ar:{ask:'أي نكهة تريد؟',confirm:n=>`حسنًا، ${n} كرات.`,empty:'كرة واحدة إذًا.'},
 de:{ask:'Welche Sorten?',confirm:n=>`Gut, ${n} ${n===1?'Kugel':'Kugeln'}.`,empty:'Dann eine Kugel.'},
 ru:{ask:'Какие вкусы?',confirm:n=>`Хорошо, ${n} шариков.`,empty:'Тогда один шарик.'},
 ja:{ask:'どの味にする？',confirm:n=>`${n}個ですね。`,empty:'では、1個。'},
};
const shortTr=['sade','fıstıklı','kakaolu','Urmu dutlu'];
const labelTr=['Sade','Fıstıklı','Kakaolu','Dutlu'];
const shortEn=['Plain','Pistachio','Cocoa','Mulberry'];
const ORDER_HINT={
 tr:{choose:'Bir top seç',hold:'Kovada bekle · bir top',finish:'Sabit tut · tamam',confirm:'Tamam',count:n=>`${n} top`},
 en:{choose:'Choose a scoop',hold:'Hold over a tub · one scoop',finish:'Hold still · done',confirm:'All set',count:n=>`${n} ${n===1?'scoop':'scoops'}`},
 ar:{choose:'اختر كرة',hold:'انتظر فوق النكهة',finish:'ثبّت يدك · تم',confirm:'تم',count:n=>`${n} كرات`},
 de:{choose:'Eine Kugel wählen',hold:'Über der Sorte halten',finish:'Still halten · fertig',confirm:'Fertig',count:n=>`${n} ${n===1?'Kugel':'Kugeln'}`},
 ru:{choose:'Выбери шарик',hold:'Задержи руку над вкусом',finish:'Замри · готово',confirm:'Готово',count:n=>`${n} шариков`},
 ja:{choose:'味を選ぶ',hold:'容器の上で待つと1個',finish:'手を止めて決定',confirm:'決まり',count:n=>`${n}個`},
};

function pill(ctx,x,y,width,height,radius=12){
 ctx.beginPath();ctx.roundRect(x,y,width,height,radius);
}
export function orderAcknowledgement(choice,lang='tr') {
 const flavor=ICE_CREAM_FLAVORS[choice.value];
 if(lang==='tr')return `Bir ${shortTr[choice.value]}.${choice.count>1?` ${choice.count} top oldu.`:''}`;
 const name=flavor?.names[lang]||flavor?.names.en||'';
 if(lang==='ja')return `${name}を1個。合計${choice.count}個。`;
 if(lang==='de')return `Eine Kugel ${name}. ${choice.count} insgesamt.`;
 if(lang==='ru')return `Один ${name}. Всего ${choice.count}.`;
 if(lang==='ar')return `${name}، كرة واحدة. المجموع ${choice.count}.`;
 return `One ${name.toLowerCase()}.${choice.count>1?` ${choice.count} scoops.`:''}`;
}

/** One warm outline at a time, including on white ice. Food color is untouched. */
export function orderTubPulse(age,count=0){
 if(count>0)return{index:-1,strength:0};
 const beat=Math.max(0,age)/.70;
 return{index:Math.floor(beat)%ICE_CREAM_FLAVORS.length,strength:Math.sin(Math.PI*(beat%1))};
}

/** Select the visible ice itself. Camera fitting never moves the cart or tubs. */
export class TubOrderView {
 constructor(world) {
  this.world=world;
  this.active=false;this.cameraProgress=0;this.flash=null;this.pickIndex=null;
  this.materials=(world.tubIceGroups||[]).map(({group})=>{
   const seen=new Set(),saved=[];group.traverse(node=>{
    if(!node.isMesh)return;for(const material of Array.isArray(node.material)?node.material:[node.material]){
     if(!material.emissive||seen.has(material))continue;seen.add(material);
     saved.push({material,color:material.emissive.clone(),intensity:material.emissiveIntensity});
    }
   });return saved;
  });
  this.startPosition=new Vector3();this.targetPosition=new Vector3();
  this.tubTargets=Array.from({length:ICE_CREAM_FLAVORS.length},(_,i)=>(world.tubMeshes||[]).find(mesh=>mesh.userData.flavorIndex===i));
  this.projection=new Vector3();this.edgeProjection=new Vector3();
 }
 begin() {
  this.active=true;this.cameraProgress=0;this.flash=null;this.pickIndex=null;this.hintAge=0;
  const c=this.world.camera;c.updateMatrixWorld(true);this.startPosition.copy(c.position);this.startQuaternion=c.quaternion.clone();
  this.saved={position:c.position.clone(),quaternion:c.quaternion.clone()};
  this.updateCamera(0);
 }
 end() {
  if(!this.active)return;
  this.active=false;this.clearHighlights();this.flash=null;
  if(this.saved&&!this.world.encounterCamera){const c=this.world.camera;c.position.copy(this.world.baseCamPos||this.saved.position);c.quaternion.copy(this.saved.quaternion);c.updateMatrixWorld(true);}
 }
 cameraDestination() {
  const c=this.world.camera;const halfWidth=Math.max(...ICE_CREAM_FLAVORS.map(f=>Math.abs(f.xOffset)))+.14;
  const fitDistance=halfWidth/(Math.tan(c.fov*Math.PI/360)*c.aspect)*1.08;
  this.targetPosition.copy(this.world.baseCamPos||this.saved.position);
  this.targetPosition.z=Math.max(this.targetPosition.z,fitDistance-.30);
  return this.targetPosition;
 }
 updateCamera(dt) {
  if(this.world.encounterCamera)return;
  if(!this.active)return;
  this.cameraProgress=Math.min(1,this.cameraProgress+Math.max(0,dt)/.8);
  const t=this.cameraProgress*this.cameraProgress*(3-2*this.cameraProgress),c=this.world.camera;
  c.position.lerpVectors(this.startPosition,this.cameraDestination(),t);
  // Retain the original view direction so every projected tub matches its mesh.
  c.quaternion.copy(this.saved.quaternion);c.updateMatrixWorld(true);
 }
 settleCamera() {this.cameraProgress=1;this.updateCamera(0);}
 /** Aim with the same visible hand as play. Generous, non-overlapping lanes
  * cover each tub and label; a 5px boundary buffer prevents focus flicker. */
 pick(x,y) {
  if(!this.active||!Number.isFinite(x)||!Number.isFinite(y))return null;
  const w=this.world; // projection sizes are CSS pixels, never DPR
  w.scene.updateMatrixWorld(true);w.camera.updateMatrixWorld(true);
  const width=w.canvas?.clientWidth||390,height=w.canvas?.clientHeight||width/w.camera.aspect;
  const px=x*width,py=y*height;
  const targets=this.tubTargets.map((_,i)=>this.projectedTub(i,width,height)).filter(Boolean);
  const accepts=(i,buffer=0)=>{
   const t=targets[i];if(!t)return false;
   const left=i?(targets[i-1].x+t.x)/2:t.x-t.radius-10;
   const right=i<targets.length-1?(t.x+targets[i+1].x)/2:t.x+t.radius+10;
   return px>=left-buffer&&px<=right+buffer&&py>=t.y-Math.max(26,t.radius*.52+12)&&py<=t.y+Math.max(36,t.radius*.52+24);
  };
  if(this.pickIndex!==null&&accepts(this.pickIndex,5))return this.pickIndex;
  this.pickIndex=targets.findIndex((_,i)=>accepts(i));
  if(this.pickIndex<0)this.pickIndex=null;
  return this.pickIndex;
 }
 /** The whole visible wafer (tip, rim and body) can overlap a tub. */
 pickCone(x,y){
  const w=this.world,mesh=w.mainConeMesh;
  if(!this.active||!mesh?.geometry)return this.pick(x,y);
  w.scene.updateMatrixWorld(true);w.camera.updateMatrixWorld(true);
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox;
  const width=w.canvas?.clientWidth||390,height=w.canvas?.clientHeight||width/w.camera.aspect;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const a of[box.min.x,box.max.x])for(const b of[box.min.y,box.max.y])for(const c of[box.min.z,box.max.z]){
   this.point ||= new Vector3();this.point.set(a,b,c).applyMatrix4(mesh.matrixWorld).project(w.camera);
   if(this.point.z< -1||this.point.z>1)continue;
   const px=(this.point.x+1)*width/2,py=(1-this.point.y)*height/2;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
  }
  let best=null,bestScore=-Infinity;
  for(let i=0;i<this.tubTargets.length;i++){
   const t=this.projectedTub(i,width,height);if(!t)continue;
   const dx=Math.min(maxX,t.x+t.radius+9)-Math.max(minX,t.x-t.radius-9),dy=Math.min(maxY,t.y+Math.max(26,t.radius*.6))-Math.max(minY,t.y-Math.max(24,t.radius*.6));
   if(dx>=0&&dy>=0){const score=dx*dy-Math.abs((minX+maxX)/2-t.x)*.1+(this.pickIndex===i?12:0);if(score>bestScore){best=i;bestScore=score;}}
  }
  if(best!==null){this.pickIndex=best;return best;}
  return this.pick(x,y);
 }
 projectedTub(index,width,height){
  const mesh=this.tubTargets[index];if(!mesh)return null;
  mesh.updateWorldMatrix(true,false);mesh.getWorldPosition(this.projection);
  this.edgeProjection.set(.10,0,0);mesh.localToWorld(this.edgeProjection);
  this.projection.project(this.world.camera);this.edgeProjection.project(this.world.camera);
  if(this.projection.z < -1||this.projection.z > 1)return null;
  const x=(this.projection.x+1)*width*.5,y=(1-this.projection.y)*height*.5;
  return {x,y,radius:Math.max(9,Math.abs(this.edgeProjection.x-this.projection.x)*width*.5)};
 }
 clearHighlights() {
  for(const row of this.materials)for(const saved of row){saved.material.emissive.copy(saved.color);saved.material.emissiveIntensity=saved.intensity;}
 }
 /** The full compact menu is always readable under its physical tubs. */
 labelLayout(ctx,width,height,lang='tr'){
  const labels=ICE_CREAM_FLAVORS.map((flavor,index)=>{
   const target=this.projectedTub(index,width,height);if(!target)return null;
   const text=lang==='tr'?labelTr[index]:lang==='en'?shortEn[index]:flavor.names[lang]||shortEn[index];
   return{index,text,...target};
  }).filter(Boolean);
  const y=Math.max(...labels.map(p=>p.y+p.radius*.52+8));
  for(let i=0;i<labels.length;i++){
   const p=labels[i],left=i?labels[i-1].x:0,right=i<labels.length-1?labels[i+1].x:width;
   const available=Math.max(24,Math.min(p.x-left,right-p.x)-5);
   let font=width<360?11:12;ctx.font=`600 ${font}px system-ui, sans-serif`;
   while(font>8&&ctx.measureText(p.text).width+10>available){font--;ctx.font=`600 ${font}px system-ui, sans-serif`;}
   const w=Math.min(available,ctx.measureText(p.text).width+10);
   Object.assign(p,{font,boxX:Math.max(4,Math.min(width-w-4,p.x-w/2)),boxY:y,boxWidth:w,boxHeight:22});
  }
  return labels;
 }
 drawLabels(ctx,width,height,lang='tr',focused=-1){
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(const p of this.labelLayout(ctx,width,height,lang)){
   pill(ctx,p.boxX,p.boxY,p.boxWidth,p.boxHeight,6);ctx.fillStyle='rgba(33,23,16,.9)';ctx.fill();
   ctx.strokeStyle=p.index===focused?'#ffe2a2':'rgba(226,191,127,.45)';ctx.lineWidth=1;ctx.stroke();
   ctx.font=`600 ${p.font}px system-ui, sans-serif`;ctx.fillStyle='#fff3dc';ctx.fillText(p.text,p.boxX+p.boxWidth/2,p.boxY+11,p.boxWidth-6);
  }
  ctx.restore();
 }
 acknowledge(index) {this.flash={index,age:0};this.world.churnTubIceCream?.(index,.15);}
 update(snapshot,dt) {
  this.clearHighlights();if(!this.active)return;
  this.hintAge=(this.hintAge||0)+dt;
  if(this.flash){this.flash.age+=dt;if(this.flash.age>.55)this.flash=null;}
 }
 /** A receipt, not a menu: every dot is a scoop already deliberately selected.
  * The tub ring selects; the receipt fill shows automatic idle confirmation. */
 draw(ctx,snapshot,width,height,lang='tr'){
  if(!this.active||!snapshot.active)return;
  const words=ORDER_HINT[lang]||ORDER_HINT.en,flavors=snapshot.flavors||[];
  const focused=this.flash?.index??snapshot.focusFlavor??snapshot.hover;
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  if(snapshot.phase==='order')for(let index=0;index<ICE_CREAM_FLAVORS.length;index++){
   const target=this.projectedTub(index,width,height);if(!target)continue;
   const {x,y,radius}=target,ry=radius*.52,isFocus=index===focused;
   const pulse=orderTubPulse(this.hintAge,snapshot.count);
   const strength=focused>=0?(isFocus?.85:0):pulse.index===index?pulse.strength:0;
   if(strength>0){
    ctx.save();ctx.globalAlpha=.25+.65*strength;ctx.shadowColor='#ffc957';ctx.shadowBlur=10+16*strength;
    ctx.beginPath();ctx.ellipse(x,y,radius+5,ry+5,0,0,Math.PI*2);
    ctx.strokeStyle='#ffcb62';ctx.lineWidth=2+2*strength;ctx.stroke();ctx.restore();
   }
   ctx.beginPath();ctx.ellipse(x,y,radius+2,ry+2,0,0,Math.PI*2);
   ctx.strokeStyle='rgba(34,20,13,.88)';ctx.lineWidth=isFocus?6:4;ctx.stroke();
   ctx.strokeStyle=isFocus?'#ffe2a2':index===0?'#e9c894':'#c7bad8';ctx.lineWidth=isFocus?2.5:1.2;ctx.stroke();
   if(index===snapshot.hover&&snapshot.dwell>0){
    ctx.beginPath();ctx.ellipse(x,y,radius+5,ry+5,0,-Math.PI/2,-Math.PI/2+Math.PI*2*snapshot.dwell);
    ctx.strokeStyle='#fff5d0';ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke();
   }
   if(this.flash?.index===index){ctx.font='700 17px system-ui';ctx.strokeStyle='#352313';ctx.lineWidth=4;ctx.strokeText('✓',x,y);ctx.fillStyle='#fff5d0';ctx.fillText('✓',x,y);}
  }
  this.drawLabels(ctx,width,height,lang,focused);
  const landscape=width>height,compact=height<450;
  const boxHeight=compact?52:58,boxWidth=landscape?Math.min(260,width*.30):Math.min(width-88,330),boxX=landscape?10:(width-boxWidth)/2-24;
  const boxY=this.headerInset??12,centerX=boxX+boxWidth/2;
  pill(ctx,boxX,boxY,boxWidth,boxHeight,16);ctx.fillStyle='rgba(29,20,15,.87)';ctx.fill();ctx.strokeStyle='rgba(234,205,157,.36)';ctx.lineWidth=1;ctx.stroke();
  const progress=snapshot.phase==='confirm'?1:snapshot.idleProgress||0;
  if(progress){ctx.save();ctx.clip();ctx.fillStyle='rgba(158,210,143,.22)';ctx.fillRect(boxX,boxY,boxWidth*progress,boxHeight);ctx.restore();}
  const rowY=boxY+(compact?16:21),countText=words.count(snapshot.count||0);
  ctx.font='700 14px system-ui, sans-serif';ctx.fillStyle='#fff3dc';
  if(flavors.length){
   const gap=18,rowWidth=flavors.length*gap+ctx.measureText(countText).width+15,start=centerX-rowWidth/2;
   flavors.forEach((index,i)=>{const x=start+i*gap+8;ctx.beginPath();ctx.arc(x,rowY,7.5,0,Math.PI*2);ctx.fillStyle=ICE_CREAM_FLAVORS[index].cssColor;ctx.fill();ctx.strokeStyle=index===0?'#b88953':'#f3d9b9';ctx.lineWidth=1.5;ctx.stroke();});
   ctx.fillStyle='#fff3dc';ctx.textAlign='left';ctx.fillText(countText,start+flavors.length*gap+12,rowY);ctx.textAlign='center';
  }else ctx.fillText(words.choose,centerX,rowY);
  ctx.font=`500 ${compact?11:12}px system-ui, sans-serif`;ctx.fillStyle=progress?'#d7ffd1':'#dec8aa';
  const hint=this.attentionText||(snapshot.phase==='confirm'?`✓ ${words.confirm}`:snapshot.count?words.finish:words.hold);
  ctx.fillText(hint,centerX,boxY+boxHeight-(compact?13:15));
  ctx.restore();
 }
}

export function drawOrder(ctx,snapshot,width,height,lang,view){view?.draw(ctx,snapshot,width,height,lang);}
