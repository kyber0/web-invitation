import http from 'node:http';

// A REST-contract fixture; it does not substitute for a live Supabase smoke test.
export async function startSupabaseFixture() {
  const guests = new Map(), attempts = new Map();
  const server = http.createServer(async (req, res) => {
    if (req.headers.apikey !== 'sb_secret_test_only') { res.writeHead(401); return res.end('{}'); }
    const url = new URL(req.url, 'http://localhost');
    let body = ''; for await (const chunk of req) body += chunk;
    const data = body ? JSON.parse(body) : {};
    const json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
    if (url.pathname.endsWith('/rpc/consume_login_attempt')) {
      const count = (attempts.get(data.bucket_key) || 0) + 1;
      attempts.set(data.bucket_key, count); return json(count <= 10);
    }
    if (url.pathname !== '/rest/v1/guests') { res.writeHead(404); return res.end('{}'); }
    if (req.method === 'POST') {
      guests.set(data.id, { ...data, status: 'pending', attendees: [], updated_at: null });
      res.writeHead(204); return res.end();
    }
    const id = url.searchParams.get('id')?.slice(3);
    if (req.method === 'PATCH') {
      guests.set(id, { ...guests.get(id), ...data }); res.writeHead(204); return res.end();
    }
    if (id) return json(guests.has(id) ? [guests.get(id)] : []);
    const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 500);
    return json([...guests.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(offset, offset + limit));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}
