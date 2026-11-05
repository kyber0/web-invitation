import http from 'node:http';
import {readFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname, extname} from 'node:path';
import {randomBytes, createHmac, timingSafeEqual} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const root=process.cwd(), port=Number(process.env.PORT||3000), host=process.env.HOST||'127.0.0.1';
const secret=process.env.SESSION_SECRET, password=process.env.ADMIN_PASSWORD;
if(!secret||secret.length<32||!password||password.length<16) throw Error('Set SESSION_SECRET (32+ characters) and ADMIN_PASSWORD (16+ characters) in .env');
const dbPath=resolve(process.env.DATABASE_PATH||'data/invitation.sqlite'); mkdirSync(dirname(dbPath),{recursive:true});
const db=new DatabaseSync(dbPath); db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS guests(id TEXT PRIMARY KEY,name TEXT NOT NULL,seats INTEGER NOT NULL CHECK(seats BETWEEN 1 AND 30),status TEXT NOT NULL DEFAULT 'pending',attendees TEXT NOT NULL DEFAULT '[]',updated_at TEXT);`);
const equal=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y)};
const sign=value=>createHmac('sha256',secret).update(value).digest('hex');
function authorized(req){const token=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('session='))?.slice(8)||'';const [expiry,sig]=token.split('.');return Number(expiry)>Date.now()&&equal(sig,sign(expiry));}
function json(res,status,value,headers={}){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(value));}
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>16000)throw Error('Request too large');}return JSON.parse(s||'{}');}
const attempts=new Map();
const appUrl=process.env.APP_URL||`http://localhost:${port}`;
const deadline=process.env.RSVP_DEADLINE||'2026-11-19T23:59:59+08:00';
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,appUrl), path=url.pathname;
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
 if(!['GET','HEAD'].includes(req.method)&&req.headers.origin&&req.headers.origin!==new URL(appUrl).origin)return json(res,403,{error:'Invalid origin'});
 if(path==='/api/login'&&req.method==='POST'){
  const ip=req.socket.remoteAddress,now=Date.now();let rate=attempts.get(ip);if(!rate||now>rate.until){rate={count:0,until:now+900000};attempts.set(ip,rate);}if(rate.count>=10)return json(res,429,{error:'Too many attempts. Try again in 15 minutes.'});rate.count++;
  const b=await body(req);if(!equal(b.password,password))return json(res,401,{error:'Incorrect password'});attempts.delete(ip);const expires=String(now+8*3600000);return json(res,200,{ok:true},{'Set-Cookie':`session=${expires}.${sign(expires)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.COOKIE_SECURE==='true'?'; Secure':''}`});
 }
 if(path==='/api/logout'&&req.method==='POST')return json(res,200,{ok:true},{'Set-Cookie':'session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});
 if(path==='/api/guests'){
  if(!authorized(req))return json(res,401,{error:'Please sign in'});
  if(req.method==='GET')return json(res,200,db.prepare('SELECT * FROM guests ORDER BY name').all().map(g=>({...g,attendees:JSON.parse(g.attendees),url:`${appUrl}/?invite=${g.id}`})));
  if(req.method==='POST'){const b=await body(req);if(typeof b.name!=='string'||!b.name.trim()||b.name.length>150||!Number.isInteger(b.seats)||b.seats<1||b.seats>30)return json(res,400,{error:'Enter a name and 1–30 reserved seats'});const id=randomBytes(24).toString('hex');db.prepare('INSERT INTO guests(id,name,seats) VALUES(?,?,?)').run(id,b.name.trim(),b.seats);return json(res,201,{id,url:`${appUrl}/?invite=${id}`});}
 }
 if(path==='/api/invitation'&&req.method==='GET'){const g=db.prepare('SELECT * FROM guests WHERE id=?').get(url.searchParams.get('id')||'');if(!g)return json(res,404,{error:'This invitation link is not valid. Please contact your host.'});return json(res,200,{name:g.name,seats:g.seats,status:g.status,attendees:JSON.parse(g.attendees),deadline,closed:Date.now()>Date.parse(deadline)});}
 if(path==='/api/rsvp'&&req.method==='POST'){const b=await body(req);const g=db.prepare('SELECT * FROM guests WHERE id=?').get(typeof b.id==='string'?b.id:'');if(!g)return json(res,404,{error:'Invalid invitation'});if(Date.now()>Date.parse(deadline))return json(res,403,{error:'RSVP has closed. Please contact your host.'});if(!['attending','declined'].includes(b.status))return json(res,400,{error:'Choose an attendance option'});const names=b.status==='declined'?[]:b.attendees;if(!Array.isArray(names)||(b.status==='attending'&&names.length<1)||names.length>g.seats||names.some(n=>typeof n!=='string'||!n.trim()||n.length>150))return json(res,400,{error:'Enter attendee names within your reserved seat count'});db.prepare('UPDATE guests SET status=?,attendees=?,updated_at=? WHERE id=?').run(b.status,JSON.stringify(names.map(n=>n.trim())),new Date().toISOString(),b.id);return json(res,200,{ok:true});}
 if(path.startsWith('/api/'))return json(res,404,{error:'Not found'});
 let file=path==='/'?'public/index.html':path==='/admin'?'public/admin.html':path.startsWith('/resources/')?path.slice(1):`public${path}`;
 const target=resolve(root,file);if(!target.startsWith(root+ '\\')&&!target.startsWith(root+'/'))return json(res,403,{error:'Forbidden'});
 if(path.startsWith('/resources/')&&!/\.(png|jpe?g)$/i.test(path))return json(res,404,{error:'Not found'});
 try{const bytes=readFileSync(target);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg'})[extname(target)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);}catch{return json(res,404,{error:'Not found'});}
 }catch(error){console.error(error.message);if(!res.headersSent)json(res,400,{error:'Unable to process request'});else res.end();}
}).listen(port,host,()=>console.log(`Invitation ready at http://${host}:${port}\nOrganizer: http://${host}:${port}/admin`));
