/** Audition reference frozen from the pre-polish implementation, not production. */
export const LEGACY_VOICE_PITCH=[350,320,300,285];
export const LEGACY_REACTIONS={
 hmm:[{duration:.22,pitch:[1,1.04,1.16],volume:.66,mouth:.2}],
 hirr:[{duration:.17,pitch:[.98,1.08,1.03],volume:.68,mouth:.28}],
 hoppa:[{duration:.16,pitch:[1.02,1.2,1.12],volume:.72,mouth:.3}],
 eeeh:[{duration:.12,pitch:[1.05,1.12,1.1],volume:.56,mouth:.23},{offset:.17,duration:.13,pitch:[1.14,1.22,1.18],volume:.54,mouth:.25}],
 cik:[{duration:.105,pitch:[1.08,1.1,1.04],volume:.48,mouth:.16}],
 laugh:[{duration:.12,pitch:[1.05,1.15,1.1],volume:.58,mouth:.28},{offset:.18,duration:.15,pitch:[1.17,1.27,1.22],volume:.6,mouth:.3}],
 taunt:[{duration:.2,pitch:[.98,1.08,1.2],volume:.58,mouth:.2}],
 cheer:[{duration:.19,pitch:[1.06,1.28,1.23],volume:.68,mouth:.32}],
 shock:[{duration:.14,pitch:[1.15,1.28,1.18],volume:.56,mouth:.28}],
};
export function synthesizeLegacyVocal(sampleRate,basePitch,gesture,seed=1){
 const{duration,pitch,volume=.6}=gesture,samples=new Float32Array(Math.ceil(sampleRate*duration));
 const tuning=1+Math.sin(seed*1.618)*.014;let phase=0,peak=0;
 for(let i=0;i<samples.length;i++){const p=i/(samples.length-1),local=p<.45?p/.45:(p-.45)/.55,smooth=local*local*(3-2*local),contour=p<.45?pitch[0]+(pitch[1]-pitch[0])*smooth:pitch[1]+(pitch[2]-pitch[1])*smooth;
  phase+=Math.PI*2*Math.max(250,basePitch)*contour*tuning/sampleRate;const tone=Math.sin(phase)+.16*Math.sin(phase*2)+.035*Math.sin(phase*3);samples[i]=tone*Math.pow(Math.sin(Math.PI*p),.8)*Math.exp(-1.65*p);peak=Math.max(peak,Math.abs(samples[i]));}
 const gain=.04*volume/Math.max(.0001,peak);for(let i=0;i<samples.length;i++)samples[i]*=gain;samples[0]=samples[samples.length-1]=0;return samples;
}
const scale=[293.66,311.13,369.99,392,440,466.16,523.25,587.33],pattern=[0,2,3,4,3,2,1,0,4,5,4,3,2,3,2,0];
export function legacyMusicStepEvents(beat){
 const step=beat%8,events=[];
 if(step===0||step===4)events.push({frequency:112,end:56,glide:.11,peak:.075,endGain:.001,decay:.13,duration:.14,type:'sine'});
 else if([2,6,7].includes(step))events.push({frequency:330,end:185,glide:.05,peak:.04,endGain:.001,decay:.06,duration:.07,type:'triangle'});
 if(step%2===0||step===5)events.push({frequency:scale[pattern[beat%pattern.length]],peak:.028,endGain:.0008,decay:.19,duration:.2,type:'sine'});
 return events;
}
/** Exact original WebAudio graph for browser OfflineAudioContext A/B. */
export function scheduleReferenceNote(context,bus,note,at=0,pan){
 const o=context.createOscillator(),g=context.createGain();o.type=note.type;o.frequency.setValueAtTime(note.frequency,at);if(note.end)o.frequency.exponentialRampToValueAtTime(note.end,at+note.glide);g.gain.setValueAtTime(note.peak,at);g.gain.exponentialRampToValueAtTime(note.endGain,at+note.decay);o.connect(g);
 if(pan!==undefined){const p=context.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(bus);}else g.connect(bus);
 o.start(at);o.stop(at+note.duration);
}
export function scheduleLegacyMusic(context,bus,steps=64){
 for(let step=0;step<steps;step++)for(const note of legacyMusicStepEvents(step))scheduleReferenceNote(context,bus,note,step*.22);
}
/** Node audition uses the same score/envelopes and a band-limited triangle;
 * it is an offline reconstruction, not a capture of a particular audio device. */
export function legacyNotePCM(sampleRate,note){
 const result=new Float32Array(Math.ceil(note.duration*sampleRate));let phase=0;
 for(let i=0;i<result.length;i++){
  const t=i/sampleRate,f=note.end?note.frequency*Math.pow(note.end/note.frequency,Math.min(1,t/note.glide)):note.frequency;
  let v;
  if(note.type==='triangle'){v=0;for(let harmonic=1;harmonic<=Math.min(31,Math.floor(sampleRate*.5/f));harmonic+=2)v+=Math.pow(-1,(harmonic-1)/2)*Math.sin(phase*harmonic)/(harmonic*harmonic);v*=8/(Math.PI*Math.PI);}
  else v=Math.sin(phase);
  const amplitude=note.peak*Math.pow(note.endGain/note.peak,Math.min(1,t/note.decay));result[i]=v*amplitude;phase+=Math.PI*2*f/sampleRate;
 }
 return result;
}
export function renderLegacyMusic(sampleRate,steps=64){
 const result=new Float32Array(Math.ceil((steps*.22+.4)*sampleRate));
 for(let step=0;step<steps;step++)for(const event of legacyMusicStepEvents(step)){const note=legacyNotePCM(sampleRate,event),offset=Math.round(step*.22*sampleRate);for(let i=0;i<note.length;i++)result[offset+i]+=note[i];}
 return result;
}
