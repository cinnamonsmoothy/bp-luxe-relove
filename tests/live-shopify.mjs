// Opt-in real Storefront API checks. --cart creates and empties a disposable cart;
// it never submits an order, a payment, or changes catalog data.
import assert from 'node:assert/strict';
globalThis.location=new URL('http://127.0.0.1/shop.html');
const api=await import('../storefront-api.js');
const all=await api.catalog({category:'all',first:2});
assert.ok(all.products.length,'Publish at least one product before running live checks.');
const p=await api.product(all.products[0].handle);
assert.equal(p.id,all.products[0].id);assert.ok(p.variants.length);
console.log('PASS live catalog, product handle and variants');
const filtered=await api.catalog({category:'all',filters:[{available:true},{price:{min:0,max:1000000}}]});
assert.ok(filtered.products.every(p=>p.available));console.log('PASS live combined price and availability filters');
const search=await api.catalog({q:p.title.split(' ')[0],first:3});assert.ok(search.total>=1);console.log('PASS live search and result count');
const count=await api.countCatalog({category:'all'});assert.ok(count>=all.products.length);console.log('PASS live ID pagination/count');
let cart;
if(process.argv.includes('--cart')){
 try{
  const variant=p.variants.find(v=>v.availableForSale);assert.ok(variant,'A purchasable variant is needed for cart verification.');
  cart=(await api.mutateCart('create',null,[{merchandiseId:variant.id,quantity:1}])).cart;
  assert.equal(cart.totalQuantity,1);assert.equal(new URL(cart.checkoutUrl).protocol,'https:');
  cart=(await api.mutateCart('update',cart.id,[{id:cart.lines.nodes[0].id,quantity:1}])).cart;
  cart=(await api.mutateCart('remove',cart.id,[cart.lines.nodes[0].id])).cart;assert.equal(cart.totalQuantity,0);
  cart=(await api.mutateCart('add',cart.id,[{merchandiseId:variant.id,quantity:1}])).cart;
  cart=await api.getCart(cart.id);assert.equal(cart.totalQuantity,1);
  console.log('PASS live cart create, add, update, remove, restore and checkout URL');
 }finally{if(cart?.lines.nodes.length)await api.mutateCart('remove',cart.id,cart.lines.nodes.map(line=>line.id));}
}
console.log('No order or payment was submitted.');
