import { CONFIG, CATEGORIES } from './config.js';
import { demo } from './storefront-api.js';
export const $ = (id) => document.getElementById(id);
export const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function link(file,params={}) { const url=new URL(file,location.href);for(const [key,value] of Object.entries(params))if(value!=null&&value!=='')url.searchParams.set(key,value);if(demo)url.searchParams.set('demo','1');return url.pathname.split('/').pop()+url.search+url.hash; }
export const categoryLink = category => link(({all:'shop',bags:'handbags',shoes:'shoes',sunglasses:'sunglasses',accessories:'accessories',fashion:'fashion',beauty:'hair-beauty',new:'new-arrivals'}[category]||'shop')+'.html');
export const money = (amount,currency='GBP') => new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(Number(amount||0));
export const icons = {
 search:'<circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 5 5"/>',
 heart:'<path d="M20.3 5.4a4.5 4.5 0 0 0-6.4 0L12 7.2l-1.9-1.8a4.5 4.5 0 0 0-6.4 6.3l8.3 8.1 8.3-8.1a4.5 4.5 0 0 0 0-6.3Z"/>',
 bag:'<path d="M4.5 8.5h15l-1 12h-13l-1-12Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
 menu:'<path d="M3 7h18M3 12h18M3 17h18"/>',close:'<path d="m5 5 14 14M19 5 5 19"/>',filter:'<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>'
};
export const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||''}</svg>`;
export function imageMarkup(image,classes='',lazy=true) {
 const src=image?.url||'assets/image-unavailable.svg';let sizes='',srcset='';
 if(src.startsWith('https://cdn.shopify.com/')) {
   srcset=` srcset="${[320,640,960,1440,2000].map(w=>{const u=new URL(src);u.searchParams.set('width',w);return `${escape(u.href)} ${w}w`;}).join(', ')}"`;
   sizes=' sizes="(max-width:800px) 50vw, (min-width:1920px) 30vw, 25vw"';
 }
 return `<img class="${classes}" src="${escape(src)}"${srcset}${sizes} alt="${escape(image?.altText||'Product photograph')}" loading="${lazy?'lazy':'eager'}" decoding="async"${image?.width?` width="${image.width}" height="${image.height}"`:''}>`;
}
export function skeleton(count=8){return `<div class="catalog-grid">${Array.from({length:count},()=>'<div class="skeleton-card" aria-hidden="true"><div></div><span></span><span></span></div>').join('')}</div><span class="sr-only" role="status">Loading pieces…</span>`;}
export function empty(title,description,action=`<a class="button button-outline" href="${link('shop.html')}">Explore the edit</a>`){return `<div class="empty-state"><h2>${escape(title)}</h2><p>${escape(description)}</p>${action}</div>`;}
export function errorMarkup(message){return empty('A little pause.',message,`<button class="button button-outline" data-retry>Try again</button>`);}
let toastTimer;
export function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
let activePanel=null,restoreFocus=null,closeTimer,closingPanel;
export function closePanel() {
 if(!activePanel)return;
 const panel=activePanel;activePanel=null;panel.classList.remove('open','is-open');panel.setAttribute('aria-hidden','true');panel.inert=true;
 $('overlay').classList.remove('is-open');$('overlay').hidden=true;document.body.classList.remove('no-scroll');
 document.querySelectorAll('#siteHeader,main,#footer').forEach(el=>el.inert=false);
 $('menuOpen')?.setAttribute('aria-expanded','false');
 closingPanel=panel;closeTimer=setTimeout(()=>{panel.hidden=true;if(closingPanel===panel)closingPanel=null;},300);
 if(restoreFocus?.isConnected)restoreFocus.focus();
}
export function openPanel(id) {
 if(activePanel=== $(id))return;
 if(activePanel) {activePanel.hidden=true;closePanel();}
 const panel=$(id);if(closingPanel&&closingPanel!==panel)closingPanel.hidden=true;clearTimeout(closeTimer);closingPanel=null;restoreFocus=document.activeElement;activePanel=panel;
 panel.hidden=false;panel.inert=false;panel.setAttribute('aria-hidden','false');
 document.querySelectorAll('#siteHeader,main,#footer').forEach(el=>el.inert=true);
 $('overlay').hidden=false;requestAnimationFrame(()=>{$('overlay').classList.add('is-open');panel.classList.add('open','is-open');});
 document.body.classList.add('no-scroll');if(id==='mobileMenu')$('menuOpen').setAttribute('aria-expanded','true');
 setTimeout(()=>{const target=id==='searchDialog'?panel.querySelector('#searchInput'):panel.querySelector('[data-close]')||panel.querySelector('input,button,a,[tabindex="0"]');target?.focus();},50);
}
export function mountShell() {
 const home=document.body.dataset.page==='home';
 const navItems=[['all','Shop all'],['new','New arrivals'],['bags','Handbags'],['shoes','Shoes'],['sunglasses','Sunglasses'],['accessories','Accessories & jewellery'],['fashion','Fashion'],['beauty','Hair & beauty']];
 const logo='<img src="assets/bp-luxe-relove-logo.svg" alt="BP Luxe Relove" width="125" height="98">';
 $('siteHeaderMount').innerHTML=`<a class="skip-link" href="#main">Skip to content</a><header class="site-header${home?'':' scrolled'}" id="siteHeader"><div class="header-inner site-width"><nav class="header-nav" aria-label="Primary navigation">${[['all','Shop'],['bags','Handbags'],['shoes','Shoes'],['accessories','Accessories']].map(([key,label])=>`<a href="${categoryLink(key)}">${label}</a>`).join('')}</nav><a class="brand" href="${link('index.html')}" aria-label="BP Luxe Relove home">${logo}</a><div class="header-tools"><a class="header-about" href="${link('about.html')}">Our story</a><button type="button" class="icon-button" id="searchOpen" data-open="searchDialog" aria-label="Search products">${icon('search')}</button><a class="icon-button favorites-button" href="${link('wishlist.html')}" aria-label="Saved pieces">${icon('heart')}<span class="tiny-count" id="savedCount" hidden>0</span></a><button type="button" class="icon-button bag-button" id="cartOpen" data-open="cartDrawer" aria-label="Open shopping bag">${icon('bag')}<span class="tiny-count" id="cartCount">0</span></button><button type="button" class="icon-button mobile-toggle" id="menuOpen" data-open="mobileMenu" aria-controls="mobileMenu" aria-label="Open navigation" aria-expanded="false">${icon('menu')}</button></div></div></header>
 <div class="mobile-menu" id="mobileMenu" role="dialog" aria-modal="true" aria-label="Navigation" aria-hidden="true" hidden inert><div class="mobile-menu__top"><a class="mobile-menu__brand" href="${link('index.html')}">${logo}</a><button class="mobile-menu__close" type="button" data-close aria-label="Close navigation">${icon('close')}<span>Close</span></button></div><nav class="mobile-menu__content" aria-label="Mobile navigation"><div class="mobile-menu__links">${navItems.map(([key,label],i)=>`<a href="${categoryLink(key)}"><span class="mobile-menu__number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span>${label}</span></a>`).join('')}<div class="mobile-menu__utility"><button type="button" data-open="searchDialog">Search</button><a href="${link('wishlist.html')}">Wishlist</a><a href="${link('about.html')}">Our story</a></div></div></nav><div class="mobile-menu__bottom"><span></span><span>BP Luxe Relove</span><span></span></div></div>`;
 $('siteFooterMount').innerHTML=`<footer class="site-footer" id="footer"><div class="site-width footer-main"><div class="footer-brand"><a href="${link('index.html')}">${logo}</a><p>Curated pieces. New stories.<br>Luxury to love again.</p></div><div class="footer-col"><h3>The edit</h3>${navItems.slice(0,5).map(([key,label])=>`<a href="${categoryLink(key)}">${label}</a>`).join('')}</div><div class="footer-col"><h3>Discover</h3><a href="${link('about.html')}">Our story</a><a href="${link('authentication.html')}">Condition & authentication</a><a href="${link('wishlist.html')}">Saved pieces</a><a href="${link('contact.html')}">Contact us</a><a href="${link('faq.html')}">FAQs</a></div><div class="footer-col"><h3>Help & information</h3>${[['delivery','Delivery information'],['returns','Returns & refunds'],['privacy','Privacy policy'],['terms','Terms & conditions']].map(([key,label])=>`<a href="${link(key+'.html')}">${label}</a>`).join('')}</div></div><div class="site-width footer-bottom"><span>© ${new Date().getFullYear()} BP Luxe Relove</span><span>Powered by Shopify</span></div></footer>`;
 document.body.insertAdjacentHTML('beforeend',`<div class="overlay" id="overlay" hidden></div>
 <aside class="drawer commerce-drawer" id="cartDrawer" role="dialog" aria-modal="true" aria-label="Shopping bag" aria-hidden="true" hidden inert><div class="drawer-top"><h2>Your bag</h2><button class="drawer-close" type="button" data-close aria-label="Close bag">${icon('close')}</button></div><div class="drawer-content" id="miniCart"><p>Loading your bag…</p></div><div class="drawer-bottom" id="miniCartBottom"></div></aside>
 <div class="search-dialog" id="searchDialog" role="dialog" aria-modal="true" aria-label="Search the collection" aria-hidden="true" hidden inert><div class="search-box"><button class="drawer-close" type="button" data-close aria-label="Close search">${icon('close')}</button><h2>What will you find?</h2><form id="globalSearch"><label class="sr-only" for="searchInput">Search the collection</label><input id="searchInput" name="q" type="search" placeholder="A brand, a piece, a possibility…" required minlength="2" autocomplete="off" aria-controls="searchSuggestions"><button class="button button-solid" type="submit">Search</button></form><div id="searchSuggestions" aria-live="polite"></div><p class="search-hint">Discover the pieces that speak to you.</p></div></div>
 <aside class="drawer commerce-drawer" id="filterDrawer" role="dialog" aria-modal="true" aria-label="Filter products" aria-hidden="true" hidden inert><div class="drawer-top"><h2>Refine the edit</h2><button class="drawer-close" type="button" data-close aria-label="Close filters">${icon('close')}</button></div><div class="drawer-content" id="mobileFilters"></div></aside>
 <div id="lightbox" class="lightbox" role="dialog" aria-modal="true" aria-label="Product image viewer" aria-hidden="true" hidden inert><button class="drawer-close" type="button" data-close aria-label="Close image viewer">${icon('close')}</button><button class="lightbox-nav prev" type="button" data-gallery-step="-1" aria-label="Previous image">‹</button><img id="zoomImage" alt=""><button class="lightbox-nav next" type="button" data-gallery-step="1" aria-label="Next image">›</button><span id="zoomCount"></span></div><div class="toast" id="toast" role="status" aria-live="polite"></div>`);
 if(demo){document.body.classList.add('demo-mode');document.body.insertAdjacentHTML('afterbegin',`<div class="demo-banner">Illustrated demo catalogue · Nothing here is for sale <a href="shop.html" data-exit-demo>Return to live shop</a></div>`);}
 document.addEventListener('click',event=>{
   const open=event.target.closest('[data-open]');if(open)openPanel(open.dataset.open);
   if(event.target.closest('[data-close]')||event.target===$('overlay'))closePanel();
 });
 document.addEventListener('keydown',event=>{
   if(event.key==='Escape')closePanel();
   if(event.key==='Tab'&&activePanel){const items=[...activePanel.querySelectorAll('button:not(:disabled),a,input,select,summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);if(!items.length)return;const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
 });
 document.addEventListener('error',event=>{if(event.target.tagName==='IMG'&&!event.target.dataset.failed){event.target.dataset.failed='1';event.target.removeAttribute('srcset');event.target.src='assets/image-unavailable.svg';}},true);
 const header=()=>{$('siteHeader').classList.toggle('scrolled',!home||scrollY>25);};window.addEventListener('scroll',header,{passive:true});header();
 window.matchMedia('(min-width:801px)').addEventListener('change',e=>{if(e.matches&&activePanel?.id==='mobileMenu')closePanel();});
 if(!$('pageLoader'))document.body.insertAdjacentHTML('afterbegin','<div class="page-loader" id="pageLoader" role="status" aria-label="Loading BP Luxe Relove"><div class="page-loader__inner"><img class="page-loader__logo" src="assets/bp-luxe-relove-logo.svg" alt="" width="160" height="136"><span class="page-loader__rule" aria-hidden="true"></span><span class="page-loader__progress" aria-hidden="true"><span></span></span></div></div>');
 { const loader=$('pageLoader');const start=performance.now();let closing=false;const close=()=>{if(closing)return;closing=true;setTimeout(()=>{loader?.classList.add('is-exiting');document.body.classList.add('page-ready','hero-intro-ready');setTimeout(()=>loader?.remove(),710);},Math.max(0,550-(performance.now()-start)));};if(document.readyState==='complete')close();else window.addEventListener('load',close,{once:true});setTimeout(close,5500); }
}
let observer;
const observedTargets=new Set();
export function reveals(root=document){
 if(!observer&&'IntersectionObserver'in window)observer=new IntersectionObserver(entries=>entries.forEach(e=>{e.target.classList.toggle('from-top',e.boundingClientRect.top<0);e.target.classList.toggle('in-view',e.isIntersecting);}),{threshold:0,rootMargin:'-35px 0px -35px 0px'});
 observedTargets.forEach(el=>{if(!el.isConnected){observer?.unobserve(el);observedTargets.delete(el);}});
 root.querySelectorAll('.reveal').forEach(el=>{if(observer&&!observedTargets.has(el)){observer.observe(el);observedTargets.add(el);}else if(!observer)el.classList.add('in-view');});
}
export function metadata(title,description){document.title=`${title} | BP Luxe Relove`;let meta=document.querySelector('meta[name="description"]');if(!meta){meta=document.createElement('meta');meta.name='description';document.head.append(meta);}meta.content=description;for(const [name,content]of [['og:title',document.title],['og:description',description],['og:type','website']]){let tag=document.querySelector(`meta[property="${name}"]`);if(!tag){tag=document.createElement('meta');tag.setAttribute('property',name);document.head.append(tag);}tag.content=content;}let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}const url=new URL(location.href);url.searchParams.delete('demo');url.searchParams.delete('variant');url.hash='';canonical.href=CONFIG.siteUrl?new URL(url.pathname.split('/').pop()+url.search,CONFIG.siteUrl.replace(/\/?$/,'/')).href:url.href;if(demo&&!document.querySelector('meta[name="robots"]')){const robots=document.createElement('meta');robots.name='robots';robots.content='noindex,nofollow';document.head.append(robots);}}
export function sanitize(html){
 const t=document.createElement('template');t.innerHTML=html;
 const tags=new Set(['P','DIV','SPAN','H1','H2','H3','H4','H5','H6','UL','OL','LI','BR','STRONG','B','EM','I','U','A','TABLE','THEAD','TBODY','TR','TD','TH','BLOCKQUOTE','HR']);
 t.content.querySelectorAll('*').forEach(el=>{if(!tags.has(el.tagName)){el.remove();return;}for(const a of [...el.attributes]){if(a.name==='href'&&el.tagName==='A'){if(!/^(https?:|mailto:|tel:|#)/i.test(a.value))el.removeAttribute(a.name);}else el.removeAttribute(a.name);}if(el.tagName==='A'){el.rel='noopener';}});
 return t.innerHTML;
}
