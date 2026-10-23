-- Tables used by "Publish to Students" and the /student seat finder.
create table if not exists public.exam_sessions (
  session_id     text primary key,
  total_students integer not null,
  total_rooms    integer not null,
  published_at   timestamptz not null default now(),
  is_active      boolean not null default true
);

create table if not exists public.exam_seating_lookup (
  id           bigint generated always as identity primary key,
  roll_number  text not null,
  room_number  text not null,
  seat_number  integer not null,
  exam_code    text,
  dept         text,
  session_id   text not null references public.exam_sessions (session_id) on delete cascade,
  published_at timestamptz not null default now(),
  unique (roll_number, session_id)
);

create index if not exists exam_seating_lookup_roll_idx on public.exam_seating_lookup (roll_number, published_at desc);

alter table public.exam_sessions enable row level security;
alter table public.exam_seating_lookup enable row level security;

-- Students look up seats anonymously; the admin page publishes with the anon key.
-- Tighten the insert/update policies (e.g. require auth) before using this in production.
create policy "public read sessions"  on public.exam_sessions       for select using (true);
create policy "public read seats"     on public.exam_seating_lookup for select using (true);
create policy "anon publish sessions" on public.exam_sessions       for insert with check (true);
create policy "anon update sessions"  on public.exam_sessions       for update using (true);
create policy "anon publish seats"    on public.exam_seating_lookup for insert with check (true);
create policy "anon update seats"     on public.exam_seating_lookup for update using (true);
