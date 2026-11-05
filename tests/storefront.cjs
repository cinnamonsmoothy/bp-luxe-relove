const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8001';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let server,browser,passed=0;
const failures=[];
async function test(name,fn){try{await fn();console.log('PASS',name);passed++;}catch(error){console.error('FAIL',name,error.message);failures.push(name+': '+error.message);}}
(async()=>{
 if(!process.env.TEST_BASE_URL){server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'8001'},stdio:'ignore',windowsHide:true});for(let i=0;i<30;i++){try{await fetch(base);break;}catch{await pause(100);}}}
 const executable=process.env.CHROME_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
 browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const errors=[];context.on('page',p=>p.on('pageerror',err=>errors.push(err.message)));
 await context.route('https://**/*',route=>route.abort());
 const page=await context.newPage();page.setDefaultTimeout(7000);
 const go=path=>page.goto(base+'/'+path);
 const ready=()=>page.waitForSelector('.catalog-card');
 await test('Catalogue pagination and original sample assets',async()=>{
  await go('shop.html?demo=1');await ready();assert.equal(await page.locator('.catalog-card').count(),24);
  assert.match(await page.locator('#catalogCount').innerText(),/36 pieces/);assert.equal(new URL(await page.locator('[data-exit-demo]').getAttribute('href'),base).search,'');await page.locator('#loadMore').click();await page.waitForFunction(()=>document.querySelectorAll('.catalog-card').length===36);
  for(const img of await page.locator('.catalog-image img:first-child').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.complete?null:new Promise(resolve=>{el.onload=resolve;el.onerror=resolve;}));assert.ok(await img.evaluate(el=>el.naturalWidth>0));}
  assert.equal(await page.locator('.catalog-card [data-save]').evaluateAll(list=>new Set(list.map(el=>el.dataset.save)).size),36);
 });
 await test('Combined filters, price, URL, sorting and history',async()=>{
  await go('shop.html?demo=1');await ready();await page.locator('.filter-sidebar .filter-choice').filter({hasText:'In stock'}).locator('input').check();await page.waitForFunction(()=>document.querySelector('#catalogCount').textContent==='32 pieces');
  await page.locator('.filter-sidebar .filter-choice').filter({hasText:'Cream'}).locator('input').check();await page.waitForFunction(()=>document.querySelector('#catalogCount').textContent==='6 pieces');
  await page.locator('.filter-sidebar input[name=max]').fill('200');await page.locator('.filter-sidebar button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#catalogCount').textContent==='4 pieces');
  assert.match(page.url(),/max=200/);assert.equal(await page.locator('.filter-chip').count(),3);
  await page.goBack();await page.waitForFunction(()=>document.querySelector('#catalogCount').textContent==='6 pieces');await page.goForward();await page.waitForFunction(()=>document.querySelector('#catalogCount').textContent==='4 pieces');
  await page.locator('#sortSelect').selectOption('price-high');await page.waitForFunction(()=>document.querySelector('#sortSelect').value==='price-high'&&document.querySelectorAll('.catalog-card').length===4);
  const amounts=await page.locator('.catalog-price').allTextContents();const values=amounts.map(t=>Number(t.match(/[\d,.]+/)[0].replaceAll(',','')));assert.deepEqual(values,[...values].sort((a,b)=>b-a));
  await page.locator('.active-filters [data-clear-filters]').click();await page.waitForFunction(()=>document.querySelectorAll('.catalog-card').length===24);
  await page.locator('#sortSelect').selectOption('az');await page.waitForFunction(()=>document.querySelector('#sortSelect').value==='az'&&document.querySelectorAll('.catalog-card').length===24);const names=await page.locator('.catalog-info h3').allTextContents();assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b)));
  await page.locator('.filter-sidebar input[name=max]').fill('0');await page.locator('.filter-sidebar button[type=submit]').click();await page.waitForSelector('.empty-state');assert.match(await page.locator('#catalogResults').innerText(),/Nothing quite like that/);
 });
 await test('All dedicated category entry points',async()=>{
  for(const route of ['handbags','shoes','sunglasses','accessories','fashion','hair-beauty','new-arrivals']){await go(route+'.html?demo=1');await ready();const expected=route==='new-arrivals'?24:6;assert.equal(await page.locator('.catalog-card').count(),expected);assert.ok(await page.locator('.category-nav [aria-current=page]').count());}
 });
 await test('Wishlist persistence and removal',async()=>{
  await go('handbags.html?demo=1');await ready();const button=page.locator('[data-save]').first();await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');await go('wishlist.html?demo=1');await ready();assert.equal(await page.locator('.catalog-card').count(),1);await page.reload();await ready();await page.locator('[data-save]').click();await page.waitForSelector('.empty-state');
 });
 await test('Product options, gallery, availability, demo bag and persistence',async()=>{
  await go('product.html?handle=demo-shoes-1&demo=1');await page.waitForSelector('#productForm');await page.locator('#productOptions select[name=Size]').selectOption('EU 39');assert.ok(await page.locator('#productAdd').isDisabled());await page.locator('#productOptions select[name=Size]').selectOption('EU 38');assert.ok(await page.locator('#productAdd').isEnabled());
  await page.locator('[data-thumbnail="1"]').click();assert.match(await page.locator('#mainProductImage img').getAttribute('src'),/-1.svg/);await page.locator('#mainProductImage').click();await page.waitForTimeout(100);assert.ok(await page.locator('#lightbox').isVisible());await page.keyboard.press('ArrowRight');assert.match(await page.locator('#zoomImage').getAttribute('src'),/-0.svg/);await page.keyboard.press('Escape');
  await page.locator('#productAdd').click();await page.waitForSelector('#cartDrawer.is-open .bag-line');assert.ok(await page.locator('#cartDrawer [data-checkout]').isDisabled());assert.match(await page.locator('#miniCart').innerText(),/EU 38/);await page.locator('#cartDrawer [data-quantity="2"]').click();await page.waitForFunction(()=>document.querySelector('#cartCount').textContent==='2');await page.keyboard.press('Escape');
  await go('cart.html?demo=1');await page.waitForSelector('.bag-line');assert.match(await page.locator('main .bag-subtotal').innerText(),/370/);await page.reload();await page.waitForSelector('.bag-line');assert.equal(await page.locator('main .quantity-control span').innerText(),'2');await page.locator('main [data-quantity="1"]').click();await page.waitForFunction(()=>document.querySelector('.quantity-control span').textContent==='1');await page.locator('main [data-quantity="0"]').last().click();await page.waitForSelector('main .empty-state');
 });
 await test('Predictive search, keyboard navigation and search results',async()=>{
  await go('shop.html?demo=1');await page.locator('#searchOpen').click();await page.locator('#searchInput').fill('handbag');await page.waitForSelector('.suggestion');assert.equal(await page.locator('.suggestion').count(),5);await page.locator('#searchInput').focus();await page.keyboard.press('ArrowDown');assert.ok(await page.locator('.suggestion').first().evaluate(el=>el===document.activeElement));await page.locator('#searchInput').focus();await page.locator('#globalSearch').evaluate(form=>form.requestSubmit());await page.waitForURL('**/search.html?**');await ready();assert.equal(await page.locator('.catalog-card').count(),6);
  await go('search.html?demo=1&q=xyzunfindable');await page.waitForSelector('.empty-state');assert.equal(await page.locator('.catalog-card').count(),0);
 });
 await test('Information pages are complete or explicitly awaiting merchant content',async()=>{
  for(const route of ['about','contact','delivery','returns','faq','privacy','terms','authentication']){await go(route+'.html?demo=1');await page.waitForFunction(()=>!document.querySelector('#infoBody').textContent.includes('Loading information'));assert.ok((await page.locator('#infoBody').innerText()).length>100);}
 });
 await test('Mobile navigation at scroll and filter drawer',async()=>{
  await page.setViewportSize({width:390,height:844});await go('shop.html?demo=1');await ready();await page.evaluate(()=>scrollTo(0,600));await page.waitForTimeout(100);await page.locator('#menuOpen').click();await page.waitForTimeout(450);const rect=await page.locator('#mobileMenu').boundingBox();assert.equal(rect.y,0);assert.equal(rect.height,844);assert.ok(await page.locator('#mobileMenu').evaluate(el=>el.contains(document.elementFromPoint(195,420))));await page.keyboard.press('Escape');
  await page.locator('.filter-toggle').click();await page.locator('#mobileFilters .filter-choice').filter({hasText:'In stock'}).locator('input').check();await page.locator('#mobileFilters button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#catalogCount').textContent==='32 pieces');assert.match(page.url(),/f=/);assert.equal(await page.locator('#filterDrawer').getAttribute('aria-hidden'),'true');
 });
 await test('Phone, tablet, desktop and 4K layout plus image loading',async()=>{
  fs.mkdirSync('test-artifacts',{recursive:true});await go('product.html?handle=demo-bags-1&demo=1');await page.waitForSelector('#productForm');await page.locator('#productAdd').click();await page.waitForSelector('#cartDrawer.is-open .bag-line');await page.keyboard.press('Escape');
  for(const [width,height]of [[320,740],[390,844],[768,1024],[1440,1000],[2560,1440],[3840,2160]]){
   await page.setViewportSize({width,height});
   for(const route of ['shop.html?demo=1','product.html?handle=demo-bags-1&demo=1','index.html?demo=1','cart.html?demo=1']){await go(route);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' overflows at '+width);}
   await go('shop.html?demo=1');await ready();await page.evaluate(()=>document.fonts.ready);await page.waitForSelector('#pageLoader',{state:'detached',timeout:7000});await page.screenshot({path:`test-artifacts/shop-${width}.png`});
   const urls=await page.locator('a[href]').evaluateAll(links=>links.map(a=>a.href).filter(h=>h.startsWith(location.origin)));
   for(const href of new Set(urls)){const response=await page.request.get(href);assert.ok(response.ok(),href);}
  }
 });
 await test('Live API errors never turn into demo products',async()=>{
  await page.setViewportSize({width:1440,height:1000});let demoRequests=0;const failing=await context.newPage();failing.on('request',r=>{if(r.url().includes('demo-products'))demoRequests++;});await failing.goto(base+'/shop.html');await failing.waitForSelector('.empty-state');assert.match(await failing.locator('#catalogResults').innerText(),/could not be loaded/);assert.equal(await failing.locator('.catalog-card').count(),0);assert.equal(await failing.locator('.demo-banner').count(),0);assert.equal(demoRequests,0);await failing.close();
 });
 await test('Reduced motion and clean browser runtime',async()=>{await page.emulateMedia({reducedMotion:'reduce'});await go('shop.html?demo=1');await ready();const duration=await page.locator('.catalog-image img').first().evaluate(el=>getComputedStyle(el).transitionDuration);assert.ok(duration==='0s'||duration==='1e-05s');assert.deepEqual(errors,[]);});
 console.log(`${passed} checks passed; ${failures.length} failed.`);
 if(failures.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.kill();});
