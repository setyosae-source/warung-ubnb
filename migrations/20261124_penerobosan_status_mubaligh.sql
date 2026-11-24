-- Rekap terbatas status muballigh sensus daerah untuk laporan penerobosan umum.
-- Tidak mengekspos status per orang dari private.sensus_profile.
create or replace function public.dashboard_penerobosan_mubaligh_counts()
returns jsonb language sql stable security definer set search_path='' as $fn$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.kelompok_nama),'[]'::jsonb)
  from (
    select j.kelompok_nama,
      count(*) filter(where p.status_mubaligh='MT (Mubaligh Tugasan)')::integer as mt,
      count(*) filter(where p.status_mubaligh='MS (Mubaligh Setempat)')::integer as ms,
      count(*) filter(where p.status_mubaligh is null)::integer as belum_isi
    from public.jamaah_desa j
    left join private.sensus_profile p on p.did=j.did
    where j.status_sambung='Tetap' and j.kelompok_nama in ('PW1','PW2','PW3','PW4')
    group by j.kelompok_nama
  ) t;
$fn$;
revoke all on function public.dashboard_penerobosan_mubaligh_counts() from public;
grant execute on function public.dashboard_penerobosan_mubaligh_counts() to anon,authenticated;
