import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { USTA_BASE_PITCH, VENDOR_REACTIONS, synthesizeVendorVocal, renderMusicPhrase } from '../src/sound-palette.js';
import { LEGACY_VOICE_PITCH, LEGACY_REACTIONS, synthesizeLegacyVocal, renderLegacyMusic, legacyNotePCM } from './fixtures/audio-legacy-reference.js';

const destination=process.argv[2];if(!destination)throw new Error('Provide an output directory.');await mkdir(destination,{recursive:true});
const rate=48000,vendor=1,files={};
const add=(out,data,time,gain=1)=>{const offset=Math.round(time*rate);for(let i=0;i<data.length&&offset+i<out.length;i++)out[offset+i]+=data[i]*gain;};
function phrase(key,legacy=false,variation=1){
 const gestures=(legacy?LEGACY_REACTIONS:VENDOR_REACTIONS)[key],pitch=(legacy?LEGACY_VOICE_PITCH:USTA_BASE_PITCH)[vendor];
 const result=new Float32Array(Math.ceil((Math.max(...gestures.map(g=>(g.offset||0)+g.duration))+.02)*rate));
 gestures.forEach((g,index)=>add(result,(legacy?synthesizeLegacyVocal:synthesizeVendorVocal)(rate,pitch,g,variation*83+index*17+vendor*971),g.offset||0,legacy?1.3:1.45));return result;
}
function metrics(samples){let energy=0,peak=0,mean=0;for(const x of samples){energy+=x*x;peak=Math.max(peak,Math.abs(x));mean+=x;}const rms=Math.sqrt(energy/samples.length);return{duration: samples.length/rate,peak,rms,rmsDb:20*Math.log10(rms||1e-12),dc:mean/samples.length,headroomDb:-20*Math.log10(peak||1e-12)};}
async function wav(name,samples){
 const buffer=Buffer.alloc(44+samples.length*2);buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples.length*2,40);
 for(let i=0;i<samples.length;i++){if(!Number.isFinite(samples[i])||Math.abs(samples[i])>1)throw new Error(`${name}: invalid/clipping PCM`);buffer.writeInt16LE(Math.round(samples[i]*32767),44+i*2);}
 await writeFile(path.join(destination,name),buffer);files[name]=metrics(samples);
}
for(const legacy of [true,false]){
 const suffix=legacy?'before':'after',music=legacy?renderLegacyMusic(rate):renderMusicPhrase(rate);
 await wav(`music-${suffix}.wav`,music);
 const voice=new Float32Array(rate*16);['hmm','hoppa','laugh','cheer'].forEach((key,index)=>add(voice,phrase(key,legacy,index+1),index*4));await wav(`vendor-${suffix}.wav`,voice);
 const context=music.slice(),timeline=[{at:2,key:'hmm'},{at:6,key:'hoppa'},{at:10,key:'laugh'}];
 for(const [index,cue]of timeline.entries()){
  const clip=phrase(cue.key,legacy,index+1),end=cue.at+clip.length/rate,target=legacy?.75:.68;
  for(let i=Math.round(cue.at*rate);i<Math.min(context.length,Math.ceil((end+.12)*rate));i++){
   const t=i/rate;let level=target;if(t<cue.at+.025)level=1+(target-1)*(t-cue.at)/.025;else if(t>end)level=target+(1-target)*(t-end)/.12;context[i]*=level;
  }add(context,clip,cue.at);
 }
 add(context,legacyNotePCM(rate,{frequency:310,end:680,glide:.11,peak:.18,endGain:.001,decay:.12,duration:.13,type:'triangle'}),2.01);
 add(context,legacyNotePCM(rate,{frequency:190,end:590,glide:.065,peak:.24,endGain:.001,decay:.08,duration:.09,type:'sine'}),6.01);
 await wav(`context-${suffix}.wav`,context);
}
await wav('pala-hum-after.wav',phrase('hmm'));await wav('pala-chuckle-after.wav',phrase('laugh'));
await writeFile(path.join(destination,'measurements.json'),JSON.stringify({sampleRate:rate,channels:1,method:'Offline PCM audition. New notes/voices use the live pure synthesizers. Before music and unchanged Foley reconstruct previous oscillator envelopes with a band-limited triangle. Conservative mono instrument sum, not a recording of a device or live stereo panner.',contextTimeline:'Voice at2s/6s/10s, wafer2.01s, cone-pop6.01s. No normalization between versions.',files},null,2)+'\n');
console.log(JSON.stringify({destination,files},null,2));
