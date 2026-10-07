// Servidor local que imita o Cloudflare Pages: /academia -> academia.html; o resto cai no index.html
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const raiz=path.resolve(process.argv[2]||'dist'), porta=+(process.argv[3]||8766);
const tipos={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.mp4':'video/mp4','.webm':'video/webm'};
http.createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/\/+$/,'')||'/';
 const tenta=[p==='/'?'/index.html':p,p+'.html'];let f=null;
 for(const t of tenta){const a=path.join(raiz,t);if(a.startsWith(raiz)&&fs.existsSync(a)&&fs.statSync(a).isFile()){f=a;break;}}
 if(!f){if(/\.[a-z0-9]+$/i.test(p)){res.writeHead(404);return res.end('404');}f=path.join(raiz,'index.html');}
 res.writeHead(200,{'content-type':tipos[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
}).listen(porta,()=>console.log('ok '+porta));
