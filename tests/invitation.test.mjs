import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {startSupabaseFixture} from './supabase-fixture.mjs';
async function start(deadline) {
  const fixture = await startSupabaseFixture();
  const port = 32000 + Math.floor(Math.random() * 20000);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.mjs'], {
    env: {...process.env, HOST:'127.0.0.1', PORT:String(port), APP_URL:base,
      SUPABASE_URL:fixture.url, SUPABASE_SECRET_KEY:'sb_secret_test_only',
      ADMIN_PASSWORD:'test-password-long-enough',
      SESSION_SECRET:'test-session-secret-with-more-than-32-characters', RSVP_DEADLINE:deadline},
    stdio:['ignore','pipe','pipe']
  });
  await new Promise((resolve,reject) => {
    child.stdout.once('data',resolve);
    child.once('error',reject);
    child.once('exit',code=>reject(Error(`Server exited: ${code}`)));
  });
  return {base, async close() {
    const exited = new Promise(resolve => child.once('exit',resolve));
    child.kill(); await exited; await fixture.close();
  }};
}
test('protected organizer, persistent RSVP, seat validation and personal links',async()=>{const app=await start('2099-11-19T23:59:59+08:00');try{const request=(path,opts)=>fetch(app.base+path,opts);assert.equal((await request('/')).status,200);assert.equal((await request('/api/guests')).status,401);assert.equal((await request('/.env')).status,404);assert.equal((await request('/api/invitation?id=bad')).status,404);assert.equal((await request('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'wrong'})})).status,401);const login=await request('/api/login',{method:'POST',body:JSON.stringify({password:'test-password-long-enough'})});const cookie=login.headers.get('set-cookie').split(';')[0];const created=await request('/api/guests',{method:'POST',headers:{cookie},body:JSON.stringify({name:'Test Family',seats:2})});assert.equal(created.status,201);const {id}=await created.json();assert.equal((await request('/api/rsvp',{method:'POST',body:JSON.stringify({id,status:'attending',attendees:['A','B','C']})})).status,400);assert.equal((await request('/api/rsvp',{method:'POST',body:JSON.stringify({id,status:'attending',attendees:['A','B']})})).status,200);const personal=await (await request(`/api/invitation?id=${id}`)).json();assert.deepEqual(personal.attendees,['A','B']);assert.equal(personal.status,'attending');assert.equal((await request('/api/guests',{method:'POST',headers:{cookie,origin:'https://wrong.test'},body:'{}'})).status,403);assert.equal((await request('/api/rsvp',{method:'POST',body:JSON.stringify({id,status:'declined'})})).status,200);const declined=await (await request(`/api/invitation?id=${id}`)).json();assert.deepEqual(declined.attendees,[]);}finally{await app.close()}});
test('RSVP cutoff is enforced by the server',async()=>{const app=await start('2020-01-01T00:00:00Z');try{const login=await fetch(app.base+'/api/login',{method:'POST',body:JSON.stringify({password:'test-password-long-enough'})});const cookie=login.headers.get('set-cookie').split(';')[0];const created=await fetch(app.base+'/api/guests',{method:'POST',headers:{cookie},body:JSON.stringify({name:'Late Guest',seats:1})});const {id}=await created.json();const reply=await fetch(app.base+'/api/rsvp',{method:'POST',body:JSON.stringify({id,status:'attending',attendees:['Guest']})});assert.equal(reply.status,403)}finally{await app.close()}});
