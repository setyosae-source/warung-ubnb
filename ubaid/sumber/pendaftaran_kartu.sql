-- Pendaftaran mandiri: tautan acak per jamaah, sekali kirim, persetujuan pengurus.
create table if not exists private.ubaid_card_invite (
 id bigint generated always as identity primary key,
 token_hash text not null unique, jamaah_did text not null,
 created_by text not null, created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '3 days',
 status text not null default 'invited' check(status in ('invited','pending','approved','rejected','revoked')),
 uid text, submitted_at timestamptz, reviewed_at timestamptz, reviewed_by text
);
alter table private.ubaid_card_invite enable row level security;
revoke all on private.ubaid_card_invite from public,anon,authenticated;
create index if not exists ubaid_card_invite_person on private.ubaid_card_invite(jamaah_did);
create or replace function public.ubaid_card_registration(p_token text,p_action text,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare s record; m private.ubaid_portal_member%rowtype; inv private.ubaid_card_invite%rowtype;
 did_ text; name_ text; group_ text; secret_ text; card_ text; rows_ jsonb; result_ jsonb;
begin
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Permintaan tidak valid';end if;
 if p_action in ('open','submit') then
  if p_token !~ '^[a-f0-9]{64}$' then raise exception 'Tautan tidak valid';end if;
  select * into inv from private.ubaid_card_invite where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
  if not found or inv.status in ('rejected','revoked') or (inv.expires_at<now() and inv.status='invited') then raise exception 'Tautan tidak berlaku. Minta tautan baru kepada pengurus';end if;
  select nama,kelompok_nama into name_,group_ from public.jamaah_desa where did=inv.jamaah_did;
  if p_action='submit' then
   if inv.status<>'invited' then raise exception 'Pendaftaran sudah dikirim';end if;
   card_:=upper(coalesce(p_data->>'uid',''));
   if card_ !~ '^([0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})$' then raise exception 'UID kartu tidak valid';end if;
   if p_data->>'confirm' is distinct from 'yes' then raise exception 'Konfirmasi pemilik kartu wajib';end if;
   perform pg_advisory_xact_lock(hashtextextended('ubaid-card:'||card_,0));
   if exists(select 1 from public.ubnb_jamaah_identifier where jenis='rfid' and nilai=card_ and jamaah_did<>inv.jamaah_did) then raise exception 'Kartu sudah terdaftar untuk orang lain';end if;
   update private.ubaid_card_invite set uid=card_,status='pending',submitted_at=now() where id=inv.id;
   inv.status:='pending';
  end if;
  return jsonb_build_object('ok',true,'nama',name_,'kelompok',group_,'status',inv.status,'expires_at',inv.expires_at);
 end if;
 select * into s from private.dk_attendance_session_row(p_token);
 if not found then raise exception 'Silakan login kembali';end if;
 select * into m from private.ubaid_portal_member where user_id=s.legacy_user_id and enabled;
 if not found then raise exception 'Akses pengurus diperlukan';end if;
 if p_action='invite' then
  select j.did,j.nama,j.kelompok_nama into did_,name_,group_ from public.jamaah_desa j join private.ubnb_absen_id a on a.jamaah_did=j.did and a.retired_at is null
  where a.absen_code=p_data->>'code' and (m.kelompok_scope is null or j.kelompok_nama=m.kelompok_scope);
  if did_ is null then raise exception 'Jamaah tidak ditemukan dalam lingkup Anda';end if;
  perform pg_advisory_xact_lock(hashtextextended('ubaid-invite:'||did_,0));
  update private.ubaid_card_invite set status='revoked' where jamaah_did=did_ and status='invited';
  secret_:=encode(extensions.gen_random_bytes(32),'hex');
  insert into private.ubaid_card_invite(token_hash,jamaah_did,created_by) values(encode(extensions.digest(secret_,'sha256'),'hex'),did_,s.username);
  return jsonb_build_object('ok',true,'invite_token',secret_,'nama',name_);
 elsif p_action='list' then
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'nama',j.nama,'kelompok',j.kelompok_nama,'uid',i.uid,'status',i.status,'created_at',i.created_at,'submitted_at',i.submitted_at) order by i.created_at desc),'[]') into rows_
  from private.ubaid_card_invite i join public.jamaah_desa j on j.did=i.jamaah_did where m.kelompok_scope is null or j.kelompok_nama=m.kelompok_scope;
  return jsonb_build_object('ok',true,'requests',rows_);
 elsif p_action in ('approve','reject','revoke') then
  select i.* into inv from private.ubaid_card_invite i join public.jamaah_desa j on j.did=i.jamaah_did where i.id=(p_data->>'id')::bigint and (m.kelompok_scope is null or j.kelompok_nama=m.kelompok_scope) for update of i;
  if not found then raise exception 'Pendaftaran tidak ditemukan';end if;
  if p_action='revoke' and inv.status<>'invited' then raise exception 'Hanya tautan yang belum dikirim dapat dibatalkan';end if;
  if p_action in ('approve','reject') and inv.status<>'pending' then raise exception 'Pendaftaran sudah diproses';end if;
  if p_action='approve' then
   select absen_code into secret_ from private.ubnb_absen_id where jamaah_did=inv.jamaah_did and retired_at is null;
   result_:=public.ubaid_portal(p_token,'card_save',jsonb_build_object('code',secret_,'uid',inv.uid,'confirm','yes'));
   if result_->>'ok' is distinct from 'true' then raise exception '%',result_->>'error';end if;
  end if;
  update private.ubaid_card_invite set status=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'revoked' end,reviewed_by=s.username,reviewed_at=now() where id=inv.id;
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Tindakan tidak dikenal';
end $$;
revoke all on function public.ubaid_card_registration(text,text,jsonb) from public;
grant execute on function public.ubaid_card_registration(text,text,jsonb) to anon,authenticated;
