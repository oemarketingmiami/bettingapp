-- Waitlist capture + admin allowlist.

create table if not exists waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  source     text,
  created_at timestamptz not null default now()
);

create table if not exists admins (
  email      text primary key,
  added_by   text,
  created_at timestamptz not null default now()
);

insert into admins (email, added_by) values
  ('marganonoirazan@gmail.com', 'system'),
  ('bmgaccident@gmail.com', 'system')
on conflict (email) do nothing;

-- RLS on, no policies: only the service role (server routes) can read/write.
-- Keeps waitlist emails and the admin list private from the client.
alter table waitlist enable row level security;
alter table admins   enable row level security;
