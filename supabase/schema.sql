-- Knowledge Diary schema. Run once in Supabase -> SQL Editor.

create table if not exists public.notes (
  id                uuid primary key default gen_random_uuid(),
  entry_date        date not null default current_date,
  title             text not null,
  raw_understanding text not null,       -- what you wrote, in your own words
  final_note        text,                -- Gemini's rewrite in your voice (editable)
  citations         jsonb not null default '[]'::jsonb,  -- [{label, url}]
  review            jsonb,               -- latest Gemini review
  tags              text[] not null default '{}',
  overall_score     numeric(3,1),
  search            tsvector,            -- maintained by trigger, powers Ask
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists notes_entry_date_idx on public.notes (entry_date desc, created_at desc);
create index if not exists notes_search_idx on public.notes using gin (search);

create table if not exists public.settings (
  id            int primary key default 1 check (id = 1),
  style_samples text not null default '',
  style_profile text not null default '',
  updated_at    timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Title and tags weigh most, then the polished note, then your raw notes.
create or replace function public.notes_search_refresh() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.search :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(new.tags, ' ')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.final_note, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.raw_understanding, '')), 'C');
  return new;
end $$;

drop trigger if exists notes_touch on public.notes;
create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();

drop trigger if exists notes_search on public.notes;
create trigger notes_search before insert or update on public.notes
  for each row execute function public.notes_search_refresh();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- Keyword search for Ask. Words are OR-ed (any keyword can match) and ranked,
-- so notes matching more / rarer keywords in more important fields come first.
-- With no keywords but a date range, returns the notes in that range.
create or replace function public.search_notes(
  q text,
  date_from date default null,
  date_to date default null,
  max_results int default 6
)
returns table (id uuid, title text, entry_date date, rank real, snippet text)
language sql stable set search_path = '' as $$
  with query as (
    select nullif(replace(plainto_tsquery('english', coalesce(q, ''))::text, '&', '|'), '')::tsquery as tsq
  )
  select
    n.id,
    n.title,
    n.entry_date,
    coalesce(ts_rank_cd(n.search, query.tsq), 0)::real as rank,
    case
      when query.tsq is null then left(coalesce(n.final_note, n.raw_understanding), 240)
      else ts_headline('english', coalesce(n.final_note, n.raw_understanding), query.tsq,
                       'MaxWords=40, MinWords=18, MaxFragments=1')
    end as snippet
  from public.notes n, query
  where (query.tsq is null or n.search @@ query.tsq)
    and (date_from is null or n.entry_date >= date_from)
    and (date_to is null or n.entry_date <= date_to)
    and (query.tsq is not null or date_from is not null or date_to is not null)
  order by rank desc, n.entry_date desc
  limit max_results;
$$;

-- The app talks to Supabase only from the server with the service-role key,
-- which bypasses RLS. Enabling RLS with no policies locks out the public anon key.
alter table public.notes enable row level security;
alter table public.settings enable row level security;
revoke execute on function public.search_notes(text, date, date, int) from public, anon, authenticated;
grant execute on function public.search_notes(text, date, date, int) to service_role;
