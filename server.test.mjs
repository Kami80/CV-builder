import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createServer} from './server.mjs';

async function withServer(options,run){const server=createServer(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await run(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise(r=>server.close(r));}}
const payload={consent:true,filename:'کام‌یاب_cv.md'.replace('‌',''),markdown:'# کام‌یاب\n\nEducation'};
const post=(url,body=payload,headers={})=>fetch(url+'/api/resume',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('sends UTF-8 Markdown as an actual document to the configured owner, then rate limits',async()=>{
 await withServer({token:'test-token',chatId:'123',send:async(url,options)=>{
   assert.equal(url,'https://api.telegram.org/bottest-token/sendDocument');assert.equal(options.body.get('chat_id'),'123');
   const file=options.body.get('document');assert.equal(file.name,payload.filename);assert.equal(await file.text(),payload.markdown);
   return Response.json({ok:true});
 }},async url=>{assert.equal((await post(url)).status,200);assert.equal((await post(url)).status,429);assert.equal((await fetch(url+'/.env')).status,404);});
});
test('missing configuration gives an actionable error',async()=>withServer({token:'',chatId:''},async url=>assert.equal((await post(url)).status,503)));
test('rejects missing consent and cross-origin requests without contacting Telegram',async()=>withServer({token:'x',chatId:'1',send:()=>{throw Error('Unexpected send');}},async url=>{assert.equal((await post(url,{...payload,consent:false})).status,400);assert.equal((await post(url,payload,{Origin:'https://other.example'})).status,403);assert.equal((await post(url,{...payload,filename:'../secret.md'})).status,400);assert.equal((await post(url,{...payload,markdown:'x'.repeat(256001)})).status,413);}));
test('Telegram failure is never reported as success',async()=>withServer({token:'x',chatId:'1',send:async()=>Response.json({ok:false},{status:400})},async url=>assert.equal((await post(url)).status,502)));
test('frontend script parses and download/import controls are absent',async()=>{const html=await readFile(new URL('./index.html',import.meta.url),'utf8');new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);assert.doesNotMatch(html,/function download\(|function importFile\(|type="file"|\.download=/);assert.match(html,/699 Toman/);assert.match(html,/id="sendMain"/);});
