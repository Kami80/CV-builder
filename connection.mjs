const randomHex=length=>Array.from(crypto.getRandomValues(new Uint8Array(length)),b=>b.toString(16).padStart(2,'0')).join('');
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');

export async function startConnection(db,now=Math.floor(Date.now()/1000)){
 const id=randomHex(24),pollSecret=randomHex(32),expires=now+600;
 await db.prepare('DELETE FROM telegram_connections WHERE expires < ?1').bind(now).run();
 await db.prepare('INSERT INTO telegram_connections (id,poll_hash,expires) VALUES (?1,?2,?3)').bind(id,await hash(pollSecret),expires).run();
 return {id,pollSecret,expires,botUrl:'https://t.me/ApplyEuropeCVBot?start=c_'+id};
}
export async function connectionStatus(db,body,now=Math.floor(Date.now()/1000)){
 if(typeof body.id!=='string'||!/^[a-f0-9]{48}$/.test(body.id)||typeof body.pollSecret!=='string'||!/^[a-f0-9]{64}$/.test(body.pollSecret))return null;
 return db.prepare('SELECT identity,expires FROM telegram_connections WHERE id=?1 AND poll_hash=?2 AND expires>?3').bind(body.id,await hash(body.pollSecret),now).first();
}
export async function completeConnection(db,id,identity,now=Math.floor(Date.now()/1000)){
 if(!/^[a-f0-9]{48}$/.test(id))return false;
 const result=await db.prepare('UPDATE telegram_connections SET identity=?1 WHERE id=?2 AND identity IS NULL AND expires>?3').bind(identity,id,now).run();
 return result.meta.changes===1;
}
