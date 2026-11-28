-- Persistent reconciliation evidence. No automatic accounting entries.
create function public.ubnb_finance_recon_allowed() returns boolean
language sql stable security invoker set search_path='' as $$
 select coalesce(lower(public.ubnb_secure_session('staff')->>'role') in ('pemilik','admin','bendahara','keuangan'),false)
$$;
revoke all on function public.ubnb_finance_recon_allowed() from public;
grant execute on function public.ubnb_finance_recon_allowed() to anon,authenticated;
create table public.keuangan_rekonsiliasi (
 id bigint generated always as identity primary key,
 jenis text not null check(jenis in('aktual','bukti')),
 tanggal date not null,
 label text not null check(length(trim(label)) between 1 and 200),
 jumlah numeric(18,2) check(jumlah>=0),
 terkonfirmasi boolean not null default false,
 kas_id bigint references public.kas(id),
 mutasi_id bigint references public.kas_mutasi(id),
 catatan text not null default '',
 bukti_url text not null default '' check(bukti_url='' or bukti_url ~ '^https://'),
 diarsipkan boolean not null default false,
 updated_by text not null default '',
 updated_at timestamptz not null default now(),
 unique(jenis,tanggal,label),
 check(jenis='bukti' or mutasi_id is null),
 check(jenis='aktual' or jumlah>0)
);
create unique index keuangan_rekon_unique_match on public.keuangan_rekonsiliasi(mutasi_id) where mutasi_id is not null and not diarsipkan;
create index keuangan_rekon_date on public.keuangan_rekonsiliasi(tanggal,jenis);
create index keuangan_rekon_kas on public.keuangan_rekonsiliasi(kas_id);
alter table public.keuangan_rekonsiliasi enable row level security;
grant select,insert,update on public.keuangan_rekonsiliasi to anon,authenticated;
grant usage,select on sequence public.keuangan_rekonsiliasi_id_seq to anon,authenticated;
create policy finance_rekon_read on public.keuangan_rekonsiliasi for select to anon,authenticated using(public.ubnb_finance_recon_allowed());
create policy finance_rekon_add on public.keuangan_rekonsiliasi for insert to anon,authenticated with check(public.ubnb_finance_recon_allowed());
create policy finance_rekon_edit on public.keuangan_rekonsiliasi for update to anon,authenticated using(public.ubnb_finance_recon_allowed()) with check(public.ubnb_finance_recon_allowed());
create function private.finance_recon_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare actor jsonb; m public.kas_mutasi;
begin
 actor:=private.ubnb_secure_actor('staff');
 if new.mutasi_id is not null then
  select * into m from public.kas_mutasi where id=new.mutasi_id;
  if not found or m.tipe<>'keluar' or m.jumlah<>new.jumlah or (new.kas_id is not null and m.kas_id<>new.kas_id) then
   raise exception 'Bukti harus cocok nominal, arah keluar dan kas dengan mutasi';
  end if;
 end if;
 new.updated_by:=coalesce(actor->>'username','audit_ubnb');
 new.updated_at:=now();
 insert into public.audit_log(tabel,record_id,aksi,username,data_lama,data_baru)
 values('keuangan_rekonsiliasi',new.id,TG_OP,new.updated_by,case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
revoke all on function private.finance_recon_audit() from public;
create trigger finance_recon_audit before insert or update on public.keuangan_rekonsiliasi for each row execute function private.finance_recon_audit();
