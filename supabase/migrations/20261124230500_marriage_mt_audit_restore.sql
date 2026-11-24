
-- MT access, session-bound audit, and recoverable marriage records.
alter table private.jamaah_marriage_event
 add column if not exists deleted_at timestamptz,
 add column if not exists deleted_by_did text,
 add column if not exists updated_at timestamptz,
 add column if not exists updated_by_did text;
alter table private.ubnb_biodata_nikah
 add column if not exists deleted_at timestamptz,
 add column if not exists deleted_by_did text;

create table private.marriage_audit(
 id bigint generated always as identity primary key,
 created_at timestamptz not null default clock_timestamp(),
 actor_did text not null, actor_name text not null, actor_scope text not null,
 action text not null, entity text not null, record_id text not null,
 record_label text, groups text[] not null default '{}',
 before_data jsonb, after_data jsonb,
 changed_fields text[] not null default '{}'
);
alter table private.marriage_audit enable row level security;
revoke all on private.marriage_audit from public,anon,authenticated;
create index marriage_audit_created_idx on private.marriage_audit(created_at desc,id desc);
create index marriage_audit_record_idx on private.marriage_audit(entity,record_id,id desc);

create or replace function private.marriage_actor(p_token text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare d text; p jsonb;
begin
 select s.pengurus_did into d from private.dk_attendance_session s
 where s.token=p_token and s.expires_at>now();
 if d is null then raise exception 'Sesi pengurus berakhir. Masuk ulang.' using errcode='28000'; end if;
 p:=public.dashboard_pengurus_profile(d);
 if not coalesce((p->>'ok')::boolean,false)
 or not private.dk_pengurus_module_access(d,'marriage') then
  raise exception 'Akses Pernikahan tidak diberikan untuk akun ini' using errcode='42501';
 end if;
 return p;
end $$;
revoke all on function private.marriage_actor(text) from public,anon,authenticated;

create or replace function private.marriage_assert_actor(p_did text)
returns void language plpgsql security definer set search_path=''
as $$
declare a jsonb;
begin
 a:=private.marriage_actor(current_setting('ubnb.marriage_token',true));
 if a->>'did' is distinct from p_did then
  raise exception 'Akun editor berbeda dengan sesi login' using errcode='42501';
 end if;
end $$;
revoke all on function private.marriage_assert_actor(text) from public,anon,authenticated;

create or replace function private.marriage_audit_row()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
 a jsonb; b jsonb; v jsonb; x jsonb; fields text[]; gr text[];
 act text; rid text; label text; token text;
begin
 token:=nullif(current_setting('ubnb.marriage_token',true),'');
 if token is null then
  -- Existing non-marriage workflows are unchanged.
  if tg_table_name in ('jamaah_marriage_event','ubnb_biodata_nikah') then
   raise exception 'Perubahan Pernikahan wajib melalui sesi editor agar tercatat';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
 end if;
 a:=private.marriage_actor(token);
 if tg_op='DELETE' and tg_table_name in ('jamaah_marriage_event','ubnb_biodata_nikah') then
  raise exception 'Hapus permanen tidak diizinkan. Gunakan arsip yang dapat dipulihkan.';
 end if;
 if tg_op<>'INSERT' then b:=to_jsonb(old); end if;
 if tg_op<>'DELETE' then v:=to_jsonb(new); end if;
 if b is not distinct from v then return new; end if;
 x:=coalesce(v,b);
 act:=case when tg_op='INSERT' then 'tambah' when tg_op='DELETE' then 'hapus'
  when b->>'deleted_at' is null and v->>'deleted_at' is not null then 'hapus'
  when b->>'deleted_at' is not null and v->>'deleted_at' is null then 'pulihkan'
  else 'ubah' end;
 rid:=coalesce(x->>'id',x->>'did');
 label:=coalesce(x->>'nama',x->>'nama_kk',nullif(concat_ws(' & ',x->>'jamaah_1_nama',x->>'jamaah_2_nama'),''));
 if tg_table_name='ubnb_biodata_nikah' then
  select j.nama into label from public.jamaah_desa j where j.did=x->>'jamaah_did';
 end if;
 select coalesce(array_agg(k order by k),'{}') into fields from (
  select key k from jsonb_object_keys(coalesce(b,'{}')||coalesce(v,'{}')) as keys(key)
  where (b->key) is distinct from (v->key)
 ) q;
 select coalesce(array_agg(distinct g) filter(where g in ('PW1','PW2','PW3','PW4')),'{}')
 into gr from unnest(array[
  b->>'kelompok_nama',v->>'kelompok_nama',
  x->>'asal_kelompok_1',x->>'asal_kelompok_2',x->>'kelompok_akhir',
  x->>'kelompok_sambung'
 ]) g;
 if tg_table_name='ubnb_biodata_nikah' then
  select array[j.kelompok_nama] into gr from public.jamaah_desa j where j.did=x->>'jamaah_did';
 end if;
 insert into private.marriage_audit(actor_did,actor_name,actor_scope,action,entity,
  record_id,record_label,groups,before_data,after_data,changed_fields)
 values(a->>'did',a->>'nama',a->>'scope',act,tg_table_schema||'.'||tg_table_name,
  rid,label,coalesce(gr,'{}'),b,v,fields);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.marriage_audit_row() from public,anon,authenticated;
create trigger marriage_event_audit after insert or update or delete on private.jamaah_marriage_event
 for each row execute function private.marriage_audit_row();
create trigger marriage_biodata_audit after insert or update or delete on private.ubnb_biodata_nikah
 for each row execute function private.marriage_audit_row();
create trigger marriage_jamaah_audit after insert or update or delete on public.jamaah_desa
 for each row execute function private.marriage_audit_row();
create trigger marriage_family_audit after insert or update or delete on public.keluarga
 for each row execute function private.marriage_audit_row();

create or replace function private.marriage_editor(
 p_token text,p_action text,p_target text default null,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 a jsonb; d text; sc text; e private.jamaah_marriage_event%rowtype;
 b private.ubnb_biodata_nikah%rowtype; j public.jamaah_desa%rowtype; r jsonb; allowed boolean;
begin
 a:=private.marriage_actor(p_token); d:=a->>'did'; sc:=a->>'scope';
 if p_payload ? '_editor_did' and p_payload->>'_editor_did' is distinct from d then
  raise exception 'Sesi akun berubah. Verifikasi login kembali.' using errcode='28000';
 end if;
 perform set_config('ubnb.marriage_token',p_token,true);
 if p_action='process' then
  return public.dashboard_marriage_process(d,p_payload);
 elsif p_action='youth_save' then
  if exists(select 1 from private.ubnb_biodata_nikah where jamaah_did=p_target and deleted_at is not null) then
   raise exception 'Profil ada di arsip. Pulihkan dahulu sebelum mengedit.';
  end if;
  return public.dashboard_marriage_youth_save(d,p_target,p_payload);
 elsif p_action='audit' then
  return jsonb_build_object('ok',true,'logs',coalesce((
   select jsonb_agg(to_jsonb(q) order by q.id desc) from (
    select id,created_at,actor_did,actor_name,actor_scope,action,entity,record_id,record_label,changed_fields
    from private.marriage_audit
    where (sc='Desa' or sc=any(groups))
      and (nullif(p_target,'') is null or record_id=p_target)
    order by id desc limit 200
   ) q),'[]'::jsonb));

 elsif p_action='audit_detail' then
  select jsonb_build_object('ok',true,'log',to_jsonb(l)) into r
  from private.marriage_audit l where l.id=p_target::bigint and (sc='Desa' or sc=any(l.groups));
  if r is null then raise exception 'Log tidak ditemukan atau di luar lingkup akses'; end if;
  return r;
 elsif p_action='trash' then
  return jsonb_build_object('ok',true,
   'events',coalesce((select jsonb_agg(to_jsonb(q) order by q.deleted_at desc) from (
    select id,jamaah_1_nama,jamaah_2_nama,tanggal_nikah,deleted_at,deleted_by_did,
     (select nama from public.jamaah_desa where did=ev.deleted_by_did) as deleted_by_name
    from private.jamaah_marriage_event ev where deleted_at is not null
     and (sc='Desa' or sc in (ev.asal_kelompok_1,ev.asal_kelompok_2,ev.kelompok_akhir))
   ) q),'[]'::jsonb),
   'profiles',coalesce((select jsonb_agg(to_jsonb(q) order by q.deleted_at desc) from (
    select bp.id,bp.jamaah_did,jp.nama,bp.deleted_at,bp.deleted_by_did,
     (select nama from public.jamaah_desa where did=bp.deleted_by_did) as deleted_by_name
    from private.ubnb_biodata_nikah bp join public.jamaah_desa jp on jp.did=bp.jamaah_did
    where bp.deleted_at is not null and (sc='Desa' or sc=jp.kelompok_nama)
   ) q),'[]'::jsonb));
 elsif p_action in ('event_update','event_delete','event_restore') then
  select * into e from private.jamaah_marriage_event where id=p_target::bigint for update;
  if not found then raise exception 'Catatan pernikahan tidak ditemukan'; end if;
  if not (sc='Desa' or sc in (e.asal_kelompok_1,e.asal_kelompok_2,e.kelompok_akhir)) then
   raise exception 'Di luar lingkup akses' using errcode='42501';
  end if;
  if p_action='event_update' then
   if e.deleted_at is not null then raise exception 'Pulihkan catatan dari arsip dahulu'; end if;
   if not (p_payload ? 'tanggal_nikah') or nullif(p_payload->>'tanggal_nikah','') is null then
    raise exception 'Tanggal nikah wajib diisi';
   end if;
   update private.jamaah_marriage_event set tanggal_nikah=(p_payload->>'tanggal_nikah')::date,
    catatan=nullif(btrim(p_payload->>'catatan'),''),updated_at=now(),updated_by_did=d where id=e.id;
  elsif p_action='event_delete' then
   if e.deleted_at is not null then raise exception 'Catatan sudah diarsipkan'; end if;
   update private.jamaah_marriage_event set deleted_at=now(),deleted_by_did=d,
    updated_at=now(),updated_by_did=d where id=e.id;
  else
   if e.deleted_at is null then raise exception 'Catatan sudah aktif'; end if;
   update private.jamaah_marriage_event set deleted_at=null,deleted_by_did=null,
    updated_at=now(),updated_by_did=d where id=e.id;
  end if;
  return jsonb_build_object('ok',true,'id',e.id);
 elsif p_action in ('youth_delete','youth_restore') then
  select * into j from public.jamaah_desa where did=p_target;
  if not found then raise exception 'Jamaah tidak ditemukan'; end if;
  if not (sc='Desa' or sc=j.kelompok_nama) then raise exception 'Di luar lingkup akses' using errcode='42501'; end if;
  select * into b from private.ubnb_biodata_nikah where jamaah_did=p_target for update;
  if not found then raise exception 'Profil belum dibuat'; end if;
  if p_action='youth_delete' then
   if b.deleted_at is not null then raise exception 'Profil sudah diarsipkan'; end if;
   update private.ubnb_biodata_nikah set deleted_at=now(),deleted_by_did=d,updated_at=now(),updated_by=d where id=b.id;
  else
   if b.deleted_at is null then raise exception 'Profil sudah aktif'; end if;
   if not (j.status_nikah='Belum Menikah' and j.kelas_usia='Dewasa' and coalesce(j.status_sambung,'Tetap')='Tetap') then
    raise exception 'Jamaah tidak lagi termasuk daftar usia nikah; arsip tetap tersimpan.';
   end if;
   update private.ubnb_biodata_nikah set deleted_at=null,deleted_by_did=null,updated_at=now(),updated_by=d where id=b.id;
  end if;
  return jsonb_build_object('ok',true,'id',b.id);
 end if;
 raise exception 'Tindakan tidak dikenal';
end $$;
revoke all on function private.marriage_editor(text,text,text,jsonb) from public;
grant usage on schema private to anon,authenticated;
grant execute on function private.marriage_editor(text,text,text,jsonb) to anon,authenticated;
create or replace function public.dashboard_marriage_editor(
 p_token text,p_action text,p_target text default null,p_payload jsonb default '{}')
returns jsonb language sql security invoker set search_path=''
as $$ select private.marriage_editor(p_token,p_action,p_target,p_payload); $$;
revoke all on function public.dashboard_marriage_editor(text,text,text,jsonb) from public;
grant execute on function public.dashboard_marriage_editor(text,text,text,jsonb) to anon,authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_marriage_youth_save(p_editor_did text, p_jamaah_did text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  sc record;
  v_j public.jamaah_desa%rowtype;
  v_id bigint;
  v_foto text;
begin
  perform private.marriage_assert_actor(p_editor_did);
  select * into sc from private.dk_youth_editor_scope(p_editor_did);
  if not coalesce(sc.ok,false) then return jsonb_build_object('ok',false,'error','Akses ditolak'); end if;
  select * into v_j from public.jamaah_desa where did=p_jamaah_did;
  if not found then return jsonb_build_object('ok',false,'error','Jamaah tidak ditemukan'); end if;
  if not (sc.is_desa or v_j.kelompok_nama=any(sc.kelompok)) then return jsonb_build_object('ok',false,'error','Di luar lingkup akses'); end if;
  if not (v_j.status_nikah='Belum Menikah' and v_j.kelas_usia='Dewasa' and coalesce(v_j.status_sambung,'Tetap')='Tetap') then
    return jsonb_build_object('ok',false,'error','Jamaah tidak lagi termasuk kategori Dewasa Belum Menikah');
  end if;

  if p_payload ? 'foto_data' then
    v_foto:=nullif(p_payload->>'foto_data','');
    if v_foto is not null and length(v_foto)>600000 then
      return jsonb_build_object('ok',false,'error','Ukuran foto terlalu besar');
    end if;
  end if;

  insert into private.ubnb_biodata_nikah(
    jamaah_did,foto_data,nama_orang_tua,tempat_lahir,suku,anak_ke,jumlah_saudara,
    tinggi_badan,berat_badan,status_biodata,pekerjaan,pendidikan_terakhir,dapukan,
    kelompok_sambung,desa_sambung,daerah_sambung,hobby,kriteria,hub_tim,catatan_internal,
    is_publish,created_by,updated_by
  ) values(
    p_jamaah_did,
    case when p_payload ? 'foto_data' then v_foto else null end,
    nullif(trim(p_payload->>'nama_orang_tua'),''),
    nullif(trim(p_payload->>'tempat_lahir'),''),
    nullif(trim(p_payload->>'suku'),''),
    nullif(p_payload->>'anak_ke','')::integer,
    nullif(p_payload->>'jumlah_saudara','')::integer,
    nullif(p_payload->>'tinggi_badan','')::numeric,
    nullif(p_payload->>'berat_badan','')::numeric,
    nullif(trim(p_payload->>'status_biodata'),''),
    nullif(trim(p_payload->>'pekerjaan'),''),
    nullif(trim(p_payload->>'pendidikan_terakhir'),''),
    nullif(trim(p_payload->>'dapukan'),''),
    nullif(trim(p_payload->>'kelompok_sambung'),''),
    coalesce(nullif(trim(p_payload->>'desa_sambung'),''),'Desa Perwira'),
    nullif(trim(p_payload->>'daerah_sambung'),''),
    nullif(trim(p_payload->>'hobby'),''),
    nullif(trim(p_payload->>'kriteria'),''),
    nullif(trim(p_payload->>'hub_tim'),''),
    nullif(trim(p_payload->>'catatan_internal'),''),
    coalesce((p_payload->>'is_publish')::boolean,false),
    p_editor_did,p_editor_did
  )
  on conflict (jamaah_did) do update set
    foto_data=case when p_payload ? 'foto_data' then excluded.foto_data else private.ubnb_biodata_nikah.foto_data end,
    nama_orang_tua=excluded.nama_orang_tua,
    tempat_lahir=excluded.tempat_lahir,
    suku=excluded.suku,
    anak_ke=excluded.anak_ke,
    jumlah_saudara=excluded.jumlah_saudara,
    tinggi_badan=excluded.tinggi_badan,
    berat_badan=excluded.berat_badan,
    status_biodata=excluded.status_biodata,
    pekerjaan=excluded.pekerjaan,
    pendidikan_terakhir=excluded.pendidikan_terakhir,
    dapukan=excluded.dapukan,
    kelompok_sambung=excluded.kelompok_sambung,
    desa_sambung=excluded.desa_sambung,
    daerah_sambung=excluded.daerah_sambung,
    hobby=excluded.hobby,
    kriteria=excluded.kriteria,
    hub_tim=excluded.hub_tim,
    catatan_internal=excluded.catatan_internal,
    is_publish=excluded.is_publish,
    updated_by=p_editor_did,
    updated_at=now()
  returning id into v_id;

  return jsonb_build_object('ok',true,'id',v_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_marriage_youth_profile(p_editor_did text, p_jamaah_did text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  sc record;
  v_scope_ok boolean:=false;
  v_j public.jamaah_desa%rowtype;
  v_b private.ubnb_biodata_nikah%rowtype;
  v_dapukan text;
  v_team jsonb:='[]'::jsonb;
begin
  select * into sc from private.dk_youth_editor_scope(p_editor_did);
  if not coalesce(sc.ok,false) then return jsonb_build_object('ok',false,'error','Akses ditolak'); end if;

  select * into v_j from public.jamaah_desa where did=p_jamaah_did;
  if not found then return jsonb_build_object('ok',false,'error','Jamaah tidak ditemukan'); end if;
  v_scope_ok:=sc.is_desa or v_j.kelompok_nama=any(sc.kelompok);
  if not v_scope_ok then return jsonb_build_object('ok',false,'error','Di luar lingkup akses'); end if;
  if not (v_j.status_nikah='Belum Menikah' and v_j.kelas_usia='Dewasa' and coalesce(v_j.status_sambung,'Tetap')='Tetap') then
    return jsonb_build_object('ok',false,'error','Jamaah tidak lagi termasuk kategori Dewasa Belum Menikah');
  end if;

  select * into v_b from private.ubnb_biodata_nikah where jamaah_did=p_jamaah_did and deleted_at is null;
  select string_agg(distinct p.dapukan,', ' order by p.dapukan) into v_dapukan
  from public.ubnb_pengurus p where p.did=p_jamaah_did and p.aktif=true;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.scope_rank,t.urutan,t.nama),'[]'::jsonb)
  into v_team
  from (
    select
      p.did,
      coalesce(j.nama,p.did) as nama,
      case
        when p.level='desa' and lower(coalesce(p.dapukan,'')) like '%pnkb%' then 'Tim PNKB Desa'
        else p.dapukan
      end as dapukan,
      p.level,
      p.kelompok_nama,
      j.nomor_wa,
      coalesce(p.urutan,999) as urutan,
      case when p.level='kelompok' then 1 else 2 end as scope_rank
    from public.ubnb_pengurus p
    left join public.jamaah_desa j on j.did=p.did
    where p.aktif=true
      and (
        (p.level='kelompok'
          and p.kelompok_nama=v_j.kelompok_nama
          and lower(coalesce(p.dapukan,'')) like '%pkw%')
        or
        (p.level='desa'
          and (
            lower(coalesce(p.dapukan,'')) like '%pkw%'
            or lower(coalesce(p.dapukan,'')) like '%pnkb%'
          ))
      )
  ) t;

  return jsonb_build_object('ok',true,'data',
    jsonb_build_object(
      'did',v_j.did,'nama',v_j.nama,'nama_kk',v_j.nama_kk,'kelompok_nama',v_j.kelompok_nama,
      'jenis_kelamin',v_j.jenis_kelamin,'tgl_lahir',v_j.tgl_lahir,
      'umur',case when v_j.tgl_lahir is null then null else date_part('year',age(current_date,v_j.tgl_lahir))::int end,
      'nomor_wa',v_j.nomor_wa,'alamat',v_j.alamat,
      'profile_id',v_b.id,'foto_data',v_b.foto_data,
      'nama_orang_tua',coalesce(v_b.nama_orang_tua,v_j.nama_kk),
      'tempat_lahir',v_b.tempat_lahir,'suku',v_b.suku,
      'anak_ke',v_b.anak_ke,'jumlah_saudara',v_b.jumlah_saudara,
      'tinggi_badan',v_b.tinggi_badan,'berat_badan',v_b.berat_badan,
      'status_biodata',coalesce(v_b.status_biodata,case when lower(coalesce(v_j.jenis_kelamin,'')) like 'laki%' then 'Jejaka' else 'Perawan' end),
      'pekerjaan',v_b.pekerjaan,'pendidikan_terakhir',v_b.pendidikan_terakhir,
      'dapukan',coalesce(v_b.dapukan,v_dapukan),
      'kelompok_sambung',coalesce(v_b.kelompok_sambung,v_j.kelompok_nama),
      'desa_sambung',coalesce(v_b.desa_sambung,'Desa Perwira'),
      'daerah_sambung',coalesce(v_b.daerah_sambung,'Bekasi Timur'),
      'hobby',v_b.hobby,'kriteria',v_b.kriteria,'hub_tim',v_b.hub_tim,
      'catatan_internal',v_b.catatan_internal,'is_publish',coalesce(v_b.is_publish,false),
      'created_at',v_b.created_at,'updated_at',v_b.updated_at,
      'team_pkw',v_team
    )
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_marriage_youth_list(p_editor_did text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  sc record;
begin
  select * into sc from private.dk_youth_editor_scope(p_editor_did);
  if not coalesce(sc.ok,false) then
    return jsonb_build_object('ok',false,'error','Akses ditolak');
  end if;

  return jsonb_build_object(
    'ok',true,
    'data',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.kelompok_nama,x.jenis_kelamin,x.nama)
      from (
        select
          j.did,j.nama,j.nama_kk,
          coalesce(nullif(b.nama_orang_tua,''),j.nama_kk) as bin_binti,
          j.kelompok_nama,j.jenis_kelamin,j.tgl_lahir,
          date_part('year',age(current_date,j.tgl_lahir))::int as umur,
          j.status_nikah,j.status_sambung,j.nomor_wa,j.alamat,
          b.id as profile_id,
          (b.foto_data is not null and length(b.foto_data)>20) as has_photo,
          b.pekerjaan,b.pendidikan_terakhir,b.dapukan,b.hub_tim,b.is_publish,
          b.updated_at,
          case when b.id is null then 'Belum dibuat'
               when b.is_publish then 'Siap dibagikan'
               else 'Draft' end as profile_status
        from public.jamaah_desa j
        left join private.ubnb_biodata_nikah b on b.jamaah_did=j.did and b.deleted_at is null
        where j.status_nikah='Belum Menikah'
          and j.kelas_usia='Dewasa'
          and coalesce(j.status_sambung,'Tetap')='Tetap'
          and (sc.is_desa or j.kelompok_nama=any(sc.kelompok))
      ) x
    ),'[]'::jsonb)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.dk_pengurus_module_access(p_did text, p_module text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(
    select 1
    from public.ubnb_pengurus p
    where p.did=p_did
      and p.aktif=true
      and (
        (
          lower(coalesce(p_module,'')) in ('invitation','calendar')
          and (
            lower(coalesce(p.dapukan,'')) like '%penerobos%'
            or lower(coalesce(p.dapukan,'')) ~ '(^|[^a-z0-9])mt([ .]|$)'
            or lower(coalesce(p.dapukan,'')) ~ '(^|[^a-z])ki([^a-z]|$)'
          )
        )
        or
        (
          lower(coalesce(p_module,''))='marriage'
          and (
            lower(coalesce(p.dapukan,'')) ~ '(^|[^a-z0-9])mt([ .]|$)'
            or lower(coalesce(p.dapukan,'')) like '%pnkb%'
            or lower(coalesce(p.dapukan,'')) like '%pkw%'
            or lower(coalesce(p.dapukan,'')) like '%penerobos%'
            or lower(coalesce(p.dapukan,'')) ~ '(^|[^a-z])ki([^a-z]|$)'
          )
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_marriage_process_legacy(p_editor_did text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_profile jsonb;
  v_scope text;
  v_editor_name text;
  v_mode text;
  v_date date;
  v_note text;
  v_final_group text;
  v_group_code text;
  v_legacy_group text;

  a public.jamaah_desa%rowtype;
  b public.jamaah_desa%rowtype;
  h public.jamaah_desa%rowtype;

  v_a_did text;
  v_b_did text;
  v_head_did text;
  v_family_id bigint;
  v_moved_did text;

  v_ext_name text;
  v_ext_gender text;
  v_ext_origin text;
  v_ext_destination text;
  v_ext_dob date;
  v_ext_wa text;
  v_ext_address text;
  v_ext_did text;
  v_kk_choice text;

  v_before jsonb;
  v_after jsonb;
  v_event_id bigint;
  v_other_count integer;
begin
  perform private.marriage_assert_actor(p_editor_did);
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception 'Data proses pernikahan tidak valid';
  end if;

  v_profile := public.dashboard_pengurus_profile(p_editor_did);
  if coalesce((v_profile->>'ok')::boolean,false) is not true then
    raise exception '%',coalesce(v_profile->>'error','Akses pengurus tidak aktif');
  end if;
  if not private.dk_pengurus_module_access(p_editor_did,'marriage') then
    raise exception 'Akses modul Pernikahan tidak diberikan untuk dapukan ini';
  end if;
  v_scope := v_profile->>'scope';
  v_editor_name := v_profile->>'nama';

  v_mode := nullif(btrim(p_payload->>'mode'),'');
  if v_mode not in ('internal','external_in','external_out') then
    raise exception 'Jenis proses pernikahan tidak valid';
  end if;

  v_date := nullif(p_payload->>'tanggal_nikah','')::date;
  if v_date is null then raise exception 'Tanggal nikah wajib diisi'; end if;
  v_note := nullif(btrim(p_payload->>'catatan'),'');
  v_a_did := nullif(btrim(p_payload->>'person1_did'),'');
  if v_a_did is null then raise exception 'Jamaah Perwira wajib dipilih'; end if;

  select * into a
  from public.jamaah_desa
  where did=v_a_did
  for update;
  if not found then raise exception 'Jamaah Perwira tidak ditemukan'; end if;
  if a.kelompok_nama not in ('PW1','PW2','PW3','PW4') then
    raise exception 'Jamaah bukan anggota kelompok Desa Perwira';
  end if;
  if a.status_sambung='Meninggal Dunia' then
    raise exception 'Data meninggal tidak dapat diproses sebagai pernikahan';
  end if;

  perform set_config('ubnb.marriage_flow','1',true);

  if v_mode='internal' then
    v_b_did := nullif(btrim(p_payload->>'person2_did'),'');
    if v_b_did is null or v_b_did=v_a_did then raise exception 'Pilih pasangan jamaah yang berbeda'; end if;

    select * into b
    from public.jamaah_desa
    where did=v_b_did
    for update;
    if not found then raise exception 'Pasangan jamaah tidak ditemukan'; end if;
    if b.kelompok_nama not in ('PW1','PW2','PW3','PW4') then
      raise exception 'Pasangan bukan anggota kelompok Desa Perwira';
    end if;
    if b.status_sambung='Meninggal Dunia' then
      raise exception 'Data meninggal tidak dapat diproses sebagai pernikahan';
    end if;

    v_final_group := nullif(btrim(p_payload->>'final_group'),'');
    if v_final_group not in ('PW1','PW2','PW3','PW4') then
      raise exception 'Kelompok setelah menikah wajib dipilih';
    end if;
    if v_final_group not in (a.kelompok_nama,b.kelompok_nama) then
      raise exception 'Untuk sesama Perwira, kelompok akhir harus mengikuti salah satu kelompok pasangan';
    end if;

    if v_scope<>'Desa'
       and v_scope is distinct from a.kelompok_nama
       and v_scope is distinct from b.kelompok_nama
       and v_scope is distinct from v_final_group then
      raise exception 'Proses di luar scope pengurus';
    end if;

    v_head_did := nullif(btrim(p_payload->>'kk_did'),'');
    if v_head_did not in (v_a_did,v_b_did) then
      raise exception 'KK setelah menikah harus salah satu pasangan';
    end if;

    v_group_code := case v_final_group when 'PW1' then '1' when 'PW2' then '2' when 'PW3' then '3' when 'PW4' then '4' end;
    v_legacy_group := case v_final_group when 'PW1' then 'Perwirasari' when 'PW2' then 'Alinda' when 'PW3' then 'Bulak Perwira' when 'PW4' then 'VIP' end;

    v_before := jsonb_build_object('jamaah_1',to_jsonb(a),'jamaah_2',to_jsonb(b));

    if v_head_did=v_a_did then
      h:=a;
    else
      h:=b;
    end if;

    update public.jamaah_desa
    set status_nikah='Menikah',
        status_sambung='Tetap',
        kelompok_nama=v_final_group,
        kelompok=v_group_code,
        nama_kk=h.nama
    where did=v_head_did;

    v_family_id := private.ensure_jamaah_family_head(v_head_did);

    update public.jamaah_desa
    set status_nikah='Menikah',
        status_sambung='Tetap',
        kelompok_nama=v_final_group,
        kelompok=v_group_code,
        nama_kk=h.nama,
        keluarga_id=v_family_id
    where did in (v_a_did,v_b_did);

    if a.kelompok_nama<>v_final_group then v_moved_did:=a.did;
    elsif b.kelompok_nama<>v_final_group then v_moved_did:=b.did;
    else v_moved_did:=null;
    end if;

    select jsonb_build_object(
      'jamaah_1',to_jsonb(xa),
      'jamaah_2',to_jsonb(xb)
    ) into v_after
    from public.jamaah_desa xa, public.jamaah_desa xb
    where xa.did=v_a_did and xb.did=v_b_did;

    insert into private.jamaah_marriage_event(
      tanggal_nikah,jenis_proses,
      jamaah_1_did,jamaah_1_nama,jamaah_1_jk,asal_kelompok_1,
      jamaah_2_did,jamaah_2_nama,jamaah_2_jk,asal_kelompok_2,
      pasangan_external,kelompok_akhir,kk_did,kk_nama,
      moved_did,moved_direction,catatan,snapshot_before,snapshot_after,
      created_by_did,created_by_name
    ) values (
      v_date,'internal_perwira',
      a.did,a.nama,a.jenis_kelamin,a.kelompok_nama,
      b.did,b.nama,b.jenis_kelamin,b.kelompok_nama,
      false,v_final_group,v_head_did,h.nama,
      v_moved_did,case when v_moved_did is null then null else 'internal' end,
      v_note,v_before,v_after,p_editor_did,v_editor_name
    ) returning id into v_event_id;

  elsif v_mode='external_in' then
    v_final_group := nullif(btrim(p_payload->>'final_group'),'');
    if v_final_group not in ('PW1','PW2','PW3','PW4') then
      raise exception 'Kelompok tujuan wajib dipilih';
    end if;
    if v_scope<>'Desa' and v_scope<>v_final_group and v_scope<>a.kelompok_nama then
      raise exception 'Proses di luar scope pengurus';
    end if;

    v_ext_name := nullif(btrim(p_payload->>'external_name'),'');
    v_ext_gender := nullif(btrim(p_payload->>'external_gender'),'');
    v_ext_origin := nullif(btrim(p_payload->>'external_origin'),'');
    v_ext_dob := nullif(p_payload->>'external_tgl_lahir','')::date;
    v_ext_wa := nullif(btrim(p_payload->>'external_nomor_wa'),'');
    v_ext_address := nullif(btrim(p_payload->>'external_address'),'');
    v_kk_choice := nullif(btrim(p_payload->>'kk_choice'),'');

    if v_ext_name is null then raise exception 'Nama pasangan dari luar Desa wajib diisi'; end if;
    if v_ext_gender not in ('Laki-laki','Perempuan') then raise exception 'Jenis kelamin pasangan luar wajib dipilih'; end if;
    if v_ext_origin is null then raise exception 'Asal Desa pasangan luar wajib diisi'; end if;
    if v_kk_choice not in ('local','external') then raise exception 'Pilih siapa yang menjadi KK'; end if;

    v_group_code := case v_final_group when 'PW1' then '1' when 'PW2' then '2' when 'PW3' then '3' when 'PW4' then '4' end;
    v_legacy_group := case v_final_group when 'PW1' then 'Perwirasari' when 'PW2' then 'Alinda' when 'PW3' then 'Bulak Perwira' when 'PW4' then 'VIP' end;
    v_before := jsonb_build_object('jamaah_perwira',to_jsonb(a),'pasangan_external',jsonb_build_object(
      'nama',v_ext_name,'jenis_kelamin',v_ext_gender,'asal_desa',v_ext_origin
    ));

    loop
      v_ext_did := 'JD'||floor(extract(epoch from clock_timestamp())*1000)::bigint::text||
                   lpad((floor(random()*1000))::int::text,3,'0');
      exit when not exists(select 1 from public.jamaah_desa where did=v_ext_did);
    end loop;

    if v_kk_choice='local' then
      update public.jamaah_desa
      set status_nikah='Menikah',
          status_sambung='Tetap',
          kelompok_nama=v_final_group,
          kelompok=v_group_code,
          nama_kk=a.nama
      where did=a.did;

      v_family_id := private.ensure_jamaah_family_head(a.did);

      insert into public.jamaah_desa(
        did,nama,nama_kk,kelompok,kelompok_nama,alamat,jenis_kelamin,tgl_lahir,
        status_nikah,status_sambung,nomor_wa,keluarga_id
      ) values (
        v_ext_did,v_ext_name,a.nama,v_group_code,v_final_group,
        coalesce(v_ext_address,a.alamat),v_ext_gender,v_ext_dob,
        'Menikah','Tetap',v_ext_wa,v_family_id
      );
      v_head_did:=a.did;
      h:=a;
    else
      insert into public.jamaah_desa(
        did,nama,nama_kk,kelompok,kelompok_nama,alamat,jenis_kelamin,tgl_lahir,
        status_nikah,status_sambung,nomor_wa
      ) values (
        v_ext_did,v_ext_name,v_ext_name,v_group_code,v_final_group,
        coalesce(v_ext_address,a.alamat),v_ext_gender,v_ext_dob,
        'Menikah','Tetap',v_ext_wa
      );

      v_family_id := private.ensure_jamaah_family_head(v_ext_did);

      update public.jamaah_desa
      set status_nikah='Menikah',
          status_sambung='Tetap',
          kelompok_nama=v_final_group,
          kelompok=v_group_code,
          nama_kk=v_ext_name,
          keluarga_id=v_family_id
      where did=a.did;
      v_head_did:=v_ext_did;
    end if;

    select * into b from public.jamaah_desa where did=v_ext_did;
    select * into h from public.jamaah_desa where did=v_head_did;

    select jsonb_build_object(
      'jamaah_perwira',to_jsonb(xa),
      'pasangan_masuk',to_jsonb(xb)
    ) into v_after
    from public.jamaah_desa xa,public.jamaah_desa xb
    where xa.did=a.did and xb.did=v_ext_did;

    insert into private.jamaah_marriage_event(
      tanggal_nikah,jenis_proses,
      jamaah_1_did,jamaah_1_nama,jamaah_1_jk,asal_kelompok_1,
      jamaah_2_did,jamaah_2_nama,jamaah_2_jk,asal_kelompok_2,
      pasangan_external,asal_desa_external,kelompok_akhir,kk_did,kk_nama,
      moved_did,moved_direction,catatan,snapshot_before,snapshot_after,
      created_by_did,created_by_name
    ) values (
      v_date,'external_in',
      a.did,a.nama,a.jenis_kelamin,a.kelompok_nama,
      v_ext_did,v_ext_name,v_ext_gender,null,
      true,v_ext_origin,v_final_group,v_head_did,h.nama,
      v_ext_did,'masuk',v_note,v_before,v_after,p_editor_did,v_editor_name
    ) returning id into v_event_id;

  else
    if v_scope<>'Desa' and v_scope<>a.kelompok_nama then
      raise exception 'Proses di luar scope pengurus';
    end if;

    v_ext_name := nullif(btrim(p_payload->>'external_name'),'');
    v_ext_gender := nullif(btrim(p_payload->>'external_gender'),'');
    v_ext_destination := nullif(btrim(p_payload->>'external_destination'),'');
    v_kk_choice := nullif(btrim(p_payload->>'kk_choice'),'');

    if v_ext_name is null then raise exception 'Nama pasangan dari luar Desa wajib diisi'; end if;
    if v_ext_gender not in ('Laki-laki','Perempuan') then raise exception 'Jenis kelamin pasangan luar wajib dipilih'; end if;
    if v_ext_destination is null then raise exception 'Desa tujuan pindah sambung wajib diisi'; end if;
    if v_kk_choice not in ('local','external') then raise exception 'Pilih posisi KK setelah menikah'; end if;

    if a.keluarga_id is not null and exists(
      select 1 from public.keluarga k where k.id=a.keluarga_id and k.jamaah_did=a.did
    ) then
      select count(*) into v_other_count
      from public.jamaah_desa j
      where j.keluarga_id=a.keluarga_id and j.did<>a.did and coalesce(j.status_sambung,'Tetap')<>'Pindah Sambung';
      if v_other_count>0 then
        raise exception 'Jamaah ini masih menjadi KK bagi % anggota aktif. Perlu review keluarga sebelum pindah keluar.',v_other_count;
      end if;
    end if;

    v_before := jsonb_build_object('jamaah_perwira',to_jsonb(a),'pasangan_external',jsonb_build_object(
      'nama',v_ext_name,'jenis_kelamin',v_ext_gender,'tujuan_desa',v_ext_destination
    ));

    update public.jamaah_desa
    set status_nikah='Menikah',
        status_sambung='Pindah Sambung',
        nama_kk=case when v_kk_choice='local' then a.nama else v_ext_name end,
        keluarga_id=null
    where did=a.did;

    select to_jsonb(x) into v_after from public.jamaah_desa x where did=a.did;

    insert into private.jamaah_marriage_event(
      tanggal_nikah,jenis_proses,
      jamaah_1_did,jamaah_1_nama,jamaah_1_jk,asal_kelompok_1,
      jamaah_2_did,jamaah_2_nama,jamaah_2_jk,asal_kelompok_2,
      pasangan_external,tujuan_desa_external,kelompok_akhir,kk_did,kk_nama,
      moved_did,moved_direction,catatan,snapshot_before,snapshot_after,
      created_by_did,created_by_name
    ) values (
      v_date,'external_out',
      a.did,a.nama,a.jenis_kelamin,a.kelompok_nama,
      null,v_ext_name,v_ext_gender,null,
      true,v_ext_destination,null,
      case when v_kk_choice='local' then a.did else null end,
      case when v_kk_choice='local' then a.nama else v_ext_name end,
      a.did,'keluar',v_note,v_before,
      jsonb_build_object('jamaah_perwira',v_after,'pasangan_external',jsonb_build_object('nama',v_ext_name,'jenis_kelamin',v_ext_gender,'tujuan_desa',v_ext_destination)),
      p_editor_did,v_editor_name
    ) returning id into v_event_id;
  end if;

  return jsonb_build_object('ok',true,'event_id',v_event_id,'mode',v_mode);
end;
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_marriage_summary(p_editor_did text, p_year integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_profile jsonb;
  v_scope text;
  v_stats jsonb;
  v_events jsonb;
begin
  v_profile := public.dashboard_pengurus_profile(p_editor_did);
  if coalesce((v_profile->>'ok')::boolean,false) is not true then
    raise exception '%',coalesce(v_profile->>'error','Akses pengurus tidak aktif');
  end if;
  if not private.dk_pengurus_module_access(p_editor_did,'marriage') then
    raise exception 'Akses modul Pernikahan tidak diberikan untuk dapukan ini';
  end if;
  v_scope:=v_profile->>'scope';

  select jsonb_build_object(
    'total',count(*),
    'internal',count(*) filter(where e.jenis_proses='internal_perwira'),
    'incoming',count(*) filter(where e.jenis_proses='external_in'),
    'outgoing',count(*) filter(where e.jenis_proses='external_out'),
    'pindah_internal',count(*) filter(where e.moved_direction='internal')
  )
  into v_stats
  from private.jamaah_marriage_event e
  where e.deleted_at is null and (p_year is null or extract(year from e.tanggal_nikah)::int=p_year)
    and (
      v_scope='Desa'
      or v_scope=e.asal_kelompok_1
      or v_scope=e.asal_kelompok_2
      or v_scope=e.kelompok_akhir
    );

  select coalesce(jsonb_agg(to_jsonb(x) order by x.tanggal_nikah desc,x.id desc),'[]'::jsonb)
  into v_events
  from (
    select
      e.id,e.tanggal_nikah,e.jenis_proses,
      e.jamaah_1_did,e.jamaah_1_nama,e.jamaah_1_jk,e.asal_kelompok_1,
      e.jamaah_2_did,e.jamaah_2_nama,e.jamaah_2_jk,e.asal_kelompok_2,
      e.pasangan_external,e.asal_desa_external,e.tujuan_desa_external,
      e.kelompok_akhir,e.kk_did,e.kk_nama,e.moved_did,e.moved_direction,
      e.catatan,e.created_by_name,e.created_at
    from private.jamaah_marriage_event e
    where e.deleted_at is null and (p_year is null or extract(year from e.tanggal_nikah)::int=p_year)
      and (
        v_scope='Desa'
        or v_scope=e.asal_kelompok_1
        or v_scope=e.asal_kelompok_2
        or v_scope=e.kelompok_akhir
      )
    order by e.tanggal_nikah desc,e.id desc
  ) x;

  return jsonb_build_object('ok',true,'scope',v_scope,'year',p_year,'stats',v_stats,'events',v_events);
end;
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_marriage_process(p_editor_did text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_mode text;
  v_profile jsonb;
  v_scope text;
  v_editor_name text;
  v_date date;
  v_note text;
  v_a_did text;
  v_ext_name text;
  v_ext_gender text;
  v_ext_destination text;
  v_before jsonb;
  v_after jsonb;
  v_event_id bigint;
  a public.jamaah_desa%rowtype;
begin
  perform private.marriage_assert_actor(p_editor_did);
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception 'Data proses pernikahan tidak valid';
  end if;

  v_mode := nullif(btrim(p_payload->>'mode'),'');
  if v_mode is distinct from 'external_out' then
    return public.dashboard_marriage_process_legacy(p_editor_did,p_payload);
  end if;

  v_profile := public.dashboard_pengurus_profile(p_editor_did);
  if coalesce((v_profile->>'ok')::boolean,false) is not true then
    raise exception '%',coalesce(v_profile->>'error','Akses pengurus tidak aktif');
  end if;
  if not private.dk_pengurus_module_access(p_editor_did,'marriage') then
    raise exception 'Akses modul Pernikahan tidak diberikan untuk dapukan ini';
  end if;
  v_scope := v_profile->>'scope';
  v_editor_name := v_profile->>'nama';

  v_date := nullif(p_payload->>'tanggal_nikah','')::date;
  if v_date is null then raise exception 'Tanggal nikah wajib diisi'; end if;

  v_note := nullif(btrim(p_payload->>'catatan'),'');
  v_a_did := nullif(btrim(p_payload->>'person1_did'),'');
  if v_a_did is null then raise exception 'Jamaah Perwira wajib dipilih'; end if;

  select * into a
  from public.jamaah_desa
  where did=v_a_did
  for update;

  if not found then raise exception 'Jamaah Perwira tidak ditemukan'; end if;
  if a.kelompok_nama not in ('PW1','PW2','PW3','PW4') then
    raise exception 'Jamaah bukan anggota kelompok Desa Perwira';
  end if;
  if a.status_sambung='Meninggal Dunia' then
    raise exception 'Data meninggal tidak dapat diproses';
  end if;
  if v_scope<>'Desa' and v_scope<>a.kelompok_nama then
    raise exception 'Proses di luar scope pengurus';
  end if;

  v_ext_name := nullif(btrim(p_payload->>'external_name'),'');
  v_ext_gender := nullif(btrim(p_payload->>'external_gender'),'');
  if v_ext_gender is not null and v_ext_gender not in ('Laki-laki','Perempuan') then
    raise exception 'Jenis kelamin pasangan tidak valid';
  end if;
  v_ext_destination := nullif(btrim(p_payload->>'external_destination'),'');
  if v_ext_destination is null then
    raise exception 'Desa tujuan pindah sambung wajib diisi';
  end if;

  v_before := jsonb_build_object(
    'jamaah_perwira',to_jsonb(a),
    'pasangan_external',jsonb_build_object(
      'nama',v_ext_name,
      'jenis_kelamin',v_ext_gender,
      'tujuan_desa',v_ext_destination
    )
  );

  update public.jamaah_desa
  set status_sambung='Pindah Sambung'
  where did=a.did;

  select to_jsonb(x) into v_after
  from public.jamaah_desa x
  where x.did=a.did;

  insert into private.jamaah_marriage_event(
    tanggal_nikah,jenis_proses,
    jamaah_1_did,jamaah_1_nama,jamaah_1_jk,asal_kelompok_1,
    jamaah_2_did,jamaah_2_nama,jamaah_2_jk,asal_kelompok_2,
    pasangan_external,tujuan_desa_external,kelompok_akhir,kk_did,kk_nama,
    moved_did,moved_direction,catatan,snapshot_before,snapshot_after,
    created_by_did,created_by_name
  ) values (
    v_date,'external_out',
    a.did,a.nama,a.jenis_kelamin,a.kelompok_nama,
    null,v_ext_name,v_ext_gender,null,
    true,v_ext_destination,null,null,null,
    a.did,'keluar',v_note,v_before,
    jsonb_build_object(
      'jamaah_perwira',v_after,
      'pasangan_external',jsonb_build_object(
        'nama',v_ext_name,
        'jenis_kelamin',v_ext_gender,
        'tujuan_desa',v_ext_destination
      )
    ),
    p_editor_did,v_editor_name
  )
  returning id into v_event_id;

  return jsonb_build_object('ok',true,'event_id',v_event_id,'mode',v_mode);
end;
$function$;

notify pgrst,'reload schema';