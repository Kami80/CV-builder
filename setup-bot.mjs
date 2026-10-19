import {botCall,welcome} from './telegram.mjs';
import {miniAppUrl} from './bot-copy.mjs';
try{
 const me=await botCall('getMe',{});console.log('Connected to @'+me.username);
 await botCall('setMyDescription',{description:welcome});
 await botCall('setMyShortDescription',{short_description:'Academic resumes with Apply Europe · 699 Toman per resume · https://kami80.github.io/CV-builder/'});
 await botCall('setMyCommands',{commands:[{command:'start',description:'Welcome and CV questionnaire link'}]});
 await botCall('setChatMenuButton',{menu_button:{type:'web_app',text:'Build my CV',web_app:{url:miniAppUrl}}});
 console.log('Bot welcome description, website link and Start command configured.');
}catch(error){console.error(error.message?.startsWith('Telegram ')?error.message:'Bot setup connection failed. Check proxy settings.');process.exitCode=1;}
