import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),port=Number(process.env.PORT||8000);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2','.otf':'font/otf','.ttf':'font/ttf','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const bytes=await fs.readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Page not found');}}).listen(port,'127.0.0.1',()=>console.log(`BP Luxe Relove: http://127.0.0.1:${port}`));
