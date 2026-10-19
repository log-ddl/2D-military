import { icon } from './icons';
import type { StudioOptions } from './studio';
export function timecode(seconds: number) {
 const whole=Math.max(0,Math.floor(seconds));
 return whole>=3600 ? `${Math.floor(whole/3600)}:${String(Math.floor(whole/60)%60).padStart(2,'0')}:${String(whole%60).padStart(2,'0')}` : `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;
}
export function setupPlayerControls(opts: StudioOptions) {
 const ui=document.getElementById('ui')!;
 const scrub=document.getElementById('scrub') as HTMLInputElement;
 const marks=document.getElementById('marks')!;
 const info=document.getElementById('info')!;
 const duration=Number(scrub.max);
 scrub.setAttribute('aria-label','Tua video');
 const seekbar=document.createElement('div');seekbar.className='player-seekbar';
 marks.before(seekbar);seekbar.append(marks,scrub);
 for(const mark of marks.children) { (mark as HTMLElement).textContent=''; (mark as HTMLElement).removeAttribute('title'); }
 const tooltip=document.createElement('div');tooltip.className='player-seek-tooltip';tooltip.hidden=true;seekbar.append(tooltip);
 const controls=document.createElement('div');controls.id='transport-bar';
 const button=(id:string,name:string,label:string)=>`<button id="${id}" class="player-button" title="${label}" aria-label="${label}">${icon(name)}</button>`;
 controls.innerHTML=`<div class="player-controls-main">${button('tr-play','play','Phát (Space)')}${button('tr-back','back','Lùi 5 giây (←)')}${button('tr-fwd','forward','Tiến 5 giây (→)')}<span class="player-time"><span id="player-current">0:00</span><span class="player-time-divider">/</span>${timecode(duration)}</span><span class="player-chapter" id="player-chapter"></span></div><div class="player-controls-extra">${button('tr-loop','loop','Lặp cảnh hiện tại (L)')}${button('player-mute','volume','Tắt âm thanh')}<input id="player-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Âm lượng"/>${opts.hasSfx?`<button id="player-sfx" class="player-button active" title="Bật/tắt hiệu ứng âm thanh" aria-label="Hiệu ứng âm thanh" style="font-size:11px;font-weight:700;width:auto;padding:0 8px">SFX</button>`:''}${button('player-fullscreen','fullscreen','Toàn màn hình')}</div>`;
 ui.append(controls);info.hidden=true;
 const on=(id:string,fn:()=>void)=>document.getElementById(id)!.addEventListener('click',fn);
 on('tr-play',opts.togglePlay);on('tr-back',()=>opts.seek(opts.getCurrentTime()-5));on('tr-fwd',()=>opts.seek(opts.getCurrentTime()+5));on('tr-loop',opts.toggleLoop);
 const mute=document.getElementById('player-mute') as HTMLButtonElement,volume=document.getElementById('player-volume') as HTMLInputElement;
 mute.disabled=!opts.hasAudio;volume.disabled=!opts.hasAudio;
 let remembered=1;
 on('player-mute',()=>{const current=opts.getVolume();if(current>0){remembered=current;opts.setVolume(0);}else opts.setVolume(remembered);});
 volume.addEventListener('input',()=>opts.setVolume(Number(volume.value)));
 const sfxBtn=document.getElementById('player-sfx');
 if(sfxBtn)sfxBtn.addEventListener('click',()=>{const next=!opts.getSfx!();opts.setSfx!(next);sfxBtn.classList.toggle('active',next);sfxBtn.style.opacity=next?'1':'.45';});
 on('player-fullscreen',()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.getElementById('studio-viewport-wrap')!.requestFullscreen();});
 seekbar.addEventListener('pointermove',event=>{
  const bounds=seekbar.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width)),time=fraction*duration;
  const scene=opts.timeline.find(entry=>time>=entry.start&&time<entry.end);
  tooltip.textContent=`${timecode(time)}${scene ? ` · ${scene.id}` : ''}`;tooltip.style.left=`${Math.max(10,Math.min(90,fraction*100))}%`;tooltip.hidden=false;
 });
 seekbar.addEventListener('pointerleave',()=>{tooltip.hidden=true;});
 let lastPlaying:boolean|undefined,lastMuted:boolean|undefined;
 return {onTick(time:number){
  const progress=Math.min(100,time/duration*100);scrub.style.setProperty('--played',`${progress}%`);marks.style.setProperty('--played',`${progress}%`);
  const playing=opts.getPlaying(),play=document.getElementById('tr-play')!;
  if(playing!==lastPlaying){play.innerHTML=icon(playing?'pause':'play');play.setAttribute('aria-label',playing?'Tạm dừng (Space)':'Phát (Space)');play.setAttribute('title',playing?'Tạm dừng (Space)':'Phát (Space)');lastPlaying=playing;}
  const looping=opts.getLoop();document.getElementById('tr-loop')!.classList.toggle('active',looping);document.getElementById('tr-loop')!.setAttribute('aria-pressed',String(looping));
  document.getElementById('player-current')!.textContent=timecode(time);
  const scene=opts.timeline.find(entry=>time>=entry.start&&time<entry.end);document.getElementById('player-chapter')!.textContent=scene?.id||'';
  scrub.setAttribute('aria-valuetext',`${timecode(time)} / ${timecode(duration)}`);
  const muted=!opts.hasAudio||opts.getVolume()===0;
  if(muted!==lastMuted){mute.innerHTML=icon(muted?'muted':'volume');mute.title=muted?'Bật âm thanh':'Tắt âm thanh';mute.setAttribute('aria-label',mute.title);lastMuted=muted;}
  if(document.activeElement!==volume)volume.value=String(opts.getVolume());
 }};
}
