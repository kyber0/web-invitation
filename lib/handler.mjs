import {randomBytes, createHmac, timingSafeEqual} from 'node:crypto';
import {createStore} from './store.mjs';
const port=Number(process.env.PORT||3000);
const secret=process.env.SESSION_SECRET, password=process.env.ADMIN_PASSWORD;
if(!secret||secret.length<32||!password||password.length<16) throw Error('Set SESSION_SECRET (32+ characters) and ADMIN_PASSWORD (16+ characters) in .env');
const db=createStore();
const equal=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y)};
const sign=value=>createHmac('sha256',secret).update(value).digest('hex');
function authorized(req){const token=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('session='))?.slice(8)||'';const [expiry,sig]=token.split('.');return Number(expiry)>Date.now()&&equal(sig,sign(expiry));}
function json(res,status,value,headers={}){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(value));}
async function body(req){if(req.body!==undefined){const value=typeof req.body==='string'?JSON.parse(req.body):req.body;if(JSON.stringify(value).length>16000)throw Error('Request too large');return value;}let s='';for await(const chunk of req){s+=chunk;if(s.length>16000)throw Error('Request too large');}return JSON.parse(s||'{}');}
const appUrl=process.env.APP_URL||`http://localhost:${port}`;
const deadline=process.env.RSVP_DEADLINE||'2026-12-26T23:59:59+08:00';
if(!Number.isFinite(Date.parse(deadline)))throw Error('Invalid RSVP_DEADLINE');
export async function handler(req,res){try{
 const url=new URL(req.url,appUrl); const route=url.searchParams.get('route'); const path=route?`/api/${route}`:url.pathname;
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
 if(!['GET','HEAD'].includes(req.method)&&req.headers.origin&&req.headers.origin!==new URL(appUrl).origin)return json(res,403,{error:'Invalid origin'});
 if(path==='/api/login'&&req.method==='POST'){
  const ip=process.env.VERCEL?String(req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim():req.socket.remoteAddress; const now=Date.now();if(!await db.allowLogin(sign(ip)))return json(res,429,{error:'Too many attempts. Try again in 15 minutes.'});
  const b=await body(req);if(!equal(b.password,password))return json(res,401,{error:'Incorrect password'});const expires=String(now+8*3600000);return json(res,200,{ok:true},{'Set-Cookie':`session=${expires}.${sign(expires)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.COOKIE_SECURE==='true'?'; Secure':''}`});
 }
 if(path==='/api/logout'&&req.method==='POST')return json(res,200,{ok:true},{'Set-Cookie':'session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});
 if(path==='/api/guests'){
  if(!authorized(req))return json(res,401,{error:'Please sign in'});
  if(req.method==='GET')return json(res,200,(await db.list()).map(g=>({...g,url:`${appUrl}/?invite=${g.id}`})));
  if(req.method==='POST'){const b=await body(req);if(typeof b.name!=='string'||!b.name.trim()||b.name.length>150||!Number.isInteger(b.seats)||b.seats<1||b.seats>30)return json(res,400,{error:'Enter a name and 1–30 reserved seats'});const id=randomBytes(24).toString('hex');await db.create(id,b.name.trim(),b.seats);return json(res,201,{id,url:`${appUrl}/?invite=${id}`});}
 }
 if(path==='/api/invitation'&&req.method==='GET'){const g=await db.get(url.searchParams.get('id')||'');if(!g)return json(res,404,{error:'This invitation link is not valid. Please contact your host.'});return json(res,200,{name:g.name,seats:g.seats,status:g.status,attendees:g.attendees,deadline,closed:Date.now()>Date.parse(deadline)});}
 if(path==='/api/rsvp'&&req.method==='POST'){const b=await body(req);const g=await db.get(typeof b.id==='string'?b.id:'');if(!g)return json(res,404,{error:'Invalid invitation'});if(Date.now()>Date.parse(deadline))return json(res,403,{error:'RSVP has closed. Please contact your host.'});if(!['attending','declined'].includes(b.status))return json(res,400,{error:'Choose an attendance option'});const names=b.status==='declined'?[]:b.attendees;if(!Array.isArray(names)||(b.status==='attending'&&names.length<1)||names.length>g.seats||names.some(n=>typeof n!=='string'||!n.trim()||n.length>150))return json(res,400,{error:'Enter attendee names within your reserved seat count'});await db.rsvp(b.id,b.status,names.map(n=>n.trim()));return json(res,200,{ok:true});}
 return json(res,404,{error:'Not found'});
 }catch(error){console.error(error.message);if(!res.headersSent)json(res,503,{error:'Unable to process request. Please try again later.'});else res.end();}
}
