import { demo, getCart, mutateCart, productsByIds } from './storefront-api.js';
const key=demo?'bp-cart-demo-v1':'bp-cart-shopify-v1';
export const readLocal=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return value==null||(Array.isArray(fallback)&&!Array.isArray(value))?fallback:value;}catch{return fallback;}};
export const writeLocal=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Storage can be disabled; the current session remains usable. */}};
let cart=null,busy=false,problem='',chain=Promise.resolve();
const subscribers=new Set();
export function subscribe(fn){subscribers.add(fn);fn({cart,busy,problem});return()=>subscribers.delete(fn);}
function emit(){subscribers.forEach(fn=>fn({cart,busy,problem}));}
function emptyDemo(){return{id:'demo-cart',checkoutUrl:null,totalQuantity:0,cost:{subtotalAmount:{amount:'0',currencyCode:'GBP'},totalAmount:{amount:'0',currencyCode:'GBP'}},lines:{nodes:[]}};}
function demoTotals(){const total=cart.lines.nodes.reduce((n,l)=>n+Number(l.cost.totalAmount.amount),0);cart.totalQuantity=cart.lines.nodes.reduce((n,l)=>n+l.quantity,0);cart.cost={subtotalAmount:{amount:String(total),currencyCode:'GBP'},totalAmount:{amount:String(total),currencyCode:'GBP'}};writeLocal(key,cart);}
export async function initCart(){
 busy=true;emit();try{if(demo){cart=readLocal(key,null)||emptyDemo();if(cart.id!=='demo-cart'||!Array.isArray(cart.lines?.nodes)||!cart.cost?.subtotalAmount)cart=emptyDemo();}
 else {const id=readLocal(key,null);if(typeof id==='string'){cart=await getCart(id);if(!cart)writeLocal(key,null);}}}
 catch{problem='We could not refresh your bag. Please try again before checkout.';}finally{busy=false;emit();}
}
function enqueue(fn){const task=chain.then(async()=>{busy=true;problem='';emit();try{return await fn();}catch(error){problem=error.message||'Your bag could not be updated.';throw error;}finally{busy=false;emit();}});chain=task.catch(()=>{});return task;}
export function addItem(product,variant,quantity=1){return enqueue(async()=>{
 if(!variant?.availableForSale)throw Error('This selection is no longer available. Please choose another.');
 if(demo){if(!product.id.startsWith('demo-'))throw Error('Live items cannot enter a demo bag.');cart ||=emptyDemo();const existing=cart.lines.nodes.find(l=>l.merchandise.id===variant.id);const next=(existing?.quantity||0)+quantity;if(next>(variant.quantityAvailable??2))throw Error('Only this sample quantity is available.');const line=existing||{id:`demo-line-${variant.id}`,merchandise:{...variant,product:{id:product.id,handle:product.handle,title:product.title,featuredImage:product.featuredImage}},quantity:0};line.quantity=next;line.cost={totalAmount:{amount:String(Number(variant.price.amount)*next),currencyCode:'GBP'},amountPerQuantity:variant.price};if(!existing)cart.lines.nodes.push(line);demoTotals();}
 else {if(product.id.startsWith('demo-')||variant.id.startsWith('demo-'))throw Error('Sample products cannot be purchased.');const existingId=readLocal(key,null);if(!cart&&typeof existingId==='string')cart=await getCart(existingId);const result=await mutateCart(cart?'add':'create',cart?.id,[{merchandiseId:variant.id,quantity}]);cart=result.cart;if(!cart)throw Error('Shopify could not create your bag. Please try again.');writeLocal(key,cart.id);problem=result.warnings.map(w=>w.message).join(' ');}
});}
export function changeLine(id,quantity){return enqueue(async()=>{
 if(!cart)throw Error('Your bag is empty.');
 if(demo){const line=cart.lines.nodes.find(l=>l.id===id);if(!line)return;if(quantity>(line.merchandise.quantityAvailable??2))throw Error('Only this sample quantity is available.');if(quantity<=0)cart.lines.nodes=cart.lines.nodes.filter(l=>l.id!==id);else{line.quantity=quantity;line.cost.totalAmount.amount=String(Number(line.cost.amountPerQuantity.amount)*quantity);}demoTotals();}
 else {const result=await mutateCart(quantity<=0?'remove':'update',cart.id,quantity<=0?[id]:[{id,quantity}]);cart=result.cart;problem=result.warnings.map(w=>w.message).join(' ');}
});}
export function checkout(){return enqueue(async()=>{
 if(demo)throw Error('This is an illustrated preview. Demo products cannot be checked out.');
 if(!cart?.id)throw Error('Your bag is empty.');
 cart=await getCart(cart.id);if(!cart?.totalQuantity)throw Error('Your bag is empty or has expired. Please add your pieces again.');
 if(cart.lines.nodes.some(l=>!l.merchandise.availableForSale))throw Error('A piece in your bag is no longer available. Remove it before checkout.');
 const url=new URL(cart.checkoutUrl);if(url.protocol!=='https:')throw Error('Shopify could not provide a secure checkout URL.');
 location.assign(url.href);
});}
export const wishlistKey=demo?'bp-wishlist-demo-v1':'bp-luxe-relove-saved-v1';
export let wishlist=new Set(readLocal(wishlistKey,[]).filter(id=>typeof id==='string'&&(demo?id.startsWith('demo-'):id.startsWith('gid://shopify/Product/'))));
export function toggleSaved(id){wishlist.has(id)?wishlist.delete(id):wishlist.add(id);writeLocal(wishlistKey,[...wishlist]);window.dispatchEvent(new Event('wishlistchange'));}
export async function savedProducts(){return productsByIds([...wishlist]);}
