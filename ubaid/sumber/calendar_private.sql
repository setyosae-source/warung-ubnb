-- Private compatibility functions; only ubaid_calendar exposes them.
CREATE OR REPLACE FUNCTION private.ubaid_calendar_access(p_token text,p_module text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT exists(select 1 from private.dk_attendance_session s join private.ubaid_portal_member m on m.user_id=s.legacy_user_id where s.token=p_token and s.expires_at>now() and m.enabled); $$;
REVOKE ALL ON FUNCTION private.ubaid_calendar_access(text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_attendance_bulk_hadir(p_token text, p_kegiatan_id bigint, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  k record;
  n integer;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid'); end if;
  if p_status not in ('hadir','izin','sakit','tidak_hadir') then
    return jsonb_build_object('ok',false,'error','Status kehadiran tidak valid');
  end if;

  select id,kelompok into k from public.ubnb_kegiatan where id=p_kegiatan_id;
  if not found then return jsonb_build_object('ok',false,'error','Kegiatan tidak ditemukan'); end if;
  if not private.dk_attendance_can_manage(s.role,s.kelompok_scope,k.kelompok) then
    return jsonb_build_object('ok',false,'error','Tidak boleh mengubah absensi di luar scope');
  end if;

  update public.ubnb_kegiatan_hadir set
    status_hadir=p_status,
    hadir_at=case when p_status='hadir' then now() else null end,
    input_by=s.username,
    input_via='manual',
    updated_at=now()
  where kegiatan_id=p_kegiatan_id;
  get diagnostics n = row_count;

  return jsonb_build_object('ok',true,'updated',n);
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_attendance_bulk_hadir(p_token text, p_kegiatan_id bigint, p_status text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_attendance_close_event(p_token text, p_kegiatan_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  k public.ubnb_kegiatan%rowtype;
  v jsonb;
  v_rekap jsonb;
  v_peserta jsonb;
  v_now timestamptz:=now();
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then
    return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid atau sudah kedaluwarsa');
  end if;
  if not private.ubaid_calendar_access(p_token,'calendar') then
    return jsonb_build_object('ok',false,'error','Penutupan acara hanya untuk pengelola Acara');
  end if;

  select * into k from public.ubnb_kegiatan where id=p_kegiatan_id for update;
  if not found then
    return jsonb_build_object('ok',false,'error','Kegiatan tidak ditemukan');
  end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,k.scope_level,k.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Kegiatan di luar hak kelola akun');
  end if;
  if k.status='dibatalkan' then
    return jsonb_build_object('ok',false,'error','Acara yang dibatalkan tidak dapat ditutup sebagai selesai');
  end if;

  if k.status='selesai' and k.final_rekap is not null and k.final_peserta is not null then
    return jsonb_build_object(
      'ok',true,'already',true,
      'rekap',k.final_rekap,'peserta',k.final_peserta,
      'closed_at',k.closed_at,'closed_by',k.closed_by
    );
  end if;

  v:=private.dk_build_kegiatan_rekap(p_kegiatan_id);
  v_rekap:=coalesce(v->'rekap','{}'::jsonb) || jsonb_build_object(
    'closed_at',v_now,
    'closed_by',s.username
  );
  v_peserta:=coalesce(v->'peserta','[]'::jsonb);

  update public.ubnb_kegiatan
  set status='selesai',
      absen_public=false,
      peserta_wajib_count=coalesce((v_rekap->>'total_peserta')::int,peserta_wajib_count),
      closed_at=v_now,
      closed_by=s.username,
      final_rekap=v_rekap,
      final_peserta=v_peserta,
      updated_at=v_now
  where id=p_kegiatan_id
  returning * into k;

  return jsonb_build_object(
    'ok',true,'already',false,
    'rekap',k.final_rekap,'peserta',k.final_peserta,
    'closed_at',k.closed_at,'closed_by',k.closed_by
  );
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_attendance_close_event(p_token text, p_kegiatan_id bigint) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_attendance_delete_kegiatan(p_token text, p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  r public.ubnb_kegiatan%rowtype;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not private.ubaid_calendar_access(p_token,'calendar') then
    return jsonb_build_object('ok',false,'error','Tambah/edit Acara hanya untuk dapukan KI, Wakil KI, Penerobos, atau MT');
  end if;
  if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid'); end if;

  select * into r from public.ubnb_kegiatan where id=p_id;
  if not found then return jsonb_build_object('ok',false,'error','Kegiatan tidak ditemukan'); end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,r.scope_level,r.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Tidak boleh menghapus kegiatan di luar scope');
  end if;

  delete from public.ubnb_kegiatan where id=p_id;
  return jsonb_build_object('ok',true);
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_attendance_delete_kegiatan(p_token text, p_id bigint) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_attendance_generate_participants(p_token text, p_kegiatan_id bigint, p_peserta jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  k public.ubnb_kegiatan%rowtype;
  p jsonb;
  v_count int:=0;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid'); end if;

  select * into k from public.ubnb_kegiatan where id=p_kegiatan_id;
  if not found then return jsonb_build_object('ok',false,'error','Kegiatan tidak ditemukan'); end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,k.scope_level,k.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Tidak boleh mengubah peserta acara di luar scope');
  end if;
  if (now() at time zone 'Asia/Jakarta')::date < (k.tanggal-7) then
    return jsonb_build_object('ok',false,'error','Peserta baru bisa digenerate mulai H-7','available_from',(k.tanggal-7));
  end if;

  delete from public.ubnb_kegiatan_hadir h
  where h.kegiatan_id=k.id
    and h.status_hadir='tidak_hadir'
    and h.hadir_at is null;

  if jsonb_typeof(coalesce(p_peserta,'[]'::jsonb))='array' then
    for p in select value from jsonb_array_elements(coalesce(p_peserta,'[]'::jsonb))
    loop
      if k.scope_level='kelompok'
         and nullif(p->>'did','') is not null
         and not exists(
           select 1 from public.jamaah_desa x
           where x.did=p->>'did' and x.kelompok_nama=k.scope_kelompok
         )
      then continue; end if;

      insert into public.ubnb_kegiatan_hadir(
        kegiatan_id,jamaah_did,jamaah_nama,jamaah_kk,status_hadir,input_by,input_via
      ) values(
        k.id,nullif(p->>'did',''),coalesce(nullif(p->>'nama',''),'-'),
        nullif(p->>'nama_kk',''),'tidak_hadir',s.username,'manual'
      )
      on conflict(kegiatan_id,jamaah_did) do update set
        jamaah_nama=excluded.jamaah_nama,
        jamaah_kk=excluded.jamaah_kk,
        updated_at=now();
    end loop;
  end if;

  select count(*) into v_count from public.ubnb_kegiatan_hadir where kegiatan_id=k.id;
  update public.ubnb_kegiatan
  set peserta_wajib_count=v_count,participants_generated_at=now(),updated_at=now()
  where id=k.id;

  return jsonb_build_object('ok',true,'count',v_count);
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_attendance_generate_participants(p_token text, p_kegiatan_id bigint, p_peserta jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_attendance_recap_event(p_token text, p_kegiatan_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  k public.ubnb_kegiatan%rowtype;
  v jsonb;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then
    return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid atau sudah kedaluwarsa');
  end if;

  select * into k from public.ubnb_kegiatan where id=p_kegiatan_id;
  if not found then
    return jsonb_build_object('ok',false,'error','Kegiatan tidak ditemukan');
  end if;

  if not private.dk_calendar_can_view(s.role,s.kelompok_scope,k.scope_level,k.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Kegiatan di luar akses akun');
  end if;

  if k.final_rekap is not null and k.final_peserta is not null then
    return jsonb_build_object(
      'ok',true,'final',true,
      'rekap',k.final_rekap,
      'peserta',k.final_peserta,
      'closed_at',k.closed_at,
      'closed_by',k.closed_by
    );
  end if;

  v:=private.dk_build_kegiatan_rekap(p_kegiatan_id);
  return jsonb_build_object(
    'ok',true,'final',false,
    'rekap',v->'rekap',
    'peserta',v->'peserta'
  );
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_attendance_recap_event(p_token text, p_kegiatan_id bigint) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_attendance_reopen_event(p_token text, p_kegiatan_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  k public.ubnb_kegiatan%rowtype;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then
    return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid atau sudah kedaluwarsa');
  end if;
  if not private.ubaid_calendar_access(p_token,'calendar') then
    return jsonb_build_object('ok',false,'error','Buka kembali acara hanya untuk pengelola Acara');
  end if;

  select * into k from public.ubnb_kegiatan where id=p_kegiatan_id for update;
  if not found then return jsonb_build_object('ok',false,'error','Kegiatan tidak ditemukan'); end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,k.scope_level,k.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Kegiatan di luar hak kelola akun');
  end if;

  perform set_config('ubnb.allow_closed_event_update','1',true);
  update public.ubnb_kegiatan
  set status='aktif',
      absen_public=true,
      closed_at=null,
      closed_by=null,
      final_rekap=null,
      final_peserta=null,
      updated_at=now()
  where id=p_kegiatan_id
  returning * into k;

  return jsonb_build_object('ok',true,'data',to_jsonb(k));
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_attendance_reopen_event(p_token text, p_kegiatan_id bigint) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_attendance_save_kegiatan(p_token text, p_id bigint, p_payload jsonb, p_peserta jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  oldk public.ubnb_kegiatan%rowtype;
  r public.ubnb_kegiatan%rowtype;
  v_scope text;
  v_kel text;
  v_acara_id bigint;
  v_name text;
  v_status text;
  p jsonb;
  v_has_peserta boolean:=jsonb_typeof(coalesce(p_peserta,'[]'::jsonb))='array'
                       and jsonb_array_length(coalesce(p_peserta,'[]'::jsonb))>0;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not private.ubaid_calendar_access(p_token,'calendar') then
    return jsonb_build_object('ok',false,'error','Tambah/edit Acara hanya untuk dapukan KI, Wakil KI, Penerobos, atau MT');
  end if;
  if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid atau sudah kedaluwarsa'); end if;

  v_scope:=coalesce(
    nullif(p_payload->>'scope_level',''),
    case when nullif(trim(coalesce(p_payload->>'kelompok','')),'') is null then 'desa' else 'kelompok' end
  );
  v_kel:=coalesce(
    nullif(p_payload->>'scope_kelompok',''),
    nullif(trim(coalesce(p_payload->>'kelompok','')),'')
  );
  if v_scope<>'kelompok' then v_kel:=null; end if;

  v_name:=trim(coalesce(p_payload->>'acara_nama',''));
  if v_name='' then return jsonb_build_object('ok',false,'error','Nama acara wajib diisi'); end if;
  if coalesce(p_payload->>'tanggal','')='' then return jsonb_build_object('ok',false,'error','Tanggal wajib diisi'); end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,v_scope,v_kel) then
    return jsonb_build_object('ok',false,'error','Scope kegiatan di luar akses akun');
  end if;

  if p_id is not null then
    select * into oldk from public.ubnb_kegiatan where id=p_id;
    if not found then return jsonb_build_object('ok',false,'error','Kegiatan tidak ditemukan'); end if;
    if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,oldk.scope_level,oldk.scope_kelompok) then
      return jsonb_build_object('ok',false,'error','Tidak boleh mengubah kegiatan di luar scope');
    end if;
  end if;

  v_acara_id:=nullif(p_payload->>'acara_id','')::bigint;
  if v_acara_id is not null and not exists(
    select 1 from public.ubnb_acara_master m
    where m.id=v_acara_id
      and m.scope_level=v_scope
      and m.scope_kelompok is not distinct from v_kel
  ) then v_acara_id:=null; end if;

  if v_acara_id is null then
    select id into v_acara_id
    from public.ubnb_acara_master
    where lower(nama)=lower(v_name)
      and scope_level=v_scope
      and scope_kelompok is not distinct from v_kel
    order by id limit 1;

    if v_acara_id is null then
      insert into public.ubnb_acara_master(
        kelompok,scope_level,scope_kelompok,nama,aktif,created_by,default_filter
      ) values(v_kel,v_scope,v_kel,v_name,true,s.username,p_payload->'filter_peserta')
      returning id into v_acara_id;
    end if;
  end if;

  v_status:=coalesce(nullif(p_payload->>'status',''),'aktif');
  if v_status not in ('draft','aktif','selesai','dibatalkan') then v_status:='aktif'; end if;

  if p_id is null then
    insert into public.ubnb_kegiatan(
      acara_id,acara_nama,kelompok,scope_level,scope_kelompok,tanggal,waktu,waktu_selesai,lokasi,
      mode,filter_peserta,peserta_wajib_count,participants_generated_at,status,catatan,created_by,updated_at
    ) values(
      v_acara_id,v_name,v_kel,v_scope,v_kel,(p_payload->>'tanggal')::date,
      nullif(p_payload->>'waktu','')::time,nullif(p_payload->>'waktu_selesai','')::time,
      nullif(p_payload->>'lokasi',''),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'mode','["manual"]'::jsonb))),array['manual']::text[]),
      p_payload->'filter_peserta',
      case when v_has_peserta then jsonb_array_length(p_peserta) else 0 end,
      case when v_has_peserta then now() else null end,
      v_status,nullif(p_payload->>'catatan',''),s.username,now()
    ) returning * into r;

    if v_has_peserta then
      for p in select value from jsonb_array_elements(p_peserta)
      loop
        if v_scope='kelompok'
           and nullif(p->>'did','') is not null
           and not exists(
             select 1 from public.jamaah_desa j
             where j.did=p->>'did' and j.kelompok_nama=v_kel
           )
        then continue; end if;

        insert into public.ubnb_kegiatan_hadir(
          kegiatan_id,jamaah_did,jamaah_nama,jamaah_kk,status_hadir,input_by,input_via
        ) values(
          r.id,nullif(p->>'did',''),coalesce(nullif(p->>'nama',''),'-'),
          nullif(p->>'nama_kk',''),'tidak_hadir',s.username,'manual'
        );
      end loop;
    end if;
  else
    update public.ubnb_kegiatan set
      acara_id=v_acara_id,acara_nama=v_name,kelompok=v_kel,scope_level=v_scope,scope_kelompok=v_kel,
      tanggal=(p_payload->>'tanggal')::date,
      waktu=nullif(p_payload->>'waktu','')::time,
      waktu_selesai=nullif(p_payload->>'waktu_selesai','')::time,
      lokasi=nullif(p_payload->>'lokasi',''),
      mode=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'mode','["manual"]'::jsonb))),array['manual']::text[]),
      filter_peserta=p_payload->'filter_peserta',
      status=v_status,
      catatan=nullif(p_payload->>'catatan',''),
      updated_at=now()
    where id=p_id returning * into r;
  end if;

  update public.ubnb_acara_master set last_used_at=now(),updated_at=now() where id=v_acara_id;
  return jsonb_build_object('ok',true,'data',to_jsonb(r));
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_attendance_save_kegiatan(p_token text, p_id bigint, p_payload jsonb, p_peserta jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_attendance_save_template_peserta(p_token text, p_acara_id bigint, p_dids text[], p_use_custom boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  m public.ubnb_acara_master%rowtype;
  v_did text;
  v_count int:=0;
  v_rule text;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not private.ubaid_calendar_access(p_token,'calendar') then
    return jsonb_build_object('ok',false,'error','Tambah/edit Acara hanya untuk dapukan KI, Wakil KI, Penerobos, atau MT');
  end if;
  if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid'); end if;

  select * into m from public.ubnb_acara_master where id=p_acara_id and aktif=true;
  if not found then return jsonb_build_object('ok',false,'error','Template acara tidak ditemukan'); end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,m.scope_level,m.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Template di luar scope akun');
  end if;

  v_rule:=coalesce(m.default_filter->>'rule','');
  delete from public.ubnb_acara_template_peserta where acara_id=p_acara_id;

  if coalesce(p_use_custom,false) then
    foreach v_did in array coalesce(p_dids,array[]::text[])
    loop
      if not exists(
        select 1 from public.jamaah_desa j
        where j.did=v_did
          and j.status_sambung='Tetap'
          and j.kelompok_nama in ('PW1','PW2','PW3','PW4')
          and (m.scope_level<>'kelompok' or j.kelompok_nama=m.scope_kelompok)
          and (v_rule<>'kelas_kbm' or j.status_nikah='Belum Menikah')
      ) then continue; end if;

      insert into public.ubnb_acara_template_peserta(acara_id,jamaah_did)
      values(p_acara_id,v_did)
      on conflict(acara_id,jamaah_did) do nothing;
      v_count:=v_count+1;
    end loop;

    update public.ubnb_acara_master
    set default_filter=jsonb_set(coalesce(default_filter,'{}'::jsonb),'{participant_mode}','"custom"'::jsonb,true),
        updated_at=now()
    where id=p_acara_id;
  else
    update public.ubnb_acara_master
    set default_filter=jsonb_set(coalesce(default_filter,'{}'::jsonb),'{participant_mode}','"criteria"'::jsonb,true),
        updated_at=now()
    where id=p_acara_id;
  end if;

  return jsonb_build_object(
    'ok',true,'count',v_count,
    'participant_mode',case when p_use_custom then 'custom' else 'criteria' end
  );
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_attendance_save_template_peserta(p_token text, p_acara_id bigint, p_dids text[], p_use_custom boolean) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_attendance_set_hadir(p_token text, p_hadir_id bigint, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  h record;
  r public.ubnb_kegiatan_hadir%rowtype;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid'); end if;
  if p_status not in ('hadir','izin','sakit','tidak_hadir') then
    return jsonb_build_object('ok',false,'error','Status kehadiran tidak valid');
  end if;

  select h0.id,k.kelompok into h
  from public.ubnb_kegiatan_hadir h0
  join public.ubnb_kegiatan k on k.id=h0.kegiatan_id
  where h0.id=p_hadir_id;
  if not found then return jsonb_build_object('ok',false,'error','Peserta kegiatan tidak ditemukan'); end if;
  if not private.dk_attendance_can_manage(s.role,s.kelompok_scope,h.kelompok) then
    return jsonb_build_object('ok',false,'error','Tidak boleh mengubah absensi di luar scope');
  end if;

  update public.ubnb_kegiatan_hadir set
    status_hadir=p_status,
    hadir_at=case when p_status='hadir' then coalesce(hadir_at,now()) else null end,
    input_by=s.username,
    input_via='manual',
    updated_at=now()
  where id=p_hadir_id
  returning * into r;

  return jsonb_build_object('ok',true,'data',to_jsonb(r));
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_attendance_set_hadir(p_token text, p_hadir_id bigint, p_status text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_attendance_set_slot_count(p_token text, p_kegiatan_id bigint, p_slot_id bigint, p_count integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  k public.ubnb_kegiatan%rowtype;
  sl private.ubnb_acara_slot%rowtype;
  v_count int:=greatest(coalesce(p_count,0),0);
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then return jsonb_build_object('ok',false,'error','Sesi tidak valid'); end if;
  select * into k from public.ubnb_kegiatan where id=p_kegiatan_id;
  if not found then return jsonb_build_object('ok',false,'error','Kegiatan tidak ditemukan'); end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,k.scope_level,k.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Di luar hak kelola');
  end if;
  select * into sl from private.ubnb_acara_slot
  where id=p_slot_id and kegiatan_id=p_kegiatan_id;
  if not found then return jsonb_build_object('ok',false,'error','Slot tidak ditemukan'); end if;
  if not sl.allow_over_quota and v_count>sl.kuota then
    return jsonb_build_object('ok',false,'error','Jumlah hadir melebihi kuota slot','quota',sl.kuota);
  end if;

  insert into private.ubnb_acara_slot_hadir(kegiatan_id,slot_id,jumlah_hadir,updated_by)
  values(p_kegiatan_id,p_slot_id,v_count,s.username)
  on conflict(kegiatan_id,slot_id) do update set
    jumlah_hadir=excluded.jumlah_hadir,updated_by=excluded.updated_by,updated_at=now();

  return jsonb_build_object('ok',true,'count',v_count,'quota',sl.kuota,'allow_over',sl.allow_over_quota);
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_attendance_set_slot_count(p_token text, p_kegiatan_id bigint, p_slot_id bigint, p_count integer) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_attendance_snapshot(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  v_masters jsonb;
  v_kegiatan jsonb;
  v_hadir jsonb;
  v_template_peserta jsonb;
  v_jadwal jsonb;
  v_exception jsonb;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then
    return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid atau sudah kedaluwarsa');
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by
    case x.scope_level when 'daerah' then 0 when 'desa' then 1 else 2 end,
    x.scope_kelompok nulls first,x.id),'[]'::jsonb)
  into v_masters
  from (
    select m.*
    from public.ubnb_acara_master m
    where m.aktif
      and private.dk_calendar_can_view(s.role,s.kelompok_scope,m.scope_level,m.scope_kelompok)
  ) x;

  select coalesce(jsonb_agg((to_jsonb(x)-'final_peserta') order by x.tanggal desc,x.id desc),'[]'::jsonb)
  into v_kegiatan
  from (
    select k.*
    from public.ubnb_kegiatan k
    where private.dk_calendar_can_view(s.role,s.kelompok_scope,k.scope_level,k.scope_kelompok)
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
  into v_hadir
  from (
    select h.*
    from public.ubnb_kegiatan_hadir h
    join public.ubnb_kegiatan k on k.id=h.kegiatan_id
    where private.dk_calendar_can_view(s.role,s.kelompok_scope,k.scope_level,k.scope_kelompok)
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.acara_id,x.jamaah_did),'[]'::jsonb)
  into v_template_peserta
  from (
    select tp.*
    from public.ubnb_acara_template_peserta tp
    join public.ubnb_acara_master m on m.id=tp.acara_id
    where m.aktif
      and private.dk_calendar_can_view(s.role,s.kelompok_scope,m.scope_level,m.scope_kelompok)
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
  into v_jadwal
  from (
    select j.*
    from private.ubnb_acara_jadwal j
    join public.ubnb_acara_master m on m.id=j.acara_id
    where j.aktif
      and private.dk_calendar_can_view(s.role,s.kelompok_scope,m.scope_level,m.scope_kelompok)
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.jadwal_id,x.tanggal_asli),'[]'::jsonb)
  into v_exception
  from (
    select e.*
    from private.ubnb_acara_exception e
    join private.ubnb_acara_jadwal j on j.id=e.jadwal_id
    join public.ubnb_acara_master m on m.id=j.acara_id
    where j.aktif
      and private.dk_calendar_can_view(s.role,s.kelompok_scope,m.scope_level,m.scope_kelompok)
  ) x;

  return jsonb_build_object(
    'ok',true,
    'masters',v_masters,
    'template_peserta',v_template_peserta,
    'kegiatan',v_kegiatan,
    'hadir',v_hadir,
    'jadwal',v_jadwal,
    'exceptions',v_exception
  );
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_attendance_snapshot(p_token text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_calendar_delete_exception(p_token text, p_jadwal_id bigint, p_tanggal_asli date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  j record;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not private.ubaid_calendar_access(p_token,'calendar') then
    return jsonb_build_object('ok',false,'error','Tambah/edit Acara hanya untuk dapukan KI, Wakil KI, Penerobos, atau MT');
  end if;
  if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid'); end if;

  select x.id,m.scope_level,m.scope_kelompok into j
  from private.ubnb_acara_jadwal x
  join public.ubnb_acara_master m on m.id=x.acara_id
  where x.id=p_jadwal_id;

  if not found then return jsonb_build_object('ok',false,'error','Jadwal tidak ditemukan'); end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,j.scope_level,j.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Tidak boleh mengubah acara di luar scope');
  end if;

  delete from private.ubnb_acara_exception
  where jadwal_id=p_jadwal_id and tanggal_asli=p_tanggal_asli;

  return jsonb_build_object('ok',true);
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_calendar_delete_exception(p_token text, p_jadwal_id bigint, p_tanggal_asli date) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_calendar_delete_schedule(p_token text, p_jadwal_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  j record;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not private.ubaid_calendar_access(p_token,'calendar') then
    return jsonb_build_object('ok',false,'error','Tambah/edit Acara hanya untuk dapukan KI, Wakil KI, Penerobos, atau MT');
  end if;
  if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid'); end if;

  select x.id,m.scope_level,m.scope_kelompok into j
  from private.ubnb_acara_jadwal x
  join public.ubnb_acara_master m on m.id=x.acara_id
  where x.id=p_jadwal_id;

  if not found then return jsonb_build_object('ok',false,'error','Jadwal tidak ditemukan'); end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,j.scope_level,j.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Tidak boleh menghapus jadwal di luar scope');
  end if;

  update private.ubnb_acara_jadwal set aktif=false,updated_at=now() where id=p_jadwal_id;
  return jsonb_build_object('ok',true);
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_calendar_delete_schedule(p_token text, p_jadwal_id bigint) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_calendar_extras_snapshot(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  v_targets jsonb;
  v_slots jsonb;
  v_slot_hadir jsonb;
  v_inv jsonb:='[]'::jsonb;
  v_rec jsonb:='[]'::jsonb;
  v_tpl jsonb:='[]'::jsonb;
  v_inv_access boolean:=false;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then return jsonb_build_object('ok',false,'error','Sesi tidak valid'); end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb) into v_targets
  from (
    select t.*
    from private.ubnb_acara_target_peserta t
    left join public.ubnb_kegiatan k on k.id=t.kegiatan_id
    left join private.ubnb_acara_jadwal j on j.id=t.jadwal_id
    left join public.ubnb_acara_master m on m.id=j.acara_id
    where private.dk_calendar_can_view(
      s.role,s.kelompok_scope,
      coalesce(k.scope_level,m.scope_level),
      coalesce(k.scope_kelompok,m.scope_kelompok)
    )
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.urutan,x.id),'[]'::jsonb) into v_slots
  from (
    select sl.*
    from private.ubnb_acara_slot sl
    left join public.ubnb_kegiatan k on k.id=sl.kegiatan_id
    left join private.ubnb_acara_jadwal j on j.id=sl.jadwal_id
    left join public.ubnb_acara_master m on m.id=j.acara_id
    where private.dk_calendar_can_view(
      s.role,s.kelompok_scope,
      coalesce(k.scope_level,m.scope_level),
      coalesce(k.scope_kelompok,m.scope_kelompok)
    )
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb) into v_slot_hadir
  from (
    select sh.*
    from private.ubnb_acara_slot_hadir sh
    join public.ubnb_kegiatan k on k.id=sh.kegiatan_id
    where private.dk_calendar_can_view(s.role,s.kelompok_scope,k.scope_level,k.scope_kelompok)
  ) x;

  v_inv_access:=private.ubaid_calendar_access(p_token,'invitation');
  if v_inv_access then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]'::jsonb)
    into v_inv
    from (
      select u.*
      from private.ubnb_undangan u
      where private.dk_invitation_can_view(p_token,u.id)
    ) x;

    select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
    into v_rec
    from (
      select p.*
      from private.ubnb_undangan_penerima p
      where private.dk_invitation_can_view(p_token,p.undangan_id)
    ) x;

    select coalesce(jsonb_agg(to_jsonb(x) order by x.nama),'[]'::jsonb)
    into v_tpl
    from (
      select *
      from private.ubnb_undangan_template
      where aktif
    ) x;
  end if;

  return jsonb_build_object(
    'ok',true,
    'targets',v_targets,
    'slots',v_slots,
    'slot_hadir',v_slot_hadir,
    'invitations',v_inv,
    'invitation_recipients',v_rec,
    'invitation_templates',v_tpl,
    'invitation_master',v_inv_access
  );
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_calendar_extras_snapshot(p_token text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_calendar_generate_occurrence(p_token text, p_jadwal_id bigint, p_occurrence_date date, p_peserta jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  j record;
  e record;
  v_date date;
  v_start time;
  v_end time;
  v_location text;
  v_k public.ubnb_kegiatan%rowtype;
  p jsonb;
  v_count int:=0;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid'); end if;

  select x.*,am.nama as acara_nama,am.scope_level,am.scope_kelompok
  into j
  from private.ubnb_acara_jadwal x
  join public.ubnb_acara_master am on am.id=x.acara_id
  where x.id=p_jadwal_id and x.aktif;

  if not found then return jsonb_build_object('ok',false,'error','Jadwal rutin tidak ditemukan'); end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,j.scope_level,j.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Tidak boleh generate acara di luar scope');
  end if;
  if not private.dk_calendar_occurs(j.tanggal_mulai,j.tanggal_selesai,j.recurrence_rule,p_occurrence_date) then
    return jsonb_build_object('ok',false,'error','Tanggal ini bukan jadwal rutin yang valid');
  end if;

  select * into e
  from private.ubnb_acara_exception
  where jadwal_id=p_jadwal_id and tanggal_asli=p_occurrence_date;

  if found and e.aksi='mansuh' then
    return jsonb_build_object('ok',false,'error','Acara tanggal ini sudah dimansuh/dibatalkan');
  end if;

  v_date:=case when found and e.aksi='pindah' then e.tanggal_baru else p_occurrence_date end;
  v_start:=case when found and e.waktu_mulai is not null then e.waktu_mulai else j.waktu_mulai end;
  v_end:=case when found and e.waktu_selesai is not null then e.waktu_selesai else j.waktu_selesai end;
  v_location:=case when found and e.lokasi is not null then e.lokasi else j.lokasi end;

  if (now() at time zone 'Asia/Jakarta')::date < (v_date-7) then
    return jsonb_build_object('ok',false,'error','Peserta baru bisa digenerate mulai H-7','available_from',(v_date-7));
  end if;

  select * into v_k
  from public.ubnb_kegiatan
  where jadwal_id=p_jadwal_id and occurrence_date=p_occurrence_date
  limit 1;

  if not found then
    insert into public.ubnb_kegiatan(
      acara_id,acara_nama,kelompok,scope_level,scope_kelompok,jadwal_id,occurrence_date,
      tanggal,waktu,waktu_selesai,lokasi,mode,filter_peserta,peserta_wajib_count,
      participants_generated_at,status,catatan,created_by,updated_at
    ) values(
      j.acara_id,j.acara_nama,j.scope_kelompok,j.scope_level,j.scope_kelompok,j.id,p_occurrence_date,
      v_date,v_start,v_end,v_location,j.mode,j.kriteria_peserta,0,
      now(),'aktif',j.catatan,s.username,now()
    ) returning * into v_k;
  else
    update public.ubnb_kegiatan set
      tanggal=v_date,waktu=v_start,waktu_selesai=v_end,lokasi=v_location,
      filter_peserta=j.kriteria_peserta,participants_generated_at=now(),updated_at=now()
    where id=v_k.id returning * into v_k;

    delete from public.ubnb_kegiatan_hadir h
    where h.kegiatan_id=v_k.id
      and h.status_hadir='tidak_hadir'
      and h.hadir_at is null;
  end if;

  if jsonb_typeof(coalesce(p_peserta,'[]'::jsonb))='array' then
    for p in select value from jsonb_array_elements(coalesce(p_peserta,'[]'::jsonb))
    loop
      if j.scope_level='kelompok'
         and nullif(p->>'did','') is not null
         and not exists(
           select 1 from public.jamaah_desa x
           where x.did=p->>'did' and x.kelompok_nama=j.scope_kelompok
         )
      then continue; end if;

      insert into public.ubnb_kegiatan_hadir(
        kegiatan_id,jamaah_did,jamaah_nama,jamaah_kk,status_hadir,input_by,input_via
      ) values(
        v_k.id,nullif(p->>'did',''),coalesce(nullif(p->>'nama',''),'-'),
        nullif(p->>'nama_kk',''),'tidak_hadir',s.username,'manual'
      )
      on conflict(kegiatan_id,jamaah_did) do update set
        jamaah_nama=excluded.jamaah_nama,
        jamaah_kk=excluded.jamaah_kk,
        updated_at=now();
    end loop;
  end if;

  select count(*) into v_count from public.ubnb_kegiatan_hadir where kegiatan_id=v_k.id;
  update public.ubnb_kegiatan
  set peserta_wajib_count=v_count,participants_generated_at=now(),updated_at=now()
  where id=v_k.id
  returning * into v_k;

  return jsonb_build_object('ok',true,'data',to_jsonb(v_k),'count',v_count);
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_calendar_generate_occurrence(p_token text, p_jadwal_id bigint, p_occurrence_date date, p_peserta jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_calendar_participants_plan(p_token text, p_kegiatan_id bigint DEFAULT NULL::bigint, p_jadwal_id bigint DEFAULT NULL::bigint, p_occurrence_date date DEFAULT NULL::date, p_peserta jsonb DEFAULT '[]'::jsonb, p_apply boolean DEFAULT false, p_expected_fingerprint text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 s record; j record; ex record; k public.ubnb_kegiatan%rowtype;
 v_scope text;v_group text;v_date date;v_meta jsonb;v_current jsonb;v_payload jsonb;
 v_added jsonb;v_removed jsonb;v_protected jsonb;v_fingerprint text;v_result jsonb;
 v_kid bigint;v_slots jsonb;v_final_count int;
begin
 select * into s from private.dk_attendance_session_row(p_token);
 if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid');end if;
 if p_kegiatan_id is null and (p_jadwal_id is null or p_occurrence_date is null) then
  return jsonb_build_object('ok',false,'error','Tanggal pelaksanaan wajib dipilih');end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  coalesce('K'||p_kegiatan_id::text,'S'||p_jadwal_id::text||':'||p_occurrence_date::text),104));
 if p_kegiatan_id is not null then
  select * into k from public.ubnb_kegiatan where id=p_kegiatan_id for update;
  if not found then return jsonb_build_object('ok',false,'error','Acara tidak ditemukan');end if;
  v_scope:=k.scope_level;v_group:=k.scope_kelompok;v_date:=k.tanggal;v_meta:=to_jsonb(k);v_kid:=k.id;
 else
  select x.*,am.scope_level,am.scope_kelompok into j from private.ubnb_acara_jadwal x
   join public.ubnb_acara_master am on am.id=x.acara_id where x.id=p_jadwal_id and x.aktif;
  if not found then return jsonb_build_object('ok',false,'error','Jadwal rutin tidak ditemukan');end if;
  if not private.dk_calendar_occurs(j.tanggal_mulai,j.tanggal_selesai,j.recurrence_rule,p_occurrence_date) then
   return jsonb_build_object('ok',false,'error','Tanggal bukan pelaksanaan jadwal rutin');end if;
  select * into ex from private.ubnb_acara_exception where jadwal_id=p_jadwal_id and tanggal_asli=p_occurrence_date;
  if found and ex.aksi='mansuh' then return jsonb_build_object('ok',false,'error','Acara dibatalkan');end if;
  v_date:=case when ex.aksi='pindah' then ex.tanggal_baru else p_occurrence_date end;
  v_scope:=j.scope_level;v_group:=j.scope_kelompok;v_meta:=jsonb_build_object('schedule',to_jsonb(j),'exception',to_jsonb(ex));
  select * into k from public.ubnb_kegiatan where jadwal_id=p_jadwal_id and occurrence_date=p_occurrence_date for update;
  if found then v_kid:=k.id;v_meta:=v_meta||jsonb_build_object('occurrence',to_jsonb(k));end if;
 end if;
 if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,v_scope,v_group) then
  return jsonb_build_object('ok',false,'error','Tidak boleh mengelola peserta di luar scope');end if;
 if k.closed_at is not null or k.status in ('selesai','dibatalkan') then
  return jsonb_build_object('ok',false,'error','Acara sudah ditutup atau dibatalkan');end if;
 if (now() at time zone 'Asia/Jakarta')::date<v_date-7 then
  return jsonb_build_object('ok',false,'error','Peserta dapat digenerate mulai H-7');end if;
 if jsonb_typeof(p_peserta) is distinct from 'array' then
  return jsonb_build_object('ok',false,'error','Daftar peserta tidak valid');end if;
 if exists(select 1 from jsonb_array_elements(p_peserta) p where nullif(p->>'did','') is not null and
   not exists(select 1 from public.jamaah_desa x where x.did=p->>'did' and (v_scope<>'kelompok' or x.kelompok_nama=v_group))) then
  return jsonb_build_object('ok',false,'error','Ada peserta tidak ditemukan atau di luar scope');end if;
 perform h.id from public.ubnb_kegiatan_hadir h where h.kegiatan_id=v_kid for update;
 select coalesce(jsonb_agg(to_jsonb(h) order by h.id),'[]'::jsonb) into v_current
  from public.ubnb_kegiatan_hadir h where h.kegiatan_id=v_kid;
 select coalesce(jsonb_agg(p order by p->>'did'),'[]'::jsonb) into v_payload from
  (select distinct on(p->>'did') p from jsonb_array_elements(p_peserta) p
   where nullif(p->>'did','') is not null order by p->>'did',p::text) q;
 -- Participant updates keep existing unnamed slots; never duplicate recorded slots.
 if exists(select 1 from jsonb_array_elements(v_current) h where h->>'jamaah_did' is null) then
  select coalesce(jsonb_agg(jsonb_build_object('did',null,'nama',h->>'jamaah_nama','nama_kk',h->>'jamaah_kk')),'[]'::jsonb)
   into v_slots from jsonb_array_elements(v_current) h where h->>'jamaah_did' is null
    and h->>'status_hadir'='tidak_hadir' and h->>'hadir_at' is null;
 else
  select coalesce(jsonb_agg(p),'[]'::jsonb) into v_slots from jsonb_array_elements(p_peserta) p where nullif(p->>'did','') is null;
 end if;
 select coalesce(jsonb_agg(p),'[]'::jsonb) into v_added from jsonb_array_elements(v_payload) p
  where not exists(select 1 from jsonb_array_elements(v_current) h where h->>'jamaah_did'=p->>'did');
 select coalesce(jsonb_agg(jsonb_build_object('did',h->>'jamaah_did','nama',h->>'jamaah_nama')),'[]'::jsonb)
  into v_removed from jsonb_array_elements(v_current) h where h->>'jamaah_did' is not null
  and h->>'status_hadir'='tidak_hadir' and h->>'hadir_at' is null
  and not exists(select 1 from jsonb_array_elements(v_payload) p where p->>'did'=h->>'jamaah_did');
 select coalesce(jsonb_agg(jsonb_build_object('did',h->>'jamaah_did','nama',h->>'jamaah_nama','status',h->>'status_hadir')),'[]'::jsonb)
  into v_protected from jsonb_array_elements(v_current) h
  where (h->>'status_hadir' is distinct from 'tidak_hadir' or h->>'hadir_at' is not null)
  and (h->>'jamaah_did' is null or not exists(select 1 from jsonb_array_elements(v_payload) p where p->>'did'=h->>'jamaah_did'));
 v_payload:=v_payload||v_slots;
 v_final_count:=jsonb_array_length(v_payload)+jsonb_array_length(v_protected);
 v_fingerprint:=md5(jsonb_build_object('meta',v_meta,'current',v_current,'desired',v_payload)::text);
 if not p_apply then
  return jsonb_build_object('ok',true,'fingerprint',v_fingerprint,'kegiatan_id',v_kid,
   'current_count',jsonb_array_length(v_current),'final_count',v_final_count,
   'participants',v_payload,'added',v_added,'removed',v_removed,'protected',v_protected);
 end if;
 if p_expected_fingerprint is distinct from v_fingerprint then
  return jsonb_build_object('ok',false,'code','PREVIEW_STALE','error','Data acara atau absensi berubah. Tampilkan pratinjau terbaru sebelum menyimpan.');end if;
 if v_kid is not null then
  v_result:=private.ubaid_cal_dk_attendance_generate_participants(p_token,v_kid,v_payload);
 else
  v_result:=private.ubaid_cal_dk_calendar_generate_occurrence(p_token,p_jadwal_id,p_occurrence_date,v_payload);
 end if;
 return v_result;
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_calendar_participants_plan(p_token text, p_kegiatan_id bigint, p_jadwal_id bigint, p_occurrence_date date, p_peserta jsonb, p_apply boolean, p_expected_fingerprint text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_calendar_save_exception(p_token text, p_jadwal_id bigint, p_tanggal_asli date, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  j record;
  v_action text:=coalesce(p_payload->>'aksi','ubah');
  r private.ubnb_acara_exception%rowtype;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not private.ubaid_calendar_access(p_token,'calendar') then
    return jsonb_build_object('ok',false,'error','Tambah/edit Acara hanya untuk dapukan KI, Wakil KI, Penerobos, atau MT');
  end if;
  if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid'); end if;

  select x.*,m.scope_level,m.scope_kelompok
  into j
  from private.ubnb_acara_jadwal x
  join public.ubnb_acara_master m on m.id=x.acara_id
  where x.id=p_jadwal_id and x.aktif;

  if not found then return jsonb_build_object('ok',false,'error','Jadwal rutin tidak ditemukan'); end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,j.scope_level,j.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Tidak boleh mengubah acara di luar scope');
  end if;
  if not private.dk_calendar_occurs(j.tanggal_mulai,j.tanggal_selesai,j.recurrence_rule,p_tanggal_asli) then
    return jsonb_build_object('ok',false,'error','Tanggal ini bukan occurrence dari jadwal rutin');
  end if;
  if v_action not in ('mansuh','pindah','ubah') then
    return jsonb_build_object('ok',false,'error','Aksi perubahan tidak valid');
  end if;
  if v_action='pindah' and coalesce(p_payload->>'tanggal_baru','')='' then
    return jsonb_build_object('ok',false,'error','Tanggal baru wajib diisi');
  end if;

  insert into private.ubnb_acara_exception(
    jadwal_id,tanggal_asli,aksi,tanggal_baru,waktu_mulai,waktu_selesai,lokasi,catatan,created_by
  ) values(
    p_jadwal_id,p_tanggal_asli,v_action,
    nullif(p_payload->>'tanggal_baru','')::date,
    nullif(p_payload->>'waktu_mulai','')::time,
    nullif(p_payload->>'waktu_selesai','')::time,
    nullif(p_payload->>'lokasi',''),
    nullif(p_payload->>'catatan',''),
    s.username
  )
  on conflict(jadwal_id,tanggal_asli) do update set
    aksi=excluded.aksi,
    tanggal_baru=excluded.tanggal_baru,
    waktu_mulai=excluded.waktu_mulai,
    waktu_selesai=excluded.waktu_selesai,
    lokasi=excluded.lokasi,
    catatan=excluded.catatan,
    created_by=excluded.created_by,
    updated_at=now()
  returning * into r;

  return jsonb_build_object('ok',true,'data',to_jsonb(r));
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_calendar_save_exception(p_token text, p_jadwal_id bigint, p_tanggal_asli date, p_payload jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_calendar_save_schedule(p_token text, p_id bigint, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  v_scope text:=coalesce(nullif(p_payload->>'scope_level',''),'desa');
  v_kel text:=nullif(p_payload->>'scope_kelompok','');
  v_name text:=trim(coalesce(p_payload->>'acara_nama',''));
  v_acara_id bigint:=nullif(p_payload->>'acara_id','')::bigint;
  v_rule jsonb:=coalesce(p_payload->'recurrence_rule','{}'::jsonb);
  v_row private.ubnb_acara_jadwal%rowtype;
  v_old record;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not private.ubaid_calendar_access(p_token,'calendar') then
    return jsonb_build_object('ok',false,'error','Tambah/edit Acara hanya untuk dapukan KI, Wakil KI, Penerobos, atau MT');
  end if;
  if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid'); end if;

  if v_scope not in ('daerah','desa','kelompok') then
    return jsonb_build_object('ok',false,'error','Scope acara tidak valid');
  end if;
  if v_scope='kelompok' and v_kel not in ('PW1','PW2','PW3','PW4') then
    return jsonb_build_object('ok',false,'error','Kelompok acara tidak valid');
  end if;
  if v_scope<>'kelompok' then v_kel:=null; end if;

  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,v_scope,v_kel) then
    return jsonb_build_object('ok',false,'error','Tidak boleh membuat jadwal di scope tersebut');
  end if;
  if v_name='' then return jsonb_build_object('ok',false,'error','Nama acara wajib diisi'); end if;
  if coalesce(p_payload->>'tanggal_mulai','')='' then
    return jsonb_build_object('ok',false,'error','Tanggal mulai wajib diisi');
  end if;
  if coalesce(v_rule->>'freq','') not in ('daily','weekly','monthly_date','monthly_week') then
    return jsonb_build_object('ok',false,'error','Frekuensi rutin tidak valid');
  end if;
  if coalesce(nullif(v_rule->>'interval','')::int,1) < 1 then
    return jsonb_build_object('ok',false,'error','Interval rutin minimal 1');
  end if;
  if coalesce(v_rule->>'freq','') in ('weekly','monthly_week')
     and jsonb_array_length(coalesce(v_rule->'weekdays','[]'::jsonb))=0 then
    return jsonb_build_object('ok',false,'error','Pilih minimal satu hari untuk jadwal rutin');
  end if;
  if coalesce(v_rule->>'freq','')='monthly_week'
     and jsonb_array_length(coalesce(v_rule->'weeks','[]'::jsonb))=0 then
    return jsonb_build_object('ok',false,'error','Pilih minggu ke berapa untuk jadwal bulanan');
  end if;
  if coalesce(v_rule->>'freq','')='monthly_date'
     and jsonb_array_length(coalesce(v_rule->'days','[]'::jsonb))=0 then
    return jsonb_build_object('ok',false,'error','Masukkan minimal satu tanggal bulanan');
  end if;

  if p_id is not null then
    select j.id,m.scope_level,m.scope_kelompok
    into v_old
    from private.ubnb_acara_jadwal j
    join public.ubnb_acara_master m on m.id=j.acara_id
    where j.id=p_id;
    if not found then return jsonb_build_object('ok',false,'error','Jadwal tidak ditemukan'); end if;
    if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,v_old.scope_level,v_old.scope_kelompok) then
      return jsonb_build_object('ok',false,'error','Tidak boleh mengubah jadwal di luar scope');
    end if;
  end if;

  if v_acara_id is not null and not exists(
    select 1 from public.ubnb_acara_master m
    where m.id=v_acara_id
      and m.scope_level=v_scope
      and m.scope_kelompok is not distinct from v_kel
  ) then v_acara_id:=null; end if;

  if v_acara_id is null then
    select id into v_acara_id
    from public.ubnb_acara_master
    where lower(nama)=lower(v_name)
      and scope_level=v_scope
      and scope_kelompok is not distinct from v_kel
    order by id
    limit 1;

    if v_acara_id is null then
      insert into public.ubnb_acara_master(
        kelompok,scope_level,scope_kelompok,nama,default_filter,template_rutin,aktif,created_by
      ) values(
        v_kel,v_scope,v_kel,v_name,p_payload->'filter_peserta',false,true,s.username
      ) returning id into v_acara_id;
    end if;
  end if;

  if p_id is null then
    insert into private.ubnb_acara_jadwal(
      acara_id,tanggal_mulai,tanggal_selesai,recurrence_rule,waktu_mulai,waktu_selesai,
      lokasi,mode,kriteria_peserta,catatan,aktif,created_by
    ) values(
      v_acara_id,
      (p_payload->>'tanggal_mulai')::date,
      nullif(p_payload->>'tanggal_selesai','')::date,
      v_rule,
      nullif(p_payload->>'waktu_mulai','')::time,
      nullif(p_payload->>'waktu_selesai','')::time,
      nullif(p_payload->>'lokasi',''),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'mode','["manual"]'::jsonb))),array['manual']::text[]),
      p_payload->'filter_peserta',
      nullif(p_payload->>'catatan',''),
      true,s.username
    ) returning * into v_row;
  else
    update private.ubnb_acara_jadwal set
      acara_id=v_acara_id,
      tanggal_mulai=(p_payload->>'tanggal_mulai')::date,
      tanggal_selesai=nullif(p_payload->>'tanggal_selesai','')::date,
      recurrence_rule=v_rule,
      waktu_mulai=nullif(p_payload->>'waktu_mulai','')::time,
      waktu_selesai=nullif(p_payload->>'waktu_selesai','')::time,
      lokasi=nullif(p_payload->>'lokasi',''),
      mode=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'mode','["manual"]'::jsonb))),array['manual']::text[]),
      kriteria_peserta=p_payload->'filter_peserta',
      catatan=nullif(p_payload->>'catatan',''),
      updated_at=now()
    where id=p_id
    returning * into v_row;
  end if;

  update public.ubnb_acara_master
  set nama=v_name,scope_level=v_scope,scope_kelompok=v_kel,kelompok=v_kel,updated_at=now()
  where id=v_acara_id;

  return jsonb_build_object('ok',true,'data',to_jsonb(v_row),'acara_id',v_acara_id);
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_calendar_save_schedule(p_token text, p_id bigint, p_payload jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_calendar_save_slots(p_token text, p_kegiatan_id bigint, p_jadwal_id bigint, p_slots jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  o record;
  x jsonb;
  v_count int:=0;
  v_kel text;
  v_quota int;
  v_gender text;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not private.ubaid_calendar_access(p_token,'calendar') then
    return jsonb_build_object('ok',false,'error','Tambah/edit Acara hanya untuk dapukan KI, Wakil KI, Penerobos, atau MT');
  end if;
  if not found then return jsonb_build_object('ok',false,'error','Sesi tidak valid'); end if;
  if (p_kegiatan_id is null)=(p_jadwal_id is null) then
    return jsonb_build_object('ok',false,'error','Target slot tidak valid');
  end if;
  select * into o from private.dk_calendar_owner_scope(p_kegiatan_id,p_jadwal_id);
  if not found then return jsonb_build_object('ok',false,'error','Acara/jadwal tidak ditemukan'); end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,o.scope_level,o.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Di luar hak kelola');
  end if;

  delete from private.ubnb_acara_slot
  where (p_kegiatan_id is not null and kegiatan_id=p_kegiatan_id)
     or (p_jadwal_id is not null and jadwal_id=p_jadwal_id);

  for x in select value from jsonb_array_elements(coalesce(p_slots,'[]'::jsonb))
  loop
    if trim(coalesce(x->>'nama_slot',''))='' then continue; end if;
    v_quota:=greatest(coalesce(nullif(x->>'kuota','')::int,1),1);
    v_gender:=nullif(x->>'gender','');
    if v_gender not in ('L','P') then v_gender:=null; end if;

    if coalesce(x->>'scope_kelompok','')='ALL' and o.scope_level<>'kelompok' then
      foreach v_kel in array array['PW1','PW2','PW3','PW4']
      loop
        insert into private.ubnb_acara_slot(
          kegiatan_id,jadwal_id,nama_slot,scope_kelompok,kuota,allow_over_quota,gender,urutan,catatan,created_by
        ) values(
          p_kegiatan_id,p_jadwal_id,trim(x->>'nama_slot'),v_kel,v_quota,
          coalesce((x->>'allow_over_quota')::boolean,false),v_gender,
          coalesce(nullif(x->>'urutan','')::int,v_count),nullif(x->>'catatan',''),s.username
        );
        v_count:=v_count+1;
      end loop;
    else
      v_kel:=case when o.scope_level='kelompok' then o.scope_kelompok else nullif(x->>'scope_kelompok','') end;
      if v_kel is not null and v_kel not in ('PW1','PW2','PW3','PW4') then v_kel:=null; end if;
      insert into private.ubnb_acara_slot(
        kegiatan_id,jadwal_id,nama_slot,scope_kelompok,kuota,allow_over_quota,gender,urutan,catatan,created_by
      ) values(
        p_kegiatan_id,p_jadwal_id,trim(x->>'nama_slot'),v_kel,v_quota,
        coalesce((x->>'allow_over_quota')::boolean,false),v_gender,
        coalesce(nullif(x->>'urutan','')::int,v_count),nullif(x->>'catatan',''),s.username
      );
      v_count:=v_count+1;
    end if;
  end loop;
  return jsonb_build_object('ok',true,'count',v_count);
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_calendar_save_slots(p_token text, p_kegiatan_id bigint, p_jadwal_id bigint, p_slots jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_calendar_save_targets(p_token text, p_kegiatan_id bigint, p_jadwal_id bigint, p_dids text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  o record;
  v_did text;
  v_count int := 0;
  v_regular boolean;
  v_pengurus boolean;
  v_source text;
  v_rows int;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not private.ubaid_calendar_access(p_token,'calendar') then
    return jsonb_build_object('ok',false,'error','Tambah/edit Acara hanya untuk dapukan KI, Wakil KI, Penerobos, atau MT');
  end if;
  if not found then
    return jsonb_build_object('ok',false,'error','Sesi tidak valid');
  end if;

  if (p_kegiatan_id is null) = (p_jadwal_id is null) then
    return jsonb_build_object('ok',false,'error','Target acara tidak valid');
  end if;

  select * into o from private.dk_calendar_owner_scope(p_kegiatan_id,p_jadwal_id);
  if not found then
    return jsonb_build_object('ok',false,'error','Acara/jadwal tidak ditemukan');
  end if;

  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,o.scope_level,o.scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Di luar hak kelola');
  end if;

  delete from private.ubnb_acara_target_peserta
  where (p_kegiatan_id is not null and kegiatan_id=p_kegiatan_id)
     or (p_jadwal_id is not null and jadwal_id=p_jadwal_id);

  foreach v_did in array coalesce(p_dids,array[]::text[])
  loop
    v_regular := exists(
      select 1
      from public.jamaah_desa j
      where j.did=v_did
        and j.status_sambung in ('Tetap','Pindah Sementara')
        and (o.scope_level<>'kelompok' or j.kelompok_nama=o.scope_kelompok)
    );

    v_pengurus := exists(
      select 1
      from public.ubnb_pengurus p
      join public.jamaah_desa j on j.did=p.did
      where p.did=v_did
        and p.aktif=true
        and j.status_sambung in ('Tetap','Pindah Sementara')
        and (
          s.kelompok_scope is null
          or p.level='desa'
          or (p.level='kelompok' and p.kelompok_nama=s.kelompok_scope)
        )
    );

    if not (v_regular or v_pengurus) then
      continue;
    end if;

    v_source := case when v_regular then 'manual' else 'pengurus' end;

    insert into private.ubnb_acara_target_peserta(
      kegiatan_id,jadwal_id,jamaah_did,sumber,created_by
    )
    values(
      p_kegiatan_id,p_jadwal_id,v_did,v_source,s.username
    )
    on conflict do nothing;

    get diagnostics v_rows = row_count;
    v_count := v_count + v_rows;
  end loop;

  return jsonb_build_object('ok',true,'count',v_count);
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_calendar_save_targets(p_token text, p_kegiatan_id bigint, p_jadwal_id bigint, p_dids text[]) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_calendar_update_schedule_future(p_token text, p_jadwal_id bigint, p_effective_date date, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  v_old record;
  v_scope text:=coalesce(nullif(p_payload->>'scope_level',''),'desa');
  v_kel text:=nullif(p_payload->>'scope_kelompok','');
  v_name text:=trim(coalesce(p_payload->>'acara_nama',''));
  v_rule jsonb:=coalesce(p_payload->'recurrence_rule','{}'::jsonb);
  v_new_master bigint;
  v_new_id bigint;
  v_old_end date;
  v_new_end date:=nullif(p_payload->>'tanggal_selesai','')::date;
  v_mode text[];
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not private.ubaid_calendar_access(p_token,'calendar') then
    return jsonb_build_object('ok',false,'error','Tambah/edit Acara hanya untuk dapukan KI, Wakil KI, Penerobos, atau MT');
  end if;
  if not found then return jsonb_build_object('ok',false,'error','Sesi absensi tidak valid'); end if;

  select j.*,m.nama as master_name,m.scope_level as master_scope_level,
         m.scope_kelompok as master_scope_kelompok
  into v_old
  from private.ubnb_acara_jadwal j
  join public.ubnb_acara_master m on m.id=j.acara_id
  where j.id=p_jadwal_id;
  if not found then return jsonb_build_object('ok',false,'error','Jadwal rutin tidak ditemukan'); end if;

  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,v_old.master_scope_level,v_old.master_scope_kelompok) then
    return jsonb_build_object('ok',false,'error','Tidak boleh mengubah jadwal di luar scope');
  end if;

  if p_effective_date is null then return jsonb_build_object('ok',false,'error','Tanggal mulai berlaku wajib diisi'); end if;
  if p_effective_date < v_old.tanggal_mulai then
    return jsonb_build_object('ok',false,'error','Tanggal mulai berlaku tidak boleh sebelum awal jadwal');
  end if;
  if v_old.tanggal_selesai is not null and p_effective_date > v_old.tanggal_selesai then
    return jsonb_build_object('ok',false,'error','Tanggal mulai berlaku berada di luar rentang jadwal');
  end if;
  if v_new_end is not null and v_new_end < p_effective_date then
    return jsonb_build_object('ok',false,'error','Tanggal selesai tidak boleh sebelum tanggal mulai berlaku');
  end if;

  if v_scope not in ('daerah','desa','kelompok') then
    return jsonb_build_object('ok',false,'error','Scope acara tidak valid');
  end if;
  if v_scope='kelompok' and v_kel not in ('PW1','PW2','PW3','PW4') then
    return jsonb_build_object('ok',false,'error','Kelompok acara tidak valid');
  end if;
  if v_scope<>'kelompok' then v_kel:=null; end if;
  if not private.dk_calendar_can_manage(s.role,s.kelompok_scope,v_scope,v_kel) then
    return jsonb_build_object('ok',false,'error','Tidak boleh membuat jadwal di scope tersebut');
  end if;

  if v_name='' then return jsonb_build_object('ok',false,'error','Nama acara wajib diisi'); end if;
  if coalesce(v_rule->>'freq','') not in ('daily','weekly','monthly_date','monthly_week') then
    return jsonb_build_object('ok',false,'error','Frekuensi rutin tidak valid');
  end if;
  if coalesce(nullif(v_rule->>'interval','')::int,1)<1 then
    return jsonb_build_object('ok',false,'error','Interval rutin minimal 1');
  end if;
  if coalesce(v_rule->>'freq','') in ('weekly','monthly_week')
     and jsonb_array_length(coalesce(v_rule->'weekdays','[]'::jsonb))=0 then
    return jsonb_build_object('ok',false,'error','Pilih minimal satu hari untuk jadwal rutin');
  end if;
  if coalesce(v_rule->>'freq','')='monthly_week'
     and jsonb_array_length(coalesce(v_rule->'weeks','[]'::jsonb))=0 then
    return jsonb_build_object('ok',false,'error','Pilih minggu ke berapa untuk jadwal bulanan');
  end if;
  if coalesce(v_rule->>'freq','')='monthly_date'
     and jsonb_array_length(coalesce(v_rule->'days','[]'::jsonb))=0 then
    return jsonb_build_object('ok',false,'error','Masukkan minimal satu tanggal bulanan');
  end if;

  v_mode:=coalesce(
    array(select jsonb_array_elements_text(coalesce(p_payload->'mode','["manual"]'::jsonb))),
    array['manual']::text[]
  );

  if p_effective_date=v_old.tanggal_mulai then
    return private.ubaid_cal_dk_calendar_save_schedule(
      p_token,
      p_jadwal_id,
      p_payload || jsonb_build_object('tanggal_mulai',p_effective_date)
    );
  end if;

  v_old_end:=p_effective_date-1;

  if lower(v_name)=lower(coalesce(v_old.master_name,''))
     and v_scope=v_old.master_scope_level
     and v_kel is not distinct from v_old.master_scope_kelompok then
    v_new_master:=v_old.acara_id;
  else
    insert into public.ubnb_acara_master(
      kelompok,scope_level,scope_kelompok,nama,default_filter,template_rutin,aktif,created_by
    ) values(
      v_kel,v_scope,v_kel,v_name,p_payload->'filter_peserta',false,true,s.username
    ) returning id into v_new_master;
  end if;

  update private.ubnb_acara_jadwal
  set tanggal_selesai=v_old_end,updated_at=now()
  where id=p_jadwal_id;

  insert into private.ubnb_acara_jadwal(
    acara_id,tanggal_mulai,tanggal_selesai,recurrence_rule,waktu_mulai,waktu_selesai,
    lokasi,mode,kriteria_peserta,catatan,aktif,created_by
  ) values(
    v_new_master,p_effective_date,v_new_end,v_rule,
    nullif(p_payload->>'waktu_mulai','')::time,
    nullif(p_payload->>'waktu_selesai','')::time,
    nullif(p_payload->>'lokasi',''),v_mode,p_payload->'filter_peserta',
    nullif(p_payload->>'catatan',''),true,s.username
  ) returning id into v_new_id;

  insert into private.ubnb_acara_target_peserta(kegiatan_id,jadwal_id,jamaah_did,sumber,created_by)
  select null,v_new_id,jamaah_did,sumber,s.username
  from private.ubnb_acara_target_peserta
  where jadwal_id=p_jadwal_id;

  insert into private.ubnb_acara_slot(
    kegiatan_id,jadwal_id,nama_slot,scope_kelompok,kuota,allow_over_quota,gender,urutan,catatan,created_by
  )
  select null,v_new_id,nama_slot,scope_kelompok,kuota,allow_over_quota,gender,urutan,catatan,s.username
  from private.ubnb_acara_slot
  where jadwal_id=p_jadwal_id;

  update private.ubnb_acara_exception
  set jadwal_id=v_new_id
  where jadwal_id=p_jadwal_id
    and tanggal_asli>=p_effective_date;

  update public.ubnb_kegiatan
  set jadwal_id=v_new_id,acara_id=v_new_master,acara_nama=v_name,
      waktu=nullif(p_payload->>'waktu_mulai','')::time,
      waktu_selesai=nullif(p_payload->>'waktu_selesai','')::time,
      lokasi=nullif(p_payload->>'lokasi',''),mode=v_mode,
      filter_peserta=p_payload->'filter_peserta',
      catatan=nullif(p_payload->>'catatan',''),
      scope_level=v_scope,scope_kelompok=v_kel,kelompok=v_kel,updated_at=now()
  where jadwal_id=p_jadwal_id
    and occurrence_date>=p_effective_date;

  update private.ubnb_undangan
  set jadwal_id=v_new_id,updated_at=now()
  where jadwal_id=p_jadwal_id
    and kegiatan_id is null
    and occurrence_date>=p_effective_date;

  return jsonb_build_object(
    'ok',true,'mode','split_future',
    'old_jadwal_id',p_jadwal_id,'new_jadwal_id',v_new_id,
    'effective_date',p_effective_date,'old_end_date',v_old_end
  );
end;
$function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_calendar_update_schedule_future(p_token text, p_jadwal_id bigint, p_effective_date date, p_payload jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.ubaid_cal_dk_event_document(p_token text, p_event_key text, p_kind text DEFAULT 'minutes'::text, p_action text DEFAULT 'load'::text, p_payload jsonb DEFAULT '{}'::jsonb, p_version integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 a private.dk_attendance_session%rowtype;k public.ubnb_kegiatan%rowtype;
 j private.ubnb_acara_jadwal%rowtype;m public.ubnb_acara_master%rowtype;ex private.ubnb_acara_exception%rowtype;
 doc private.dk_event_document%rowtype;f private.dk_event_document_file%rowtype;
 canon text;level_ text;group_ text;title_ text;date_ date;location_ text;orig date;parts text[];
 writable boolean; actor_ text;next_ jsonb;hist jsonb;status_ text;reason_ text;field_ text;item jsonb;
 attached jsonb:='[]';bytes bytea;fid uuid;total_ integer:=0;n integer;has_doc boolean;
begin
 select * into a from private.dk_attendance_session where token=p_token and expires_at>now();
 if not found then return jsonb_build_object('ok',false,'code','AUTH_REQUIRED','error','Sesi login berakhir. Silakan login kembali.'); end if;
 if p_kind not in ('minutes','report') or p_action not in ('load','save','file') then return jsonb_build_object('ok',false,'error','Permintaan dokumen tidak valid'); end if;
 if p_event_key ~ '^K[0-9]+$' then
  select * into k from public.ubnb_kegiatan where id=substring(p_event_key from 2)::bigint;
  if not found then return jsonb_build_object('ok',false,'error','Acara tidak ditemukan'); end if;
  canon:=case when k.jadwal_id is null then p_event_key else 'S'||k.jadwal_id||':'||coalesce(k.occurrence_date,k.tanggal)::text end;
  level_:=coalesce(k.scope_level,case when k.kelompok in ('PW1','PW2','PW3','PW4') then 'kelompok' else 'desa' end);group_:=coalesce(k.scope_kelompok,k.kelompok);
  title_:=k.acara_nama;date_:=k.tanggal;location_:=k.lokasi;
 elsif p_event_key ~ '^S[0-9]+:[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
  parts:=string_to_array(substring(p_event_key from 2),':');orig:=parts[2]::date;
  select * into j from private.ubnb_acara_jadwal where id=parts[1]::bigint;
  if not found or orig<j.tanggal_mulai or orig>coalesce(j.tanggal_selesai,'infinity'::date) then return jsonb_build_object('ok',false,'error','Jadwal pelaksanaan tidak ditemukan'); end if;
  select * into m from public.ubnb_acara_master where id=j.acara_id;
  if not found then return jsonb_build_object('ok',false,'error','Acara tidak ditemukan'); end if;
  select * into ex from private.ubnb_acara_exception where jadwal_id=j.id and tanggal_asli=orig;
  canon:='S'||j.id||':'||orig::text;level_:=m.scope_level;group_:=m.scope_kelompok;
  title_:=m.nama;date_:=coalesce(ex.tanggal_baru,orig);location_:=coalesce(ex.lokasi,j.lokasi);
 else return jsonb_build_object('ok',false,'error','Identitas pelaksanaan tidak valid');end if;
 if not coalesce(private.dk_calendar_can_view(a.role,a.kelompok_scope,level_,group_),false) then return jsonb_build_object('ok',false,'error','Acara di luar lingkup akses Anda');end if;
 writable:=coalesce(private.dk_calendar_can_manage(a.role,a.kelompok_scope,level_,group_),false);
 actor_:=coalesce(nullif(a.pengurus_did,''),'user:'||a.legacy_user_id);
 perform pg_advisory_xact_lock(hashtextextended(canon||':'||p_kind,0));
 select * into doc from private.dk_event_document where event_key=canon and kind=p_kind;has_doc:=found;
 if p_action='file' then
  select * into f from private.dk_event_document_file where id=(p_payload->>'id')::uuid and event_key=canon and kind=p_kind;
  if not found or not exists(select 1 from jsonb_array_elements(coalesce(doc.payload->'attachments','[]')) e where e->>'id'=f.id::text) then return jsonb_build_object('ok',false,'error','Lampiran tidak ditemukan');end if;
  return jsonb_build_object('ok',true,'name',f.name,'mime',f.mime,'base64',encode(f.content,'base64'));
 end if;
 if p_action='load' then
  select coalesce(jsonb_agg(to_jsonb(h)-'payload'),'[]') into hist from (select * from private.dk_event_document_history where event_key=canon and kind=p_kind order by id desc limit 30)h;
  return jsonb_build_object('ok',true,'event_key',canon,'event',jsonb_build_object('name',title_,'date',date_,'location',location_,'scope',coalesce(group_,level_)),
   'can_write',writable,'version',coalesce(doc.version,0),'status',coalesce(doc.status,'draft'),'payload',coalesce(doc.payload,'{}'),'history',hist);
 end if;
 if not writable then return jsonb_build_object('ok',false,'error','Hanya pengurus penyelenggara yang boleh mengisi dokumen ini');end if;
 if coalesce(p_version,-1)<>coalesce(doc.version,0) then return jsonb_build_object('ok',false,'code','VERSION_CONFLICT','error','Dokumen berubah di perangkat lain. Muat ulang sebelum menyimpan.');end if;
 if jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>18000000 then return jsonb_build_object('ok',false,'error','Ukuran dokumen terlalu besar');end if;
 status_:=p_payload->>'status';reason_:=btrim(coalesce(p_payload->>'reason',''));
 if status_ is null or status_ not in ('draft','final') then return jsonb_build_object('ok',false,'error','Status dokumen tidak valid');end if;
 if has_doc and doc.status='final' and (status_<>'final' or length(reason_)<3) then return jsonb_build_object('ok',false,'error','Dokumen selesai hanya dapat dikoreksi dengan alasan, minimal 3 karakter');end if;
 if length(reason_)>500 then return jsonb_build_object('ok',false,'error','Alasan maksimal 500 karakter');end if;
 next_:='{}';
 foreach field_ in array array['chair','scribe','discussion','decisions','summary','results','obstacles'] loop
  if jsonb_typeof(coalesce(p_payload->field_,'""'))<>'string' or length(coalesce(p_payload->>field_,''))>20000 then return jsonb_build_object('ok',false,'error','Isian teks tidak valid atau terlalu panjang');end if;
  next_:=next_||jsonb_build_object(field_,btrim(coalesce(p_payload->>field_,'')));
 end loop;
 if status_='final' and ((p_kind='minutes' and coalesce(next_->>'discussion','')='' and coalesce(next_->>'decisions','')='') or (p_kind='report' and coalesce(next_->>'summary','')='')) then return jsonb_build_object('ok',false,'error','Isi pembahasan/keputusan atau ringkasan kegiatan sebelum menyelesaikan');end if;
 if jsonb_typeof(coalesce(p_payload->'actions','[]'))<>'array' or jsonb_array_length(coalesce(p_payload->'actions','[]'))>100 then return jsonb_build_object('ok',false,'error','Daftar tindak lanjut tidak valid');end if;
 next_:=next_||jsonb_build_object('actions','[]'::jsonb);
 for item in select value from jsonb_array_elements(coalesce(p_payload->'actions','[]')) loop
  if jsonb_typeof(item)<>'object' or length(coalesce(item->>'task',''))>2000 or length(coalesce(item->>'person',''))>200 or coalesce(item->>'due','')!~ '^([0-9]{4}-[0-9]{2}-[0-9]{2})?$' then return jsonb_build_object('ok',false,'error','Isian tindak lanjut tidak valid');end if;
  if coalesce(item->>'due','')<>'' then perform (item->>'due')::date;end if;
  next_:=jsonb_set(next_,'{actions}',(next_->'actions')||jsonb_build_array(jsonb_build_object('task',btrim(coalesce(item->>'task','')),'person',btrim(coalesce(item->>'person','')),'due',coalesce(item->>'due',''))));
 end loop;
 if jsonb_typeof(coalesce(p_payload->'attachments','[]'))<>'array' or jsonb_array_length(coalesce(p_payload->'attachments','[]'))>10 then return jsonb_build_object('ok',false,'error','Maksimal 10 lampiran');end if;
 -- Validate every attachment before storing any bytes.
 for item in select value from jsonb_array_elements(coalesce(p_payload->'attachments','[]')) loop
  if item ? 'base64' then
   bytes:=decode(item->>'base64','base64');n:=octet_length(bytes);
   if n is null or n=0 or n>3145728 or length(coalesce(item->>'name','')) not between 1 and 180 or coalesce(item->>'mime','') not in ('image/jpeg','image/png','image/webp','application/pdf') then return jsonb_build_object('ok',false,'error','Lampiran harus foto atau PDF, maksimal 3 MB per file');end if;
   if not ((item->>'mime'='application/pdf' and substring(bytes from 1 for 5)=decode('255044462d','hex')) or (item->>'mime'='image/jpeg' and substring(bytes from 1 for 3)=decode('ffd8ff','hex')) or (item->>'mime'='image/png' and substring(bytes from 1 for 8)=decode('89504e470d0a1a0a','hex')) or (item->>'mime'='image/webp' and substring(bytes from 1 for 4)=decode('52494646','hex') and substring(bytes from 9 for 4)=decode('57454250','hex'))) then return jsonb_build_object('ok',false,'error','Isi file tidak sesuai format foto/PDF');end if;
  else
   select * into f from private.dk_event_document_file where id=(item->>'id')::uuid and event_key=canon and kind=p_kind;
   if not found then return jsonb_build_object('ok',false,'error','Lampiran tidak sesuai dokumen ini');end if;n:=octet_length(f.content);
  end if;
  total_:=total_+n;if total_>10485760 then return jsonb_build_object('ok',false,'error','Total lampiran maksimal 10 MB');end if;
 end loop;
 for item in select value from jsonb_array_elements(coalesce(p_payload->'attachments','[]')) loop
  if item ? 'base64' then
   insert into private.dk_event_document_file(event_key,kind,name,mime,content) values(canon,p_kind,item->>'name',item->>'mime',decode(item->>'base64','base64')) returning * into f;
  else select * into f from private.dk_event_document_file where id=(item->>'id')::uuid and event_key=canon and kind=p_kind;end if;
  attached:=attached||jsonb_build_array(jsonb_build_object('id',f.id,'name',f.name,'mime',f.mime,'size',octet_length(f.content)));
 end loop;
 next_:=next_||jsonb_build_object('attachments',attached);
 insert into private.dk_event_document(event_key,kind,version,status,payload,updated_by,updated_name) values(canon,p_kind,coalesce(doc.version,0)+1,status_,next_,actor_,a.username)
 on conflict(event_key,kind) do update set version=excluded.version,status=excluded.status,payload=excluded.payload,updated_by=excluded.updated_by,updated_name=excluded.updated_name,updated_at=now() returning * into doc;
 insert into private.dk_event_document_history(event_key,kind,version,status,payload,reason,actor,actor_name) values(canon,p_kind,doc.version,status_,next_,reason_,actor_,a.username);
 return jsonb_build_object('ok',true,'version',doc.version,'status',doc.status,'payload',doc.payload);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
 return jsonb_build_object('ok',false,'error','Format tanggal atau lampiran tidak valid');
end $function$;
REVOKE ALL ON FUNCTION private.ubaid_cal_dk_event_document(p_token text, p_event_key text, p_kind text, p_action text, p_payload jsonb, p_version integer) FROM PUBLIC,anon,authenticated;

