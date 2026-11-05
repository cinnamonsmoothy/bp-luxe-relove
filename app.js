import { CONFIG, CATEGORIES } from './config.js';
import * as api from './storefront-api.js';
import { $, escape as e, link, categoryLink, money, icon, imageMarkup, skeleton, empty, errorMarkup, toast, openPanel, closePanel, mountShell, reveals, metadata, sanitize } from './ui.js';
import { subscribe, initCart, addItem, changeLine, checkout, wishlist, toggleSaved, savedProducts, readLocal, writeLocal, wishlistKey } from './cart.js';

mountShell();
const page=document.body.dataset.page;
const registry=new Map();
const register=products=>products.forEach(p=>registry.set(p.id,p));
const productUrl=p=>link('product.html',{handle:p.handle});
let listing=[],lastResult=null,listingRun=0,homeCategory='bags';
let currentProduct=null,currentVariant=null,galleryIndex=0;
const recentKey=api.demo?'bp-recent-demo-v1':'bp-recent-live-v1';
const main=$('storefront');
const selectionLabel=v=>v?.selectedOptions?.filter(o=>o.value!=='Default Title').map(o=>o.value).join(' / ')||'';

function card(p){
 const saved=wishlist.has(p.id),sale=p.compare>p.price;
 const isNew=Number.isFinite(Date.parse(p.createdAt))&&Date.now()-Date.parse(p.createdAt)<CONFIG.newArrivalDays*86400000;
 const label=!p.available?'Sold out':sale?'Sale':isNew?'New arrival':'';
 const single=p.variants.length===1;
 return `<article class="catalog-card reveal"><div class="catalog-image"><a class="product-image-link" href="${productUrl(p)}" aria-label="View ${e(p.title)}">${imageMarkup(p.images[0])}${p.images[1]?imageMarkup(p.images[1],'secondary-image'):''}</a>${label?`<span class="product-badge${sale?' sale':''}">${label}</span>`:''}<button class="card-heart${saved?' saved':''}" type="button" data-save="${e(p.id)}" aria-label="${saved?'Remove':'Save'} ${e(p.title)}${saved?' from':' to'} wishlist" aria-pressed="${saved}">${icon('heart')}</button></div><div class="catalog-info">${p.vendor?`<span class="catalog-vendor">${e(p.vendor)}</span>`:''}<h3><a href="${productUrl(p)}">${e(p.title)}</a></h3><p class="catalog-price">${p.maxPrice>p.price?'From ':''}${money(p.price,p.currency)}${sale?` <s>${money(p.compare,p.currency)}</s>`:''}</p>${!p.available?'<span class="card-unavailable">No longer available</span>':single?`<button type="button" class="quick-add" data-add="${e(p.id)}">Add to bag</button>`:`<a class="quick-add" href="${productUrl(p)}">Choose options</a>`}</div></article>`;
}
function cards(products){register(products);queueMicrotask(()=>reveals());return `<div class="catalog-grid">${products.map(card).join('')}</div>`;}
function updateSaved(){
 $('savedCount').textContent=wishlist.size;$('savedCount').hidden=!wishlist.size;
 document.querySelectorAll('[data-save]').forEach(button=>{const saved=wishlist.has(button.dataset.save);button.classList.toggle('saved',saved);button.setAttribute('aria-pressed',String(saved));const p=registry.get(button.dataset.save);button.setAttribute('aria-label',`${saved?'Remove':'Save'} ${p?.title||'piece'} ${saved?'from':'to'} wishlist`);});
}
window.addEventListener('wishlistchange',()=>{updateSaved();if(page==='wishlist')renderWishlist();});
updateSaved();

function cartLines(cart,busy){return cart.lines.nodes.map(line=>{const v=line.merchandise,p=v.product;
 return `<article class="bag-line"><a href="${link('product.html',{handle:p.handle})}">${imageMarkup(v.image||p.featuredImage)}</a><div class="bag-line-info"><h3><a href="${link('product.html',{handle:p.handle})}">${e(p.title)}</a></h3><p>${e(selectionLabel(v))}</p><p>${money(line.cost.amountPerQuantity.amount,line.cost.amountPerQuantity.currencyCode)}</p>${!v.availableForSale?'<p class="form-error">This selection is no longer available.</p>':''}<div class="bag-line-actions"><div class="quantity-control"><button type="button" data-line="${e(line.id)}" data-quantity="${line.quantity-1}" aria-label="Decrease quantity of ${e(p.title)}" ${busy?'disabled':''}>−</button><span aria-label="Quantity">${line.quantity}</span><button type="button" data-line="${e(line.id)}" data-quantity="${line.quantity+1}" aria-label="Increase quantity of ${e(p.title)}" ${busy||!v.availableForSale?'disabled':''}>+</button></div><button class="plain-link" type="button" data-line="${e(line.id)}" data-quantity="0" ${busy?'disabled':''}>Remove</button></div></div><strong class="bag-line-total">${money(line.cost.totalAmount.amount,line.cost.totalAmount.currencyCode)}</strong></article>`;
 }).join('');}
function bagSummary(cart,busy,problem,mini=false){const cost=cart?.cost;return `${problem?`<p class="form-error" role="alert">${e(problem)}</p>`:''}${cart?.totalQuantity?`<div class="bag-subtotal"><span>Subtotal</span><strong>${money(cost.subtotalAmount.amount,cost.subtotalAmount.currencyCode)}</strong></div><p class="muted">Delivery, taxes and any applicable discounts are confirmed at Shopify checkout.</p>${api.demo?'<p class="demo-notice">Illustrated preview only. Sample pieces cannot be purchased.</p>':''}<button type="button" class="button button-solid full-width" data-checkout ${busy||api.demo?'disabled':''}>${busy?'Updating your bag…':api.demo?'Demo checkout unavailable':'Continue to checkout'}</button>${mini?`<a class="plain-link bag-full-link" href="${link('cart.html')}">View your shopping bag</a>`:''}`:''}`;}
function renderCart({cart,busy,problem}){
 $('cartCount').textContent=cart?.totalQuantity||0;
 const content=cart?.totalQuantity?cartLines(cart,busy):busy?'<p class="muted" role="status">Refreshing your bag…</p>':empty('A little room for something special.','Your bag is empty. Find a piece to make your own.');
 $('miniCart').innerHTML=content;$('miniCartBottom').innerHTML=bagSummary(cart,busy,problem,true);
 if(page==='cart'){
   main.innerHTML=`<div class="page-heading site-width"><h1>Your shopping bag</h1><p>A new chapter begins here.</p></div><div class="bag-page site-width"><section aria-label="Bag items" aria-busy="${busy}">${content}</section><aside class="bag-summary"><h2>The details</h2>${bagSummary(cart,busy,problem)}${!cart?.totalQuantity?`<p class="muted">Your selection will appear here.</p>${problem?`<p class="form-error">${e(problem)}</p><button class="plain-link" type="button" data-refresh-cart>Refresh bag</button>`:''}`:''}<a href="${link('delivery.html')}" class="plain-link">Delivery information</a><a href="${link('returns.html')}" class="plain-link">Returns & refunds</a></aside></div>`;
 }
}
subscribe(renderCart);
const cartReady=initCart();

function filtersFromUrl(){
 const params=new URLSearchParams(location.search),filters=[];
 for(const value of params.getAll('f')){try{const f=JSON.parse(value);if(f&&Object.keys(f).length===1&&['available','productVendor','productType','variantOption','productMetafield','variantMetafield','tag','category','taxonomyMetafield'].includes(Object.keys(f)[0]))filters.push(f);}catch{/* Ignore malformed shared filters. */}}
 const min=params.get('min'),max=params.get('max');
 if(min!==null&&min!==''||max!==null&&max!==''){const price={};if(min!==null&&min!==''&&Number.isFinite(Number(min))&&Number(min)>=0)price.min=Number(min);if(max!==null&&max!==''&&Number.isFinite(Number(max))&&Number(max)>=0)price.max=Number(max);if(Object.keys(price).length)filters.push({price});}
 const requested=params.get('category')||document.body.dataset.category||'all';
 return {category:requested in CATEGORIES?requested:'all',q:params.get('q')?.trim()||'',filters,sortBy:params.get('sort')|| (page==='search'?'relevance':'newest')};
}
function filterName(f){if(f.price)return `${f.price.min!=null?money(f.price.min):'Any price'} – ${f.price.max!=null?money(f.price.max):'Any price'}`;if(f.available!==undefined)return f.available?'In stock':'Sold out';return f.productVendor||f.productType||f.variantOption?.value||f.productMetafield?.value||f.tag||'Selected filter';}
function filterForm(facets,state,mobile=false){
 if(!facets.length)return '<p class="muted">No filters are available for this edit.</p>';
 const selected=state.filters.map(f=>JSON.stringify(f)),price=state.filters.find(f=>f.price)?.price||{};
 return `<form class="filter-form" data-filter-form="${mobile?'mobile':'desktop'}"><h2 class="filter-heading">Refine by</h2>${facets.map(f=>{
   if(f.type==='PRICE_RANGE')return `<details open><summary>Price</summary><div class="price-fields"><label>Min £<input type="number" name="min" min="0" step="0.01" inputmode="decimal" value="${e(price.min??'')}" placeholder="0"></label><label>Max £<input type="number" name="max" min="0" step="0.01" inputmode="decimal" value="${e(price.max??'')}" placeholder="Any"></label></div></details>`;
   if(!f.values?.some(v=>v.count>0||selected.includes(v.input)))return '';
   return `<details open><summary>${e(f.label)}</summary><div class="filter-options">${f.values.filter(v=>v.count>0||selected.includes(v.input)).map(v=>{const checked=selected.includes(v.input);return `<label class="filter-choice${!v.count&&!checked?' unavailable':''}"><input type="checkbox" name="f" value="${e(v.input)}" ${checked?'checked':''} ${!v.count&&!checked?'disabled':''}><span>${e(v.label)}</span><small>${v.count}</small></label>`;}).join('')}</div></details>`;
 }).join('')}<button class="button button-outline full-width" type="submit">${mobile?'Show pieces':'Apply filters'}</button>${state.filters.length?'<button class="plain-link full-width" type="button" data-clear-filters>Clear all filters</button>':''}</form>`;
}
function changeUrl(update){const url=new URL(location.href);update(url.searchParams);history.pushState({},'',url);renderCatalog();}
function wireFilters(){document.querySelectorAll('[data-filter-form]').forEach(form=>{
 const apply=()=>{const data=new FormData(form),min=data.get('min'),max=data.get('max');if(min!==''&&max!==''&&min!=null&&max!=null&&Number(min)>Number(max)){toast('Minimum price must be less than maximum price.');return;}
 changeUrl(params=>{params.delete('f');params.delete('min');params.delete('max');for(const [key,value]of data)if(value!=='')params.append(key,value);});closePanel();};
 form.addEventListener('submit',event=>{event.preventDefault();apply();});
 if(form.dataset.filterForm==='desktop')form.addEventListener('change',event=>{if(event.target.type==='checkbox')apply();});
 });}
async function renderCatalog(){
 const run=++listingRun,state=filtersFromUrl(),search=page==='search',category=CATEGORIES[state.category];
 const title=search?(state.q?`Results for “${state.q}”`:'Find your next piece'):category.title;
 metadata(title,search?'Search the BP Luxe Relove collection.':category.description);
 main.innerHTML=`<div class="shop-intro site-width${search?' search-intro':''}"><div><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${link('index.html')}">Home</a><span>/</span><span>${search?'Search':'The shop'}</span></nav><h1>${e(title)}</h1>${search?'<p>A particular piece. A favourite brand. Something unexpected.</p>':''}${search?`<form class="page-search" action="search.html"><label class="sr-only" for="pageSearch">Search products</label><input id="pageSearch" name="q" type="search" required minlength="2" value="${e(state.q)}" placeholder="Search the collection">${api.demo?'<input type="hidden" name="demo" value="1">':''}<button class="button button-outline">Search</button></form>`:''}</div></div>
 <div class="mobile-category site-width"><span id="categoryLabel">Shop by category</span><details class="category-picker"><summary aria-describedby="categoryLabel"><span>${search?'Choose a category':state.category==='all'?'All pieces':e(category.title)}</span><span class="category-chevron" aria-hidden="true"></span></summary><nav class="category-options" aria-label="Shop categories">${Object.entries(CATEGORIES).map(([key,c])=>`<a href="${e(categoryLink(key))}"${!search&&state.category===key?' aria-current="page"':''}><span>${key==='all'?'All pieces':e(c.title)}</span><span class="category-check" aria-hidden="true"></span></a>`).join('')}</nav></details></div>
 <nav class="category-nav site-width" aria-label="Shop categories">${Object.entries(CATEGORIES).map(([key,c])=>`<a${!search&&state.category===key?' aria-current="page"':''} href="${categoryLink(key)}">${key==='all'?'All pieces':c.title}</a>`).join('')}</nav>
 <div class="shop-toolbar site-width"><span id="catalogCount" role="status">${search&&!state.q?'Search the collection':'Finding your pieces…'}</span><button class="filter-toggle" type="button" data-open="filterDrawer">${icon('filter')} Filters${state.filters.length?` (${state.filters.length})`:''}</button><label class="sort-control"><span>Sort by</span><select id="sortSelect" aria-label="Sort products">${(search?[['relevance','Relevance'],['price-low','Price: low to high'],['price-high','Price: high to low']]:[['newest','Newest arrivals'],['price-low','Price: low to high'],['price-high','Price: high to low'],['az','Name: A–Z'],['za','Name: Z–A']]).map(([value,label])=>`<option value="${value}"${state.sortBy===value?' selected':''}>${label}</option>`).join('')}</select></label></div>
 <div class="active-filters site-width" id="activeFilters">${state.filters.map((f,index)=>`<button class="filter-chip" data-remove-filter="${index}" type="button">${e(filterName(f))}<span aria-hidden="true">×</span></button>`).join('')}${state.filters.length?'<button class="plain-link" type="button" data-clear-filters>Clear all</button>':''}</div>
 <div class="shop-layout site-width"><aside class="filter-sidebar" id="filterSidebar" aria-label="Filter products"></aside><section aria-label="Products" id="catalogResults" aria-busy="true">${skeleton()}</section></div>`;
 const picker=main.querySelector('.category-picker'),trigger=picker.querySelector('summary');
 let outsideListener;
 picker.addEventListener('toggle',()=>{outsideListener?.abort();if(picker.open){outsideListener=new AbortController();document.addEventListener('pointerdown',event=>{if(!picker.contains(event.target))picker.open=false;},{signal:outsideListener.signal});}});
 picker.addEventListener('keydown',event=>{if(event.key==='Escape'){picker.open=false;trigger.focus();event.preventDefault();}if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();picker.open=true;const items=[...picker.querySelectorAll('a')],index=items.indexOf(document.activeElement);items[event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(index+1)%items.length:index<=0?items.length-1:index-1].focus();}});
 picker.addEventListener('focusout',event=>{if(event.relatedTarget&&!picker.contains(event.relatedTarget))picker.open=false;});
 const categoryNav=main.querySelector('.category-nav'),activeCategory=categoryNav.querySelector('[aria-current]');
 if(activeCategory)categoryNav.scrollLeft=Math.max(0,activeCategory.offsetLeft-categoryNav.offsetLeft-(categoryNav.clientWidth-activeCategory.clientWidth)/2);
 $('sortSelect').addEventListener('change',event=>changeUrl(p=>p.set('sort',event.target.value)));
 if(search&&!state.q){$('catalogResults').innerHTML=empty('A beautiful place to start.','Enter a product, brand or style above.','');$('catalogResults').setAttribute('aria-busy','false');$('mobileFilters').innerHTML='<p>Search for a piece to see available filters.</p>';return;}
 try{
  const result=await api.catalog(state);if(run!==listingRun)return;
  lastResult=result;listing=result.products;
  main.querySelector('.shop-layout').classList.toggle('without-filters',!result.filters.length);
  main.querySelector('.filter-toggle').hidden=!result.filters.length;
  $('filterSidebar').innerHTML=filterForm(result.filters,state);$('mobileFilters').innerHTML=filterForm(result.filters,state,true);wireFilters();
  $('catalogResults').innerHTML=listing.length?`${cards(listing)}<div class="load-more"><p id="shownCount">${listing.length} pieces shown</p><button class="button button-outline" id="loadMore" ${result.pageInfo.hasNextPage?'':'hidden'}>Discover more</button></div>`:empty(result.missingCollection?'This edit is taking shape.':'Nothing quite like that.','No pieces are currently available in this selection. Explore another edit or adjust your filters.',`<a class="button button-outline" href="${link('shop.html')}">Explore all pieces</a>${state.filters.length?'<button class="plain-link" data-clear-filters type="button">Clear filters</button>':''}`);
  $('catalogResults').setAttribute('aria-busy','false');
  $('loadMore')?.addEventListener('click',()=>loadMore(state,run));
  $('catalogCount').textContent=`${result.total??listing.length}${result.total==null&&result.pageInfo.hasNextPage?'+':''} pieces`;

  if(result.total==null)api.countCatalog(state).then(count=>{if(run===listingRun)$('catalogCount').textContent=`${count} piece${count===1?'':'s'}`;}).catch(()=>{});
 }catch(error){if(run!==listingRun)return;$('catalogResults').innerHTML=errorMarkup('The collection could not be loaded. Please check your connection and try again.');$('catalogCount').textContent='Collection unavailable';$('catalogResults').setAttribute('aria-busy','false');console.warn('Catalogue:',error.message);}
}
async function loadMore(state,run){const button=$('loadMore');button.disabled=true;button.textContent='Finding more pieces…';try{const result=await api.catalog({...state,after:lastResult.pageInfo.endCursor});if(run!==listingRun)return;listing.push(...result.products);register(result.products);$('catalogResults').querySelector('.catalog-grid').insertAdjacentHTML('beforeend',result.products.map(card).join(''));reveals();lastResult=result;$('shownCount').textContent=`${listing.length} pieces shown`;button.hidden=!result.pageInfo.hasNextPage;}catch{toast('More pieces could not load. Please try again.');}finally{button.disabled=false;button.textContent='Discover more';}}

async function renderHome(category=homeCategory){
 homeCategory=category;const run=++listingRun;$('productGrid').innerHTML=skeleton(4);$('productGrid').className='home-products';
 $('shopTabs').querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===category;b.classList.toggle('is-active',active);b.setAttribute('aria-selected',String(active));});
 try{const result=await api.catalog({category,first:4});if(run!==listingRun)return;$('productGrid').innerHTML=result.products.length?cards(result.products):empty('More beautiful things are on their way.','Explore the complete edit for the latest pieces.');$('shopStatus').textContent=api.demo?'Illustrated sample pieces · preview only':'';}
 catch{$('productGrid').innerHTML=errorMarkup('Our collection is taking a moment to load. Please try again.');$('shopStatus').textContent='';}
}
async function renderWishlist(){
 metadata('Your saved pieces','Keep the pieces you love close. Discover your BP Luxe Relove wishlist.');
 main.innerHTML=`<div class="page-heading site-width"><h1>Worth keeping.</h1><p>Your saved pieces, all in one place.</p></div><section class="site-width wishlist-content" aria-label="Saved pieces" id="savedGrid">${skeleton(4)}</section>`;
 try{const products=await savedProducts();$('savedGrid').innerHTML=products.length?cards(products):empty('Save something special.','Tap the heart on a piece you love. You will find it here when you return.');const missing=wishlist.size-products.length;if(missing>0){const liveIds=new Set(products.map(p=>p.id));$('savedGrid').insertAdjacentHTML('afterbegin',`<p class="muted">${missing} saved piece${missing===1?' is':'s are'} no longer published. <button class="plain-link" id="cleanSaved">Remove unavailable saved entries</button></p>`);$('cleanSaved').onclick=()=>{[...wishlist].filter(id=>!liveIds.has(id)).forEach(id=>wishlist.delete(id));writeLocal(wishlistKey,[...wishlist]);window.dispatchEvent(new Event('wishlistchange'));};}}
 catch{$('savedGrid').innerHTML=errorMarkup('Your saved pieces could not load. Please try again.');}
}
function priceMarkup(v){const amount=Number(v.price.amount),compare=Number(v.compareAtPrice?.amount||0);return `${money(amount,v.price.currencyCode)}${compare>amount?` <s>${money(compare,v.price.currencyCode)}</s>`:''}`;}
function structuredProduct(p,v){if(api.demo)return;let el=$('productSchema');if(!el){el=document.createElement('script');el.id='productSchema';el.type='application/ld+json';document.head.append(el);}el.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Product',name:p.title,description:p.description,image:p.images.map(i=>i.url),url:new URL(productUrl(p),location.href).href,...(p.vendor?{brand:{'@type':'Brand',name:p.vendor}}:{}),offers:{'@type':'Offer',price:v.price.amount,priceCurrency:v.price.currencyCode,availability:`https://schema.org/${v.availableForSale?'InStock':'OutOfStock'}`,url:new URL(productUrl(p),location.href).href}});}
function setGallery(index){if(!currentProduct?.images.length)return;galleryIndex=(index+currentProduct.images.length)%currentProduct.images.length;const img=currentProduct.images[galleryIndex];$('mainProductImage').innerHTML=imageMarkup(img,'',false);$('zoomImage').src=img.url;$('zoomImage').alt=img.altText||currentProduct.title;$('zoomCount').textContent=`${galleryIndex+1} / ${currentProduct.images.length}`;document.querySelectorAll('[data-thumbnail]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.thumbnail)===galleryIndex)));}
function updateVariant(){
 const selected=[...$('productOptions').querySelectorAll('select')].map(select=>({name:select.name,value:select.value}));
 currentVariant=currentProduct.variants.find(v=>selected.every(o=>v.selectedOptions.some(value=>value.name===o.name&&value.value===o.value)))||null;
 $('productPrice').innerHTML=currentVariant?priceMarkup(currentVariant):'Selection unavailable';
 $('productAdd').disabled=!currentVariant?.availableForSale;$('productAdd').textContent=currentVariant?.availableForSale?'Add to bag':'Unavailable';
 $('variantAvailability').textContent=currentVariant?.availableForSale?'Available to add to your bag':'This selection is no longer available.';
 if(currentVariant){const url=new URL(location.href);url.searchParams.set('variant',currentVariant.id);history.replaceState({},'',url);structuredProduct(currentProduct,currentVariant);const imageIndex=currentProduct.images.findIndex(i=>i.url===currentVariant.image?.url);if(imageIndex>=0)setGallery(imageIndex);}
}
async function renderProduct(){
 const handle=new URLSearchParams(location.search).get('handle');
 main.innerHTML=`<div class="site-width product-loading">${skeleton(2)}</div>`;
 if(!handle){main.innerHTML=empty('Which piece caught your eye?','Explore the collection to find a product.');return;}
 try{
  const p=await api.product(handle);if(!p){main.innerHTML=empty('This piece has moved on.','It may no longer be published. Discover something else to love.');metadata('Piece unavailable','Explore more beautiful pieces from BP Luxe Relove.');return;}
  currentProduct=p;register([p]);metadata(p.seo?.title||p.title,p.seo?.description||p.description.slice(0,155));
  const requested=new URLSearchParams(location.search).get('variant');currentVariant=p.variants.find(v=>v.id===requested)||p.variants.find(v=>v.availableForSale)||p.variants[0];
  main.innerHTML=`<nav class="breadcrumbs site-width" aria-label="Breadcrumb"><a href="${link('index.html')}">Home</a><span>/</span><a href="${link('shop.html')}">The shop</a><span>/</span><span>${e(p.title)}</span></nav><div class="product-detail site-width"><section class="product-gallery" aria-label="Product photographs"><button class="main-product-image" id="mainProductImage" type="button" data-open="lightbox" aria-label="Enlarge product image" ${p.images.length?'':'disabled'}>${imageMarkup(p.images[0],'',false)}</button><div class="gallery-thumbnails">${p.images.map((img,i)=>`<button type="button" data-thumbnail="${i}" aria-label="View image ${i+1}" aria-pressed="${i===0}">${imageMarkup(img)}</button>`).join('')}</div><p class="image-hint">Select an image to explore the details${api.demo?' · Original sample illustrations':''}</p></section><section class="product-purchase" aria-label="Product details">${p.vendor?`<p class="product-designer">${e(p.vendor)}</p>`:''}<h1>${e(p.title)}</h1><p class="detail-price" id="productPrice">${currentVariant?priceMarkup(currentVariant):money(p.price,p.currency)}</p>${p.fields.condition?`<p class="condition-label">${e(p.fields.condition)} <a href="${link('authentication.html')}">Condition guide</a></p>`:''}<p class="detail-description">${e(p.description)}</p><form id="productForm"><div id="productOptions" class="variant-options">${p.options.filter(o=>!(o.name==='Title'&&o.values.length===1&&o.values[0]==='Default Title')).map(o=>`<label>${e(o.name)}<select name="${e(o.name)}">${o.values.map(value=>`<option value="${e(value)}"${currentVariant?.selectedOptions.some(v=>v.name===o.name&&v.value===value)?' selected':''}>${e(value)}</option>`).join('')}</select></label>`).join('')}</div><p class="availability" id="variantAvailability">${p.available?'Available to add to your bag':'This piece is no longer available.'}</p><div class="purchase-actions"><label class="product-quantity">Qty<input name="quantity" id="productQuantity" type="number" min="1" max="99" value="1" inputmode="numeric" aria-label="Quantity"></label><button id="productAdd" class="button button-solid" type="submit" ${!currentVariant?.availableForSale?'disabled':''}>${currentVariant?.availableForSale?'Add to bag':'Unavailable'}</button><button type="button" class="detail-heart card-heart${wishlist.has(p.id)?' saved':''}" data-save="${e(p.id)}" aria-pressed="${wishlist.has(p.id)}" aria-label="Save ${e(p.title)} to wishlist">${icon('heart')}</button></div><p class="form-error" id="productError" role="alert"></p></form><div class="product-accordions"><details open><summary>The details</summary><dl>${Object.entries(p.fields).filter(([key])=>!['authentication','care'].includes(key)).map(([key,value])=>`<div><dt>${e({included:'What is included',dimensions:'Dimensions',condition:'Condition',material:'Material',style:'Style'}[key]||key)}</dt><dd>${e(value)}</dd></div>`).join('')||'<p>Additional details can be found in the product description.</p>'}</dl></details><details><summary>Authentication & condition</summary><p>${e(p.fields.authentication||'Read the product description and photographs for the details provided for this piece. Contact us if you need further information.')}</p><a class="plain-link" href="${link('authentication.html')}">Read our condition guide</a></details><details><summary>Delivery & returns</summary><p>Review the store’s published delivery and returns information before placing your order.</p><a class="plain-link" href="${link('delivery.html')}">Delivery information</a><a class="plain-link" href="${link('returns.html')}">Returns & refunds</a></details>${p.fields.care?`<details><summary>Care</summary><p>${e(p.fields.care)}</p></details>`:''}</div></section></div><section class="recommendations site-width" id="relatedPieces"></section><section class="recommendations site-width" id="recentPieces"></section>`;
  $('productOptions').addEventListener('change',updateVariant);
  $('productForm').addEventListener('submit',async event=>{event.preventDefault();const button=$('productAdd');button.disabled=true;$('productError').textContent='';try{await cartReady;await addItem(p,currentVariant,Math.max(1,Math.min(99,Number($('productQuantity').value)||1)));openPanel('cartDrawer');}catch(error){$('productError').textContent=error.message;}finally{button.disabled=!currentVariant?.availableForSale;}});
  setGallery(0);if(currentVariant)structuredProduct(p,currentVariant);
  api.related(p.id).then(async products=>{if(!products.length){products=(await api.catalog({first:5})).products.filter(v=>v.id!==p.id).slice(0,4);}if(products.length)$('relatedPieces').innerHTML=`<h2>A considered pairing.</h2>${cards(products)}`;}).catch(()=>{});
  const recent=readLocal(recentKey,[]).filter(id=>id!==p.id).slice(0,4);writeLocal(recentKey,[p.id,...recent]);
  api.productsByIds(recent).then(products=>{if(products.length)$('recentPieces').innerHTML=`<h2>Another look.</h2>${cards(products)}`;}).catch(()=>{});
 }catch(error){main.innerHTML=errorMarkup('This piece could not be loaded. Please try again.');console.warn('Product:',error.message);}
}

const information={
 about:{title:'A new chapter for beautiful things.',intro:'Thoughtfully chosen. Ready to be loved again.'},
 contact:{title:'Let’s talk.',intro:'A question about a piece, an order, or something else? We are here to help.'},
 delivery:{title:'Delivery information',intro:'The details for the journey to you.'},returns:{title:'Returns & refunds',intro:'Know the details before you choose.'},
 privacy:{title:'Privacy policy',intro:'How your information is handled.'},terms:{title:'Terms & conditions',intro:'The terms that apply when you shop with us.'},
 faq:{title:'A few things to know.',intro:'Helpful details, all in one place.'},authentication:{title:'Every detail matters.',intro:'A guide to product condition and the information to look for.'}
};
async function renderInfo(){
 const key=document.body.dataset.info,content=information[key]||information.about;metadata(content.title,content.intro);
 main.innerHTML=`<div class="page-heading site-width"><h1>${e(content.title)}</h1><p>${e(content.intro)}</p></div><div class="info-layout site-width"><nav class="info-nav" aria-label="Information pages">${Object.entries(information).map(([value,p])=>`<a href="${link(value+'.html')}" ${value===key?'aria-current="page"':''}>${e({about:'Our story',contact:'Contact us',faq:'FAQs',authentication:'Condition & authentication'}[value]||p.title)}</a>`).join('')}</nav><article class="info-body" id="infoBody"><p role="status">Loading information…</p></article></div>`;
 try{const published=await api.shopContent(key);if(published?.body){$('infoBody').innerHTML=sanitize(published.body);return;}
 const fallback={
 about:`<img class="about-image" src="assets/05_story_leather_detail.webp" alt="Leather texture and fine stitching"><h2>Luxury to love again.</h2><p>BP Luxe Relove brings together a considered edit of handbags, shoes, fashion and finishing touches. We believe the pieces you reach for should feel as special as the moments you wear them in.</p><p>Explore timeless shapes and thoughtful details, with the product photographs and descriptions at the heart of every decision.</p><a class="button button-outline" href="${link('shop.html')}">Discover the edit</a>`,
 contact:`<h2>Contact BP Luxe Relove</h2>${CONFIG.contactEmail?`<p><a class="plain-link" href="mailto:${e(CONFIG.contactEmail)}">${e(CONFIG.contactEmail)}</a></p><form id="contactForm" class="contact-form"><label>Your name<input name="name" required autocomplete="name"></label><label>Your email<input name="email" type="email" required autocomplete="email"></label><label>Your message<textarea name="message" required rows="6"></textarea></label><p class="muted">This opens your email application with your message. It does not send automatically.</p><button class="button button-solid" type="submit">Open email</button></form>`:'<div class="publication-note"><p>Customer-service contact details are awaiting confirmation from the store owner.</p><p>Please check back before ordering. This contact template will display the approved email address once configured.</p></div>'}${CONFIG.contactPhone?`<p>${e(CONFIG.contactPhone)}</p>`:''}${CONFIG.address?`<p>${e(CONFIG.address)}</p>`:''}`,
 faq:`${[['Where can I find the details of a piece?','Each product page contains the available photographs, description, options and product specifications supplied by the store.'],['How do I save a piece?','Select its heart icon. Saved pieces stay in this browser and can be found on the wishlist page.'],['How do I pay?','Add your chosen pieces to the bag and continue to Shopify’s secure hosted checkout. Payment methods are shown there by the store.'],['Does saving a piece reserve it?','No. Saving a piece or adding it to your bag does not guarantee that it will remain available. Availability is checked during the shopping and checkout process.'],['Where are delivery and returns explained?','Read the delivery and returns pages before ordering. The store’s published policies are displayed there.'],['Where can I find authentication information?','Read the individual product’s authentication and condition details, where supplied. Ask the store for clarification before purchasing if anything is unclear.']].map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}`,
 authentication:`<h2>Look a little closer.</h2><p>The photographs and description for each individual piece are the most important guide to its condition. Inspect the details and any noted signs of wear before choosing.</p><h3>Understanding condition descriptions</h3><p>These descriptions are a general reading guide, not a guarantee or a substitute for the individual product listing.</p><dl>${[['New','Described by the seller as unused. Check the listing for packaging, tags and any storage marks.'],['Like New','Usually describes minimal visible wear. Review the photographs and product notes.'],['Excellent','Usually describes light signs of use with a well-preserved overall appearance.'],['Good','Usually describes visible signs of wear. The listing should explain the relevant details.']].map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl><h3>Authentication information</h3><p>Where authentication or certification information is supplied, it appears on the product’s detail page. The store owner must confirm the applicable process, provider and documentation for each piece. No certification provider is implied by this guide.</p><a href="${link('contact.html')}" class="plain-link">Ask about a piece</a>`
 };
 $('infoBody').innerHTML=fallback[key]||`<div class="publication-note"><h2>Awaiting the store’s published policy.</h2><p>The ${e(content.title.toLowerCase())} has not yet been published by the store owner. This page will automatically display the policy once it is available through Shopify.</p><p>Please review the completed policy before placing an order.</p></div>`;
 $('contactForm')?.addEventListener('submit',event=>{event.preventDefault();const values=new FormData(event.currentTarget);location.href=`mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent('BP Luxe Relove enquiry')}&body=${encodeURIComponent(`Name: ${values.get('name')}\nEmail: ${values.get('email')}\n\n${values.get('message')}`)}`;});
 }catch{$('infoBody').innerHTML=errorMarkup('This information could not load. Please try again.');}
}

document.addEventListener('click',async event=>{
 const save=event.target.closest('[data-save]');if(save){toggleSaved(save.dataset.save);toast(wishlist.has(save.dataset.save)?'Saved for another look.':'Removed from your saved pieces.');}
 const add=event.target.closest('[data-add]');if(add){add.disabled=true;try{await cartReady;const p=registry.get(add.dataset.add);await addItem(p,p.variants.find(v=>v.availableForSale),1);openPanel('cartDrawer');}catch(error){toast(error.message);}finally{add.disabled=false;}}
 const line=event.target.closest('[data-line]');if(line){try{await changeLine(line.dataset.line,Number(line.dataset.quantity));}catch(error){toast(error.message);}}
 if(event.target.closest('[data-checkout]'))try{await checkout();}catch(error){toast(error.message);}
 if(event.target.closest('[data-refresh-cart]'))initCart();
 const thumbnail=event.target.closest('[data-thumbnail]');if(thumbnail)setGallery(Number(thumbnail.dataset.thumbnail));
 const galleryStep=event.target.closest('[data-gallery-step]');if(galleryStep)setGallery(galleryIndex+Number(galleryStep.dataset.galleryStep));
 if(event.target.closest('[data-retry]'))route();
 if(event.target.closest('[data-clear-filters]')){changeUrl(params=>{params.delete('f');params.delete('min');params.delete('max');});closePanel();}
 const remove=event.target.closest('[data-remove-filter]');if(remove){const state=filtersFromUrl();state.filters.splice(Number(remove.dataset.removeFilter),1);changeUrl(params=>{params.delete('f');params.delete('min');params.delete('max');for(const f of state.filters)if(f.price){for(const[k,v]of Object.entries(f.price))params.set(k,String(v));}else params.append('f',JSON.stringify(f));});}
});
document.addEventListener('keydown',event=>{if(!$('lightbox').hidden&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();setGallery(galleryIndex+(event.key==='ArrowRight'?1:-1));}});
let predictTimer,predictRun=0;
$('globalSearch').addEventListener('submit',event=>{event.preventDefault();const q=$('searchInput').value.trim();if(q.length>=2)location.href=link('search.html',{q});});
$('searchInput').addEventListener('input',()=>{clearTimeout(predictTimer);const q=$('searchInput').value.trim(),run=++predictRun;if(q.length<2){$('searchSuggestions').innerHTML='';return;}$('searchSuggestions').innerHTML='<p class="muted">Looking for your piece…</p>';predictTimer=setTimeout(async()=>{try{const products=await api.predict(q);if(run!==predictRun)return;$('searchSuggestions').innerHTML=products.length?products.map(p=>`<a class="suggestion" href="${productUrl(p)}">${imageMarkup(p.images[0])}<span>${e(p.title)}<small>${money(p.price,p.currency)}</small></span></a>`).join('')+`<a class="plain-link" href="${link('search.html',{q})}">See all results</a>`:'<p class="muted">No pieces found. Try another name or style.</p>';}catch{if(run===predictRun)$('searchSuggestions').innerHTML=`<a class="plain-link" href="${link('search.html',{q})}">View search results</a>`;}},300);});
$('globalSearch').addEventListener('keydown',event=>{if(event.key==='ArrowDown'){$('searchSuggestions').querySelector('a')?.focus();event.preventDefault();}});
$('searchSuggestions').addEventListener('keydown',event=>{const items=[...$('searchSuggestions').querySelectorAll('a')],index=items.indexOf(document.activeElement);if(event.key==='ArrowDown'){items[(index+1)%items.length]?.focus();event.preventDefault();}if(event.key==='ArrowUp'){if(index===0)$('searchInput').focus();else items[index-1]?.focus();event.preventDefault();}});

function route(){if(page==='shop'||page==='search')return renderCatalog();if(page==='home')return renderHome();if(page==='product')return renderProduct();if(page==='wishlist')return renderWishlist();if(page==='info')return renderInfo();if(page==='cart')metadata('Your shopping bag','Review your chosen pieces and continue to Shopify checkout.');}
window.addEventListener('popstate',()=>{if(page==='shop'||page==='search')renderCatalog();if(page==='product')renderProduct();});
if(page==='home'){
 metadata('Luxury worth loving again','Curated handbags, shoes and accessories. Beautiful pieces, ready for a new chapter.');
 $('shopTabs').addEventListener('click',event=>{const b=event.target.closest('[data-filter]');if(b)renderHome(b.dataset.filter);});
 $('viewAll').addEventListener('click',()=>location.href=categoryLink(homeCategory));
}
if(api.demo&&page==='home')document.querySelector('.arrivals .section-heading p').textContent='An illustrated preview of the collection. Sample pieces cannot be purchased.';
if(api.demo)document.querySelectorAll('a[href]').forEach(a=>{if(a.hasAttribute('data-exit-demo'))return;const url=new URL(a.href,location.href);if(url.origin===location.origin&&/\.html$/.test(url.pathname)){url.searchParams.set('demo','1');a.href=url.href;}});
route();reveals();
