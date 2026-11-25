-- Tinjauan duplikasi jamaah: data baru tetap aktif sampai admin utama memutuskan.
create table if not exists private.jamaah_duplicate_review (
  id bigint generated always as identity primary key,
  new_did text not null,
  existing_did text not null,
  score numeric(4,3) not null,
  status text not null default 'pending' check (status in ('pending','distinct','archived')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  note text,
  unique(new_did,existing_did),
  check(new_did<>existing_did)
);
create index if not exists jamaah_duplicate_review_pending on private.jamaah_duplicate_review(status,created_at desc);
create table if not exists private.jamaah_duplicate_archive (
  id bigint generated always as identity primary key,
  review_id bigint not null references private.jamaah_duplicate_review(id),
  did text not null unique,
  row_data jsonb not null,
  family_data jsonb,
  archived_at timestamptz not null default now(),
  archived_by text not null,
  reason text not null,
  restored_at timestamptz,
  restored_by text
);
revoke all on private.jamaah_duplicate_review,private.jamaah_duplicate_archive from public,anon,authenticated;

create or replace function private.jamaah_duplicate_detect() returns trigger
language plpgsql security definer set search_path to '' as $fn$
begin
  if new.kelompok_nama not in ('PW1','PW2','PW3','PW4') or length(btrim(new.nama))<8 then return new; end if;
  insert into private.jamaah_duplicate_review(new_did,existing_did,score)
  select new.did,j.did,extensions.similarity(lower(btrim(new.nama)),lower(btrim(j.nama)))
  from public.jamaah_desa j
  where j.did<>new.did and j.kelompok_nama=new.kelompok_nama
    and length(btrim(j.nama))>=8
    and extensions.similarity(lower(btrim(new.nama)),lower(btrim(j.nama)))>=0.72
  on conflict(new_did,existing_did) do nothing;
  return new;
end $fn$;
drop trigger if exists jamaah_duplicate_detect on public.jamaah_desa;
create trigger jamaah_duplicate_detect after insert or update of nama,kelompok_nama on public.jamaah_desa
for each row execute function private.jamaah_duplicate_detect();

-- Masukkan kandidat lama sebagai antrean pemeriksaan, tanpa mengubah jamaah.
insert into private.jamaah_duplicate_review(new_did,existing_did,score)
select a.did,b.did,extensions.similarity(lower(btrim(a.nama)),lower(btrim(b.nama)))
from public.jamaah_desa a join public.jamaah_desa b
  on a.did<>b.did and a.created_at>b.created_at and a.kelompok_nama=b.kelompok_nama
where a.kelompok_nama in ('PW1','PW2','PW3','PW4')
  and length(btrim(a.nama))>=8 and length(btrim(b.nama))>=8
  and extensions.similarity(lower(btrim(a.nama)),lower(btrim(b.nama)))>=0.72
on conflict(new_did,existing_did) do nothing;

create or replace function private.jamaah_review_admin(p_did text) returns void
language plpgsql security definer set search_path to '' as $fn$
declare a jsonb;
begin
  perform private.ubnb_assert_editor(p_did);
  a:=private.ubnb_secure_actor('staff');
  if not (p_did='4075' or a->>'role' in ('pemilik','admin')) then
    raise exception 'Tinjauan duplikasi hanya untuk admin utama' using errcode='42501';
  end if;
end $fn$;

create or replace function public.dashboard_jamaah_duplicate_reviews(p_editor_did text)
returns jsonb language plpgsql security definer set search_path to '' as $fn$
begin
  perform private.jamaah_review_admin(p_editor_did);
  return jsonb_build_object('ok',true,'items',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',r.id,'score',r.score,'created_at',r.created_at,'status',r.status,
      'new',jsonb_build_object('did',n.did,'nama',n.nama,'kelompok',n.kelompok_nama,'nama_kk',n.nama_kk,'tgl_lahir',n.tgl_lahir,'alamat',n.alamat,'status_sambung',n.status_sambung,'created_at',n.created_at),
      'existing',jsonb_build_object('did',o.did,'nama',o.nama,'kelompok',o.kelompok_nama,'nama_kk',o.nama_kk,'tgl_lahir',o.tgl_lahir,'alamat',o.alamat,'status_sambung',o.status_sambung,'created_at',o.created_at)
    ) order by r.score desc,r.created_at desc)
    from private.jamaah_duplicate_review r
    join public.jamaah_desa n on n.did=r.new_did
    join public.jamaah_desa o on o.did=r.existing_did
    where r.status='pending'
  ),'[]'::jsonb));
end $fn$;

create or replace function public.dashboard_jamaah_duplicate_resolve(p_editor_did text,p_review_id bigint,p_action text,p_note text default '')
returns jsonb language plpgsql security definer set search_path to '' as $fn$
declare r private.jamaah_duplicate_review%rowtype; v_row public.jamaah_desa%rowtype;
  v_family public.keluarga%rowtype; v_fk record; v_found boolean;
begin
  perform private.jamaah_review_admin(p_editor_did);
  select * into r from private.jamaah_duplicate_review where id=p_review_id for update;
  if not found or r.status<>'pending' then raise exception 'Tinjauan sudah selesai atau tidak ditemukan'; end if;
  if p_action='distinct' then
    update private.jamaah_duplicate_review set status='distinct',resolved_at=now(),resolved_by=p_editor_did,note=left(coalesce(p_note,''),500) where id=r.id;
    return jsonb_build_object('ok',true,'status','distinct');
  end if;
  if p_action<>'archive' then raise exception 'Tindakan tidak valid'; end if;
  if length(btrim(coalesce(p_note,'')))<8 then raise exception 'Alasan penghapusan minimal 8 karakter'; end if;
  select * into v_row from public.jamaah_desa where did=r.new_did for update;
  if not found then raise exception 'Data jamaah tidak ditemukan'; end if;
  -- Blokir SEMUA relasi, termasuk yang beraturan CASCADE atau SET NULL; jangan kehilangan riwayat.
  for v_fk in
    select c.conrelid::regclass as child,a.attname as column_name
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
    where c.contype='f' and c.confrelid='public.jamaah_desa'::regclass
      and pg_catalog.array_length(c.conkey,1)=1
  loop
    execute format('select exists(select 1 from %s where %I=$1)',v_fk.child,v_fk.column_name)
      into v_found using v_row.did;
    if v_found and v_fk.child='public.keluarga'::regclass then
      if exists(select 1 from public.keluarga k where k.jamaah_did=v_row.did
        and (select count(*) from public.jamaah_desa j where j.keluarga_id=k.id)>1) then
        raise exception 'Masih menjadi kepala keluarga bagi anggota lain';
      end if;
    elsif v_found then
      raise exception 'Tidak bisa dihapus: masih ada riwayat terkait pada %',v_fk.child;
    end if;
  end loop;
  select * into v_family from public.keluarga where id=v_row.keluarga_id and jamaah_did=v_row.did;
  if found and exists(select 1 from private.sensus_session where keluarga_id=v_family.id) then
    raise exception 'Tidak bisa dihapus: keluarga memiliki riwayat sensus';
  end if;
  insert into private.jamaah_duplicate_archive(review_id,did,row_data,family_data,archived_by,reason)
  values(r.id,v_row.did,to_jsonb(v_row),case when v_family.id is null then null else to_jsonb(v_family) end,p_editor_did,btrim(p_note));
  delete from public.jamaah_desa where did=v_row.did;
  if v_family.id is not null then delete from public.keluarga where id=v_family.id; end if;
  update private.jamaah_duplicate_review set status='archived',resolved_at=now(),resolved_by=p_editor_did,note=left(p_note,500)
    where new_did=v_row.did and status='pending';
  return jsonb_build_object('ok',true,'status','archived','did',v_row.did);
end $fn$;

create or replace function public.dashboard_jamaah_duplicate_restore(p_editor_did text,p_did text)
returns jsonb language plpgsql security definer set search_path to '' as $fn$
declare a private.jamaah_duplicate_archive%rowtype; v_family public.keluarga%rowtype;
begin
  perform private.jamaah_review_admin(p_editor_did);
  select * into a from private.jamaah_duplicate_archive where did=p_did and restored_at is null for update;
  if not found then raise exception 'Arsip tidak ditemukan'; end if;
  if exists(select 1 from public.jamaah_desa where did=p_did) then raise exception 'DID sudah dipakai'; end if;
  if a.family_data is not null then
    v_family:=jsonb_populate_record(null::public.keluarga,a.family_data);
    if exists(select 1 from public.keluarga where id=v_family.id) then raise exception 'ID keluarga sudah dipakai'; end if;
    insert into public.keluarga(id,nama_kk,jamaah_did,kelompok,kelompok_nama,nomor_wa,alamat,catatan,created_at)
    values(v_family.id,v_family.nama_kk,null,v_family.kelompok,v_family.kelompok_nama,v_family.nomor_wa,v_family.alamat,v_family.catatan,v_family.created_at);
  end if;
  insert into public.jamaah_desa select (jsonb_populate_record(null::public.jamaah_desa,a.row_data)).*;
  if a.family_data is not null then update public.keluarga set jamaah_did=p_did where id=v_family.id; end if;
  update private.jamaah_duplicate_archive set restored_at=now(),restored_by=p_editor_did where id=a.id;
  update private.jamaah_duplicate_review set status='distinct',resolved_at=now(),resolved_by=p_editor_did,note='Dipulihkan dari arsip' where id=a.review_id;
  return jsonb_build_object('ok',true,'did',p_did);
end $fn$;

create or replace function public.dashboard_jamaah_duplicate_archives(p_editor_did text)
returns jsonb language plpgsql security definer set search_path to '' as $fn$
begin
  perform private.jamaah_review_admin(p_editor_did);
  return jsonb_build_object('ok',true,'items',coalesce((select jsonb_agg(jsonb_build_object('did',did,'nama',row_data->>'nama','kelompok',row_data->>'kelompok_nama','archived_at',archived_at,'archived_by',archived_by,'reason',reason) order by archived_at desc)
    from private.jamaah_duplicate_archive where restored_at is null),'[]'::jsonb));
end $fn$;
revoke all on function public.dashboard_jamaah_duplicate_reviews(text),public.dashboard_jamaah_duplicate_resolve(text,bigint,text,text),public.dashboard_jamaah_duplicate_restore(text,text),public.dashboard_jamaah_duplicate_archives(text) from public;
grant execute on function public.dashboard_jamaah_duplicate_reviews(text),public.dashboard_jamaah_duplicate_resolve(text,bigint,text,text),public.dashboard_jamaah_duplicate_restore(text,text),public.dashboard_jamaah_duplicate_archives(text) to anon,authenticated;
