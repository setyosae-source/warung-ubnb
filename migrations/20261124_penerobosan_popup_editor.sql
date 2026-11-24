-- Mutasi popup laporan memakai sesi dashboard dan membatasi scope di server.
create or replace function public.dashboard_penerobosan_edit_jamaah(
  p_token text, p_scope text, p_action text, p_did text, p_payload jsonb default '{}'::jsonb,
  p_is_kk boolean default false, p_kk_did text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s record; v_old public.jamaah_desa%rowtype; v_new public.jamaah_desa%rowtype;
  v_editor text; v_head_did text; v_result jsonb; v_bad text; v_scope text := upper(trim(coalesce(p_scope,'')));
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then raise exception 'Sesi pengurus tidak valid'; end if;
  if s.role not in ('pemilik','pengurus_desa','pengurus_kelompok') then raise exception 'Akses tulis ditolak'; end if;
  if v_scope not in ('PW1','PW2','PW3','PW4') or
     (s.kelompok_scope is not null and s.kelompok_scope <> v_scope) then
    raise exception 'Di luar akses kelompok';
  end if;
  if jsonb_typeof(p_payload) <> 'object' or pg_column_size(p_payload)>5000 then raise exception 'Data tidak valid'; end if;
  if p_action = 'create' then
    select ds.pengurus_did into v_editor from private.dk_attendance_session ds
      where ds.token=p_token and ds.expires_at>now();
    if v_editor is null or not exists (select 1 from public.ubnb_pengurus p where p.did=v_editor and p.aktif=true and
        (p.level='desa' or (p.level='kelompok' and p.kelompok_nama=v_scope))) then
      select p.did into v_editor from public.ubnb_pengurus p where p.aktif=true and p.level='desa'
        order by p.id limit 1;
    end if;
    if v_editor is null then raise exception 'Pengurus desa aktif tidak ditemukan'; end if;
    if p_payload->>'kelompok_nama' is distinct from v_scope then raise exception 'Kelompok tidak sesuai'; end if;
    if coalesce(p_payload->>'status_sambung','Tetap') not in ('Tetap','Pindah Sementara','Pindah Sambung') then
      raise exception 'Status sambung tidak valid';
    end if;
    if not p_is_kk then
      select coalesce(k.jamaah_did,j.did) into v_head_did
        from public.jamaah_desa j left join public.keluarga k on k.id=j.keluarga_id
        where j.did=p_kk_did and j.kelompok_nama=v_scope;
      if v_head_did is null then raise exception 'KK tujuan tidak ditemukan'; end if;
    end if;
    v_result := public.dashboard_jamaah_create(v_editor,p_payload,p_is_kk,v_head_did);
    insert into public.dk_activity_log(username,role,kelompok,aksi,detail)
      values(s.username,s.role,v_scope,'penerobosan_jamaah_create',jsonb_build_object('did',v_result->>'did','nama',p_payload->>'nama'));
    return v_result;
  end if;
  if p_action <> 'update' then raise exception 'Aksi tidak valid'; end if;
  select * into v_old from public.jamaah_desa where did=p_did and kelompok_nama=v_scope for update;
  if not found then raise exception 'Jamaah tidak ditemukan pada kelompok ini'; end if;
  select key into v_bad from jsonb_object_keys(p_payload) key
    where key not in ('nama','jenis_kelamin','tgl_lahir','status_nikah','status_sambung') limit 1;
  if v_bad is not null then raise exception 'Kolom tidak diizinkan: %',v_bad; end if;
  if p_payload ? 'nama' and nullif(trim(p_payload->>'nama'),'') is null then raise exception 'Nama wajib diisi'; end if;
  if p_payload ? 'jenis_kelamin' and coalesce(p_payload->>'jenis_kelamin','') not in ('L','P','Laki-laki','Perempuan','') then raise exception 'Jenis kelamin tidak valid'; end if;
  if p_payload ? 'status_nikah' and coalesce(p_payload->>'status_nikah','') not in ('Menikah','Belum Menikah','Janda / Duda','') then raise exception 'Status nikah tidak valid'; end if;
  if p_payload ? 'status_sambung' and
     (coalesce(p_payload->>'status_sambung','') not in ('','Tetap','Pindah Sementara','Pindah Sambung','Meninggal Dunia') or
      (p_payload->>'status_sambung'='Meninggal Dunia' and v_old.status_sambung is distinct from 'Meninggal Dunia') or
      (v_old.status_sambung='Meninggal Dunia' and p_payload->>'status_sambung' is distinct from 'Meninggal Dunia')) then
    raise exception 'Status meninggal hanya dapat diubah melalui data Jamaah';
  end if;
  update public.jamaah_desa set
    nama=case when p_payload ? 'nama' then trim(p_payload->>'nama') else nama end,
    jenis_kelamin=case when p_payload ? 'jenis_kelamin' then nullif(p_payload->>'jenis_kelamin','') else jenis_kelamin end,
    tgl_lahir=case when p_payload ? 'tgl_lahir' then nullif(p_payload->>'tgl_lahir','')::date else tgl_lahir end,
    status_nikah=case when p_payload ? 'status_nikah' then nullif(p_payload->>'status_nikah','') else status_nikah end,
    status_sambung=case when p_payload ? 'status_sambung' then nullif(p_payload->>'status_sambung','') else status_sambung end
    where did=p_did returning * into v_new;
  insert into public.dk_activity_log(username,role,kelompok,aksi,detail)
    values(s.username,s.role,v_scope,'penerobosan_jamaah_update',jsonb_build_object('did',p_did,'sebelum',to_jsonb(v_old),'sesudah',to_jsonb(v_new)));
  return jsonb_build_object('ok',true,'did',p_did);
end $$;

create or replace function public.dashboard_penerobosan_edit_pengurus(
  p_token text, p_scope text, p_action text, p_id bigint default null,
  p_did text default null, p_dapukan text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s record; v_scope text := upper(trim(coalesce(p_scope,''))); v_level text;
  v_row public.ubnb_pengurus%rowtype; v_name text;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then raise exception 'Sesi pengurus tidak valid'; end if;
  if s.role not in ('pemilik','pengurus_desa','pengurus_kelompok') then raise exception 'Akses tulis ditolak'; end if;
  if v_scope not in ('DESA','PW1','PW2','PW3','PW4') or
    (s.kelompok_scope is not null and (v_scope='DESA' or s.kelompok_scope<>v_scope)) then
    raise exception 'Di luar akses pengurus';
  end if;
  v_level := case when v_scope='DESA' then 'desa' else 'kelompok' end;
  if p_action='create' then
    if nullif(trim(p_dapukan),'') is null or length(p_dapukan)>150 then raise exception 'Dapukan wajib diisi (maksimal 150 huruf)'; end if;
    select nama into v_name from public.jamaah_desa where did=p_did and status_sambung='Tetap'
      and (v_scope='DESA' or kelompok_nama=v_scope);
    if v_name is null then raise exception 'Pilih jamaah aktif dalam cakupan ini'; end if;
    insert into public.ubnb_pengurus(did,dapukan,level,kelompok_nama,aktif)
      values(p_did,trim(p_dapukan),v_level,nullif(v_scope,'DESA'),true) returning * into v_row;
  elsif p_action in ('update','remove') then
    select * into v_row from public.ubnb_pengurus where id=p_id and level=v_level and
      (v_scope='DESA' or kelompok_nama=v_scope) and aktif is distinct from false for update;
    if not found then raise exception 'Dapukan tidak ditemukan pada cakupan ini'; end if;
    if p_action='update' then
      if nullif(trim(p_dapukan),'') is null or length(p_dapukan)>150 then raise exception 'Dapukan wajib diisi (maksimal 150 huruf)'; end if;
      update public.ubnb_pengurus set dapukan=trim(p_dapukan) where id=p_id returning * into v_row;
    else
      update public.ubnb_pengurus set aktif=false where id=p_id returning * into v_row;
    end if;
  else
    raise exception 'Aksi tidak valid';
  end if;
  insert into public.dk_activity_log(username,role,kelompok,aksi,detail)
    values(s.username,s.role,v_scope,'penerobosan_pengurus_'||p_action,
      jsonb_build_object('id',v_row.id,'did',v_row.did,'dapukan',v_row.dapukan));
  return jsonb_build_object('ok',true,'id',v_row.id);
end $$;

revoke all on function public.dashboard_penerobosan_edit_jamaah(text,text,text,text,jsonb,boolean,text) from public;
revoke all on function public.dashboard_penerobosan_edit_pengurus(text,text,text,bigint,text,text) from public;
grant execute on function public.dashboard_penerobosan_edit_jamaah(text,text,text,text,jsonb,boolean,text) to anon,authenticated;
grant execute on function public.dashboard_penerobosan_edit_pengurus(text,text,text,bigint,text,text) to anon,authenticated;
