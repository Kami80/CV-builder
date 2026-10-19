import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {telegramFetch,pollWelcome} from './telegram.mjs';
import {FormData} from 'undici';
import {verifyApplicant,applicantDocument,applicantCaption,applicantButtons} from './applicant-identity.mjs';

const assets = new Map([['/', ['index.html','text/html; charset=utf-8']], ['/index.html',['index.html','text/html; charset=utf-8']], ...['contact-qr.png','group-qr.png','reference-cv-preview.webp','reference-academic-cv.pdf'].map(name=>['/'+name,[name,name.endsWith('.pdf')?'application/pdf':name.endsWith('.png')?'image/png':'image/webp']])]);

export function createServer({token=process.env.TELEGRAM_BOT_TOKEN,chatId=process.env.TELEGRAM_CHAT_ID,identitySecret=process.env.TELEGRAM_WEBHOOK_SECRET,send=telegramFetch}={}) {
  const attempts=new Map();
  return http.createServer(async(req,res)=>{
    const json=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
    if(['/api/connect','/api/connect/status'].includes(req.url)){
      if(req.method!=='POST')return json(405,{error:'Use POST.'});
      if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return json(403,{error:'Origin not allowed.'});}catch{return json(403,{error:'Invalid origin.'});}}
      try{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>4096)return json(413,{error:'Invalid connection request.'});chunks.push(chunk);}
       const response=await telegramFetch('https://apply-europe-cv-api.micioparla.workers.dev'+req.url,{method:'POST',headers:{Origin:'https://kami80.github.io','Content-Type':'application/json'},body:Buffer.concat(chunks),signal:AbortSignal.timeout(15000)});
       return json(response.status,await response.json());
      }catch{return json(503,{error:'Unable to connect to Telegram. Please try again.'});}
    }
    if(req.url==='/api/resume'||req.url==='/api/identity'){
      if(req.method!=='POST')return json(405,{error:'Use POST.'});
      if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return json(403,{error:'Origin not allowed.'});}catch{return json(403,{error:'Invalid origin.'});}}
      if(!token||!chatId)return json(503,{error:'Telegram delivery is not configured yet. Contact @SafaeiKamyab. Your draft is saved.'});
      if(!req.headers['content-type']?.startsWith('application/json'))return json(415,{error:'Expected JSON.'});
      const now=Date.now();for(const [key,time] of attempts)if(now-time>60000)attempts.delete(key);
      const ip=req.socket.remoteAddress;
      if(attempts.has(ip))return json(429,{error:'Please wait one minute before sending again.'});
      let bytes=0,chunks=[];
      try{
        for await(const chunk of req){bytes+=chunk.length;if(bytes>256000)return json(413,{error:'Resume is too large. Please shorten your entries.'});chunks.push(chunk);}
        let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{return json(400,{error:'Invalid request.'});}
        const applicant=await verifyApplicant(body?.telegramIdentity,identitySecret);
        if(!applicant)return json(401,{error:'Please connect your Telegram account using the bot before submitting.'});
        if(req.url==='/api/identity')return json(200,{ok:true,applicant:{id:applicant.id,username:applicant.username,expires:applicant.expires}});
        if(body.consent!==true||typeof body.markdown!=='string'||!body.markdown.trim()||typeof body.filename!=='string'||!/^[\p{L}\p{N}_.-]{1,150}\.md$/u.test(body.filename))return json(400,{error:'A resume, valid filename and consent are required.'});
        attempts.set(ip,now);
        const form=new FormData();form.set('chat_id',chatId);form.set('caption',applicantCaption(applicant));form.set('reply_markup',JSON.stringify(applicantButtons(applicant)));form.set('document',new Blob([applicantDocument(body.markdown,applicant)],{type:'text/markdown;charset=utf-8'}),body.filename);
        const response=await send(`https://api.telegram.org/bot${token}/sendDocument`,{method:'POST',body:form,signal:AbortSignal.timeout(20000)});
        const result=await response.json();
        if(!response.ok||!result.ok)return json(502,{error:'Telegram could not accept the file. Please retry in a minute or contact @SafaeiKamyab.'});
        return json(200,{ok:true});
      }catch{return json(502,{error:'Delivery could not be confirmed. Contact @SafaeiKamyab before retrying. Your draft is saved.'});}
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
    const asset=assets.get(req.url?.split('?')[0]);if(!asset){res.writeHead(404);return res.end('Not found');}
    try{const data=await readFile(new URL(asset[0],import.meta.url));res.writeHead(200,{'Content-Type':asset[1],'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);res.end('Not found');}
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 createServer().listen(Number(process.env.PORT)||3000,()=>console.log('CV Builder listening on port '+(process.env.PORT||3000)));
 if(process.env.TELEGRAM_BOT_TOKEN&&process.env.TELEGRAM_WELCOME_ENABLED==='true')pollWelcome(new AbortController().signal);
}
