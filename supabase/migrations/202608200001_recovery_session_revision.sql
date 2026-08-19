alter table public.recovery_sessions
add column if not exists revision bigint not null default 0
check (revision >= 0);

create or replace function public.replace_recovery_session_if_revision(
  p_expected_revision bigint,
  p_schema_version integer,
  p_data jsonb
)
returns table(applied boolean, revision bigint, data jsonb)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  next_revision bigint;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_expected_revision is null then
    insert into public.recovery_sessions (user_id, schema_version, data, revision)
    values (current_user_id, p_schema_version, p_data, 1)
    on conflict (user_id) do nothing
    returning recovery_sessions.revision into next_revision;
  else
    update public.recovery_sessions
    set schema_version = p_schema_version,
        data = p_data,
        revision = recovery_sessions.revision + 1
    where user_id = current_user_id
      and recovery_sessions.revision = p_expected_revision
    returning recovery_sessions.revision into next_revision;
  end if;

  if next_revision is not null then
    return query select true, next_revision, p_data;
    return;
  end if;

  return query
  select false, recovery_sessions.revision, recovery_sessions.data
  from public.recovery_sessions
  where user_id = current_user_id;
end;
$$;

revoke all on function public.replace_recovery_session_if_revision(bigint, integer, jsonb)
from public, anon;
grant execute on function public.replace_recovery_session_if_revision(bigint, integer, jsonb)
to authenticated;
