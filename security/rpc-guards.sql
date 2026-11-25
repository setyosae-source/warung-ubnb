create table if not exists private.ubnb_security_function_restore(signature text primary key,definition text not null);
revoke all on private.ubnb_security_function_restore from public,anon,authenticated;
alter table private.ubnb_security_function_restore enable row level security;
create or replace function private.ubnb_backend_request() returns boolean language sql stable set search_path='' as $$
 select (session_user in ('postgres','supabase_admin') and current_setting('role',true)='none') or coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role'='service_role'
$$;
revoke all on function private.ubnb_backend_request() from public;
create or replace function private.ubnb_assert_staff(p_admin boolean default false,p_id text default null) returns void language plpgsql stable security definer set search_path='' as $$
declare a jsonb:=private.ubnb_secure_actor('staff');begin
 if private.ubnb_backend_request() then return;end if;
 if a is null or (p_admin and coalesce(a->>'role','') not in ('pemilik','admin','pengurus_desa')) or (p_id is not null and p_id is distinct from a->>'id') then raise exception 'Sesi pengelola tidak valid atau tidak berwenang' using errcode='42501';end if;
end $$;
revoke all on function private.ubnb_assert_staff(boolean,text) from public;
create or replace function private.ubnb_assert_member(p_id text,p_did text default null) returns void language plpgsql stable security definer set search_path='' as $$
declare a jsonb:=private.ubnb_secure_actor('member');s jsonb:=private.ubnb_secure_actor('staff');begin
 if private.ubnb_backend_request() or s->>'role' in ('pemilik','admin','pengurus_desa') then return;end if;
 if a is null or (p_id is not null and p_id is distinct from a->>'id') or (p_did is not null and p_did is distinct from a->>'jamaah_did') then raise exception 'Sesi anggota tidak valid atau identitas tidak sesuai' using errcode='42501';end if;
end $$;
revoke all on function private.ubnb_assert_member(text,text) from public;
do $guard_rpc$
declare f record;d text;guard text;updated text;
begin
 for f in select p.oid,p.proname,p.proargnames,p.oid::regprocedure::text as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='public' and p.prosecdef and l.lanname='plpgsql' and (p.proname like 'jw_%' or p.proname in ('change_user_name','change_user_password','save_menu_layout','update_user_activity','verify_user_session','ppob_set_kode_bayar')) loop
  d:=pg_get_functiondef(f.oid);
  if position('private.ubnb_assert_' in d)>0 then continue;end if;
  if 'p_user_id'=any(f.proargnames) then guard:='PERFORM private.ubnb_assert_staff(false,p_user_id::text);';
  elsif 'p_admin_user_id'=any(f.proargnames) then guard:='PERFORM private.ubnb_assert_staff(true,p_admin_user_id::text);';
  elsif 'p_member_id'=any(f.proargnames) then guard:='PERFORM private.ubnb_assert_member(p_member_id::text);';
  elsif f.proname='jw_ezi_riwayat_anggota' then guard:='PERFORM private.ubnb_assert_member(null,p_jamaah_did);';
  else guard:='PERFORM private.ubnb_assert_staff(true);';end if;
  updated:=regexp_replace(d,'(\n[ \t]*BEGIN[ \t]*\r?\n)',E'\\1  '||guard||E'\n','i');
  if updated=d then raise exception 'Cannot safely add authentication guard to %',f.signature;end if;
  insert into private.ubnb_security_function_restore values(f.signature,d) on conflict do nothing;
  execute updated;
 end loop;
end $guard_rpc$;
