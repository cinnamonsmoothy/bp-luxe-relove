// Loaded only by explicit demo mode; never used as a fallback for live errors.
const response = await fetch(new URL('./demo-products.json',import.meta.url));
if(!response.ok)throw new Error('The sample catalogue could not load.');
export const products = await response.json();
const group = f => f.variantOption ? `variant:${f.variantOption.name}` : f.productMetafield ? `meta:${f.productMetafield.key}` : Object.keys(f)[0];
function matches(p,filter){
 if(filter.available!==undefined)return p.available===filter.available;
 if(filter.price)return (filter.price.min==null||p.price>=filter.price.min)&&(filter.price.max==null||p.price<=filter.price.max);
 if(filter.productVendor)return p.vendor===filter.productVendor;
 if(filter.productType)return p.productType===filter.productType;
 if(filter.variantOption)return p.variants.some(v=>v.selectedOptions.some(o=>o.name===filter.variantOption.name&&o.value===filter.variantOption.value));
 if(filter.productMetafield)return p.fields[filter.productMetafield.key]===filter.productMetafield.value;
 return true;
}
function filtered(all,filters){const groups=new Map();filters.forEach(f=>{const k=group(f);groups.set(k,[...(groups.get(k)||[]),f]);});return all.filter(p=>[...groups.values()].every(values=>values.some(f=>matches(p,f))));}
export function catalog({category='all',q='',filters=[],sortBy='newest',after=null,first=24}={}){
 let all=products.filter(p=>(['all','new'].includes(category)||p.category===category)&&(!q||`${p.title} ${p.vendor} ${p.description} ${p.productType}`.toLowerCase().includes(q.toLowerCase())));
 const specs=[['Availability',[true,false],v=>({available:v}),v=>v?'In stock':'Sold out'],['Brand',[...new Set(all.map(p=>p.vendor))],v=>({productVendor:v})],['Colour',[...new Set(all.flatMap(p=>p.options.find(o=>o.name==='Colour')?.values||[]))],v=>({variantOption:{name:'Colour',value:v}})],['Size',[...new Set(all.flatMap(p=>p.options.find(o=>o.name==='Size')?.values||[]))],v=>({variantOption:{name:'Size',value:v}})],...['condition','material','style'].map(key=>[key[0].toUpperCase()+key.slice(1),[...new Set(all.map(p=>p.fields[key]))],v=>({productMetafield:{namespace:'custom',key,value:v}})])];
 const facets=specs.filter(s=>s[1].length).map(([label,values,input,toLabel])=>({id:`demo.${label}`,label,type:'LIST',values:values.map(value=>{const f=input(value);return {id:JSON.stringify(f),label:toLabel?toLabel(value):value,input:JSON.stringify(f),count:filtered(all,filters.filter(x=>group(x)!==group(f))).filter(p=>matches(p,f)).length};})}));
 facets.splice(1,0,{id:'demo.price',label:'Price',type:'PRICE_RANGE',values:[{id:'demo.price',label:'Price',count:all.length,input:JSON.stringify({price:{min:0,max:Math.max(0,...all.map(p=>p.price))}})}]});
 const result=filtered(all,filters).sort((a,b)=>sortBy==='price-low'?a.price-b.price:sortBy==='price-high'?b.price-a.price:sortBy==='az'?a.title.localeCompare(b.title):sortBy==='za'?b.title.localeCompare(a.title):new Date(b.createdAt)-new Date(a.createdAt));
 const start=Number(after||0),end=start+first;
 return {products:result.slice(start,end),filters:facets,total:result.length,pageInfo:{hasNextPage:end<result.length,endCursor:String(end)}};
}
