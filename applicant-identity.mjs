const encoder=new TextEncoder();
const MAX_AGE=7*24*60*60;
const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
async function key(secret,usage){return crypto.subtle.importKey('raw',encoder.encode('cv-applicant-identity:'+secret),{name:'HMAC',hash:'SHA-256'},false,[usage]);}

export async function signApplicant(user,secret,now=Math.floor(Date.now()/1000)){
 if(!secret||!Number.isSafeInteger(user?.id)||user.id<=0||user.is_bot)throw Error('Invalid Telegram applicant');
 const data={id:user.id,username:typeof user.username==='string'&&/^[a-zA-Z0-9_]{1,32}$/.test(user.username)?user.username:null,issued:now,expires:now+MAX_AGE};
 const payload=base64url(encoder.encode(JSON.stringify(data)));
 const signature=await crypto.subtle.sign('HMAC',await key(secret,'sign'),encoder.encode(payload));
 return payload+'.'+base64url(new Uint8Array(signature));
}

export async function verifyApplicant(token,secret,now=Math.floor(Date.now()/1000)){
 try{
  if(!secret||typeof token!=='string'||token.length>2048)return null;
  const parts=token.split('.');if(parts.length!==2)return null;
  if(!await crypto.subtle.verify('HMAC',await key(secret,'verify'),decode(parts[1]),encoder.encode(parts[0])))return null;
  const user=JSON.parse(new TextDecoder().decode(decode(parts[0])));
  if(!Number.isSafeInteger(user.id)||user.id<=0||!Number.isSafeInteger(user.issued)||!Number.isSafeInteger(user.expires)||user.issued>now+60||user.expires<=now||user.expires-user.issued!==MAX_AGE||user.username!==null&&(typeof user.username!=='string'||!/^[a-zA-Z0-9_]{1,32}$/.test(user.username)))return null;
  return user;
 }catch{return null;}
}

export function applicantDocument(markdown,user){
 return markdown.trimEnd()+`\n\n## Applicant Telegram Contact\n\nVerified Telegram user ID: ${user.id}\nTelegram username: ${user.username?'@'+user.username:'Not set'}\nContact: ${user.username?'https://t.me/'+user.username:'tg://user?id='+user.id}\n`;
}
export function applicantCaption(user){return `New resume · 699 Toman per resume\nTelegram user ID: ${user.id}\nUsername: ${user.username?'@'+user.username:'Not set'}\nPayment not collected`;}
export function applicantButtons(user){return {inline_keyboard:[[{text:'Contact applicant',url:user.username?'https://t.me/'+user.username:'tg://user?id='+user.id}]]};}
