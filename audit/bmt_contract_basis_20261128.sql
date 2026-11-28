-- Applied via Supabase migration align_ubnb_murabahah_historical_contract_basis_20261128.
-- User-approved management reporting basis, not a SAK compliance assertion.
-- Exact baseline guards prevent applying twice. No cash or original2025 contract changes.
CREATE OR REPLACE FUNCTION public.fn_bmt_angsuran_atomik_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare a public.bmt_akad%rowtype; j bigint; paid numeric; prior_margin numeric; real_margin numeric; dr text; cr text; amt numeric; k record;
begin
if not new.posting_atomik then return new; end if;
select * into strict a from public.bmt_akad where id=new.akad_id for update;
if new.tanggal<a.tanggal_akad or new.kas_id is distinct from 1 then raise exception 'Tanggal atau kas angsuran tidak valid';end if;
select coalesce(sum(jumlah-kelebihan),0),coalesce(sum(margin),0) into paid,prior_margin from public.bmt_angsuran where akad_id=a.id and id<>new.id;
if new.kelebihan<>greatest(0,paid+coalesce(a.uang_muka,0)+new.jumlah-a.total_pembiayaan) or (new.kelebihan>0 and a.jenis_akad<>'Murabahah') then raise exception 'Kelebihan pembayaran tidak sesuai sisa kewajiban';end if;
if new.kelebihan>0 and new.margin<>greatest(0,a.total_margin-prior_margin) then raise exception 'Pelunasan margin harus sesuai sisa kontrak';end if;
if exists(select 1 from public.kas_mutasi where ref_type='bmt_angsuran' and ref_id=new.id) then raise exception 'Mutasi angsuran sudah ada';end if;
perform 1 from public.kas where id=1 for update;
if not found then raise exception 'Kas BMT tidak tersedia';end if;
insert into public.kas_mutasi(kas_id,tipe,kategori,jumlah,tanggal,keterangan,operator,ref_type,ref_id) values(1,'masuk','angsuran',new.jumlah,new.tanggal,'Angsuran: '||a.nama_jamaah||' ('||a.no_akad||')',new.operator,'bmt_angsuran',new.id);
update public.kas set saldo=saldo+new.jumlah where id=1;
if a.jenis_akad='Murabahah' then
 if not exists(select 1 from public.jurnal_umum where referensi='AUD-BMT-MARGIN-'||a.id) and a.tanggal_akad>=date '2026-01-01' and not exists(select 1 from public.jurnal_umum where referensi='AUTO-BMT-MARGIN-'||a.id) then raise exception 'Jurnal pembentukan margin akad belum tersedia';end if;
 real_margin:=least(new.margin,greatest(0,a.total_margin-prior_margin));
 if real_margin<>new.margin then raise exception 'Margin melampaui sisa kontrak';end if;
 if real_margin>0 then
 insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tanggal)::int),new.tanggal,'Realisasi margin '||a.no_akad,'AUD-BMT-REAL-'||new.id,real_margin,real_margin,'posted',new.operator) returning id into j;
 insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode='1-114' then real_margin else 0 end,case when kode='4-301' then real_margin else 0 end from public.coa where kode in('1-114','4-301');
 if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=real_margin and sum(kredit)=real_margin) then raise exception 'Jurnal margin tidak balance';end if;
 -- Dasar laporan historis UB: margin akad sudah diakui; realisasi hanya untuk pool bagi hasil.
 insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator)
 values(public.fn_next_no_jurnal(extract(year from new.tanggal)::int),new.tanggal,'Penetralan pengakuan ulang margin: '||a.no_akad,'FIN-BMT-CONTRACT-REAL-'||new.id,real_margin,real_margin,'draft',new.operator) returning id into j;
 insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)
 select j,id,kode,nama,case when kode='4-301' then real_margin else 0 end,case when kode='1-114' then real_margin else 0 end from public.coa where kode in('1-114','4-301');
 update public.jurnal_umum set status='posted' where id=j;
 end if;
elsif a.jenis_akad='Ijarah' then
 if not exists(select 1 from public.jurnal_umum where referensi='AUD-IJ-ASSET-'||a.id or (referensi='AKAD-'||a.id and a.ijarah_mulai is not null)) then raise exception 'Aset Ijarah belum direkonsiliasi';end if;
 insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tanggal)::int),new.tanggal,'Reklasifikasi angsuran Ijarah '||a.no_akad,'AUD-IJ-PAY-'||new.id,new.jumlah,new.jumlah,'posted',new.operator) returning id into j;
 insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case kode when '1-111' then new.pokok when '1-112' then new.margin else 0 end,case when kode='1-116' then new.jumlah else 0 end from public.coa where kode in('1-111','1-112','1-116');
 if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=new.jumlah and sum(kredit)=new.jumlah) then raise exception 'Jurnal Ijarah tidak balance';end if;
else raise exception 'Jenis akad belum mendukung posting atomik';end if;
update public.bmt_akad set total_angsuran=paid+new.jumlah-new.kelebihan+coalesce(a.uang_muka,0),sisa_angsuran=greatest(0,a.total_pembiayaan-paid-new.jumlah+new.kelebihan-coalesce(a.uang_muka,0)),status=case when paid+new.jumlah-new.kelebihan+coalesce(a.uang_muka,0)>=a.total_pembiayaan then 'Lunas' else 'Belum Lunas' end where id=a.id;
return new;
end $function$

;
CREATE OR REPLACE FUNCTION public.fn_bmt_margin_dp_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare m numeric:=coalesce(new.total_margin,0); dp numeric:=coalesce(new.uang_muka,0); cost numeric:=coalesce(new.harga_beli,0)-coalesce(new.diskon,0); j bigint; 
begin
if new.kas_pencairan_id is null or new.jenis_akad is distinct from 'Murabahah' then return new; end if;
if m<0 or dp<0 or dp>cost or new.total_pembiayaan is distinct from cost+m then raise exception 'Komposisi harga, margin atau DP tidak valid';end if;
if m>0 then
 insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tanggal_akad)::int),new.tanggal_akad,'Pembentukan margin '||new.no_akad,'AUTO-BMT-MARGIN-'||new.id,m,m,'posted',new.operator) returning id into j;
 insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode='1-112' then m else 0 end,case when kode='1-114' then m else 0 end from public.coa where kode in('1-112','1-114');
 if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=m and sum(kredit)=m) then raise exception 'Jurnal pembentukan margin tidak balance';end if;
 -- Dasar laporan historis UB: pengakuan margin murabahah saat akad, bukan saat angsuran.
 insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator)
 values(public.fn_next_no_jurnal(extract(year from new.tanggal_akad)::int),new.tanggal_akad,'Pengakuan margin akad sesuai dasar laporan UB: '||new.no_akad,'FIN-BMT-CONTRACT-AKAD-'||new.id,m,m,'draft',new.operator) returning id into j;
 insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)
 select j,id,kode,nama,case when kode='1-114' then m else 0 end,case when kode='4-301' then m else 0 end from public.coa where kode in('1-114','4-301');
 update public.jurnal_umum set status='posted' where id=j;
end if;
if dp>0 then
 perform 1 from public.kas where id=1 for update;
 if not found then raise exception 'Kas BMT tidak tersedia';end if;
 insert into public.kas_mutasi(kas_id,tipe,kategori,jumlah,tanggal,keterangan,operator,ref_type,ref_id) values(1,'masuk','bmt',dp,new.tanggal_akad,'DP diterima '||new.no_akad,new.operator,'bmt_dp',new.id);
 update public.kas set saldo=saldo+dp where id=1;
 insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tanggal_akad)::int),new.tanggal_akad,'DP diterima '||new.no_akad,'AUTO-BMT-DP-'||new.id,dp,dp,'posted',new.operator) returning id into j;
 insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode='1-101' then dp else 0 end,case when kode='1-111' then dp else 0 end from public.coa where kode in('1-101','1-111');
 if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=dp and sum(kredit)=dp) then raise exception 'Jurnal DP tidak balance';end if;
end if;
return new;end $function$

;
CREATE OR REPLACE FUNCTION bmt_audit.koreksi_angsuran_v1(p_id bigint, p_alasan text, p_operator text, p_jumlah numeric DEFAULT NULL::numeric, p_pokok numeric DEFAULT NULL::numeric, p_margin numeric DEFAULT NULL::numeric, p_lebih numeric DEFAULT 0)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare s public.bmt_angsuran%rowtype; a public.bmt_akad%rowtype; k public.kas_mutasi%rowtype; new_id bigint; paid numeric; arsip jsonb; 
begin
if current_user<>'postgres' then raise exception 'Koreksi hanya melalui backend pengurus';end if;
if length(trim(coalesce(p_alasan,'')))<5 or length(trim(coalesce(p_operator,'')))=0 then raise exception 'Alasan dan operator wajib diisi';end if;
perform pg_advisory_xact_lock(782619,3);
select * into strict s from public.bmt_angsuran where id=p_id for update;
select * into strict a from public.bmt_akad where id=s.akad_id for update;
if s.tanggal<date '2026-01-01' or not s.posting_atomik or a.jenis_akad<>'Murabahah' then raise exception 'Hanya angsuran Murabahah atomik periode terbuka';end if;
if exists(select 1 from public.bmt_angsuran where tanggal>s.tanggal or (tanggal=s.tanggal and id>s.id)) or exists(select 1 from bmt_audit.akad_pool_v3 where tanggal>s.tanggal) then raise exception 'Koreksi historis memerlukan rekonstruksi lanjutan';end if;
if exists(select 1 from public.bmt_penyertaan_bh_eksternal where angsuran_id=s.id) or exists(select 1 from public.ubnb_modal_bagi_hasil where sudah_dibayar and penyertaan_id in(select penyertaan_id from bmt_audit.margin_pemodal_v3 where angsuran_id=s.id)) then raise exception 'Ada penyelesaian bagi hasil; koreksi manual diperlukan';end if;
select * into strict k from public.kas_mutasi where ref_type='bmt_angsuran' and ref_id=s.id for update;
if k.kas_id<>1 or k.tipe<>'masuk' or k.jumlah<>s.jumlah then raise exception 'Mutasi kas tidak sesuai';end if;
select jsonb_build_object('angsuran',to_jsonb(s),'kas',to_jsonb(k),'akad',to_jsonb(a),'jurnal',(select jsonb_agg(jsonb_build_object('header',to_jsonb(j),'detail',(select jsonb_agg(to_jsonb(d)) from public.jurnal_detail d where d.jurnal_id=j.id))) from public.jurnal_umum j where j.referensi in('ANG-'||s.id,'AUD-BMT-REAL-'||s.id,'FIN-BMT-CONTRACT-REAL-'||s.id)),'margin',(select to_jsonb(m) from bmt_audit.margin_pool_v3 m where m.angsuran_id=s.id),'pemodal',(select jsonb_agg(to_jsonb(m)) from bmt_audit.margin_pemodal_v3 m where m.angsuran_id=s.id),'shu',(select jsonb_agg(to_jsonb(l)) from public.ubnb_shu_trx_log l where l.ref_tabel='bmt_angsuran' and l.ref_id=s.id)) into arsip;
insert into bmt_audit.koreksi_angsuran_v1(angsuran_id,alasan,operator,arsip) values(s.id,p_alasan,p_operator,arsip);
delete from bmt_audit.margin_pemodal_v3 where angsuran_id=s.id;
delete from bmt_audit.margin_pool_v3 where angsuran_id=s.id;
perform public.fn_hapus_jurnal_by_referensi('FIN-BMT-CONTRACT-REAL-'||s.id);
perform public.fn_hapus_jurnal_by_referensi('AUD-BMT-REAL-'||s.id);
delete from public.kas_mutasi where id=k.id;
update public.kas set saldo=saldo-s.jumlah where id=1;
perform set_config('bmt_audit.correction_id',s.id::text,true);
delete from public.bmt_angsuran where id=s.id;
perform set_config('bmt_audit.correction_id','',true);
if exists(select 1 from public.jurnal_umum where referensi in('ANG-'||s.id,'AUD-BMT-REAL-'||s.id,'FIN-BMT-CONTRACT-REAL-'||s.id)) or exists(select 1 from public.ubnb_shu_trx_log where ref_tabel='bmt_angsuran' and ref_id=s.id) then raise exception 'Pembersihan transaksi turunan gagal';end if;
select coalesce(sum(jumlah-kelebihan),0)+coalesce(a.uang_muka,0) into paid from public.bmt_angsuran where akad_id=a.id;
update public.bmt_akad set total_angsuran=paid,sisa_angsuran=greatest(0,a.total_pembiayaan-paid),status=case when paid>=a.total_pembiayaan then 'Lunas' else 'Belum Lunas' end where id=a.id;
if p_jumlah is not null then
insert into public.bmt_angsuran(akad_id,tanggal,jumlah,pokok,margin,kelebihan,kas_id,operator,catatan,posting_atomik) values(a.id,s.tanggal,p_jumlah,p_pokok,p_margin,p_lebih,1,p_operator,'Koreksi angsuran #'||s.id||': '||p_alasan,true) returning id into new_id;
update bmt_audit.koreksi_angsuran_v1 set pengganti_id=new_id where angsuran_id=s.id;
end if;
return new_id;
end $function$

;
DO $policy$
DECLARE s record; jid bigint; n integer:=0; baseline jsonb; after_state jsonb; old_cash numeric; new_cash numeric; old_kas jsonb; new_kas jsonb;
BEGIN
PERFORM pg_advisory_xact_lock(20261128,402);
IF EXISTS(SELECT 1 FROM jurnal_umum WHERE referensi='FIN-BMT-CONTRACT-OPENING') THEN RAISE EXCEPTION 'Kebijakan sudah diterapkan'; END IF;
IF (SELECT count(*)FROM jurnal_umum WHERE status='posted' AND referensi like 'AUD-BMT-REAL-%')<>164 OR (SELECT count(*)FROM jurnal_umum WHERE status='posted' AND referensi like 'AUD-BMT-MARGIN-%')<>15 THEN RAISE EXCEPTION 'Jumlah jurnal sumber berubah'; END IF;
SELECT sum(d.debit-d.kredit) INTO old_cash FROM jurnal_detail d JOIN jurnal_umum j ON j.id=d.jurnal_id WHERE j.status='posted' AND j.tanggal<='2026-11-28' AND(j.referensi='NERACA-2025' OR j.tanggal>='2026-01-01')AND d.kode_akun~'^1-10[0-9]$';
SELECT jsonb_agg(jsonb_build_object('id',id,'saldo',saldo)order by id)INTO old_kas FROM kas;
baseline:=jsonb_build_object('cash',old_cash,'reported_profit',36252774,'opening_equity_adjustment',27934592,'recognized_receipt_margin',29773783,'new_contract_margin',31137959,'source_journal_ids',(SELECT jsonb_agg(id order by id)FROM jurnal_umum WHERE status='posted'AND(referensi like 'AUD-BMT-REAL-%'OR referensi like 'AUD-BMT-MARGIN-%'OR referensi='AUD-BMT-TRANSISI-2026')));
FOR s IN SELECT j.* FROM jurnal_umum j WHERE j.status='posted'AND(j.referensi like 'AUD-BMT-REAL-%'OR j.referensi='AUD-BMT-TRANSISI-2026') ORDER BY j.tanggal,j.id LOOP
 IF EXISTS(SELECT 1 FROM jurnal_detail WHERE jurnal_id=s.id AND kode_akun NOT IN('1-114','4-301','3-104')) OR (SELECT count(*)FROM jurnal_detail WHERE jurnal_id=s.id)<>2 THEN RAISE EXCEPTION 'Komposisi sumber tidak sesuai: %',s.id;END IF;
 INSERT INTO jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator)
 VALUES(public.fn_next_no_jurnal(extract(year from s.tanggal)::int),s.tanggal,'Konsistensi dasar laporan UB: pembalik pengakuan margin saat angsuran/transisi, sumber #'||s.id,case when s.referensi='AUD-BMT-TRANSISI-2026'then 'FIN-BMT-CONTRACT-OPENING'else replace(s.referensi,'AUD-BMT-REAL-','FIN-BMT-CONTRACT-REAL-')end,s.total_kredit,s.total_debit,'draft','audit_ubnb')RETURNING id INTO jid;
 INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit,keterangan)
 SELECT jid,coa_id,kode_akun,nama_akun,kredit,debit,'Pembalik sumber #'||s.id||'; margin sudah diakui saat akad sesuai dasar laporan historis UB; bukan arus kas'FROM jurnal_detail WHERE jurnal_id=s.id;
 UPDATE jurnal_umum SET status='posted'WHERE id=jid;n:=n+1;
END LOOP;
FOR s IN SELECT j.*,sum(d.kredit-d.debit)filter(where d.kode_akun='1-114')amount FROM jurnal_umum j JOIN jurnal_detail d ON d.jurnal_id=j.id WHERE j.status='posted'AND j.referensi like 'AUD-BMT-MARGIN-%'GROUP BY j.id ORDER BY j.tanggal,j.id LOOP
 IF s.amount<=0 OR s.amount IS DISTINCT FROM (SELECT a.total_margin FROM bmt_akad a WHERE a.id=split_part(s.referensi,'-',4)::bigint AND a.jenis_akad='Murabahah'AND a.tanggal_akad=s.tanggal)THEN RAISE EXCEPTION 'Margin akad tidak sesuai: %',s.id;END IF;
 INSERT INTO jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator)
 VALUES(public.fn_next_no_jurnal(extract(year from s.tanggal)::int),s.tanggal,'Pengakuan margin saat akad sesuai dasar laporan historis UB; sumber #'||s.id,replace(s.referensi,'AUD-BMT-MARGIN-','FIN-BMT-CONTRACT-AKAD-'),s.amount,s.amount,'draft','audit_ubnb')RETURNING id INTO jid;
 INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit,keterangan)
 SELECT jid,id,kode,nama,case when kode='1-114'then s.amount else 0 end,case when kode='4-301'then s.amount else 0 end,'Reklasifikasi margin akad; tidak mengubah kas atau pokok pembiayaan'FROM coa WHERE kode IN('1-114','4-301');
 UPDATE jurnal_umum SET status='posted'WHERE id=jid;n:=n+1;
END LOOP;
IF n<>180 THEN RAISE EXCEPTION 'Jumlah koreksi tidak sesuai';END IF;
SELECT sum(d.debit-d.kredit) INTO new_cash FROM jurnal_detail d JOIN jurnal_umum j ON j.id=d.jurnal_id WHERE j.status='posted'AND j.tanggal<='2026-11-28'AND(j.referensi='NERACA-2025'OR j.tanggal>='2026-01-01')AND d.kode_akun~'^1-10[0-9]$';
SELECT jsonb_agg(jsonb_build_object('id',id,'saldo',saldo)order by id)INTO new_kas FROM kas;
IF old_cash IS DISTINCT FROM new_cash OR old_kas IS DISTINCT FROM new_kas THEN RAISE EXCEPTION 'Kas berubah';END IF;
IF (SELECT sum(d.debit-d.kredit)FROM jurnal_detail d JOIN jurnal_umum j ON j.id=d.jurnal_id WHERE j.status='posted'AND(j.referensi='NERACA-2025'OR j.tanggal>='2026-01-01')AND d.kode_akun IN('1-114','3-104'))<>0 THEN RAISE EXCEPTION 'Saldo transisi/tangguhan belum nol';END IF;
UPDATE coa SET keterangan='Saldo transisi BMT dibalik melalui FIN-BMT-CONTRACT-OPENING; dasar laporan UB2026 konsisten dengan laporan historis: margin murabahah diakui saat akad. Saldo harus nol. Bukan biaya atau kas keluar.'WHERE kode='3-104';
after_state:=jsonb_build_object('basis','Dasar pengakuan manajemen UB historis: margin Murabahah saat akad; bukan pernyataan kepatuhan SAK Syariah','approved_by','Setyo: ya sesuaikan aja','correction_journals',n,'cash',new_cash,'expected_profit2026',37616950,'expected_bmt_profit',29653679,'expected_assets',285362521,'expected_equity_before_profit',153443885,'opening_2025_unchanged',true,'historical_source_contracts_unchanged',true,'ijarah_unchanged',true,'capital_profit_split_receipt_basis_unchanged',true,'separate_opening_findings','Kelompok3: angsuran2025 benar1540000; laporan lama kurang100000; Aries uang muka5jt dan alokasi perlu koreksi terpisah, tidak dipaksakan pada perubahan metode ini');
INSERT INTO audit_log(tabel,record_id,aksi,username,data_lama,data_baru)VALUES('audit_bmt_contract_basis_20261128_v1',20261128,'ALIGN_HISTORICAL_UB_CONTRACT_BASIS','audit_ubnb',baseline,after_state);
END $policy$;

-- Regression scenario, run separately within BEGIN ... ROLLBACK only:
/*
BEGIN;
DO $test$
DECLARE aid bigint; pid bigint; profit_before numeric; profit_after numeric; paid_profit numeric; pool_margin numeric;
BEGIN
INSERT INTO bmt_akad(no_akad,nama_jamaah,kelompok,tanggal_akad,jenis_akad,objek_pembiayaan,jangka,harga_beli,total_margin,total_pembiayaan,uang_muka,diskon,angsuran_perbulan,total_angsuran,sisa_angsuran,status,kas_pencairan_id,tgl_perolehan_barang,tgl_serah_terima_barang,operator,posting_margin_dp)
VALUES('TEST-ROLLBACK-BASIS-20261128','Uji rollback pengakuan margin','PW4','2026-11-28','Murabahah','Uji transaksi tidak disimpan',1,100000,10000,110000,0,0,110000,0,110000,'Belum Lunas',1,'2026-11-28','2026-11-28','audit_ubnb',true)RETURNING id INTO aid;
SELECT coalesce(sum(d.kredit-d.debit),0)INTO profit_before FROM jurnal_umum j JOIN jurnal_detail d ON d.jurnal_id=j.id WHERE j.referensi IN('AUTO-BMT-MARGIN-'||aid,'FIN-BMT-CONTRACT-AKAD-'||aid)AND d.kode_akun='4-301';
IF profit_before<>10000 THEN RAISE EXCEPTION 'Margin baru tidak diakui saat akad: %',profit_before;END IF;
INSERT INTO bmt_angsuran(akad_id,tanggal,jumlah,pokok,margin,kelebihan,kas_id,operator,catatan,posting_atomik)
VALUES(aid,'2026-11-28',55000,50000,5000,0,1,'audit_ubnb','Uji rollback tidak disimpan',true)RETURNING id INTO pid;
SELECT coalesce(sum(d.kredit-d.debit),0)INTO paid_profit FROM jurnal_umum j JOIN jurnal_detail d ON d.jurnal_id=j.id WHERE j.referensi IN('AUD-BMT-REAL-'||pid,'FIN-BMT-CONTRACT-REAL-'||pid)AND d.kode_akun='4-301';
IF paid_profit<>0 THEN RAISE EXCEPTION 'Angsuran menghasilkan laba ulang: %',paid_profit;END IF;
SELECT margin INTO pool_margin FROM bmt_audit.margin_pool_v3 WHERE angsuran_id=pid;
IF pool_margin IS DISTINCT FROM 5000::numeric THEN RAISE EXCEPTION 'Pool bagi hasil berubah/tidak tersedia: %',pool_margin;END IF;
END $test$;
ROLLBACK;
*/
