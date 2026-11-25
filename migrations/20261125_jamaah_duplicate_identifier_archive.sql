-- Simpan nomor absen tanpa pemakaian bersama arsip duplikat.
-- Semua langkah dilakukan dalam satu transaksi oleh RPC penghapusan.
create table if not exists private.jamaah_duplicate_identifier_archive (
  id bigint generated always as identity primary key,
  review_id bigint not null references private.jamaah_duplicate_review(id),
  original_id bigint not null unique,
  did text not null,
  row_data jsonb not null,
  archived_at timestamptz not null default now(),
  restored_at timestamptz
);
revoke all on private.jamaah_duplicate_identifier_archive from public,anon,authenticated;

create or replace function private.jamaah_duplicate_archive_unused_ids(p_editor_did text,p_review_id bigint)
returns void language plpgsql security definer set search_path to '' as $fn$
declare v_did text; v_id record;
begin
  perform private.jamaah_review_admin(p_editor_did);
  select new_did into v_did from private.jamaah_duplicate_review where id=p_review_id and status='pending' for update;
  if v_did is null then raise exception 'Tinjauan tidak ditemukan atau sudah selesai'; end if;
  for v_id in select * from private.ubnb_absen_id where jamaah_did=v_did for update loop
    if exists(select 1 from private.kbm_family_session where identifier_id=v_id.id)
       or exists(select 1 from private.ubaid_card_audit where identifier_id=v_id.id) then
      raise exception 'Nomor absen % sudah memiliki riwayat dan harus ditangani manual',v_id.absen_code;
    end if;
    insert into private.jamaah_duplicate_identifier_archive(review_id,original_id,did,row_data)
      values(p_review_id,v_id.id,v_did,to_jsonb(v_id));
  end loop;
  delete from private.ubnb_absen_id where jamaah_did=v_did;
end $fn$;

alter function public.dashboard_jamaah_duplicate_resolve(text,bigint,text,text)
  rename to dashboard_jamaah_duplicate_resolve_guarded;
revoke all on function public.dashboard_jamaah_duplicate_resolve_guarded(text,bigint,text,text) from public,anon,authenticated;

create or replace function public.dashboard_jamaah_duplicate_resolve(p_editor_did text,p_review_id bigint,p_action text,p_note text default '')
returns jsonb language plpgsql security definer set search_path to '' as $fn$
begin
  perform private.jamaah_review_admin(p_editor_did);
  if p_action='archive' then
    if length(btrim(coalesce(p_note,'')))<8 then raise exception 'Alasan penghapusan minimal 8 karakter'; end if;
    perform private.jamaah_duplicate_archive_unused_ids(p_editor_did,p_review_id);
  end if;
  return public.dashboard_jamaah_duplicate_resolve_guarded(p_editor_did,p_review_id,p_action,p_note);
end $fn$;
revoke all on function public.dashboard_jamaah_duplicate_resolve(text,bigint,text,text) from public;
grant execute on function public.dashboard_jamaah_duplicate_resolve(text,bigint,text,text) to anon,authenticated;

alter function public.dashboard_jamaah_duplicate_restore(text,text)
  rename to dashboard_jamaah_duplicate_restore_guarded;
revoke all on function public.dashboard_jamaah_duplicate_restore_guarded(text,text) from public,anon,authenticated;

create or replace function public.dashboard_jamaah_duplicate_restore(p_editor_did text,p_did text)
returns jsonb language plpgsql security definer set search_path to '' as $fn$
declare v_result jsonb; v_id record;
begin
  perform private.jamaah_review_admin(p_editor_did);
  v_result:=public.dashboard_jamaah_duplicate_restore_guarded(p_editor_did,p_did);
  for v_id in select * from private.jamaah_duplicate_identifier_archive where did=p_did and restored_at is null for update loop
    if exists(select 1 from private.ubnb_absen_id where id=v_id.original_id or absen_code=v_id.row_data->>'absen_code') then
      raise exception 'Nomor absen arsip sudah dipakai; pemulihan ditunda';
    end if;
    insert into private.ubnb_absen_id select (jsonb_populate_record(null::private.ubnb_absen_id,v_id.row_data)).*;
    update private.jamaah_duplicate_identifier_archive set restored_at=now() where id=v_id.id;
  end loop;
  return v_result;
end $fn$;
revoke all on function public.dashboard_jamaah_duplicate_restore(text,text) from public;
grant execute on function public.dashboard_jamaah_duplicate_restore(text,text) to anon,authenticated;
