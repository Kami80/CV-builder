import {fetch, ProxyAgent} from 'undici';

const proxy=process.env.TELEGRAM_PROXY_URL;
const dispatcher=proxy?new ProxyAgent(proxy):undefined;
export const telegramFetch=(url,options={})=>fetch(url,{...options,...(dispatcher?{dispatcher}:{})});
export {website,welcome} from './bot-copy.mjs';
import {welcome,welcomeButtons} from './bot-copy.mjs';

export async function botCall(method,data){
 const response=await telegramFetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(35000)});
 const result=await response.json();if(!result.ok)throw new Error(`Telegram ${method} failed (${result.error_code||response.status})`);return result.result;
}

export async function pollWelcome(signal){
 let offset=0;
 while(!signal.aborted){
  try{const updates=await botCall('getUpdates',{offset,timeout:20,allowed_updates:['message']});
   for(const update of updates){offset=update.update_id+1;const message=update.message;
    if(message?.chat.type==='private'&&/^\/start(?:@\w+)?(?:\s|$)/.test(message.text||''))await botCall('sendMessage',{chat_id:message.chat.id,text:welcome,reply_markup:welcomeButtons});
   }
  }catch{if(!signal.aborted){console.error('Telegram welcome connection unavailable; retrying in 10 seconds.');await new Promise(resolve=>setTimeout(resolve,10000));}}
 }
}
