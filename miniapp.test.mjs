import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyMiniApp,verifyApplicant} from './applicant-identity.mjs';
import {createHandler} from './worker.mjs';

function initData(token,overrides={}){
 const fields={auth_date:String(Math.floor(Date.now()/1000)),query_id:'test-query',signature:'test-signature',user:JSON.stringify({id:123,username:'Applicant',is_bot:false}),...overrides};
 const check=Object.keys(fields).sort().map(key=>key+'='+fields[key]).join('\n');
 const key=createHmac('sha256','WebAppData').update(token).digest();
 return new URLSearchParams({...fields,hash:createHmac('sha256',key).update(check).digest('hex')}).toString();
}
test('Mini App validates Telegram HMAC and rejects forged, stale, future and duplicate data',async()=>{
 const data=initData('token');assert.equal((await verifyMiniApp(data,'token')).id,123);
 assert.equal(await verifyMiniApp(data,'other-token'),null);
 assert.equal(await verifyMiniApp(data.replace('Applicant','Impersonator'),'token'),null);
 assert.equal(await verifyMiniApp(initData('token',{auth_date:'1'}),'token'),null);
 assert.equal(await verifyMiniApp(initData('token',{auth_date:String(Math.floor(Date.now()/1000)+3600)}),'token'),null);
 assert.equal(await verifyMiniApp(data+'&user=forged','token'),null);
});
test('Mini App exchanges verified Telegram identity for resume credentials',async()=>{
 const env={ALLOWED_ORIGIN:'https://kami80.github.io',TELEGRAM_BOT_TOKEN:'token',TELEGRAM_CHAT_ID:'owner',TELEGRAM_WEBHOOK_SECRET:'secret'};
 const request=data=>new Request('https://backend.example/api/telegram',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({initData:data})});
 const handler=createHandler();const response=await handler(request(initData('token')),env);assert.equal(response.status,200);
 const result=await response.json();const user=await verifyApplicant(result.telegramIdentity,'secret');assert.equal(user.id,123);assert.equal(user.username,'Applicant');
 assert.equal((await handler(request('user=unverified'),env)).status,401);
});
