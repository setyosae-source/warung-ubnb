insert into public.audit_log(tabel,record_id,aksi,username,data_lama,data_baru) values('audit_bmt_wadiah_pool_routing_v1',202610,'UPDATE','Audit UBNB 28-11-2026',jsonb_build_object('definition','CREATE OR REPLACE FUNCTION public.bmt_wadiah_transaksi_v1(p_request uuid, p_tab bigint, p_tipe text, p_tanggal date, p_jumlah numeric, p_kas bigint, p_keterangan text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''pg_temp''
AS $function$
declare w public.ubnb_wadiah_tabungan%rowtype; m public.ubnb_wadiah_mutasi%rowtype; k public.kas%rowtype; n numeric; i bigint; op text;
begin
perform private.ubnb_assert_finance(true);
op:=coalesce(private.ubnb_secure_actor(''staff'')->>''username'',''backend'');
if p_request is null or p_tipe is null or p_tipe not in(''setor'',''tarik'') or p_jumlah is null or p_jumlah<=0 or p_tanggal is null or p_tanggal<date ''2026-01-01'' or p_tanggal>(now() at time zone ''Asia/Jakarta'')::date or p_kas is null or p_kas not in(1,5) then raise exception ''Data Wadiah tidak valid'';end if;
perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
select * into m from public.ubnb_wadiah_mutasi where request_id=p_request;
if found then if (m.tabungan_id,m.tipe,m.tanggal,m.jumlah,m.kas_id) is distinct from (p_tab,p_tipe,p_tanggal,p_jumlah,p_kas) then raise exception ''Referensi telah dipakai'';end if;return m.id;end if;
select * into strict w from public.ubnb_wadiah_tabungan where id=p_tab for update;
if w.status not in(''aktif'',''generated'') or (w.status=''generated'' and p_tipe=''tarik'') or exists(select 1 from public.ubnb_wadiah_mutasi where tabungan_id=p_tab and tanggal>p_tanggal) then raise exception ''Rekening atau tanggal tidak valid'';end if;
select * into strict k from public.kas where id=p_kas for update;
n:=case when p_tipe=''setor'' then p_jumlah else -p_jumlah end;
if w.saldo+n<0 or k.saldo+n<0 then raise exception ''Saldo tidak cukup'';end if;
insert into public.ubnb_wadiah_mutasi(tabungan_id,anggota_id,tipe,jumlah,saldo_sebelum,saldo_sesudah,tanggal,keterangan,kas_id,operator,request_id) values(p_tab,w.anggota_id,p_tipe,p_jumlah,w.saldo,w.saldo+n,p_tanggal,p_keterangan,p_kas,op,p_request) returning id into i;
update public.ubnb_wadiah_tabungan set saldo=w.saldo+n,status=''aktif'',tgl_buka=coalesce(tgl_buka,p_tanggal) where id=p_tab;
insert into public.ubnb_wadiah_saldo_harian(tabungan_id,anggota_id,tanggal,saldo) values(p_tab,w.anggota_id,p_tanggal,w.saldo+n) on conflict(tabungan_id,tanggal) do update set saldo=excluded.saldo;
insert into public.kas_mutasi(kas_id,tipe,jumlah,tanggal,keterangan,operator,kategori,ref_type,ref_id) values(p_kas,case when n>0 then ''masuk'' else ''keluar'' end,p_jumlah,p_tanggal,initcap(p_tipe)||'' Wadiah ''||w.no_rekening,op,''bmt'',''ubnb_wadiah_mutasi'',i);
update public.kas set saldo=saldo+n where id=p_kas;
return i;end $function$
'),jsonb_build_object('target_kas',1,'legacy5_normalized',true,'rollback_setor_tarik_test',true));
CREATE OR REPLACE FUNCTION public.bmt_wadiah_transaksi_v1(p_request uuid, p_tab bigint, p_tipe text, p_tanggal date, p_jumlah numeric, p_kas bigint, p_keterangan text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare w public.ubnb_wadiah_tabungan%rowtype; m public.ubnb_wadiah_mutasi%rowtype; k public.kas%rowtype; n numeric; i bigint; op text;
begin
if p_kas=5 then p_kas:=1;end if;
perform private.ubnb_assert_finance(true);
op:=coalesce(private.ubnb_secure_actor('staff')->>'username','backend');
if p_request is null or p_tipe is null or p_tipe not in('setor','tarik') or p_jumlah is null or p_jumlah<=0 or p_tanggal is null or p_tanggal<date '2026-01-01' or p_tanggal>(now() at time zone 'Asia/Jakarta')::date or p_kas is null or p_kas<>1 then raise exception 'Data Wadiah tidak valid';end if;
perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
select * into m from public.ubnb_wadiah_mutasi where request_id=p_request;
if found then if (m.tabungan_id,m.tipe,m.tanggal,m.jumlah,m.kas_id) is distinct from (p_tab,p_tipe,p_tanggal,p_jumlah,p_kas) then raise exception 'Referensi telah dipakai';end if;return m.id;end if;
select * into strict w from public.ubnb_wadiah_tabungan where id=p_tab for update;
if w.status not in('aktif','generated') or (w.status='generated' and p_tipe='tarik') or exists(select 1 from public.ubnb_wadiah_mutasi where tabungan_id=p_tab and tanggal>p_tanggal) then raise exception 'Rekening atau tanggal tidak valid';end if;
select * into strict k from public.kas where id=p_kas for update;
n:=case when p_tipe='setor' then p_jumlah else -p_jumlah end;
if w.saldo+n<0 or k.saldo+n<0 then raise exception 'Saldo tidak cukup';end if;
insert into public.ubnb_wadiah_mutasi(tabungan_id,anggota_id,tipe,jumlah,saldo_sebelum,saldo_sesudah,tanggal,keterangan,kas_id,operator,request_id) values(p_tab,w.anggota_id,p_tipe,p_jumlah,w.saldo,w.saldo+n,p_tanggal,p_keterangan,p_kas,op,p_request) returning id into i;
update public.ubnb_wadiah_tabungan set saldo=w.saldo+n,status='aktif',tgl_buka=coalesce(tgl_buka,p_tanggal) where id=p_tab;
insert into public.ubnb_wadiah_saldo_harian(tabungan_id,anggota_id,tanggal,saldo) values(p_tab,w.anggota_id,p_tanggal,w.saldo+n) on conflict(tabungan_id,tanggal) do update set saldo=excluded.saldo;
insert into public.kas_mutasi(kas_id,tipe,jumlah,tanggal,keterangan,operator,kategori,ref_type,ref_id) values(p_kas,case when n>0 then 'masuk' else 'keluar' end,p_jumlah,p_tanggal,initcap(p_tipe)||' Wadiah '||w.no_rekening,op,'bmt','ubnb_wadiah_mutasi',i);
update public.kas set saldo=saldo+n where id=p_kas;
return i;end $function$;