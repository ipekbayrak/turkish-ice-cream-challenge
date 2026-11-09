import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveManager, SUPPORTED_LANGS } from '../src/storage.js';

test('HUD formatting reuses ICU state and changes locale without changing saved data',()=>{
 const Native=Intl.NumberFormat;let creations=0;
 Intl.NumberFormat=new Proxy(Native,{construct(target,args){creations++;return Reflect.construct(target,args);}});
 try{
  const save=new SaveManager(),before=JSON.stringify(save.data);let writes=0;
  save.save=()=>writes++;
  for(const {code,locale} of SUPPORTED_LANGS){
   save.setLang(code);
   const expected=new Native(locale);
   for(let frame=0;frame<120;frame++){
    for(const value of[1234567.49,1234567.5,-1234.6,0]){
     assert.equal(save.formatNumber(value),expected.format(Math.round(value)),`${code}: ${value}`);
    }
   }
  }
  assert.equal(creations,SUPPORTED_LANGS.length,'changing scores does not create formatters');
  assert.equal(writes,SUPPORTED_LANGS.length,'only the explicit language changes save preferences');
  assert.equal(JSON.stringify(save.data),before);
  save.setLang('tr');assert.equal(save.formatNumber(1234567),'1.234.567');
  assert.ok(creations<=SUPPORTED_LANGS.length+1,'returning to a locale needs at most one formatter');
 }finally{Intl.NumberFormat=Native;}
});

test('unavailable ICU keeps the existing rounded fallback and can recover',()=>{
 const Native=Intl.NumberFormat,save=new SaveManager();save.lang='tr';
 try{
  Intl.NumberFormat=function(){throw new Error('ICU unavailable');};
  assert.equal(save.formatNumber(1234.6),'1235');
  assert.equal(save.formatNumber(-12.6),'-13');
 }finally{Intl.NumberFormat=Native;}
 assert.equal(save.formatNumber(1234.6),'1.235');
});
