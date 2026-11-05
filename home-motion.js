// Only active scenes are updated, once per animation frame after scrolling.
const media=[...document.querySelectorAll('.story-image,.shoe-edit .editorial-media,.signature .editorial-media')];
for(const host of media){
 const image=document.createElement('div');
 image.className='scene-image';
 image.style.backgroundImage=getComputedStyle(host).backgroundImage;
 image.setAttribute('aria-hidden','true');
 host.style.backgroundImage='none';
 host.append(image);
}
const scenes=[...media,document.querySelector('.newsletter')].filter(Boolean);
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const active=new Set();let frame=0;
function paint(){
 frame=0;
 if(motion.matches)return;
 const height=innerHeight,range=innerWidth<=800?16:32;
 for(const scene of active){
  const rect=scene.getBoundingClientRect();
  const progress=Math.max(-1,Math.min(1,(height/2-rect.top-rect.height/2)/((height+rect.height)/2)));
  scene.style.setProperty('--scene-drift',`${(progress*range).toFixed(2)}px`);
 }
}
function schedule(){if(!frame&&!motion.matches)frame=requestAnimationFrame(paint);}
const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)active.add(entry.target);else active.delete(entry.target);}schedule();},{rootMargin:'100px'});
scenes.forEach(scene=>observer.observe(scene));
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',schedule,{passive:true});
motion.addEventListener('change',()=>{scenes.forEach(scene=>scene.style.removeProperty('--scene-drift'));schedule();});
