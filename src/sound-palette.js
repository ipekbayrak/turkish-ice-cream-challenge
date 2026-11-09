/** Original, deliberately quiet game sounds. No recorded voice or borrowed tune. */
export const USTA_BASE_PITCH = Object.freeze([315, 290, 275, 260]);
export const VENDOR_REACTIONS = Object.freeze({
  hmm: [{duration:.24,pitch:[1,1.045,1.10],volume:.66,mouth:.20,tone:'closed'}],
  hirr: [{duration:.17,pitch:[.99,1.075,1.025],volume:.64,mouth:.26,tone:'round'}],
  hoppa: [{duration:.18,pitch:[1.025,1.17,1.08],volume:.72,mouth:.30,tone:'round'}],
  eeeh: [{duration:.13,pitch:[1.03,1.10,1.06],volume:.54,mouth:.24,tone:'smile'},{offset:.19,duration:.14,pitch:[1.10,1.16,1.09],volume:.52,mouth:.26,tone:'round'}],
  cik: [{duration:.105,pitch:[1.08,1.105,1.04],volume:.46,mouth:.16,tone:'closed'}],
  laugh: [{duration:.13,pitch:[1.04,1.13,1.07],volume:.57,mouth:.28,tone:'smile'},{offset:.20,duration:.16,pitch:[1.12,1.22,1.12],volume:.59,mouth:.31,tone:'round'}],
  taunt: [{duration:.22,pitch:[.99,1.08,1.15],volume:.57,mouth:.22,tone:'closed'}],
  cheer: [{duration:.20,pitch:[1.06,1.24,1.16],volume:.67,mouth:.32,tone:'smile'}],
  shock: [{duration:.15,pitch:[1.13,1.23,1.13],volume:.54,mouth:.28,tone:'round'}],
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{const p=clamp(t,0,1);return p*p*(3-2*p);};

/** A stylized wordless hum/chuckle: rounded harmonic opening, never throat noise,
 * subharmonics or a speech synthesizer. The old reaction peak budget is retained. */
export function synthesizeVendorVocal(sampleRate,basePitch,gesture,seed=1){
  const {duration,pitch,volume=.6,tone='round'}=gesture;
  const samples=new Float32Array(Math.max(2,Math.ceil(sampleRate*duration)));
  const tuning=1+Math.sin(seed*1.618)*.010;
  const openness=tone==='closed'?.35:tone==='smile'?.85:.62;
  let phase=0,peak=0;
  for(let i=0;i<samples.length;i++){
    const p=i/(samples.length-1),local=p<.45?p/.45:(p-.45)/.55;
    const contour=p<.45?pitch[0]+(pitch[1]-pitch[0])*smooth(local):pitch[1]+(pitch[2]-pitch[1])*smooth(local);
    phase+=Math.PI*2*Math.max(250,basePitch)*contour*tuning/sampleRate;
    // A slow vowel-like opening changes timbre rather than adding a piercing note.
    const opening=openness*Math.pow(Math.sin(Math.PI*p),1.4);
    const signal=Math.sin(phase)+(.19+.16*opening)*Math.sin(phase*2+.06)+(.035+.075*opening)*Math.sin(phase*3+.10)+.018*opening*Math.sin(phase*4);
    const envelope=smooth(p/.14)*smooth((1-p)/.28)*Math.exp(-1.25*p);
    samples[i]=signal*envelope;peak=Math.max(peak,Math.abs(samples[i]));
  }
  const gain=.04*volume/Math.max(.0001,peak);
  for(let i=0;i<samples.length;i++)samples[i]*=gain;
  samples[0]=samples[samples.length-1]=0;
  return samples;
}

export const MUSIC_SCALE = Object.freeze([293.66,311.13,369.99,392,440,466.16,523.25,587.33]);
// Four short call/answer bars using the existing game's pitch collection.
// The final three steps leave a genuine melodic rest before the phrase returns.
export const MUSIC_MELODY = Object.freeze([0,-1,2,-1,3,2,-1,0, 4,-1,3,-1,2,-1,1,-1, 0,-1,2,-1,3,4,-1,3, 2,-1,1,-1,0,-1,-1,-1]);
const DRUM_STEPS = [[0,2,4,6],[0,2,4,7],[0,2,4,5,7],[0,2,4,6]];
export function musicStepEvents(step){
  const index=((Math.floor(step)%32)+32)%32,bar=Math.floor(index/8),beat=index%8,events=[];
  if(DRUM_STEPS[bar].includes(beat))events.push(beat===0||beat===4?
    {kind:'dum',frequency:112,peak:beat===0?.061:.052,duration:.15,pan:0}:
    {kind:'tek',frequency:310,peak:bar===2&&beat===7?.014:.026,duration:.075,pan:beat%2?-.10:.10});
  if(beat===0)events.push({kind:'bass',frequency:bar===1?110:146.83,peak:.009,duration:.34,pan:0});
  if(MUSIC_MELODY[index]>=0)events.push({kind:'pluck',frequency:MUSIC_SCALE[MUSIC_MELODY[index]],peak:beat===0?.023:.021,duration:.26,pan:bar%2?-.08:.08});
  return events;
}
export function musicStepSeconds(step,tempoMultiplier=1){
  const value=Number(tempoMultiplier);
  const tempo=Number.isFinite(value)&&value>0?Math.max(.85,value):1;
  return .22/tempo*(step%2? .97:1.03);
}

/** Pure PCM is shared by live playback and offline audition/measurement. */
export function synthesizeMusicNote(sampleRate,event){
  const samples=new Float32Array(Math.max(2,Math.ceil(event.duration*sampleRate)));
  let phase=0,peak=0;
  for(let i=0;i<samples.length;i++){
    const t=i/sampleRate,p=t/event.duration;
    let frequency=event.frequency,decay=8,attack=.007,signal;
    if(event.kind==='dum'){frequency=112*Math.pow(58/112,Math.min(1,t/.11));decay=34;attack=.004;}
    else if(event.kind==='tek'){frequency=310*Math.pow(195/310,Math.min(1,t/.045));decay=62;attack=.0025;}
    else if(event.kind==='pluck'){decay=18;attack=.006;}
    else {decay=10;attack=.010;}
    phase+=Math.PI*2*frequency/sampleRate;
    if(event.kind==='tek')signal=Math.sin(phase)+.18*Math.sin(phase*2.3);
    else if(event.kind==='pluck')signal=Math.sin(phase)+.21*Math.sin(phase*2)*Math.exp(-t*17)+.038*Math.sin(phase*3)*Math.exp(-t*26);
    else if(event.kind==='bass')signal=Math.sin(phase)+.10*Math.sin(phase*2);
    else signal=Math.sin(phase);
    const envelope=smooth(t/attack)*Math.exp(-t*decay)*smooth((1-p)/.12);
    samples[i]=signal*envelope;peak=Math.max(peak,Math.abs(samples[i]));
  }
  const gain=event.peak/Math.max(.0001,peak);
  for(let i=0;i<samples.length;i++)samples[i]*=gain;
  samples[0]=samples[samples.length-1]=0;
  return samples;
}

export function renderMusicPhrase(sampleRate,steps=64,tempoMultiplier=1){
  let duration=0;const timeline=[];
  for(let step=0;step<steps;step++){timeline.push({time:duration,events:musicStepEvents(step)});duration+=musicStepSeconds(step,tempoMultiplier);}
  const result=new Float32Array(Math.ceil((duration+.4)*sampleRate));
  for(const beat of timeline)for(const event of beat.events){
    const note=synthesizeMusicNote(sampleRate,event),offset=Math.round(beat.time*sampleRate);
    for(let i=0;i<note.length;i++)result[offset+i]+=note[i];
  }
  return result;
}
