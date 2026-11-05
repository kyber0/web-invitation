-- Run once in your Supabase project's SQL Editor.
begin;

create table if not exists public.guests (
  id text primary key check (id ~ '^[a-f0-9]{48}$'),
  name text not null check (length(trim(name)) between 1 and 150),
  seats integer not null check (seats between 1 and 30),
  status text not null default 'pending' check (status in ('pending', 'attending', 'declined')),
  attendees jsonb not null default '[]'::jsonb,
  updated_at timestamptz,
  constraint attendee_array check (jsonb_typeof(attendees) = 'array'),
  constraint attendee_seats check (jsonb_array_length(attendees) <= seats),
  constraint attendance_consistency check (
    (status = 'attending' and jsonb_array_length(attendees) >= 1)
    or (status in ('pending', 'declined') and attendees = '[]'::jsonb)
  )
);

create table if not exists public.login_attempts (
  bucket text primary key,
  attempts integer not null default 1,
  expires_at timestamptz not null
);

alter table public.guests enable row level security;
alter table public.login_attempts enable row level security;
revoke all on public.guests, public.login_attempts from anon, authenticated;
grant select, insert, update, delete on public.guests, public.login_attempts to service_role;

-- An atomic shared limiter survives serverless cold starts and parallel instances.
create or replace function public.consume_login_attempt(bucket_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare total integer;
begin
  delete from public.login_attempts where expires_at < now();
  insert into public.login_attempts (bucket, attempts, expires_at)
  values (bucket_key, 1, now() + interval '15 minutes')
  on conflict (bucket) do update
  set attempts = public.login_attempts.attempts + 1
  returning attempts into total;
  return total <= 10;
end;
$$;
revoke all on function public.consume_login_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_login_attempt(text) to service_role;
commit;
