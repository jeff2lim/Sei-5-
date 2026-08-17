create table if not exists public.recovery_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null check (schema_version > 0),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recovery_sessions enable row level security;

revoke all on table public.recovery_sessions from anon;
grant select, insert, update, delete on table public.recovery_sessions to authenticated;

create policy "Users can read their recovery session"
on public.recovery_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their recovery session"
on public.recovery_sessions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their recovery session"
on public.recovery_sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their recovery session"
on public.recovery_sessions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_recovery_session_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recovery_sessions_set_updated_at on public.recovery_sessions;
create trigger recovery_sessions_set_updated_at
before update on public.recovery_sessions
for each row execute function public.set_recovery_session_updated_at();
