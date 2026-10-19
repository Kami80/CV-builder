import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {startConnection,connectionStatus,completeConnection} from './connection.mjs';
import {createHandler} from './worker.mjs';
import {verifyApplicant} from './applicant-identity.mjs';

function database(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('./connection-schema.sql',import.meta.url),'utf8'));
 return {prepare(query){return {bind(...args){const statement=sql.prepare(query);return {async run(){return {meta:{changes:statement.run(...args).changes}};},async first(){return statement.get(...args)||null;}};}};}};
}
test('browser connection uses separate polling proof, expires, and cannot be rebound',async()=>{
 const db=database(),session=await startConnection(db,1000);
 assert.match(session.botUrl,/start=c_[a-f0-9]{48}$/);
 assert.equal((await connectionStatus(db,session,1001)).identity,null);
 assert.equal(await connectionStatus(db,{...session,pollSecret:'0'.repeat(64)},1001),null);
 assert.equal(await completeConnection(db,session.id,'identity-one',1002),true);
 assert.equal(await completeConnection(db,session.id,'identity-two',1003),false);
 assert.equal((await connectionStatus(db,session,1004)).identity,'identity-one');
 assert.equal(await connectionStatus(db,session,1600),null);
 const expired=await startConnection(db,2000);assert.equal(await completeConnection(db,expired.id,'late',2601),false);
});
test('Start links the original browser, returns verified identity and sends no applicant file',async()=>{
 const messages=[];const env={CONNECTIONS:database(),ALLOWED_ORIGIN:'https://kami80.github.io',TELEGRAM_BOT_TOKEN:'test',TELEGRAM_CHAT_ID:'owner',TELEGRAM_WEBHOOK_SECRET:'secret',CONNECTION_LIMITER:{limit:async()=>({success:true})}};
 const handler=createHandler(async(url,options)=>{assert.match(url,/\/sendMessage$/);messages.push(JSON.parse(options.body));return Response.json({ok:true});});
 const request=(path,body,headers={})=>new Request('https://backend.example'+path,{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 const response=await handler(request('/api/connect',{}),env);assert.equal(response.status,200);const {connection}=await response.json();
 assert.equal((await(await handler(request('/api/connect/status',connection),env)).json()).pending,true);
 assert.equal((await handler(request('/api/connect/status',{...connection,pollSecret:'f'.repeat(64)}),env)).status,410);
 const update={message:{text:'/start c_'+connection.id,from:{id:123,username:'Applicant',is_bot:false},chat:{id:123,type:'private'}}};
 assert.equal((await handler(request('/telegram/webhook',update,{'X-Telegram-Bot-Api-Secret-Token':'wrong'}),env)).status,403);
 assert.equal((await handler(request('/telegram/webhook',update,{'X-Telegram-Bot-Api-Secret-Token':'secret'}),env)).status,200);
 assert.match(messages[0].text,/original browser is also connected/);assert.equal(messages[0].reply_markup.inline_keyboard[0][0].text,'Open CV builder');
 const status=await(await handler(request('/api/connect/status',connection),env)).json();assert.equal(status.pending,false);
 const identity=await verifyApplicant(status.telegramIdentity,env.TELEGRAM_WEBHOOK_SECRET);assert.equal(identity.id,123);assert.equal(identity.username,'Applicant');
 assert.equal((await handler(request('/api/connect',{}, {Origin:'https://other.example'}),env)).status,403);
});
