-- Profil dan arsip laporan penerobosan umum, terpisah dari sensus bulanan yang sudah berjalan.
create table if not exists public.ubnb_penerobosan_profil (
  scope_key text primary key check (scope_key in ('DESA','PW1','PW2','PW3','PW4')),
  rincian jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);
create table if not exists public.ubnb_penerobosan_laporan (
  id bigint generated always as identity primary key,
  scope_key text not null check (scope_key in ('DESA','PW1','PW2','PW3','PW4')),
  periode text not null check (periode ~ '^[0-9]{4}-([0][1-9]|1[0-2])$'),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  created_by text not null,
  unique (scope_key,periode)
);
alter table public.ubnb_penerobosan_profil enable row level security;
alter table public.ubnb_penerobosan_laporan enable row level security;
create policy penerobosan_profil_read on public.ubnb_penerobosan_profil for select to anon, authenticated using (true);
create policy penerobosan_laporan_read on public.ubnb_penerobosan_laporan for select to anon, authenticated using (true);
grant select on public.ubnb_penerobosan_profil, public.ubnb_penerobosan_laporan to anon, authenticated;

create or replace function public.dashboard_penerobosan_save(
  p_token text, p_scope text, p_rincian jsonb
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare s record; v_scope text := upper(trim(coalesce(p_scope,'')));
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then return jsonb_build_object('ok',false,'error','Sesi pengurus tidak valid. Masuk kembali.'); end if;
  if s.role not in ('pemilik','pengurus_desa','pengurus_kelompok') then
    return jsonb_build_object('ok',false,'error','Akses tulis ditolak');
  end if;
  if v_scope not in ('DESA','PW1','PW2','PW3','PW4') then
    return jsonb_build_object('ok',false,'error','Cakupan tidak dikenal');
  end if;
  if v_scope='DESA' and s.kelompok_scope is not null or
     v_scope<>'DESA' and s.kelompok_scope is not null and s.kelompok_scope<>v_scope then
    return jsonb_build_object('ok',false,'error','Di luar akses kelompok');
  end if;
  if jsonb_typeof(p_rincian) <> 'object' or pg_column_size(p_rincian)>30000 then
    return jsonb_build_object('ok',false,'error','Format profil tidak valid');
  end if;
  insert into public.ubnb_penerobosan_profil(scope_key,rincian,updated_by)
  values(v_scope,p_rincian,s.username)
  on conflict(scope_key) do update set rincian=excluded.rincian,updated_by=excluded.updated_by,updated_at=now();
  return jsonb_build_object('ok',true);
end $fn$;

create or replace function public.dashboard_penerobosan_archive(
  p_token text, p_scope text, p_periode text, p_snapshot jsonb
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare s record; v_scope text := upper(trim(coalesce(p_scope,''))); v_id bigint;
begin
  select * into s from private.dk_attendance_session_row(p_token);
  if not found then return jsonb_build_object('ok',false,'error','Sesi pengurus tidak valid. Masuk kembali.'); end if;
  if s.role not in ('pemilik','pengurus_desa','pengurus_kelompok') then
    return jsonb_build_object('ok',false,'error','Akses tulis ditolak');
  end if;
  if v_scope not in ('DESA','PW1','PW2','PW3','PW4') or p_periode !~ '^[0-9]{4}-([0][1-9]|1[0-2])$' then
    return jsonb_build_object('ok',false,'error','Cakupan atau periode tidak valid');
  end if;
  if v_scope='DESA' and s.kelompok_scope is not null or
     v_scope<>'DESA' and s.kelompok_scope is not null and s.kelompok_scope<>v_scope then
    return jsonb_build_object('ok',false,'error','Di luar akses kelompok');
  end if;
  if jsonb_typeof(p_snapshot)<>'object' or pg_column_size(p_snapshot)>200000 then
    return jsonb_build_object('ok',false,'error','Laporan tidak valid');
  end if;
  insert into public.ubnb_penerobosan_laporan(scope_key,periode,snapshot,created_by)
  values(v_scope,p_periode,p_snapshot,s.username)
  on conflict(scope_key,periode) do update
    set snapshot=excluded.snapshot,created_by=excluded.created_by,created_at=now()
  returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id);
end $fn$;
grant execute on function public.dashboard_penerobosan_save(text,text,jsonb) to anon,authenticated;
grant execute on function public.dashboard_penerobosan_archive(text,text,text,jsonb) to anon,authenticated;
