create table if not exists private.ubnb_secure_sessions(
 token_hash text primary key,kind text not null,subject text not null,credential_fingerprint text not null,
 expires_at timestamptz not null,created_at timestamptz not null default now()
);
create index if not exists ubnb_secure_session_expiry on private.ubnb_secure_sessions(expires_at);
create table if not exists private.ubnb_secure_attempts(identifier text primary key,failures integer not null default 0,window_start timestamptz not null default now());
revoke all on private.ubnb_secure_sessions,private.ubnb_secure_attempts from public,anon,authenticated;
alter table private.ubnb_secure_sessions enable row level security;
alter table private.ubnb_secure_attempts enable row level security;
create or replace function private.ubnb_secure_actor(p_kind text default 'staff') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s private.ubnb_secure_sessions;u jsonb;cred text;h jsonb:=coalesce(current_setting('request.headers',true),'{}')::jsonb;
begin
 select * into s from private.ubnb_secure_sessions where kind=p_kind and expires_at>now()
 and token_hash=encode(extensions.digest(h->>('x-ubnb-'||p_kind),'sha256'),'hex') limit 1;
 if found then
  if p_kind='staff' then select to_jsonb(t)-'password_hash',password_hash into u,cred from public.users t where id::text=s.subject;
  elsif p_kind='member' then select to_jsonb(t)-'pin_hash'-'kode_bayar_hash'-'catatan_admin',pin_hash into u,cred from public.ppob_member t where id::text=s.subject and coalesce(status,'') not in ('banned','blocked','nonaktif');
  elsif p_kind='sopram' then select to_jsonb(t)-'kode_akses',kode_akses into u,cred from public.sopram_user t where id::text=s.subject and status<>'banned';
  elsif p_kind='family' then select to_jsonb(t)-'kode_akses',kode_akses into u,cred from public.keluarga_akses t where id::text=s.subject and aktif;
  end if;
  if cred is not null and encode(extensions.digest(cred,'sha256'),'hex')=s.credential_fingerprint then return u; end if;
 end if;
 if p_kind='staff' then
  select jsonb_build_object('id',d.legacy_user_id,'username',d.username,'role',d.role,'kelompok_scope',d.kelompok_scope,'pengurus_did',d.pengurus_did)
   into u from private.dk_attendance_session d where d.token=h->>'x-ubnb-dk' and d.expires_at>now();
  if u is not null then return u; end if;
 end if;
 return null;
end $$;
revoke all on function private.ubnb_secure_actor(text) from public;
grant usage on schema private to anon,authenticated;
grant execute on function private.ubnb_secure_actor(text) to anon,authenticated;
create or replace function public.ubnb_secure_login(p_kind text,p_identifier text,p_secret text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u jsonb;cred text;token text;key text:=p_kind||':'||lower(trim(p_identifier));a private.ubnb_secure_attempts;
begin
 if p_kind is null or p_identifier is null or p_kind not in ('staff','member','sopram','family') or length(coalesce(p_identifier,''))>200 or coalesce(p_secret,'')='' or length(p_secret)>1024 then return jsonb_build_object('ok',false,'error','Data login tidak valid');end if;
 if p_kind='member' then key:='member:'||regexp_replace(regexp_replace(p_identifier,'[^0-9]','','g'),'^62','0');end if;
 insert into private.ubnb_secure_attempts(identifier) values(key) on conflict do nothing;
 select * into a from private.ubnb_secure_attempts where identifier=key for update;
 if a.window_start<now()-interval '15 minutes' then update private.ubnb_secure_attempts set failures=0,window_start=now() where identifier=key;a.failures:=0;end if;
 if a.failures>=30 then return jsonb_build_object('ok',false,'error','Terlalu banyak percobaan. Coba lagi dalam 15 menit.');end if;
 if p_kind='staff' then
  select to_jsonb(t)-'password_hash',password_hash into u,cred from public.users t where lower(username)=lower(trim(p_identifier)) and (password_hash=encode(extensions.digest(p_secret,'sha256'),'hex') or (password_hash !~ '^[0-9a-fA-F]{64}$' and password_hash=p_secret)) limit 1;
 elsif p_kind='member' then
  select to_jsonb(t)-'pin_hash'-'kode_bayar_hash'-'catatan_admin',pin_hash into u,cred from public.ppob_member t
  where regexp_replace(regexp_replace(no_hp,'[^0-9]','','g'),'^62','0')=regexp_replace(regexp_replace(p_identifier,'[^0-9]','','g'),'^62','0')
   and pin_hash=encode(extensions.digest(p_secret,'sha256'),'hex') and coalesce(status,'') not in ('banned','blocked','nonaktif') limit 1;
 elsif p_kind='sopram' then
  select to_jsonb(t)-'kode_akses',kode_akses into u,cred from public.sopram_user t
  where (jamaah_did=p_identifier or lower(username)=lower(p_identifier)) and kode_akses=upper(trim(p_secret)) and status<>'banned' limit 1;
 elsif p_kind='family' then
  select to_jsonb(t)-'kode_akses',kode_akses into u,cred from public.keluarga_akses t where nama_keluarga=p_identifier and kode_akses=trim(p_secret) and aktif limit 1;
 end if;
 if u is null then update private.ubnb_secure_attempts set failures=failures+1 where identifier=key;return jsonb_build_object('ok',false,'error','Identitas atau kode/password salah');end if;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into private.ubnb_secure_sessions(token_hash,kind,subject,credential_fingerprint,expires_at) values(encode(extensions.digest(token,'sha256'),'hex'),p_kind,u->>'id',encode(extensions.digest(cred,'sha256'),'hex'),now()+interval '12 hours');
 delete from private.ubnb_secure_attempts where identifier=key;
 delete from private.ubnb_secure_sessions where expires_at<=now();
 return jsonb_build_object('ok',true,'user',u,'token',token,'expires_at',now()+interval '12 hours');
end $$;
revoke all on function public.ubnb_secure_login(text,text,text) from public;
grant execute on function public.ubnb_secure_login(text,text,text) to anon,authenticated;
create or replace function public.ubnb_secure_session(p_kind text default 'staff') returns jsonb language sql stable security definer set search_path='' as $$select private.ubnb_secure_actor(p_kind)$$;
revoke all on function public.ubnb_secure_session(text) from public;
grant execute on function public.ubnb_secure_session(text) to anon,authenticated;
create or replace function public.ubnb_secure_logout(p_kind text default 'staff') returns void language sql security definer set search_path='' as $$
 delete from private.ubnb_secure_sessions where kind=p_kind and token_hash=encode(extensions.digest(coalesce(current_setting('request.headers',true),'{}')::jsonb->>('x-ubnb-'||p_kind),'sha256'),'hex')
$$;
revoke all on function public.ubnb_secure_logout(text) from public;
grant execute on function public.ubnb_secure_logout(text) to anon,authenticated;
create or replace function public.ubnb_secure_reauth(p_user_id bigint,p_password text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u jsonb;a jsonb:=private.ubnb_secure_actor('staff');begin
 if a->>'id' is distinct from p_user_id::text then return null;end if;
 select to_jsonb(t)-'password_hash' into u from public.users t where id=p_user_id and (password_hash=encode(extensions.digest(p_password,'sha256'),'hex') or (password_hash !~ '^[0-9a-fA-F]{64}$' and password_hash=p_password));
 return u;
end $$;
revoke all on function public.ubnb_secure_reauth(bigint,text) from public;
grant execute on function public.ubnb_secure_reauth(bigint,text) to anon,authenticated;
create or replace function public.ubnb_public_member_names() returns table(id bigint,nama text) language sql stable security definer set search_path='' as $$select id,nama from public.ppob_member$$;
revoke all on function public.ubnb_public_member_names() from public;
grant execute on function public.ubnb_public_member_names() to anon,authenticated;
create or replace view public.ubnb_public_member_directory with(security_invoker=true) as select * from public.ubnb_public_member_names();
grant select on public.ubnb_public_member_directory to anon,authenticated;
create or replace function public.ubnb_secure_member_register(p_name text,p_phone text,p_pin text,p_anggota_id bigint default null,p_jamaah_did text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare new_id bigint;
begin
 if p_name is null or p_phone is null or p_pin is null or length(trim(p_name))<2 or length(p_name)>200 or p_pin !~ '^\d{6}$' or regexp_replace(p_phone,'[^0-9]','','g') !~ '^(0|62)[0-9]{8,14}$' then return jsonb_build_object('ok',false,'error','Nama, nomor HP, atau PIN tidak valid');end if;
 if exists(select 1 from public.ppob_member where regexp_replace(regexp_replace(no_hp,'[^0-9]','','g'),'^62','0')=regexp_replace(regexp_replace(p_phone,'[^0-9]','','g'),'^62','0')) then return jsonb_build_object('ok',false,'error','Nomor HP sudah terdaftar. Silakan login.');end if;
 insert into public.ppob_member(nama,no_hp,pin_hash,status,anggota_id,jamaah_did) values(trim(p_name),p_phone,encode(extensions.digest(p_pin,'sha256'),'hex'),'aktif',p_anggota_id,p_jamaah_did) returning id into new_id;
 return public.ubnb_secure_login('member',p_phone,p_pin);
exception when unique_violation then return jsonb_build_object('ok',false,'error','Nomor HP sudah terdaftar. Silakan login.');
end $$;
revoke all on function public.ubnb_secure_member_register(text,text,text,bigint,text) from public;
grant execute on function public.ubnb_secure_member_register(text,text,text,bigint,text) to anon,authenticated;
