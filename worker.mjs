import {welcome,welcomeButtons} from './bot-copy.mjs';
import {website} from './bot-copy.mjs';
import {signApplicant,verifyApplicant,applicantDocument,applicantCaption,applicantButtons} from './applicant-identity.mjs';
import {startConnection,connectionStatus,completeConnection} from './connection.mjs';

const MAX_BYTES=256000;

async function readJson(request){
 const reader=request.body?.getReader();if(!reader)throw new Error('empty');
 const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw new Error('large');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}

async function secretMatches(expected,actual){
 if(!expected||!actual)return false;
 const key=await crypto.subtle.generateKey({name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
 const encode=value=>new TextEncoder().encode(value);
 return crypto.subtle.verify('HMAC',key,await crypto.subtle.sign('HMAC',key,encode(expected)),encode(actual));
}

export function createHandler(send=fetch){
 return async function handle(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  const allowed=origin===env.ALLOWED_ORIGIN;
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',Vary:'Origin'};
  if(allowed)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400'});
  const json=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  const telegram=async(method,body,isForm=false)=>{
   const response=await send(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,{method:'POST',...(isForm?{}:{headers:{'Content-Type':'application/json'}}),body:isForm?body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
   const result=await response.json();if(!response.ok||!result.ok)throw new Error('telegram');return result.result;
  };
  if(url.pathname==='/health'&&request.method==='GET')return json(200,{ok:true,service:'Apply Europe CV'});
  const browserApi=['/api/resume','/api/identity','/api/connect','/api/connect/status'].includes(url.pathname);
  if(!browserApi&&url.pathname!=='/telegram/webhook')return json(404,{error:'Not found.'});
  if(browserApi&&!allowed)return json(403,{error:'Please submit from the Apply Europe CV website.'});
  if(request.method==='OPTIONS'&&browserApi)return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json(405,{error:'Use POST.'});
  if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return json(503,{error:'Delivery is temporarily unavailable. Your draft is saved.'});
  if(url.pathname==='/telegram/webhook'&&!await secretMatches(env.TELEGRAM_WEBHOOK_SECRET,request.headers.get('X-Telegram-Bot-Api-Secret-Token')))return json(403,{error:'Forbidden.'});
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json(415,{error:'Expected JSON.'});
  let body;try{body=await readJson(request);}catch(error){return json(error.message==='large'?413:400,{error:error.message==='large'?'Resume is too large. Please shorten your entries.':'Invalid request.'});}
  if(!body||typeof body!=='object')return json(400,{error:'Invalid request.'});
  if(url.pathname==='/telegram/webhook'){
   const message=body.message;
   if(message?.chat?.type==='private'&&/^\/start(?:@\w+)?(?:\s|$)/.test(message.text||'')){
    try{
     if(!message.from||message.from.id!==message.chat.id||message.from.is_bot)return json(400,{error:'Invalid Telegram sender.'});
     const token=await signApplicant(message.from,env.TELEGRAM_WEBHOOK_SECRET);
     const connectionId=message.text.match(/^\/start(?:@\w+)?\s+c_([a-f0-9]{48})$/)?.[1];
     let connected=false;
     if(connectionId){connected=await completeConnection(env.CONNECTIONS,connectionId,token);if(!connected){await telegram('sendMessage',{chat_id:message.chat.id,text:'This connection request has expired or was already used. Return to the website and select Connect through Telegram again.'});return json(200,{ok:true});}}
     const buttons={inline_keyboard:[[{text:'Open CV builder',url:website+'#telegram='+token}],...welcomeButtons.inline_keyboard.slice(1)]};
     await telegram('sendMessage',{chat_id:message.chat.id,text:welcome+(connected?'\n\n✅ Telegram connected! Return to your browser—the CV builder opens automatically. You can also tap Open CV builder below.':'\n\nTap Open CV builder below to begin. Your Telegram contact is connected automatically.'),reply_markup:buttons});
    }catch{return json(502,{error:'Welcome delivery unavailable.'});}
   }
   return json(200,{ok:true});
  }
  if(url.pathname==='/api/connect'){
   const ip=request.headers.get('CF-Connecting-IP')||'unknown';
   if(!(await env.CONNECTION_LIMITER.limit({key:'connect:'+ip})).success)return json(429,{error:'Please wait a minute before connecting again.'});
   try{return json(200,{ok:true,connection:await startConnection(env.CONNECTIONS)});}catch{return json(503,{error:'Telegram connection is temporarily unavailable. Please try again.'});}
  }
  if(url.pathname==='/api/connect/status'){
   try{const connection=await connectionStatus(env.CONNECTIONS,body);if(!connection)return json(410,{error:'Connection expired. Please connect through Telegram again.'});return json(200,{ok:true,pending:!connection.identity,...(connection.identity?{telegramIdentity:connection.identity}:{})});}catch{return json(503,{error:'Unable to check Telegram connection. Please try again.'});}
  }
  const applicant=await verifyApplicant(body.telegramIdentity,env.TELEGRAM_WEBHOOK_SECRET);
  if(!applicant)return json(401,{error:'Please connect your Telegram account using the bot before submitting.'});
  if(url.pathname==='/api/identity')return json(200,{ok:true,applicant:{id:applicant.id,username:applicant.username,expires:applicant.expires}});
  if(body.consent!==true||typeof body.markdown!=='string'||!body.markdown.trim()||typeof body.filename!=='string'||!/^[\p{L}\p{N}_.-]{1,150}\.md$/u.test(body.filename))return json(400,{error:'A resume, valid filename and consent are required.'});
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  if(!(await env.RESUME_LIMITER.limit({key:'resume:'+applicant.id})).success||!(await env.RESUME_LIMITER.limit({key:'ip:'+ip})).success)return json(429,{error:'Please wait one minute before sending again.'});
  const form=new FormData();form.set('chat_id',env.TELEGRAM_CHAT_ID);form.set('caption',applicantCaption(applicant));form.set('reply_markup',JSON.stringify(applicantButtons(applicant)));form.set('document',new Blob([applicantDocument(body.markdown,applicant)],{type:'text/markdown;charset=utf-8'}),body.filename);
  try{await telegram('sendDocument',form,true);return json(200,{ok:true});}
  catch{return json(502,{error:'Delivery could not be confirmed. Contact @SafaeiKamyab before retrying. Your draft is saved.'});}
 };
}

export default {
 fetch:(request,env)=>createHandler()(request,env),
 scheduled(controller,env,ctx){ctx.waitUntil(env.CONNECTIONS.prepare('DELETE FROM telegram_connections WHERE expires < ?1').bind(Math.floor(Date.now()/1000)).run());}
};
