const $=id=>document.getElementById(id);
const canvas=$('canvas');
const keys=new Set();
const touches=new Map();
const images={};
const selections={map:'yard',hero:'slavik',role:'hide'};
const mapButtons=new Map(),heroButtons=new Map();
const roleButtons=[...document.querySelectorAll('[data-role]')];
let round,scene,paused=false,hover=null,lastFrame=0,lastHud=0;
let noticeUntil=0,sound=true,audio,ready=false,resumeAfterRules=false;

function beep(kind) {
  if(!sound||!audio||audio.state!=='running')return;
  const notes={start:[392,494,587],found:[587,784],hide:[440,330],empty:[220],ping:[880,660],noise:[220,294],win:[523,659,784,1047],lose:[330,294,220]}[kind];
  notes?.forEach((note,i)=>{
    const time=audio.currentTime+i*.09,osc=audio.createOscillator(),gain=audio.createGain();
    osc.type='triangle';osc.frequency.value=note;
    gain.gain.setValueAtTime(.045,time);gain.gain.exponentialRampToValueAtTime(.001,time+.13);
    osc.connect(gain).connect(audio.destination);osc.start(time);osc.stop(time+.14);
  });
}
function initAudio() {
  if(!sound||!window.AudioContext)return;
  audio ||= new AudioContext();
  audio.resume().catch(()=>{});
}
function notify(kind,text) {
  beep(kind);
  if(text){$('notice').textContent=text;noticeUntil=performance.now()+3500;}
  if(['hunt','found','win','lose','hide'].includes(kind))updateUI();
}
function clearInput() {
  keys.clear();touches.clear();
  document.querySelectorAll('.held').forEach(el=>el.classList.remove('held'));
}
function reset() {
  clearInput();paused=false;hover=null;noticeUntil=0;
  round=new Round(selections.map,selections.hero,selections.role,notify);
  for(const [id,button] of heroButtons)button.setAttribute('aria-pressed',String(id===selections.hero));
  for(const [id,button] of mapButtons)button.setAttribute('aria-pressed',String(id===selections.map));
  roleButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===selections.role)));
  $('map-title').textContent=round.map.title;
  $('role-note').textContent=selections.role==='hide'
    ?'12 секунд, щоб сховатися. Потім протримайся 42 секунди.'
    :'Знайди обох друзів за 60 секунд. Шурхіт допоможе тобі.';
  $('friends').replaceChildren();
  for(const actor of round.hiders){
    const face=document.createElement('div');face.className='friend';face.dataset.hero=actor.hero.id;
    const img=document.createElement('img');img.src=images[actor.hero.id].avatar.src;img.alt=actor.hero.name;
    face.append(img);$('friends').append(face);
  }
  updateUI();
}
function begin() {
  reset();initAudio();round.start();updateUI();document.activeElement?.blur();
  if(innerWidth<760)canvas.scrollIntoView({block:'center'});
}
function togglePause() {
  if(!round.active)return;
  paused=!paused;clearInput();updateUI();
  if(!paused)document.activeElement?.blur();
}
function setText(el,text) {if(el.textContent!==String(text))el.textContent=text;}
function updateUI() {
  const active=round.active,hide=round.role==='hide';
  [...heroButtons.values(),...mapButtons.values(),...roleButtons].forEach(b=>b.disabled=active);
  $('start').disabled=!ready;
  setText($('start'),active?'Завершити раунд':'Грати  ↗');
  $('start').classList.toggle('cancel',active);
  $('pause').hidden=!active;
  setText($('pause'),paused?'▶':'Ⅱ');$('pause').setAttribute('aria-label',paused?'Продовжити':'Пауза');
  $('touch-bar').hidden=!active;
  $('ability').hidden=!active;
  $('ability').disabled=paused||round.phase!=='hunt'||round.cooldown>0;
  setText($('ability').querySelector('span'),hide?'Відволікти шукача':'Прислухатися');
  setText($('ability-time'),round.cooldown>0?Math.ceil(round.cooldown)+' с':'');
  $('noise').hidden=!active||!hide||!round.player.hidden||round.phase==='prepare';
  $('noise-meter').value=round.player.noise;
  setText($('noise-time'),Math.max(0,Math.ceil(18-round.player.noise))+' с');
  for(const face of $('friends').children){
    const actor=round.hiders.find(a=>a.hero.id===face.dataset.hero);
    face.classList.toggle('found',actor.found);
    face.title=actor.hero.name+(actor.found?' · знайдено':'');
  }
  const seconds=Math.ceil(round.time);
  setText($('time'),Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'));
  $('time').classList.toggle('urgent',round.phase==='hunt'&&round.time<10);
  const phase=paused?'Пауза':round.phase==='ready'?'Обирай свою пригоду':
    round.phase==='prepare'?(hide?'Час ховатися':'Рахуй до трьох'):
      round.phase==='result'?'Раунд завершено':hide?'Тебе шукають':'Знайдено '+round.found+' / 2';
  setText($('phase'),phase);
  const item=round.nearby();
  const action=hide?(round.player.hidden?'Вийти':'Сховатися'):'Перевірити';
  setText($('touch-act'),action);
  let context='Клацни підлогу, щоб піти, або предмет, щоб діяти';
  if(active)context=round.action?'Перевіряємо схованку…':item?item.name+' · '+action.toLowerCase():
    hide?'Знайди предмет зі світлою позначкою':'Перевіряй предмети зі світлою позначкою';
  setText($('context'),context);setText($('action-key'),active?'E':'↗');
  $('scene-label').hidden=round.phase==='result'||paused||(round.phase==='prepare'&&!hide);
  let title=round.map.title,detail='Натисни «Грати», коли будеш готовий';
  if(active) {
    title=hide?(round.player.hidden?'Ти у схованці':'Тебе видно'):'Знайдено '+round.found+' із 2';
    detail=round.phase==='prepare'?'Встигни до кінця відліку':hide?'Q — відволікти шукача':'Q — почути підказку';
  }
  setText($('scene-label').querySelector('span'),title);
  setText($('scene-label').querySelector('small'),detail);
  if(performance.now()>noticeUntil){
    const note=!active?'Один гравець керує героєм, двома друзями керує гра.':
      round.phase==='prepare'?(hide?round.seeker.hero.name+' рахує. Час знайти схованку!':'Друзі ховаються…'):
        hide?(round.player.hidden?'Довго сидиш на місці — схованка почне шуміти.':'Тримайся подалі від шукача.'):
          'Дія Q підсвітить схованку одного з друзів.';
    setText($('notice'),note);
  }
  updateOverlay();
}
function updateOverlay() {
  const counting=round.phase==='prepare'&&round.role==='seek';
  const result=round.phase==='result';
  $('overlay').hidden=!paused&&!counting&&!result;
  $('again').hidden=!paused&&!result;
  $('choose').hidden=!result;
  if(paused){
    setText($('result-symbol'),'Ⅱ');setText($('result-title'),'Перепочинемо?');
    setText($('result-text'),'Таймер зачекає на тебе.');setText($('again'),'Продовжити');
  }else if(counting){
    setText($('result-symbol'),Math.ceil(round.time));setText($('result-title'),'Раз, два, три…');
    setText($('result-text'),'Друзі шукають найкращі схованки.');
  }else if(result){
    setText($('result-symbol'),round.win?'✦':'◒');
    const title=round.role==='seek'?(round.win?'Усіх знайдено!':'Друзі перехитрили тебе'):(round.win?'Тебе так і не знайшли!':'Тебе знайшли!');
    setText($('result-title'),title);
    setText($('result-text'),round.role==='seek'?'Знайдено друзів · '+round.found+' з 2':round.win?'Схованки й хитрощі спрацювали.':'Перемога шукача · '+round.seeker.hero.name+'.');
    setText($('again'),'Ще один раунд');
  }
}
function loadImage(hero,view) {
  const img=new Image();img.src='assets/'+hero.id+'-'+view+'.png';
  return img.decode().then(()=>img);
}
async function setup() {
  try {
    await Promise.all(HEROES.map(async hero=>{
      const [front,back,avatar]=await Promise.all(['front','back','avatar'].map(view=>loadImage(hero,view)));
      images[hero.id]={front,back,avatar};
    }));
    scene=new Scene(canvas,images);
    for(const hero of HEROES){
      const button=document.createElement('button');button.type='button';button.dataset.hero=hero.id;
      const portrait=images[hero.id].avatar.cloneNode();portrait.alt='';
      const label=document.createElement('span');label.textContent=hero.name;
      button.append(portrait,label);
      button.addEventListener('click',()=>{selections.hero=hero.id;reset();});
      heroButtons.set(hero.id,button);$('heroes').append(button);
    }
    for(const [id,map] of Object.entries(MAPS)){
      const button=document.createElement('button');button.type='button';button.dataset.map=id;
      const thumbnail=document.createElement('canvas');thumbnail.width=144;thumbnail.height=86;
      const mini=document.createElement('canvas');mini.width=800;mini.height=478;
      new Scene(mini,images).render(new Round(id,'slavik','hide'),0);
      const tc=thumbnail.getContext('2d');tc.imageSmoothingEnabled=false;tc.drawImage(mini,0,0,144,86);
      const text=document.createElement('span'),label=document.createElement('strong'),desc=document.createElement('small');
      label.textContent=map.title;desc.textContent=map.objects.length+' схованок';
      text.append(label,desc);button.append(thumbnail,text);
      button.addEventListener('click',()=>{selections.map=id;reset();});
      mapButtons.set(id,button);$('maps').append(button);
    }
    ready=true;reset();requestAnimationFrame(frame);
  }catch(error){
    $('notice').textContent='Не вдалося завантажити зображення. Перевір, чи папка assets лежить поруч із index.html.';
    $('start').textContent='Онови сторінку';
    console.error(error);
  }
}
roleButtons.forEach(b=>b.addEventListener('click',()=>{selections.role=b.dataset.role;reset();}));
$('start').addEventListener('click',()=>round.active?reset():begin());
$('pause').addEventListener('click',togglePause);
$('again').addEventListener('click',()=>paused?togglePause():begin());
$('choose').addEventListener('click',reset);
$('ability').addEventListener('click',()=>{if(!paused){round.ability();updateUI();document.activeElement?.blur();}});
$('touch-act').addEventListener('click',()=>{if(!paused){round.interact();updateUI();}});
$('sound').addEventListener('click',()=>{
  sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));
  $('sound').textContent=sound?'Звук увімкнено':'Звук вимкнено';
  if(sound)initAudio();
});
$('help').addEventListener('click',()=>{
  resumeAfterRules=round?.active&&!paused;
  if(resumeAfterRules)togglePause();
  $('rules').showModal();
});
$('rules').addEventListener('close',()=>{
  if(resumeAfterRules&&paused)togglePause();
  resumeAfterRules=false;
});
const keyDirections={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
window.addEventListener('keydown',e=>{
  if(!round?.active||$('rules').open||e.ctrlKey||e.altKey||e.metaKey)return;
  if(e.code==='Escape'&&!e.repeat){e.preventDefault();togglePause();return;}
  if(paused)return;
  if(keyDirections[e.code]){e.preventDefault();keys.add(e.code);}
  if(e.repeat)return;
  if(e.code==='KeyE'||e.code==='Space'&&!e.target.closest?.('button')){e.preventDefault();round.interact();updateUI();}
  if(e.code==='KeyQ'){e.preventDefault();round.ability();updateUI();}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&round?.active&&!paused)togglePause();
});
for(const button of document.querySelectorAll('[data-dir]')){
  button.addEventListener('pointerdown',e=>{
    e.preventDefault();button.setPointerCapture(e.pointerId);touches.set(e.pointerId,button);
    button.classList.add('held');
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture']){
    button.addEventListener(type,e=>{
      touches.delete(e.pointerId);
      if(![...touches.values()].includes(button))button.classList.remove('held');
    });
  }
}
function canvasPoint(e) {
  const r=canvas.getBoundingClientRect();
  return {x:(e.clientX-r.left)*800/r.width,y:(e.clientY-r.top)*478/r.height};
}
canvas.addEventListener('pointermove',e=>{if(scene){hover=scene.hit(canvasPoint(e));canvas.style.cursor=hover?'pointer':'crosshair';}});
canvas.addEventListener('pointerleave',()=>hover=null);
canvas.addEventListener('click',e=>{
  if(!round?.active||paused)return;
  const point=canvasPoint(e),item=scene.hit(point);
  if(round.player.hidden){if(item===round.player.hidden)round.interact();}
  else round.go(unproject(point.x,point.y),item);
  updateUI();
});
function frame(now) {
  const dt=Math.min(.04,(now-lastFrame)/1000);lastFrame=now;
  if(!paused){
    const directions=new Set([...Array.from(keys,key=>keyDirections[key]),...Array.from(touches.values(),b=>b.dataset.dir)]);
    round.step(dt,Number(directions.has('right'))-Number(directions.has('left')),Number(directions.has('down'))-Number(directions.has('up')));
  }
  scene.render(round,now,hover);
  if(now-lastHud>100){updateUI();lastHud=now;}
  requestAnimationFrame(frame);
}
setup();
