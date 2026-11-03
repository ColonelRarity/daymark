/* Optional, locally generated workout rhythm and device text-to-speech cues. */
const workoutSound={playing:false,voice:false,mode:'calm',volume:.24,open:false,context:null,master:null,timer:null,step:0,nextAt:0,spoken:'',utterance:null};

function workoutSoundTone(frequency,at,duration,level,type='sine'){
 const ctx=workoutSound.context,osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.type=type;osc.frequency.setValueAtTime(frequency,at);
 gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level),at+.018);
 gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
 osc.connect(gain);gain.connect(workoutSound.master);osc.start(at);osc.stop(at+duration+.02);
}
function workoutSoundBeat(at){
 const n=workoutSound.step++,energetic=workoutSound.mode==='energy';
 const roots=energetic?[220,174.61,261.63,196]:[196,174.61,146.83,174.61];
 const root=roots[Math.floor(n/4)%roots.length];
 workoutSoundTone(n%4===0?root/2:root,at,energetic?.17:.24,energetic?.18:.11,'sine');
 if(n%2===0)workoutSoundTone(root*2,at+.04,.28,.045,'triangle');
 if(n%4===0){workoutSoundTone(root*1.5,at+.1,.5,.035,'sine');workoutSoundTone(root*2,at+.16,.6,.028,'sine');}
}
function workoutSoundSchedule(){
 if(!workoutSound.playing||!workoutSound.context)return;
 const interval=60/(workoutSound.mode==='energy'?116:88);
 while(workoutSound.nextAt<workoutSound.context.currentTime+.25){workoutSoundBeat(workoutSound.nextAt);workoutSound.nextAt+=interval;}
}
function workoutSoundSync(){
 const root=document.querySelector('.workout-sound');if(!root)return;
 const music=root.querySelector('[data-action="workout-sound-toggle"]'),voice=root.querySelector('[data-action="workout-voice-toggle"]');
 music.textContent=workoutSound.playing?'Ⅱ Пауза музики':'▶ Увімкнути музику';music.classList.toggle('active',workoutSound.playing);music.setAttribute('aria-pressed',String(workoutSound.playing));
 voice.textContent=workoutSound.voice?'◉ Голос увімкнено':'◉ Голосові підказки';voice.classList.toggle('active',workoutSound.voice);voice.setAttribute('aria-pressed',String(workoutSound.voice));
 const status=root.querySelector('.sound-status');status.textContent=(workoutSound.playing?'♫ грає':'♫ вимкнено')+' · '+(workoutSound.voice?'голос увімкнено':'голос вимкнено');
}
function workoutSoundStop(){
 workoutSound.playing=false;clearInterval(workoutSound.timer);workoutSound.timer=null;
 if(workoutSound.master&&workoutSound.context){workoutSound.master.gain.setTargetAtTime(0,workoutSound.context.currentTime,.025);}
 if(workoutSound.utterance&&'speechSynthesis'in window){window.speechSynthesis.cancel();workoutSound.utterance=null;}
 workoutSound.spoken='';workoutSoundSync();
}
function workoutSoundCue(){
 if(!workoutSound.voice||!trainingRun||trainingRun.paused||!('speechSynthesis'in window))return;
 const r=trainingRun,key=[r.phase,r.index,r.set].join(':');if(key===workoutSound.spoken)return;
 workoutSound.spoken=key;const plan=trainingPlan(r.id),item=plan?.items[r.index],exercise=item&&TRAINING_EXERCISES[item[0]];
 let words='';
 if(r.phase==='warmup')words='Розминка. Почни з легкої ходьби та м’яких рухів плечима. Рухайся у комфортному темпі.';
 else if(r.phase==='exercise'&&exercise)words=exercise.name+'. Підхід '+r.set+'. '+exercise.cue;
 else if(r.phase==='rest')words='Час перепочити. Віднови дихання. Натисни далі, коли будеш готова або готовий.';
 else if(r.phase==='cooldown')words='Фінальний етап. Поступово сповільни рух і віднови дихання.';
 if(!words)return;
 window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(words);
 utterance.lang='uk-UA';utterance.rate=.92;utterance.volume=1;
 const ukrainian=window.speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('uk'));if(ukrainian)utterance.voice=ukrainian;
 utterance.onstart=()=>{if(workoutSound.master&&workoutSound.playing)workoutSound.master.gain.setTargetAtTime(workoutSound.volume*.4,workoutSound.context.currentTime,.1);};
 const restore=()=>{if(workoutSound.master&&workoutSound.context&&workoutSound.playing)workoutSound.master.gain.setTargetAtTime(workoutSound.volume,workoutSound.context.currentTime,.1);if(workoutSound.utterance===utterance)workoutSound.utterance=null;};
 utterance.onend=restore;utterance.onerror=restore;workoutSound.utterance=utterance;
 window.speechSynthesis.speak(utterance);
}
function workoutSoundPanel(){return '<details class="workout-sound" '+(workoutSound.open?'open':'')+'><summary><span class="sound-icon">♫</span><span>Звук тренування</span><span class="sound-status"></span></summary><div class="workout-sound-body"><div class="workout-sound-actions"><button type="button" data-action="workout-sound-toggle" aria-pressed="false"></button><button type="button" data-action="workout-voice-toggle" aria-pressed="false"></button></div><label class="workout-sound-modes">Ритм <select id="workoutSoundMode"><option value="calm" '+(workoutSound.mode==='calm'?'selected':'')+'>Спокійний</option><option value="energy" '+(workoutSound.mode==='energy'?'selected':'')+'>Енергійний</option></select></label><label class="workout-sound-volume">Гучність <input id="workoutSoundVolume" type="range" min="0" max="100" value="'+Math.round(workoutSound.volume*100)+'" aria-label="Гучність музики"></label><p class="workout-sound-note">Музика створюється в DAYMARK без сторонніх треків. Голос читає підказки з цієї вправи; якість українського голосу залежить від пристрою.</p></div></details>';}

const originalWorkoutFlowRender=trainingFlowRender;
trainingFlowRender=function(){
 originalWorkoutFlowRender();const r=trainingRun,container=document.querySelector('.training-show-dialog .show-shell');if(!container)return;
 if(!r||r.phase==='complete'){workoutSoundStop();return;}
 const progress=container.querySelector('.show-progress-label');if(progress)progress.insertAdjacentHTML('afterend',workoutSoundPanel());
 const panel=container.querySelector('.workout-sound');if(panel)panel.addEventListener('toggle',()=>{workoutSound.open=panel.open;});
 workoutSoundSync();workoutSoundCue();
};
actions['workout-sound-toggle']=async()=>{
 if(workoutSound.playing){workoutSoundStop();workoutSoundSync();return;}
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio){toast('Цей браузер не підтримує музику в тренуванні.');return;}
 try{
  if(!workoutSound.context){workoutSound.context=new Audio();workoutSound.master=workoutSound.context.createGain();workoutSound.master.connect(workoutSound.context.destination);}
  await workoutSound.context.resume();workoutSound.master.gain.setTargetAtTime(workoutSound.volume,workoutSound.context.currentTime,.06);
  workoutSound.playing=true;workoutSound.step=0;workoutSound.nextAt=workoutSound.context.currentTime+.06;
  workoutSoundSchedule();workoutSound.timer=setInterval(workoutSoundSchedule,100);workoutSoundSync();
 }catch{workoutSoundStop();toast('Не вдалося ввімкнути звук на цьому пристрої.');}
};
actions['workout-voice-toggle']=()=>{
 if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){toast('Голосові підказки недоступні в цьому браузері.');return;}
 workoutSound.voice=!workoutSound.voice;
 if(workoutSound.voice){workoutSound.spoken='';workoutSoundCue();}
 else if(workoutSound.utterance){window.speechSynthesis.cancel();workoutSound.utterance=null;}
 workoutSoundSync();
};
document.addEventListener('change',event=>{if(event.target.id==='workoutSoundMode'){workoutSound.mode=event.target.value==='energy'?'energy':'calm';workoutSound.step=0;workoutSound.nextAt=workoutSound.context?.currentTime||0;}});
document.addEventListener('input',event=>{if(event.target.id==='workoutSoundVolume'){workoutSound.volume=Math.max(0,Math.min(1,Number(event.target.value)/100));if(workoutSound.master&&workoutSound.context&&workoutSound.playing)workoutSound.master.gain.setTargetAtTime(workoutSound.volume,workoutSound.context.currentTime,.05);}});
document.getElementById('modal').addEventListener('close',workoutSoundStop);
