// Server-only adapter. No database credentials are sent to the browser.
export function createStore(env = process.env) {
  const base = env.SUPABASE_URL?.replace(/\/$/, '');
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY');
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  // Legacy service_role JWTs require bearer authorization; sb_secret keys do not.
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;

  async function request(path, options = {}) {
    const response = await fetch(`${base}/rest/v1/${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Database request failed (${response.status})`);
    return response.status === 204 ? null : response.json();
  }

  return {
    async list() {
      // PostgREST defaults to 1,000 rows; page explicitly so no guests disappear.
      const guests = [];
      for (let offset = 0; ; offset += 500) {
        const rows = await request(`guests?select=*&order=name.asc,id.asc&limit=500&offset=${offset}`);
        guests.push(...rows);
        if (rows.length < 500) return guests;
      }
    },
    async get(id) {
      if (!/^[a-f0-9]{48}$/.test(id)) return null;
      const rows = await request(`guests?select=*&id=eq.${id}&limit=1`);
      return rows[0] || null;
    },
    async create(id, name, seats) {
      await request('guests', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id, name, seats }) });
    },
    async rsvp(id, status, attendees) {
      await request(`guests?id=eq.${id}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status, attendees, updated_at: new Date().toISOString() }),
      });
    },
    async allowLogin(bucket) {
      return request('rpc/consume_login_attempt', { method: 'POST', body: JSON.stringify({ bucket_key: bucket }) });
    },
  };
}
