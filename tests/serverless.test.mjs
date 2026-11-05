import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {startSupabaseFixture} from './supabase-fixture.mjs';

test('Vercel route query, parsed JSON bodies, database-backed login throttling', async () => {
  const fixture = await startSupabaseFixture();
  process.env.SUPABASE_URL = fixture.url;
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_only';
  process.env.ADMIN_PASSWORD = 'test-password-long-enough';
  process.env.SESSION_SECRET = 'test-session-secret-with-more-than-32-characters';
  process.env.APP_URL = 'http://localhost:3000';
  process.env.RSVP_DEADLINE = '2099-11-19T23:59:59+08:00';
  const {handler} = await import('../api/index.mjs').then(m => ({handler:m.default}));
  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST') {
      let raw=''; for await (const chunk of req) raw += chunk;
      req.body = JSON.parse(raw || '{}');
    }
    return handler(req, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const login = await fetch(`${base}/api?route=login`, {method:'POST', body:JSON.stringify({password:process.env.ADMIN_PASSWORD})});
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const create = await fetch(`${base}/api?route=guests`, {method:'POST',headers:{cookie},body:JSON.stringify({name:'Serverless Family',seats:2})});
    assert.equal(create.status, 201);
    const {id} = await create.json();
    assert.equal((await fetch(`${base}/api?route=invitation&id=${id}`)).status, 200);
    for(let i=0;i<9;i++) await fetch(`${base}/api?route=login`, {method:'POST',body:'{"password":"wrong"}'});
    const throttled = await fetch(`${base}/api?route=login`, {method:'POST',body:'{"password":"wrong"}'});
    assert.equal(throttled.status, 429);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fixture.close();
  }
});
