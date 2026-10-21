'use strict';
const $ = (selector) => document.querySelector(selector);
const wedding = new Date('2027-10-21T00:00:00-03:00').getTime();
const content=window.NOSSO_CASAMENTO;
const letters=content.cartas;
const safeRead = (key) => {try{return localStorage.getItem(key);}catch{return null;}};
const safeWrite = (key,value) => {try{localStorage.setItem(key,value);}catch{/* Private browsing and storage limits must not break the preview. */}};
let savedReadLetters=[];
try{const saved=JSON.parse(safeRead('nosso-sim-read') || '[]');if(Array.isArray(saved))savedReadLetters=saved.filter(value=>typeof value==='string');}catch{/* Ignore malformed old preview state. */}
const readLetters = new Set(savedReadLetters);
let openingTimer;
let statusTimer;
let renderedReleaseSignature='';
function escapeText(text){return String(text??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function icon(name){return `<svg aria-hidden="true"><use href="#${name}"/></svg>`;}
function releaseTime(letter){return letter.date?new Date(letter.date).getTime():NaN;}
function hasLetterContent(letter){return Array.isArray(letter.body)&&letter.body.some(text=>typeof text==='string'&&text.trim().length>0);}
function isReady(letter){return hasLetterContent(letter)&&Number.isFinite(releaseTime(letter))&&Date.now()>=releaseTime(letter);}
function renderLetters(){
  const focused=document.activeElement?.dataset?.letter;
  renderedReleaseSignature=letters.map(letter=>isReady(letter)).join(',');
  $('#letter-track').innerHTML = letters.map(letter => `<article class="letter-card ${isReady(letter)?'':'is-locked'}"><button class="envelope-button ${letter.color} ${isReady(letter)?'':'is-locked'}" data-letter="${letter.id}" aria-label="${isReady(letter)?'Abrir':'Ver tempo para abrir'}: ${escapeText(letter.title)}"><span class="envelope-number">CARTA 0${letters.indexOf(letter)+1}</span><span class="seal">${isReady(letter)?'♡':icon('lock')}</span>${letter.color?'<svg class="envelope-botanical" aria-hidden="true"><use href="#sprig"/></svg>':''}<span class="envelope-inscription">${escapeText(letter.inscription)}</span></button><div class="letter-meta"><h3>${escapeText(letter.title)}</h3>${icon(isReady(letter)?'arrow':'lock')}</div><p class="letter-state ${isReady(letter)?'ready':''}" data-state="${letter.id}"></p></article>`).join('') || '<p class="empty-letters">Cada carta tem sua hora. Em breve, mais palavras para você. ♡</p>';
  updateLetterTimers();
  if(focused)$(`[data-letter="${focused}"]`)?.focus({preventScroll:true});
}
function parts(totalMs){
  const total = Math.max(0,Math.floor(totalMs/1000));
  return {days:Math.floor(total/86400),hours:Math.floor(total/3600)%24,minutes:Math.floor(total/60)%60,seconds:total%60};
}
function pad(number){return String(number).padStart(2,'0');}
function updateCountdown(){
  const remaining = wedding-Date.now();
  const p=parts(remaining);
  for(const key of ['days','hours','minutes','seconds'])$('#'+key).textContent=pad(p[key]);
  if(remaining<=0)$('#countdown-note').textContent='O nosso para sempre chegou. Que venham todos os próximos capítulos.';
}
function updateLetterTimers(){
  if(renderedReleaseSignature!==letters.map(letter=>isReady(letter)).join(',')){renderLetters();announce('Uma nova carta acabou de chegar para você. ♡');return;}
  for(const letter of letters){
    const el=$(`[data-state="${letter.id}"]`);
    if(!el)continue;
    const ready=isReady(letter);
    if(ready){el.textContent=readLetters.has(letter.id)?'Aberta · leia de novo':'Disponível para você';}
    else if(!Number.isFinite(releaseTime(letter))){el.textContent='Ainda é um segredo';}
    else if(Date.now()>=releaseTime(letter)&&!hasLetterContent(letter)){el.textContent='Estou preparando esta carta para você';}
    else{const p=parts(releaseTime(letter)-Date.now());el.innerHTML=`Libera em <span class="letter-timer">${p.days?`${p.days} dias · `:''}${pad(p.hours)}h ${pad(p.minutes)}m ${pad(p.seconds)}s</span>`;}
  }
}
function announce(message){clearTimeout(statusTimer);const el=$('#status-message');el.textContent=message;el.classList.add('visible');statusTimer=setTimeout(()=>el.classList.remove('visible'),4500);}
function showDialog(dialog){if(!dialog.open)dialog.showModal();}
function openLetter(id,keyboard=false){
  const letter=letters.find(item=>item.id===id);
  if(!letter)return;
  if(!isReady(letter)&&(!Number.isFinite(releaseTime(letter))||Date.now()>=releaseTime(letter))){announce('Esta carta ainda está sendo preparada com carinho. ♡');return;}
  if(!isReady(letter)){const time=new Date(releaseTime(letter)).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'long',timeStyle:'short'});announce('Ainda é um segredo. Sua carta abre em '+time+'.');return;}
  clearTimeout(openingTimer);
  const dialog=$('#letter-dialog');
  $('#paper-title').textContent=letter.heading;
  $('.signature').hidden=!letter.signature;
  if(letter.signature)$('.signature').textContent=letter.signature;
  $('#paper-date').textContent=new Date(releaseTime(letter)).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'numeric',month:'long',year:'numeric'});
  $('#paper-body').replaceChildren(...letter.body.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));
  dialog.classList.remove('unfold','opening');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced&&!keyboard)dialog.classList.add('opening');
  showDialog(dialog);dialog.scrollTop=0;
  if(!reduced&&!keyboard){requestAnimationFrame(()=>requestAnimationFrame(()=>dialog.classList.add('unfold')));openingTimer=setTimeout(()=>{dialog.classList.remove('opening','unfold');dialog.scrollTop=0;},1050);}
  readLetters.add(id);safeWrite('nosso-sim-read',JSON.stringify([...readLetters]));updateLetterTimers();
}
$('#letter-track').addEventListener('click',event=>{const button=event.target.closest('[data-letter]');if(button)openLetter(button.dataset.letter,event.detail===0);});
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{if(dialog.id==='letter-dialog'){clearTimeout(openingTimer);dialog.classList.remove('opening','unfold');}});
});
function updateNavigation(target){document.querySelectorAll('nav a').forEach(link=>{const active=link.getAttribute('href')===target;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}
document.querySelectorAll('nav a').forEach(link=>link.addEventListener('click',()=>updateNavigation(link.getAttribute('href'))));
let navigationFrame=false;
addEventListener('scroll',()=>{if(navigationFrame)return;navigationFrame=true;requestAnimationFrame(()=>{let active='#inicio';for(const id of ['musica','cartas'])if($('#'+id).getBoundingClientRect().top<=innerHeight*.35)active='#'+id;updateNavigation(active);navigationFrame=false;});},{passive:true});
updateNavigation(['#cartas','#musica'].includes(location.hash)?location.hash:'#inicio');
let photoSlides=[];
const photoMotion=matchMedia('(prefers-reduced-motion: reduce)');
let currentPhoto=0;
let photoRotationTimer=null;
function showPhoto(index){currentPhoto=index;photoSlides.forEach((slide,i)=>{slide.classList.toggle('is-active',i===index);slide.setAttribute('aria-hidden',String(i!==index));});}
function schedulePhotoRotation(){clearInterval(photoRotationTimer);if(!photoMotion.matches&&!document.hidden&&photoSlides.length>1)photoRotationTimer=setInterval(()=>showPhoto((currentPhoto+1)%photoSlides.length),1800000);}
function renderPhotos(){
  const slides=content.fotos.map((photo,index)=>{
    const slide=document.createElement('div');slide.className='hero-slide';slide.dataset.format=photo.formato;
    for(const backdrop of [true,false]){const img=document.createElement('img');img.className=backdrop?'photo-backdrop':'hero-photo';img.src=photo.src;img.alt=backdrop?'':'Uma lembrança nossa juntos';if(backdrop)img.setAttribute('aria-hidden','true');else img.style.objectPosition=photo.posicao||'50% 50%';slide.append(img);}
    return slide;
  });
  $('#hero-image').replaceChildren(...slides);photoSlides=slides;showPhoto(0);schedulePhotoRotation();
}
photoMotion.addEventListener('change',schedulePhotoRotation);
document.addEventListener('visibilitychange',schedulePhotoRotation);
renderPhotos();
const audio=$('#audio');
$('#track-name').textContent=content.musica.titulo;
$('#track-subtitle').textContent=content.musica.artista;
if(content.musica.audio)audio.src=content.musica.audio;
if(content.musica.capa){$('#album-image').src=content.musica.capa;$('#album-image').alt='Capa de '+content.musica.titulo;}
if(!content.musica.audio)$('#audio-status').textContent='A música está escolhida. O áudio chega em breve.';
const favorite=$('#favorite');
favorite.setAttribute('aria-pressed',String(safeRead('nosso-sim-favorite')==='true'));
favorite.setAttribute('aria-label',favorite.getAttribute('aria-pressed')==='true'?'Remover música dos favoritos':'Guardar música como favorita');
favorite.addEventListener('click',()=>{const selected=favorite.getAttribute('aria-pressed')!=='true';favorite.setAttribute('aria-pressed',String(selected));favorite.setAttribute('aria-label',selected?'Remover música dos favoritos':'Guardar música como favorita');safeWrite('nosso-sim-favorite',String(selected));});
function formatAudioTime(seconds){if(!Number.isFinite(seconds))return '--:--';return Math.floor(seconds/60)+':'+pad(Math.floor(seconds)%60);}
function updateAudioProgress(){
  $('#audio-current').textContent=formatAudioTime(audio.currentTime);
  $('#audio-duration').textContent=formatAudioTime(audio.duration);
  const progress=Number.isFinite(audio.duration)&&audio.duration>0?audio.currentTime/audio.duration*100:0;
  $('#audio-seek').disabled=!(Number.isFinite(audio.duration)&&audio.duration>0);
  $('#audio-seek').value=progress;
  $('#audio-seek').style.setProperty('--progress',progress+'%');
}
['loadedmetadata','durationchange','timeupdate','ended'].forEach(name=>audio.addEventListener(name,updateAudioProgress));
$('#audio-seek').addEventListener('input',event=>{if(Number.isFinite(audio.duration)&&audio.duration>0){audio.currentTime=Number(event.target.value)/100*audio.duration;updateAudioProgress();}});
function updatePlayer(){const available=!!audio.getAttribute('src');$('#play-button').disabled=!available;$('#restart-track').disabled=!available;const playing=!audio.paused&&!audio.ended;const label=playing?'Pausar a música':'Ouvir a música';$('#play-label').textContent=label;$('#play-icon').textContent=playing?'Ⅱ':'▶';$('#play-button').setAttribute('aria-pressed',String(playing));$('#play-button').title=label;$('#playback-state').textContent=!available?'ÁUDIO EM PREPARAÇÃO':playing?'TOCANDO AGORA · A NOSSA TRILHA':'ESCOLHIDA COM AMOR, PARA VOCÊ';$('#musica').classList.toggle('is-playing',playing);}
$('#play-button').addEventListener('click',async()=>{try{if(audio.paused){await audio.play();$('#audio-status').textContent='';}else audio.pause();}catch{$('#audio-status').textContent='Não foi possível tocar esta música. Tente novamente.';}updatePlayer();});
['play','pause','ended'].forEach(name=>audio.addEventListener(name,updatePlayer));
audio.addEventListener('error',()=>{$('#audio-status').textContent='Áudio indisponível. Verifique o arquivo na pasta Nossa Música.';updatePlayer();});
$('#repeat').addEventListener('click',()=>{audio.loop=!audio.loop;$('#repeat').setAttribute('aria-pressed',String(audio.loop));$('#repeat').title=audio.loop?'Repetição ativada':'Repetição desativada';});
$('#restart-track').addEventListener('click',()=>{audio.currentTime=0;updateAudioProgress();});
renderLetters();updateCountdown();updatePlayer();updateAudioProgress();setInterval(()=>{updateCountdown();updateLetterTimers();},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateCountdown();updateLetterTimers();updatePlayer();}});
if('serviceWorker' in navigator && ['http:','https:'].includes(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{/* The prototype remains usable without offline installation. */});

let syncing=false;
async function syncFolders(){
  if(!content.folderSync||syncing||document.hidden)return;
  syncing=true;
  try{
    const response=await fetch('./api/content',{cache:'no-store'});if(!response.ok)return;
    const next=await response.json();
    if(JSON.stringify(next.fotos)!==JSON.stringify(content.fotos)){content.fotos=next.fotos;renderPhotos();}
    if(JSON.stringify(next.musica)!==JSON.stringify(content.musica)){
      const sourceChanged=next.musica.audio!==content.musica.audio;
      content.musica=next.musica;
      $('#track-name').textContent=next.musica.titulo;$('#track-subtitle').textContent=next.musica.artista;
      $('#album-image').src=next.musica.capa||'icon.svg';$('#album-image').alt='Capa de '+next.musica.titulo;
      if(sourceChanged){audio.pause();if(next.musica.audio)audio.src=next.musica.audio;else audio.removeAttribute('src');audio.load();$('#audio-status').textContent='';updatePlayer();updateAudioProgress();}
    }
    if(JSON.stringify(next.cartas)!==JSON.stringify(letters)){letters.splice(0,letters.length,...next.cartas);renderLetters();}
  }catch{/* Keep the current content during a temporary network interruption. */}
  finally{syncing=false;}
}
setInterval(syncFolders,15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncFolders();});
