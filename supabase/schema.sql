-- Festa di Natale: schema minimo (eseguilo una volta nell'SQL Editor di Supabase)
create table if not exists public.contacts (
  id uuid primary key,
  name text not null default '',
  surname text not null default '',
  company text not null default '',
  category text not null default 'artisti',
  subtype text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  price numeric(10,2),
  price_note text not null default '',
  source text not null default '',
  origin text not null default '',
  status text not null default 'da_contattare',
  notes text not null default '',
  unavailable jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  day date not null,
  slot text not null default 'mattina',
  venue text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assignments_day_idx on public.assignments (day);

create table if not exists public.settings (
  id int primary key default 1,
  event_name text not null default 'Festa di Natale',
  budget_total numeric(10,2) not null default 0,
  event_days jsonb not null default '[]'::jsonb,
  venues jsonb not null default '[]'::jsonb,
  entertainment_target int not null default 30,
  todos jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- database già creato in passato: aggiunge solo le colonne nuove, senza toccare i dati
alter table public.contacts add column if not exists unavailable jsonb not null default '[]'::jsonb;
alter table public.assignments add column if not exists venue text not null default '';
alter table public.settings add column if not exists venues jsonb not null default '[]'::jsonb;
alter table public.settings add column if not exists entertainment_target int not null default 30;
alter table public.settings add column if not exists todos jsonb not null default '[]'::jsonb;

alter table public.contacts enable row level security;
alter table public.assignments enable row level security;
alter table public.settings enable row level security;

-- Solo chi ha fatto login legge e scrive: la chiave publishable da sola non apre niente.
drop policy if exists "festa anon contacts" on public.contacts;
drop policy if exists "festa anon assignments" on public.assignments;
drop policy if exists "festa anon settings" on public.settings;
drop policy if exists "festa auth contacts" on public.contacts;
drop policy if exists "festa auth assignments" on public.assignments;
drop policy if exists "festa auth settings" on public.settings;

create policy "festa auth contacts" on public.contacts for all to authenticated using (true) with check (true);
create policy "festa auth assignments" on public.assignments for all to authenticated using (true) with check (true);
create policy "festa auth settings" on public.settings for all to authenticated using (true) with check (true);
