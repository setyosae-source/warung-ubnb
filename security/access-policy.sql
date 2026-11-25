-- Apply only to verified credential paths. Other module policies are retained.
create or replace function private.ubnb_business_access(t text,op text,r jsonb) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare s jsonb:=private.ubnb_secure_actor('staff');m jsonb:=private.ubnb_secure_actor('member');u jsonb:=private.ubnb_secure_actor('sopram');f jsonb:=private.ubnb_secure_actor('family');
begin
 if s is not null then
   if t in ('keluarga_akses','anggota_akses') then return s->>'role' in ('pemilik','admin');end if;
   if op='read' then return true;end if;
   return s->>'role' in ('pemilik','admin');
 end if;
 if t='ppob_member' then return op='read' and r->>'id'=m->>'id';end if;
 if t='keluarga_akses' then return op='read' and r->>'id'=f->>'id';end if;
 if t='sopram_user' then
   if op='read' then return r->>'status'<>'banned' or (u->>'is_admin')::boolean is true;end if;
   if (u->>'is_admin')::boolean is true then return true;end if;
   return op='update' and r->>'id'=u->>'id' and (r->>'jamaah_did' is not distinct from u->>'jamaah_did') and r->>'status'=u->>'status' and r->>'is_admin'=u->>'is_admin';
 end if;
 return false;
end $$;
revoke all on function private.ubnb_business_access(text,text,jsonb) from public;
grant execute on function private.ubnb_business_access(text,text,jsonb) to anon,authenticated;
create table if not exists private.ubnb_security_restore(table_name text primary key,rls_enabled boolean not null,policies jsonb not null,grants jsonb not null);
revoke all on private.ubnb_security_restore from public,anon,authenticated;
alter table private.ubnb_security_restore enable row level security;
do $policies$
declare t record;p record;
begin
 for t in select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname in ('users','ppob_member','sopram_user','keluarga_akses','anggota_akses') loop
  insert into private.ubnb_security_restore values(t.relname,t.relrowsecurity,coalesce((select jsonb_agg(to_jsonb(x)) from pg_policies x where x.schemaname='public' and x.tablename=t.relname),'[]'::jsonb),coalesce((select jsonb_agg(to_jsonb(x)) from information_schema.role_table_grants x where x.table_schema='public' and x.table_name=t.relname and x.grantee in ('PUBLIC','anon','authenticated')),'[]'::jsonb)) on conflict do nothing;
  for p in select policyname from pg_policies where schemaname='public' and tablename=t.relname loop execute format('drop policy %I on public.%I',p.policyname,t.relname);end loop;
  execute format('alter table public.%I enable row level security',t.relname);
  execute format('create policy verified_read on public.%I for select to anon,authenticated using(private.ubnb_business_access(%L,''read'',to_jsonb(%I)))',t.relname,t.relname,t.relname);
  execute format('create policy verified_insert on public.%I for insert to anon,authenticated with check(private.ubnb_business_access(%L,''insert'',to_jsonb(%I)))',t.relname,t.relname,t.relname);
  execute format('create policy verified_update on public.%I for update to anon,authenticated using(private.ubnb_business_access(%L,''update'',to_jsonb(%I))) with check(private.ubnb_business_access(%L,''update'',to_jsonb(%I)))',t.relname,t.relname,t.relname,t.relname,t.relname);
  execute format('create policy verified_delete on public.%I for delete to anon,authenticated using(private.ubnb_business_access(%L,''delete'',to_jsonb(%I)))',t.relname,t.relname,t.relname);
 end loop;
end $policies$;
-- Credentials cannot be downloaded, even by SELECT *. Verification is server-side.
revoke select on public.users from public,anon,authenticated;
grant select(id,username,role,nama,permissions,menu_layout,last_login_at,last_active_at,updated_at,kelompok_scope) on public.users to anon,authenticated;
revoke select on public.ppob_member from public,anon,authenticated;
grant select(id,anggota_id,jamaah_did,nama,no_hp,status,total_piutang,approved_at,approved_by,created_at,updated_at) on public.ppob_member to anon,authenticated;
revoke select on public.sopram_user from public,anon,authenticated;
grant select(id,jamaah_did,username,no_wa,bio,foto_url,foto_cover_url,is_admin,status,last_login_at,created_at) on public.sopram_user to anon,authenticated;

revoke update on public.sopram_user from public,anon,authenticated;
grant update(no_wa,bio,foto_url,foto_cover_url,last_login_at) on public.sopram_user to anon,authenticated;
-- Administrative account status changes use an authorized RPC below.
create or replace function public.ubnb_sopram_admin_update(p_id bigint,p_status text default null,p_admin boolean default null) returns void
language plpgsql security definer set search_path='' as $$
declare s jsonb:=private.ubnb_secure_actor('staff');u jsonb:=private.ubnb_secure_actor('sopram');
begin
 if coalesce(s->>'role','') not in ('pemilik','admin') and not coalesce((u->>'is_admin')::boolean,false) then raise exception 'Akses ditolak' using errcode='42501';end if;
 if p_status is not null and p_status not in ('aktif','banned','pending') then raise exception 'Status tidak valid';end if;
 update public.sopram_user set status=coalesce(p_status,status),is_admin=coalesce(p_admin,is_admin) where id=p_id;
end $$;
revoke all on function public.ubnb_sopram_admin_update(bigint,text,boolean) from public;
grant execute on function public.ubnb_sopram_admin_update(bigint,text,boolean) to anon,authenticated;
