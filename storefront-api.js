import { CONFIG } from './config.js';

export const demo = new URLSearchParams(location.search).get('demo') === '1' || CONFIG.mode === 'demo';
const demoModule = () => import('./demo-catalog.js');
const memory = new Map();
export const productFields = `id handle title vendor productType description availableForSale createdAt
  priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
  seo { title description } featuredImage { url altText width height }
  images(first:12) { nodes { url altText width height } }
  options { name values }
  metafields(identifiers:[${CONFIG.metafields.map(key => `{namespace:"custom",key:"${key}"}`).join(',')}]) { key value type }
  variants(first:100) { nodes { id title availableForSale selectedOptions { name value }
    image { url altText width height } price { amount currencyCode } compareAtPrice { amount currencyCode } } pageInfo { hasNextPage endCursor } }`;
const cardFields = productFields.replace('images(first:12)', 'images(first:2)').replace('variants(first:100)', 'variants(first:2)').replace('productType description ', 'productType description(truncateAt:180) ');
const filterFields = 'id label type values { id label count input }';
const pageFields = 'pageInfo { hasNextPage endCursor }';
const cartFields = `id checkoutUrl totalQuantity cost { subtotalAmount {amount currencyCode} totalAmount {amount currencyCode} }
  lines(first:250) { nodes { id quantity cost { totalAmount {amount currencyCode} amountPerQuantity {amount currencyCode} }
    merchandise { ... on ProductVariant { id title availableForSale selectedOptions {name value} image {url altText}
      price {amount currencyCode} product {id handle title featuredImage {url altText}} } } } pageInfo {hasNextPage endCursor} }`;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function graphql(query, variables = {}, retries = 2) {
  let response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try { response = await fetch(`https://${CONFIG.domain}/api/${CONFIG.apiVersion}/graphql.json`, {
      method: 'POST', headers: { 'Content-Type':'application/json', 'X-Shopify-Storefront-Access-Token':CONFIG.storefrontToken },
      body: JSON.stringify({query,variables}), signal:controller.signal
    }); } finally { clearTimeout(timer); }
    const json = await response.json();
    if ((response.status === 429 || response.status >= 500 || json.errors?.some(e => e.extensions?.code === 'THROTTLED')) && retries) {
      await delay(700 * (3 - retries)); return graphql(query, variables, retries - 1);
    }
    if (!response.ok || json.errors?.length) throw new Error(json.errors?.map(e => e.message).join('; ') || `Shopify returned ${response.status}.`);
    return json.data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The store took too long to respond. Please try again.');
    throw error;
  }
}
export function normalize(raw) {
  if (!raw) return null;
  const variants = raw.variants?.nodes || [];
  const variant = variants.find(v => v.availableForSale) || variants[0];
  const price = Number(raw.priceRange?.minVariantPrice?.amount ?? variant?.price?.amount ?? 0);
  const priceVariant = variants.find(v=>Number(v.price?.amount)===price);
  return { ...raw, variants, images:raw.images?.nodes || (raw.featuredImage ? [raw.featuredImage] : []),
    fields:Object.fromEntries((raw.metafields || []).filter(Boolean).map(m => [m.key,m.value])),
    price, currency:raw.priceRange?.minVariantPrice?.currencyCode || variant?.price?.currencyCode || 'GBP',
    maxPrice:Number(raw.priceRange?.maxVariantPrice?.amount ?? variant?.price?.amount ?? 0),
    compare:Number(priceVariant?.compareAtPrice?.amount || 0), available:!!raw.availableForSale };
}
const sort = value => ({ newest:['CREATED_AT',true], 'price-low':['PRICE',false], 'price-high':['PRICE',true], az:['TITLE',false], za:['TITLE',true] }[value] || ['CREATED_AT',true]);
const quoted = str => `"${String(str).replace(/["\\]/g,'\\$&')}"`;
function rootQuery(inputs) {
  return inputs.map(f => f.available !== undefined ? `available_for_sale:${f.available}` : f.price ?
    [f.price.min != null ? `variants.price:>=${Number(f.price.min)}` : '',f.price.max != null ? `variants.price:<=${Number(f.price.max)}` : ''].filter(Boolean).join(' AND ') :
    f.productVendor ? `vendor:${quoted(f.productVendor)}` : f.productType ? `product_type:${quoted(f.productType)}` : '').filter(Boolean).join(' AND ');
}
function groupedQuery(inputs) {
  const groups = new Map();
  inputs.forEach(f => { const k = Object.keys(f)[0]; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(rootQuery([f])); });
  return [...groups.values()].map(values => `(${values.filter(Boolean).join(' OR ')})`).filter(v => v !== '()').join(' AND ');
}
async function collectionHandle(category) {
  const handle = CONFIG.collections[category];
  if (!handle) return null;
  if (!memory.has(`collection:${handle}`)) {
    const d = await graphql('query($handle:String!){collection(handle:$handle){id title description image{url altText}}}',{handle});
    memory.set(`collection:${handle}`,d.collection);
  }
  return memory.get(`collection:${handle}`);
}
export async function catalog({category='all',q='',filters=[],sortBy='newest',after=null,first=CONFIG.pageSize}={}) {
  if (demo) return (await demoModule()).catalog({category,q,filters,sortBy,after,first});
  if (q) {
    const [key,reverse] = sortBy.startsWith('price-') ? sort(sortBy) : ['RELEVANCE',false];
    const d = await graphql(`query($q:String!,$filters:[ProductFilter!],$after:String,$first:Int!,$sort:SearchSortKeys,$reverse:Boolean){
      search(query:$q,types:[PRODUCT],productFilters:$filters,first:$first,after:$after,sortKey:$sort,reverse:$reverse,unavailableProducts:SHOW){
        totalCount productFilters{${filterFields}} nodes{... on Product{${cardFields}}} ${pageFields}}}`,
    {q,filters,after,first,sort:key,reverse});
    return {products:d.search.nodes.map(normalize),filters:d.search.productFilters,total:d.search.totalCount,pageInfo:d.search.pageInfo};
  }
  const collection = await collectionHandle(category);
  const [key,reverse] = sort(sortBy);
  if (collection) {
    const d = await graphql(`query($handle:String!,$filters:[ProductFilter!],$after:String,$first:Int!,$sort:ProductCollectionSortKeys,$reverse:Boolean){
      collection(handle:$handle){title description image{url altText} products(first:$first,after:$after,filters:$filters,sortKey:$sort,reverse:$reverse){
        nodes{${cardFields}} filters{${filterFields}} ${pageFields}}}}`,
    {handle:CONFIG.collections[category],filters,after,first,sort:key==='CREATED_AT'?'CREATED':key,reverse});
    const c=d.collection;
    return {products:c.products.nodes.map(normalize),filters:c.products.filters,pageInfo:c.products.pageInfo,collection:c};
  }
  if (category !== 'all') return {products:[],filters:[],pageInfo:{hasNextPage:false},total:0,missingCollection:true};
  // Without an all-products collection, use native root queries. Only expose supported filters.
  const d = await graphql(`query($query:String,$after:String,$first:Int!,$sort:ProductSortKeys,$reverse:Boolean){products(query:$query,first:$first,after:$after,sortKey:$sort,reverse:$reverse){nodes{${cardFields}} ${pageFields}}}`,
    {query:groupedQuery(filters),after,first,sort:key,reverse});
  const facetKey=`rootFacets:${JSON.stringify(filters)}`;
  if (!memory.has(facetKey)) {
    const facet = await graphql(`query($filters:[ProductFilter!]){search(query:"*",types:[PRODUCT],first:1,productFilters:$filters){productFilters{${filterFields}}}}`,{filters});
    memory.set(facetKey,facet.search.productFilters.filter(f => f.type === 'PRICE_RANGE' || f.values.every(v => {
      const input=JSON.parse(v.input); return ['available','price','productVendor','productType'].includes(Object.keys(input)[0]);
    })));
  }
  return {products:d.products.nodes.map(normalize),filters:memory.get(facetKey),pageInfo:d.products.pageInfo,root:true};
}
export async function countCatalog({category='all',filters=[]}={}) {
  if (demo) return (await demoModule()).catalog({category,filters,first:1}).total;
  const cacheKey=`count:${category}:${JSON.stringify(filters)}`;
  if (memory.has(cacheKey)) return memory.get(cacheKey);
  const c = await collectionHandle(category);
  if (!c && category !== 'all') return 0;
  let after=null,count=0,more=true;
  while(more) {
    const d = c ? await graphql(`query($h:String!,$f:[ProductFilter!],$a:String){collection(handle:$h){products(first:250,after:$a,filters:$f){nodes{id} ${pageFields}}}}`,{h:CONFIG.collections[category],f:filters,a:after}) :
      await graphql(`query($q:String,$a:String){products(first:250,after:$a,query:$q){nodes{id} ${pageFields}}}`,{q:groupedQuery(filters),a:after});
    const result=c?d.collection.products:d.products;
    count+=result.nodes.length;after=result.pageInfo.endCursor;more=result.pageInfo.hasNextPage;
  }
  memory.set(cacheKey,count);return count;
}
export async function product(handle) {
  if (demo) return (await demoModule()).products.find(p=>p.handle===handle) || null;
  const d=await graphql(`query($h:String!){product(handle:$h){${productFields}}}`,{h:handle});
  if(!d.product)return null;
  while(d.product.variants.pageInfo?.hasNextPage){const next=await graphql(`query($h:String!,$a:String!){product(handle:$h){variants(first:100,after:$a){nodes{id title availableForSale selectedOptions{name value} image{url altText width height} price{amount currencyCode} compareAtPrice{amount currencyCode}} ${pageFields}}}}`,{h:handle,a:d.product.variants.pageInfo.endCursor});d.product.variants.nodes.push(...next.product.variants.nodes);d.product.variants.pageInfo=next.product.variants.pageInfo;}
  return normalize(d.product);
}
export async function productsByIds(ids) {
  if (!ids.length) return [];
  if (demo) return (await demoModule()).products.filter(p=>ids.includes(p.id));
  const result=[];
  for(let i=0;i<ids.length;i+=50){const d=await graphql(`query($ids:[ID!]!){nodes(ids:$ids){... on Product{${cardFields}}}}`,{ids:ids.slice(i,i+50)});result.push(...d.nodes.filter(Boolean).map(normalize));}
  return result;
}
export async function related(id) {
  if (demo) { const all=(await demoModule()).products;const p=all.find(p=>p.id===id);return all.filter(v=>v.id!==id&&v.category===p?.category).slice(0,4); }
  const d=await graphql(`query($id:ID!){productRecommendations(productId:$id){${cardFields}}}`,{id});return (d.productRecommendations || []).slice(0,4).map(normalize);
}
export async function predict(q) {
  if(demo) return (await demoModule()).catalog({q,first:5}).products;
  try {const d=await graphql(`query($q:String!){predictiveSearch(query:$q,types:[PRODUCT],limit:5){products{${cardFields}}}}`,{q});return (d.predictiveSearch?.products||[]).map(normalize);}
  catch {return (await catalog({q,first:5})).products;}
}
export async function shopContent(page) {
  if(demo)return null;
  const policy={delivery:'shippingPolicy',returns:'refundPolicy',privacy:'privacyPolicy',terms:'termsOfService'}[page];
  if(policy){const d=await graphql(`{shop{${policy}{title body url}}}`);return d.shop[policy]?{title:d.shop[policy].title,body:d.shop[policy].body}:null;}
  const d=await graphql('query($h:String!){page(handle:$h){title body seo{title description}}}',{h:{about:'about-us',contact:'contact',faq:'faq',authentication:'authentication'}[page]||page});return d.page;
}
export async function getCart(id) {
  const d=await graphql(`query($id:ID!){cart(id:$id){${cartFields}}}`,{id});return completeCart(d.cart);
}
async function completeCart(cart) {
  if(!cart)return null;
  while(cart.lines.pageInfo?.hasNextPage){const d=await graphql(`query($id:ID!,$after:String!){cart(id:$id){lines(first:250,after:$after){nodes{id quantity cost{totalAmount{amount currencyCode} amountPerQuantity{amount currencyCode}} merchandise{... on ProductVariant{id title availableForSale selectedOptions{name value} image{url altText} price{amount currencyCode} product{id handle title featuredImage{url altText}}}}} ${pageFields}}}}`,{id:cart.id,after:cart.lines.pageInfo.endCursor});cart.lines.nodes.push(...d.cart.lines.nodes);cart.lines.pageInfo=d.cart.lines.pageInfo;}
  return cart;
}
export async function mutateCart(action,cartId,lines) {
  const field={create:'cartCreate',add:'cartLinesAdd',update:'cartLinesUpdate',remove:'cartLinesRemove'}[action];
  const signature=action==='create'?'$input:CartInput!':action==='remove'?'$cartId:ID!,$lines:[ID!]!':`$cartId:ID!,$lines:[${action==='update'?'CartLineUpdateInput':'CartLineInput'}!]!`;
  const args=action==='create'?'input:$input':action==='remove'?'cartId:$cartId,lineIds:$lines':'cartId:$cartId,lines:$lines';
  const d=await graphql(`mutation(${signature}){${field}(${args}){cart{${cartFields}} userErrors{field message} warnings{code message}}}`,
    action==='create'?{input:{lines}}:{cartId,lines});
  const result=d[field];
  if(result.userErrors?.length)throw new Error(result.userErrors.map(e=>e.message).join(' '));
  return {cart:await completeCart(result.cart),warnings:result.warnings||[]};
}
