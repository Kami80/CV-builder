import {botCall,welcome} from './telegram.mjs';
try{
 const me=await botCall('getMe',{});console.log('Connected to @'+me.username);
 await botCall('setMyDescription',{description:welcome});
 await botCall('setMyShortDescription',{short_description:'Academic resumes with Apply Europe · 699 Toman per resume · https://kami80.github.io/CV-builder/'});
 await botCall('setMyCommands',{commands:[{command:'start',description:'Welcome and CV questionnaire link'}]});
 console.log('Bot welcome description, website link and Start command configured.');
}catch(error){console.error(error.message?.startsWith('Telegram ')?error.message:'Bot setup connection failed. Check proxy settings.');process.exitCode=1;}
