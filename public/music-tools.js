const SHARP_NOTES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_NOTES=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const PITCH_CLASS={Cb:11,C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,'E#':5,Fb:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,'B#':0};

function normalizeAccidental(value){return value.replace('♯','#').replace('♭','b')}

export function transposeNote(note,semitones,preferFlats=false){
  const normalized=normalizeAccidental(note);
  const pitch=PITCH_CLASS[normalized];
  if(pitch===undefined)return null;
  const next=(pitch+semitones%12+12)%12;
  return (preferFlats?FLAT_NOTES:SHARP_NOTES)[next];
}

export function transposeChord(chord,semitones){
  const match=chord.match(/^([A-Ga-g])([#b♯♭]?)([^/]*?)(?:\/([A-Ga-g])([#b♯♭]?))?$/);
  if(!match)return chord;
  const [,letter,accidental,suffix,bassLetter='',bassAccidental='']=match;
  const normalizedAccidental=normalizeAccidental(accidental);
  const preferFlats=normalizedAccidental==='b'||(!normalizedAccidental&&semitones<0);
  const root=transposeNote(letter.toUpperCase()+normalizedAccidental,semitones,preferFlats);
  if(!root)return chord;
  if(!bassLetter)return root+suffix;
  const normalizedBassAccidental=normalizeAccidental(bassAccidental);
  const bassPrefersFlats=normalizedBassAccidental==='b'||(!normalizedBassAccidental&&semitones<0);
  const bass=transposeNote(bassLetter.toUpperCase()+normalizedBassAccidental,semitones,bassPrefersFlats);
  return `${root}${suffix}/${bass||bassLetter+bassAccidental}`;
}

export function transposeChordSequence(value,semitones){
  return value.split(/([,\s]+)/).map(part=>/^[,\s]+$/.test(part)?part:transposeChord(part,semitones)).join('');
}

const transposeInput=document.getElementById('transposeInput');
const transposeSteps=document.getElementById('transposeSteps');
const transposeResult=document.getElementById('transposeResult');
const transposeStatus=document.getElementById('transposeStatus');

if(transposeInput&&transposeSteps&&transposeResult){
  transposeSteps.innerHTML=Array.from({length:23},(_,index)=>index-11).map(value=>`<option value="${value}"${value===0?' selected':''}>${value>0?'+':''}${value}</option>`).join('');
  const updateTranspose=()=>{
    const value=transposeInput.value.trim();
    transposeResult.textContent=value?transposeChordSequence(value,Number(transposeSteps.value)): '—';
    transposeStatus.textContent='';
  };
  transposeInput.addEventListener('input',updateTranspose);
  transposeSteps.addEventListener('change',updateTranspose);
  document.getElementById('transposeDown').addEventListener('click',()=>{transposeSteps.value=String(Math.max(-11,Number(transposeSteps.value)-1));updateTranspose()});
  document.getElementById('transposeUp').addEventListener('click',()=>{transposeSteps.value=String(Math.min(11,Number(transposeSteps.value)+1));updateTranspose()});
  document.getElementById('copyTranspose').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(transposeResult.textContent);transposeStatus.textContent='已複製。'}
    catch{transposeStatus.textContent='請手動選取並複製結果。'}
  });
  updateTranspose();
}

export function calculateDelayTimes(bpm){
  if(!Number.isFinite(bpm)||bpm<=0)return null;
  const quarter=60000/bpm;
  return {whole:Math.round(quarter*4),half:Math.round(quarter*2),quarter:Math.round(quarter),eighth:Math.round(quarter/2),sixteenth:Math.round(quarter/4),dottedEighth:Math.round(quarter*.75)};
}

const bpmInput=document.getElementById('bpmCalculatorInput');
const delayResults=document.getElementById('delayResults');
const DELAY_LABELS=[['whole','全音符','Whole'],['half','二分音符','Half'],['quarter','四分音符','Quarter'],['eighth','八分音符','Eighth'],['sixteenth','十六分音符','Sixteenth'],['dottedEighth','附點八分音符','Dotted Eighth']];
if(bpmInput&&delayResults){
  const updateBpm=()=>{
    const values=calculateDelayTimes(Number(bpmInput.value));
    delayResults.innerHTML=DELAY_LABELS.map(([key,zh,en])=>`<div class="delay-value"><span>${zh} · ${en}</span><strong>${values?values[key]:'—'} <b>ms</b></strong></div>`).join('');
  };
  bpmInput.addEventListener('input',updateBpm);
  updateBpm();
}

const tapButton=document.getElementById('tapTempoButton');
const tapOutput=document.getElementById('tapTempoValue');
if(tapButton&&tapOutput&&bpmInput){
  let taps=[];
  let resetTimer;
  tapButton.addEventListener('click',()=>{
    const now=performance.now();
    if(taps.length&&now-taps[taps.length-1]>2000)taps=[];
    taps.push(now);
    taps=taps.slice(-7);
    clearTimeout(resetTimer);
    resetTimer=setTimeout(()=>{taps=[];tapOutput.textContent='Tap 2+ times'},2200);
    tapButton.classList.remove('is-playing');
    void tapButton.offsetWidth;
    tapButton.classList.add('is-playing');
    if(taps.length<2){tapOutput.textContent='Keep tapping…';return}
    const intervals=taps.slice(1).map((time,index)=>time-taps[index]);
    const average=intervals.reduce((sum,value)=>sum+value,0)/intervals.length;
    const bpm=Math.max(1,Math.min(999,Math.round(60000/average)));
    bpmInput.value=String(bpm);
    bpmInput.dispatchEvent(new Event('input'));
    tapOutput.textContent=`${bpm} BPM`;
  });
}
