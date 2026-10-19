import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from './worker.mjs';
import {signApplicant,verifyApplicant,applicantDocument} from './applicant-identity.mjs';
const applicant={id:123,username:'TestApplicant'};

const env={ALLOWED_ORIGIN:'https://kami80.github.io',TELEGRAM_BOT_TOKEN:'test-token',TELEGRAM_CHAT_ID:'owner',TELEGRAM_WEBHOOK_SECRET:'webhook-secret',RESUME_LIMITER:{limit:async()=>({success:true})}};
const telegramIdentity=await signApplicant(applicant,env.TELEGRAM_WEBHOOK_SECRET);
const payload={telegramIdentity,consent:true,filename:'test_cv.md',markdown:'# Test Applicant\nAcademic CV'};
const request=(data=payload,origin=env.ALLOWED_ORIGIN)=>new Request('https://backend.example/api/resume',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
test('hosted submissions upload a file only to owner and return correct CORS headers',async()=>{
 const handler=createHandler(async(url,options)=>{assert.match(url,/\/sendDocument$/);assert.equal(options.body.get('chat_id'),'owner');assert.equal(await options.body.get('document').text(),applicantDocument(payload.markdown,applicant));assert.match(options.body.get('caption'),/Telegram user ID: 123/);assert.match(options.body.get('caption'),/@TestApplicant/);return Response.json({ok:true,result:{message_id:1}});});
 const response=await handler(request(),env);assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),env.ALLOWED_ORIGIN);
 const preflight=await handler(new Request('https://backend.example/api/resume',{method:'OPTIONS',headers:{Origin:env.ALLOWED_ORIGIN}}),env);assert.equal(preflight.status,204);
});
test('hosted endpoint rejects wrong origin, missing consent, malformed and oversized requests',async()=>{
 const handler=createHandler(()=>{throw Error('Unexpected upload');});
 assert.equal((await handler(request(payload,'https://other.example'),env)).status,403);
 assert.equal((await handler(request({...payload,consent:false}),env)).status,400);
 assert.equal((await handler(request(null),env)).status,400);
 assert.equal((await handler(request({...payload,markdown:'x'.repeat(256001)}),env)).status,413);
 assert.equal((await handler(request(),{...env,RESUME_LIMITER:{limit:async()=>({success:false})}})).status,429);
});
test('hosted upstream failure preserves CORS and reports no success',async()=>{
 const response=await createHandler(async()=>Response.json({ok:false},{status:400}))(request(),env);
 assert.equal(response.status,502);assert.equal(response.headers.get('Access-Control-Allow-Origin'),env.ALLOWED_ORIGIN);
});
test('webhook rejects forged requests and replies to authenticated private start commands',async()=>{
 let sent=false;const handler=createHandler(async(url,options)=>{sent=true;assert.match(url,/\/sendMessage$/);const body=JSON.parse(options.body);assert.equal(body.chat_id,123);assert.match(body.text,/699 Toman/);const link=new URL(body.reply_markup.inline_keyboard[0][0].url);assert.equal(link.origin+link.pathname,'https://kami80.github.io/CV-builder/');const identity=await verifyApplicant(new URLSearchParams(link.hash.slice(1)).get('telegram'),env.TELEGRAM_WEBHOOK_SECRET);assert.equal(identity.id,123);assert.equal(identity.username,'TestApplicant');return Response.json({ok:true});});
 const update=secret=>new Request('https://backend.example/telegram/webhook',{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Bot-Api-Secret-Token':secret},body:JSON.stringify({message:{text:'/start',from:{id:123,username:'TestApplicant',is_bot:false},chat:{id:123,type:'private'}}})});
 assert.equal((await handler(update('wrong'),env)).status,403);assert.equal(sent,false);
 assert.equal((await handler(update(env.TELEGRAM_WEBHOOK_SECRET),env)).status,200);assert.equal(sent,true);
});

test('identity rejects missing, tampered and expired tokens and handles accounts without usernames',async()=>{
 const handler=createHandler(()=>{throw Error('Unexpected upload');});
 assert.equal((await handler(request({...payload,telegramIdentity:''}),env)).status,401);
 assert.equal((await handler(request({...payload,telegramIdentity:telegramIdentity+'x'}),env)).status,401);
 const old=await signApplicant(applicant,env.TELEGRAM_WEBHOOK_SECRET,1);
 assert.equal((await handler(request({...payload,telegramIdentity:old}),env)).status,401);
 const anonymous=await signApplicant({id:456},env.TELEGRAM_WEBHOOK_SECRET);
 const response=await handler(new Request('https://backend.example/api/identity',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({telegramIdentity:anonymous})}),env);
 assert.equal(response.status,200);assert.deepEqual((await response.json()).applicant.username,null);
});
