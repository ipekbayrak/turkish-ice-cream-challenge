import {FlavorRefusalGesture} from './flavor-refusal-gesture.js';
import {FLAVOR_FEINT_ID} from './flavor-feint-plan.js';
import {ICE_CREAM_FLAVORS} from './flavors.js';

/** A local 'no' gesture, never a replacement for the normal cut/rhythm judges. */
export function updateFlavorRefusal(d,dt,input){
 const plan=d.flavorFeint;if(!plan)return false;
 const w=d.world,mesh=w.scoopMeshes[plan.index];
 const inOffer=d.currentMechanic===FLAVOR_FEINT_ID?d.flavorFeintShow?.phase<=0:d.routineIndex===plan.prepareAt&&['SCRAPE_FLAVOR_SCOOP','CUSTOMER_SCOOP_SHOW'].includes(d.currentMechanic);
 const enabled=d.active&&!d.roundEnded&&!plan.rejected&&plan.status==='active'&&inOffer&&mesh?.visible&&mesh.material.color.getHex()===ICE_CREAM_FLAVORS[plan.offered].colorHex;
 if(!enabled){plan.refusalGesture?.reset();return false;}
 const gesture=plan.refusalGesture ||= new FlavorRefusalGesture();
 if(!gesture.update(input,dt,{enabled:true,width:w.canvas?.clientWidth||390}))return false;
 plan.rejected=true;
 if(d.flavorFeintShow?.phase===0){
  const show=d.flavorFeintShow;show.phase=-1;show.age=0;show.offerAge=0;show.rejectionPause=0;show.from=d.coneWorldPos.clone();show.feintBeat=undefined;
 }
 w.playVendorReaction('refusal');d.sound.syncMusicBeat?.();
 const lang=d.save?.lang||'en';
 const linesByLang={
  tr:['Hah! Şakayı yakaladın!','Tamam tamam, seni deniyordum!','Gözünden kaçmadı! Hemen değiştiriyorum!'],
  en:['Ha! You caught my prank!','All right, I was testing you!','Sharp eyes! Swapping it right back!'],
  ar:['ها! كشفت مقلبي!','حسناً حسناً، كنت أختبرك!','عينك صقر! سأبدلها فوراً!'],
  ru:['Ха! Раскусил мою шутку!','Ладно-ладно, я проверял тебя!','Не проведёшь! Уже меняю!'],
  de:['Ha! Streich durchschaut!','Schon gut, ich wollte dich testen!','Adlerauge! Ich tausche es sofort!'],
  ja:['ハハッ、イタズラを見抜いたね！','わかったわかった、試しただけさ！','さすが！すぐ注文の味に変えるよ！'],
 };
 const lines=linesByLang[lang]||linesByLang.en;
 d.sayLine?.(lines[(plan.offered+(d.levelIndex||0))%lines.length],'laugh',1.8);
 return true;
}
