-- Applied to Supabase on 28 November 2026.
-- Guarded migration; rollback archive is stored in audit_log.
-- Validated in a rolled-back transaction before application.
lock table public.kas,public.kas_mutasi,public.jurnal_umum,public.jurnal_detail,public.bmt_akad,public.bmt_angsuran,public.bmt_penyertaan_bh_eksternal,public.coa in share row exclusive mode;
do $guard$
begin
if exists(select 1 from public.audit_log where tabel='audit_bmt_pooled_cash_migration_v1') then raise exception 'Migration already applied';end if;
if (select saldo from public.kas where id=1)<>49598994 or (select saldo from public.kas where id=5)<>65086927 then raise exception 'Cash changed; re-read first';end if;
if (select sum(case when tipe='masuk' then jumlah else -jumlah end) from public.kas_mutasi where kas_id=5 and tanggal>=date '2026-01-01')<>61266927 then raise exception 'BMT flow changed';end if;
if exists(select 1 from public.kas_mutasi where kas_id=5 and tanggal>(now() at time zone 'Asia/Jakarta')::date) then raise exception 'Future BMT entries';end if;
insert into public.audit_log(tabel,record_id,aksi,username,data_lama,data_baru)
select 'audit_bmt_pooled_cash_migration_v1',202610,'UPDATE','Audit UBNB - konfirmasi Setyo',
jsonb_build_object('functions','[{"schema":"bmt_audit","name":"fn_modal_terima_v1","definition":"CREATE OR REPLACE FUNCTION bmt_audit.fn_modal_terima_v1()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''pg_catalog'', ''pg_temp''\nAS $function$\ndeclare akun text; ref text; j bigint; op text; jenis text;\nbegin\nperform private.ubnb_assert_finance(true);\nperform pg_advisory_xact_lock(782619,3);\nif new.tgl_mulai is null or new.tgl_mulai<date ''2026-01-01'' or new.tgl_mulai>(now() at time zone ''Asia/Jakarta'')::date or new.tgl_jatuh_tempo is null or new.tgl_jatuh_tempo<new.tgl_mulai or new.jumlah_modal is null or new.jumlah_modal<=0 or new.status is distinct from ''aktif'' then raise exception ''Data penerimaan modal tidak valid'';end if;\nif new.tgl_mulai<greatest(coalesce((select max(tanggal) from bmt_audit.akad_pool_v3),date ''2026-01-01''),coalesce((select max(tanggal) from bmt_audit.margin_pool_v3),date ''2026-01-01'')) then raise exception ''Setoran backdate perlu rekonstruksi pengurus'';end if;\nif tg_table_name=''ubnb_modal_penyertaan'' then\njenis:=to_jsonb(new)->>''jenis'';if jenis is distinct from ''penuh'' then raise exception ''Penyertaan spesifik internal belum didukung otomatisasi'';end if;akun:=''2-104'';\nelse\njenis:=to_jsonb(new)->>''jenis_penyertaan'';if jenis is distinct from ''spesifik'' then raise exception ''Penyertaan eksternal umum belum didukung distribusi'';end if;akun:=''2-103'';\nend if;\nref:=''AUTO-MODAL-''||tg_table_name||''-''||new.id;op:=coalesce(private.ubnb_secure_actor(''staff'')->>''username'',''backend'');\nperform 1 from public.kas where id=5 for update;\ninsert into public.kas_mutasi(kas_id,tipe,jumlah,tanggal,keterangan,operator,kategori,ref_type,ref_id) values(5,''masuk'',new.jumlah_modal,new.tgl_mulai,''Penerimaan modal ''||new.no_penyertaan,op,''bmt'',tg_table_name,new.id);\nupdate public.kas set saldo=saldo+new.jumlah_modal where id=5;\ninsert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tgl_mulai)::int),new.tgl_mulai,''Penerimaan modal ''||new.no_penyertaan,ref,new.jumlah_modal,new.jumlah_modal,''posted'',op) returning id into j;\ninsert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode=''1-102'' then new.jumlah_modal else 0 end,case when kode=akun then new.jumlah_modal else 0 end from public.coa where kode in(''1-102'',akun);\nif not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=new.jumlah_modal and sum(kredit)=new.jumlah_modal) then raise exception ''Jurnal modal tidak seimbang'';end if;return new;end $function$\n"},{"schema":"bmt_audit","name":"fn_post_bh_eksternal_v1","definition":"CREATE OR REPLACE FUNCTION bmt_audit.fn_post_bh_eksternal_v1()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''pg_catalog'', ''pg_temp''\nAS $function$\ndeclare j bigint; op text; v_saldo numeric;\nbegin\nif tg_op=''DELETE'' then if old.sudah_dibayar then raise exception ''Pembayaran yang sudah dibukukan tidak boleh dihapus'';end if;return old;end if;\nif tg_op=''INSERT'' then if new.sudah_dibayar then raise exception ''Buat tagihan dahulu sebelum konfirmasi pembayaran'';end if;return new;end if;\nif old.sudah_dibayar then\n if new.sudah_dibayar is distinct from old.sudah_dibayar or new.total_ke_mitra is distinct from old.total_ke_mitra or new.pokok_ke_mitra is distinct from old.pokok_ke_mitra or new.bh_ke_mitra is distinct from old.bh_ke_mitra or new.tgl_bayar_mitra is distinct from old.tgl_bayar_mitra or new.penyertaan_id is distinct from old.penyertaan_id or new.angsuran_id is distinct from old.angsuran_id then raise exception ''Pembayaran sudah dibukukan; gunakan koreksi pengurus'';end if;return new;\nend if;\nif not coalesce(new.sudah_dibayar,false) then return new;end if;\nperform private.ubnb_assert_finance(true);\nop:=coalesce(private.ubnb_secure_actor(''staff'')->>''username'',new.dikonfirmasi_oleh,''backend'');\nif new.tgl_bayar_mitra is null or new.tgl_bayar_mitra<date ''2026-01-01'' or new.tgl_bayar_mitra>(now() at time zone ''Asia/Jakarta'')::date or new.tgl_bayar_mitra<new.tgl_angsuran or new.total_ke_mitra is null or new.total_ke_mitra<=0 or new.pokok_ke_mitra is null or new.bh_ke_mitra is null or least(new.pokok_ke_mitra,new.bh_ke_mitra)<0 or new.total_ke_mitra<>new.pokok_ke_mitra+new.bh_ke_mitra then raise exception ''Data pembayaran bagi hasil tidak valid'';end if;\nif new.penyertaan_id is distinct from old.penyertaan_id or new.angsuran_id is distinct from old.angsuran_id or new.total_ke_mitra is distinct from old.total_ke_mitra or new.pokok_ke_mitra is distinct from old.pokok_ke_mitra or new.bh_ke_mitra is distinct from old.bh_ke_mitra then raise exception ''Nilai tagihan tidak boleh diubah saat pembayaran'';end if;\nif exists(select 1 from public.kas_mutasi where ref_type=''bmt_bh_eksternal'' and ref_id=new.id) or exists(select 1 from public.jurnal_umum where referensi in(''AUD-BH-HARJA-''||new.id,''AUTO-BH-EXT-''||new.id)) then raise exception ''Pembayaran sudah tercatat'';end if;\nselect k.saldo into strict v_saldo from public.kas k where id=5 for update;\nif v_saldo<new.total_ke_mitra then raise exception ''Saldo Kas BMT tidak mencukupi'';end if;\ninsert into public.kas_mutasi(kas_id,tipe,kategori,jumlah,tanggal,keterangan,operator,ref_type,ref_id) values(5,''keluar'',''bmt'',new.total_ke_mitra,new.tgl_bayar_mitra,''Pembayaran bagi hasil dan pokok mitra #''||new.id,op,''bmt_bh_eksternal'',new.id);\nupdate public.kas set saldo=kas.saldo-new.total_ke_mitra where id=5;\ninsert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tgl_bayar_mitra)::int),new.tgl_bayar_mitra,''Pembayaran bagi hasil mitra #''||new.id,''AUTO-BH-EXT-''||new.id,new.total_ke_mitra,new.total_ke_mitra,''posted'',op) returning id into j;\ninsert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case kode when ''2-103'' then new.pokok_ke_mitra when ''6-107'' then new.bh_ke_mitra else 0 end,case when kode=''1-102'' then new.total_ke_mitra else 0 end from public.coa where kode in(''2-103'',''6-107'',''1-102'');\nif not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=new.total_ke_mitra and sum(kredit)=new.total_ke_mitra) then raise exception ''Jurnal bagi hasil tidak balance'';end if;\nnew.kas_id:=5;new.dikonfirmasi_oleh:=op;new.tgl_konfirmasi:=now();return new;\nend $function$\n"},{"schema":"bmt_audit","name":"fn_post_bh_umum_v1","definition":"CREATE OR REPLACE FUNCTION bmt_audit.fn_post_bh_umum_v1()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''pg_catalog'', ''pg_temp''\nAS $function$\ndeclare p public.ubnb_modal_penyertaan%rowtype; a bmt_audit.pengesahan_profit_v1%rowtype; v_paid numeric; v_saldo numeric; j bigint; op text;\nbegin\nif tg_op=''DELETE'' then if old.sudah_dibayar then raise exception ''Pembayaran sudah dibukukan'';end if;return old;end if;\nif tg_op=''UPDATE'' and old.sudah_dibayar then if to_jsonb(new) is distinct from to_jsonb(old) then raise exception ''Pembayaran sudah dibukukan; koreksi melalui pengurus'';end if;return new;end if;\nselect * into strict p from public.ubnb_modal_penyertaan where id=new.penyertaan_id for update;\nif p.jenis<>''penuh'' then if new.sudah_dibayar then raise exception ''Penyertaan spesifik internal perlu prosedur tersendiri'';end if;return new;end if;\nperform private.ubnb_assert_finance(true);\nperform pg_advisory_xact_lock(782619,3);\nif new.pengesahan_id is null then raise exception ''Hak profit harus disahkan terlebih dahulu'';end if;\nselect * into strict a from bmt_audit.pengesahan_profit_v1 where id=new.pengesahan_id for update;\nif a.penyertaan_id<>p.id or new.anggota_id<>p.anggota_id or new.jumlah_bagi_hasil<=0 then raise exception ''Data pembayaran tidak sesuai pengesahan'';end if;\nselect coalesce(sum(jumlah_bagi_hasil),0) into v_paid from public.ubnb_modal_bagi_hasil where pengesahan_id=a.id and id<>new.id;\nif new.jumlah_bagi_hasil+v_paid>a.nominal then raise exception ''Nominal melebihi pengesahan'';end if;\nif not coalesce(new.sudah_dibayar,false) then return new;end if;\nif new.tgl_bayar is null or new.tgl_bayar<a.cutoff or new.tgl_bayar>(now() at time zone ''Asia/Jakarta'')::date or new.tgl_bayar<date ''2026-01-01'' then raise exception ''Tanggal pembayaran tidak valid'';end if;\nif exists(select 1 from bmt_audit.akad_pool_v3 where tanggal>new.tgl_bayar) then raise exception ''Pembayaran backdate memerlukan rekonstruksi komposisi modal'';end if;\nif exists(select 1 from public.kas_mutasi where ref_type=''bmt_bh_umum'' and ref_id=new.id) then raise exception ''Pembayaran sudah tercatat'';end if;\nif coalesce((select sum(nominal) from bmt_audit.bh_akrual_v1 where penyertaan_id=p.id and cutoff<=new.tgl_bayar),0)-coalesce((select sum(jumlah_bagi_hasil) from public.ubnb_modal_bagi_hasil where penyertaan_id=p.id and sudah_dibayar and id<>new.id),0)<new.jumlah_bagi_hasil then raise exception ''Hak belum dibukukan; lakukan tutup periode sebelum pembayaran'';end if;\nop:=coalesce(private.ubnb_secure_actor(''staff'')->>''username'',new.operator,''backend'');\nselect saldo into strict v_saldo from public.kas where id=5 for update;\nif v_saldo<new.jumlah_bagi_hasil then raise exception ''Saldo Kas BMT tidak mencukupi'';end if;\ninsert into public.kas_mutasi(kas_id,tipe,kategori,jumlah,tanggal,keterangan,operator,ref_type,ref_id) values(5,''keluar'',''bmt'',new.jumlah_bagi_hasil,new.tgl_bayar,''Bagi hasil ''||p.no_penyertaan,op,''bmt_bh_umum'',new.id);\nupdate public.kas set saldo=saldo-new.jumlah_bagi_hasil where id=5;\ninsert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tgl_bayar)::int),new.tgl_bayar,''Pembayaran bagi hasil ''||p.no_penyertaan,''AUTO-BH-UMUM-''||new.id,new.jumlah_bagi_hasil,new.jumlah_bagi_hasil,''posted'',op) returning id into j;\ninsert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode=''2-106'' then new.jumlah_bagi_hasil else 0 end,case when kode=''1-102'' then new.jumlah_bagi_hasil else 0 end from public.coa where kode in(''2-106'',''1-102'');\nif not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=new.jumlah_bagi_hasil and sum(kredit)=new.jumlah_bagi_hasil) then raise exception ''Jurnal tidak balance'';end if;\nupdate public.ubnb_modal_penyertaan set total_bagi_hasil=coalesce(total_bagi_hasil,0)+new.jumlah_bagi_hasil where id=p.id;\nnew.operator:=op;return new;end $function$\n"},{"schema":"bmt_audit","name":"koreksi_angsuran_v1","definition":"CREATE OR REPLACE FUNCTION bmt_audit.koreksi_angsuran_v1(p_id bigint, p_alasan text, p_operator text, p_jumlah numeric DEFAULT NULL::numeric, p_pokok numeric DEFAULT NULL::numeric, p_margin numeric DEFAULT NULL::numeric, p_lebih numeric DEFAULT 0)\n RETURNS bigint\n LANGUAGE plpgsql\n SET search_path TO ''pg_catalog'', ''pg_temp''\nAS $function$\ndeclare s public.bmt_angsuran%rowtype; a public.bmt_akad%rowtype; k public.kas_mutasi%rowtype; new_id bigint; paid numeric; arsip jsonb; \nbegin\nif current_user<>''postgres'' then raise exception ''Koreksi hanya melalui backend pengurus'';end if;\nif length(trim(coalesce(p_alasan,'''')))<5 or length(trim(coalesce(p_operator,'''')))=0 then raise exception ''Alasan dan operator wajib diisi'';end if;\nperform pg_advisory_xact_lock(782619,3);\nselect * into strict s from public.bmt_angsuran where id=p_id for update;\nselect * into strict a from public.bmt_akad where id=s.akad_id for update;\nif s.tanggal<date ''2026-01-01'' or not s.posting_atomik or a.jenis_akad<>''Murabahah'' then raise exception ''Hanya angsuran Murabahah atomik periode terbuka'';end if;\nif exists(select 1 from public.bmt_angsuran where tanggal>s.tanggal or (tanggal=s.tanggal and id>s.id)) or exists(select 1 from bmt_audit.akad_pool_v3 where tanggal>s.tanggal) then raise exception ''Koreksi historis memerlukan rekonstruksi lanjutan'';end if;\nif exists(select 1 from public.bmt_penyertaan_bh_eksternal where angsuran_id=s.id) or exists(select 1 from public.ubnb_modal_bagi_hasil where sudah_dibayar and penyertaan_id in(select penyertaan_id from bmt_audit.margin_pemodal_v3 where angsuran_id=s.id)) then raise exception ''Ada penyelesaian bagi hasil; koreksi manual diperlukan'';end if;\nselect * into strict k from public.kas_mutasi where ref_type=''bmt_angsuran'' and ref_id=s.id for update;\nif k.kas_id<>5 or k.tipe<>''masuk'' or k.jumlah<>s.jumlah then raise exception ''Mutasi kas tidak sesuai'';end if;\nselect jsonb_build_object(''angsuran'',to_jsonb(s),''kas'',to_jsonb(k),''akad'',to_jsonb(a),''jurnal'',(select jsonb_agg(jsonb_build_object(''header'',to_jsonb(j),''detail'',(select jsonb_agg(to_jsonb(d)) from public.jurnal_detail d where d.jurnal_id=j.id))) from public.jurnal_umum j where j.referensi in(''ANG-''||s.id,''AUD-BMT-REAL-''||s.id)),''margin'',(select to_jsonb(m) from bmt_audit.margin_pool_v3 m where m.angsuran_id=s.id),''pemodal'',(select jsonb_agg(to_jsonb(m)) from bmt_audit.margin_pemodal_v3 m where m.angsuran_id=s.id),''shu'',(select jsonb_agg(to_jsonb(l)) from public.ubnb_shu_trx_log l where l.ref_tabel=''bmt_angsuran'' and l.ref_id=s.id)) into arsip;\ninsert into bmt_audit.koreksi_angsuran_v1(angsuran_id,alasan,operator,arsip) values(s.id,p_alasan,p_operator,arsip);\ndelete from bmt_audit.margin_pemodal_v3 where angsuran_id=s.id;\ndelete from bmt_audit.margin_pool_v3 where angsuran_id=s.id;\nperform public.fn_hapus_jurnal_by_referensi(''AUD-BMT-REAL-''||s.id);\ndelete from public.kas_mutasi where id=k.id;\nupdate public.kas set saldo=saldo-s.jumlah where id=5;\nperform set_config(''bmt_audit.correction_id'',s.id::text,true);\ndelete from public.bmt_angsuran where id=s.id;\nperform set_config(''bmt_audit.correction_id'','''',true);\nif exists(select 1 from public.jurnal_umum where referensi in(''ANG-''||s.id,''AUD-BMT-REAL-''||s.id)) or exists(select 1 from public.ubnb_shu_trx_log where ref_tabel=''bmt_angsuran'' and ref_id=s.id) then raise exception ''Pembersihan transaksi turunan gagal'';end if;\nselect coalesce(sum(jumlah-kelebihan),0)+coalesce(a.uang_muka,0) into paid from public.bmt_angsuran where akad_id=a.id;\nupdate public.bmt_akad set total_angsuran=paid,sisa_angsuran=greatest(0,a.total_pembiayaan-paid),status=case when paid>=a.total_pembiayaan then ''Lunas'' else ''Belum Lunas'' end where id=a.id;\nif p_jumlah is not null then\ninsert into public.bmt_angsuran(akad_id,tanggal,jumlah,pokok,margin,kelebihan,kas_id,operator,catatan,posting_atomik) values(a.id,s.tanggal,p_jumlah,p_pokok,p_margin,p_lebih,5,p_operator,''Koreksi angsuran #''||s.id||'': ''||p_alasan,true) returning id into new_id;\nupdate bmt_audit.koreksi_angsuran_v1 set pengganti_id=new_id where angsuran_id=s.id;\nend if;\nreturn new_id;\nend $function$\n"},{"schema":"private","name":"bmt_kas_pencairan_wajib_v1","definition":"CREATE OR REPLACE FUNCTION private.bmt_kas_pencairan_wajib_v1()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO ''pg_catalog'', ''pg_temp''\nAS $function$begin if new.tanggal_akad is null or new.tanggal_akad<date ''2026-01-01'' then raise exception ''Periode akad ditutup atau tanggal tidak valid'';end if;if new.kas_pencairan_id is distinct from 5 then raise exception ''Akad baru wajib menggunakan Kas Pembiayaan BMT'';end if;return new;end $function$\n"},{"schema":"public","name":"bmt_modal_kembali_v1","definition":"CREATE OR REPLACE FUNCTION public.bmt_modal_kembali_v1(p_id bigint, p_tanggal date, p_bukti text)\n RETURNS bigint\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''pg_catalog'', ''pg_temp''\nAS $function$\ndeclare r public.ubnb_modal_penyertaan%rowtype; n numeric; i bigint; j bigint; m bigint; op text; v_saldo numeric;\nbegin\nperform private.ubnb_assert_finance(true);perform pg_advisory_xact_lock(782619,3);\nselect * into strict r from public.ubnb_modal_penyertaan where id=p_id for update;\nif p_tanggal is null or p_tanggal<date ''2026-01-01'' or p_tanggal>(now() at time zone ''Asia/Jakarta'')::date or r.tgl_jatuh_tempo is null or p_tanggal<r.tgl_jatuh_tempo or length(trim(coalesce(p_bukti,'''')))<3 then raise exception ''Pengembalian wajib pada/setelah jatuh tempo dengan bukti pembayaran aktual'';end if;\nselect id into i from bmt_audit.modal_kembali_v1 where penyertaan_id=p_id;\nif found then if exists(select 1 from bmt_audit.modal_kembali_v1 where id=i and tanggal=p_tanggal and bukti=p_bukti) then return i;end if;raise exception ''Modal sudah dikembalikan'';end if;\nif r.jenis<>''penuh'' or r.status<>''aktif'' then raise exception ''Hanya modal umum aktif yang didukung'';end if;\nif exists(select 1 from bmt_audit.akad_pemodal_v3 x join public.bmt_akad a on a.id=x.akad_id where x.penyertaan_id=p_id and a.sisa_angsuran>0) then raise exception ''Masih ada akad aktif terkait; pengembalian perlu penyelesaian hak pemodal'';end if;\nif exists(select 1 from public.ubnb_modal_bagi_hasil where penyertaan_id=p_id and not sudah_dibayar) or coalesce((select sum(hak) from bmt_audit.margin_pemodal_v3 where penyertaan_id=p_id and periode in(''berjalan'',''pasca_jatuh_tempo_review'')),0)>coalesce((select sum(jumlah_bagi_hasil) from public.ubnb_modal_bagi_hasil where penyertaan_id=p_id and sudah_dibayar),0) then raise exception ''Hak bagi hasil belum tuntas'';end if;\nif p_tanggal<greatest(coalesce((select max(tanggal) from bmt_audit.akad_pool_v3),date ''2026-01-01''),coalesce((select max(tanggal) from bmt_audit.margin_pool_v3),date ''2026-01-01'')) then raise exception ''Backdate pengembalian tidak didukung'';end if;\nn:=r.jumlah_modal;\nselect k.saldo into strict v_saldo from public.kas k where id=5 for update;\nif v_saldo<n then raise exception ''Kas BMT tidak cukup'';end if;\nop:=coalesce(private.ubnb_secure_actor(''staff'')->>''username'',''backend'');\ninsert into bmt_audit.modal_kembali_v1(penyertaan_id,tanggal,nominal,bukti,operator) values(p_id,p_tanggal,n,p_bukti,op) returning id into i;\ninsert into public.kas_mutasi(kas_id,tipe,jumlah,tanggal,keterangan,operator,kategori,ref_type,ref_id) values(5,''keluar'',n,p_tanggal,''Pengembalian modal ''||r.no_penyertaan,op,''bmt'',''bmt_modal_kembali'',i) returning id into m;\nupdate public.kas set saldo=public.kas.saldo-n where id=5;\ninsert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from p_tanggal)::int),p_tanggal,''Pengembalian modal ''||r.no_penyertaan,''AUTO-MODAL-KEMBALI-''||i,n,n,''posted'',op) returning id into j;\ninsert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode=''2-104'' then n else 0 end,case when kode=''1-102'' then n else 0 end from public.coa where kode in(''2-104'',''1-102'');\nif not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=n and sum(kredit)=n) then raise exception ''Jurnal pengembalian tidak balance'';end if;\nupdate public.ubnb_modal_penyertaan set status=''selesai'' where id=p_id;\nupdate bmt_audit.modal_kembali_v1 set jurnal_id=j,mutasi_id=m where id=i;\nreturn i;end $function$\n"},{"schema":"public","name":"fn_bmt_angsuran_atomik_v1","definition":"CREATE OR REPLACE FUNCTION public.fn_bmt_angsuran_atomik_v1()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO ''pg_catalog'', ''public'', ''pg_temp''\nAS $function$\ndeclare a public.bmt_akad%rowtype; j bigint; paid numeric; prior_margin numeric; real_margin numeric; dr text; cr text; amt numeric; k record;\nbegin\nif not new.posting_atomik then return new; end if;\nselect * into strict a from public.bmt_akad where id=new.akad_id for update;\nif new.tanggal<a.tanggal_akad or new.kas_id is distinct from 5 then raise exception ''Tanggal atau kas angsuran tidak valid'';end if;\nselect coalesce(sum(jumlah-kelebihan),0),coalesce(sum(margin),0) into paid,prior_margin from public.bmt_angsuran where akad_id=a.id and id<>new.id;\nif new.kelebihan<>greatest(0,paid+coalesce(a.uang_muka,0)+new.jumlah-a.total_pembiayaan) or (new.kelebihan>0 and a.jenis_akad<>''Murabahah'') then raise exception ''Kelebihan pembayaran tidak sesuai sisa kewajiban'';end if;\nif new.kelebihan>0 and new.margin<>greatest(0,a.total_margin-prior_margin) then raise exception ''Pelunasan margin harus sesuai sisa kontrak'';end if;\nif exists(select 1 from public.kas_mutasi where ref_type=''bmt_angsuran'' and ref_id=new.id) then raise exception ''Mutasi angsuran sudah ada'';end if;\nperform 1 from public.kas where id=5 for update;\nif not found then raise exception ''Kas BMT tidak tersedia'';end if;\ninsert into public.kas_mutasi(kas_id,tipe,kategori,jumlah,tanggal,keterangan,operator,ref_type,ref_id) values(5,''masuk'',''angsuran'',new.jumlah,new.tanggal,''Angsuran: ''||a.nama_jamaah||'' (''||a.no_akad||'')'',new.operator,''bmt_angsuran'',new.id);\nupdate public.kas set saldo=saldo+new.jumlah where id=5;\nif a.jenis_akad=''Murabahah'' then\n if not exists(select 1 from public.jurnal_umum where referensi=''AUD-BMT-MARGIN-''||a.id) and a.tanggal_akad>=date ''2026-01-01'' and not exists(select 1 from public.jurnal_umum where referensi=''AUTO-BMT-MARGIN-''||a.id) then raise exception ''Jurnal pembentukan margin akad belum tersedia'';end if;\n real_margin:=least(new.margin,greatest(0,a.total_margin-prior_margin));\n if real_margin<>new.margin then raise exception ''Margin melampaui sisa kontrak'';end if;\n if real_margin>0 then\n insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tanggal)::int),new.tanggal,''Realisasi margin ''||a.no_akad,''AUD-BMT-REAL-''||new.id,real_margin,real_margin,''posted'',new.operator) returning id into j;\n insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode=''1-114'' then real_margin else 0 end,case when kode=''4-301'' then real_margin else 0 end from public.coa where kode in(''1-114'',''4-301'');\n if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=real_margin and sum(kredit)=real_margin) then raise exception ''Jurnal margin tidak balance'';end if;\n end if;\nelsif a.jenis_akad=''Ijarah'' then\n if not exists(select 1 from public.jurnal_umum where referensi=''AUD-IJ-ASSET-''||a.id or (referensi=''AKAD-''||a.id and a.ijarah_mulai is not null)) then raise exception ''Aset Ijarah belum direkonsiliasi'';end if;\n insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tanggal)::int),new.tanggal,''Reklasifikasi angsuran Ijarah ''||a.no_akad,''AUD-IJ-PAY-''||new.id,new.jumlah,new.jumlah,''posted'',new.operator) returning id into j;\n insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case kode when ''1-111'' then new.pokok when ''1-112'' then new.margin else 0 end,case when kode=''1-116'' then new.jumlah else 0 end from public.coa where kode in(''1-111'',''1-112'',''1-116'');\n if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=new.jumlah and sum(kredit)=new.jumlah) then raise exception ''Jurnal Ijarah tidak balance'';end if;\nelse raise exception ''Jenis akad belum mendukung posting atomik'';end if;\nupdate public.bmt_akad set total_angsuran=paid+new.jumlah-new.kelebihan+coalesce(a.uang_muka,0),sisa_angsuran=greatest(0,a.total_pembiayaan-paid-new.jumlah+new.kelebihan-coalesce(a.uang_muka,0)),status=case when paid+new.jumlah-new.kelebihan+coalesce(a.uang_muka,0)>=a.total_pembiayaan then ''Lunas'' else ''Belum Lunas'' end where id=a.id;\nreturn new;\nend $function$\n"},{"schema":"public","name":"fn_bmt_guard_angsuran_v3","definition":"CREATE OR REPLACE FUNCTION public.fn_bmt_guard_angsuran_v3()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO ''pg_catalog'', ''public'', ''pg_temp''\nAS $function$\nbegin\n if tg_op=''INSERT'' then\n   if new.tanggal is null or new.tanggal<date ''2026-01-01'' then raise exception ''Periode 2025 sudah ditutup''; end if;\n   if new.jumlah is null or new.jumlah<=0 or new.pokok is null or new.margin is null or new.pokok<0 or new.margin<0 or new.jumlah<>new.pokok+new.margin+new.kelebihan or coalesce(new.denda,0)<>0 then raise exception ''Angsuran wajib sama dengan pokok + margin; denda perlu prosedur khusus'';end if;\n   if new.kas_id is not null and new.kas_id<>5 then raise exception ''Penerimaan angsuran wajib melalui Kas BMT'';end if;\n   if new.kelebihan<0 or (new.kelebihan>0 and not new.posting_atomik) then raise exception ''Kelebihan hanya untuk posting atomik''; end if;\n   return new;\n end if;\n if tg_op=''UPDATE'' and (new.kelebihan is distinct from old.kelebihan or new.posting_atomik is distinct from old.posting_atomik) then raise exception ''Penanda posting tidak boleh diubah'';end if;\n if tg_op=''UPDATE'' and new.akad_id is not distinct from old.akad_id and new.kas_id is not distinct from old.kas_id and new.tanggal is not distinct from old.tanggal and new.jumlah is not distinct from old.jumlah and new.pokok is not distinct from old.pokok and new.margin is not distinct from old.margin and new.denda is not distinct from old.denda then return new; end if;\n if old.tanggal<date ''2026-01-01'' then raise exception ''Periode 2025 sudah ditutup''; end if;\n if tg_op=''DELETE'' and current_user=''postgres'' and current_setting(''bmt_audit.correction_id'',true)=old.id::text then return old;end if;\n if tg_op=''UPDATE'' then\n   if new.akad_id is distinct from old.akad_id or new.kas_id is distinct from old.kas_id or new.denda is distinct from old.denda then raise exception ''Perubahan akad, kas atau denda memerlukan prosedur koreksi pengurus'';end if;\n   if new.tanggal is null or new.tanggal<date ''2026-01-01'' then raise exception ''Tanggal angsuran tidak valid atau periode ditutup'';end if;\n end if;\n if old.posting_atomik or exists(select 1 from public.jurnal_umum where referensi in (''AUD-BMT-REAL-''||old.id,''AUD-IJ-PAY-''||old.id)) or exists(select 1 from public.bmt_penyertaan_bh_eksternal where angsuran_id=old.id and sudah_dibayar) then raise exception ''Angsuran telah direkonsiliasi atau bagi hasil telah dibayar. Koreksi melalui pengurus agar jurnal, modal dan bagi hasil tetap sinkron'';end if;\n if tg_op=''DELETE'' then raise exception ''Penghapusan langsung angsuran dinonaktifkan sampai prosedur pembatalan atomik tersedia'';end if;\n return new;\nend $function$\n"},{"schema":"public","name":"fn_bmt_margin_dp_v1","definition":"CREATE OR REPLACE FUNCTION public.fn_bmt_margin_dp_v1()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO ''pg_catalog'', ''public'', ''pg_temp''\nAS $function$\ndeclare m numeric:=coalesce(new.total_margin,0); dp numeric:=coalesce(new.uang_muka,0); cost numeric:=coalesce(new.harga_beli,0)-coalesce(new.diskon,0); j bigint; \nbegin\nif new.kas_pencairan_id is null or new.jenis_akad is distinct from ''Murabahah'' then return new; end if;\nif m<0 or dp<0 or dp>cost or new.total_pembiayaan is distinct from cost+m then raise exception ''Komposisi harga, margin atau DP tidak valid'';end if;\nif m>0 then\n insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tanggal_akad)::int),new.tanggal_akad,''Pembentukan margin ''||new.no_akad,''AUTO-BMT-MARGIN-''||new.id,m,m,''posted'',new.operator) returning id into j;\n insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode=''1-112'' then m else 0 end,case when kode=''1-114'' then m else 0 end from public.coa where kode in(''1-112'',''1-114'');\n if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=m and sum(kredit)=m) then raise exception ''Jurnal pembentukan margin tidak balance'';end if;\nend if;\nif dp>0 then\n perform 1 from public.kas where id=5 for update;\n if not found then raise exception ''Kas BMT tidak tersedia'';end if;\n insert into public.kas_mutasi(kas_id,tipe,kategori,jumlah,tanggal,keterangan,operator,ref_type,ref_id) values(5,''masuk'',''bmt'',dp,new.tanggal_akad,''DP diterima ''||new.no_akad,new.operator,''bmt_dp'',new.id);\n update public.kas set saldo=saldo+dp where id=5;\n insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tanggal_akad)::int),new.tanggal_akad,''DP diterima ''||new.no_akad,''AUTO-BMT-DP-''||new.id,dp,dp,''posted'',new.operator) returning id into j;\n insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode=''1-102'' then dp else 0 end,case when kode=''1-111'' then dp else 0 end from public.coa where kode in(''1-102'',''1-111'');\n if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=dp and sum(kredit)=dp) then raise exception ''Jurnal DP tidak balance'';end if;\nend if;\nreturn new;end $function$\n"},{"schema":"public","name":"fn_bmt_post_pembelian_v2","definition":"CREATE OR REPLACE FUNCTION public.fn_bmt_post_pembelian_v2()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO ''pg_catalog'', ''public'', ''pg_temp''\nAS $function$\ndeclare v_cost numeric; v_code text; v_jid bigint; v_date date; begin\nif new.kas_pencairan_id is null then return new; end if; if new.jenis_akad=''Ijarah'' and (new.ijarah_mulai is null or new.ijarah_akhir is null or new.ijarah_mulai<new.tanggal_akad or new.ijarah_akhir<new.ijarah_mulai or coalesce(new.uang_muka,0)<>0 or coalesce(new.diskon,0)<>0 or new.total_pembiayaan<>new.harga_beli+new.total_margin) then raise exception ''Ijarah wajib memiliki masa manfaat valid tanpa DP/diskon'';end if;\nv_date:=new.tanggal_akad;\nv_cost:=coalesce(new.harga_beli,0)-coalesce(new.diskon,0);\nif v_date < date ''2026-01-01'' or v_cost<=0 or coalesce(new.diskon,0)<0 or coalesce(new.no_akad,'''')='''' or coalesce(new.objek_pembiayaan,'''')='''' then raise exception ''Data pembelian akad tidak valid atau periode ditutup''; end if;\nif new.jenis_akad=''Murabahah'' and (new.tgl_perolehan_barang is null or new.tgl_perolehan_barang>v_date or new.tgl_perolehan_barang<date ''2026-01-01'') then raise exception ''Tanggal perolehan barang wajib valid''; end if;\nselect kode_coa into strict v_code from public.kas where id=new.kas_pencairan_id for update;\nif (select saldo from public.kas where id=new.kas_pencairan_id)<v_cost then raise exception ''Saldo kas tidak cukup'';end if; if v_code not in (''1-101'',''1-102'') or v_code is null then raise exception ''Kas pembiayaan harus Kas Utama atau Kas BMT''; end if;\nif exists(select 1 from public.jurnal_umum where referensi in (''AKAD-''||new.id,''AUD-BMT-BELI-''||new.id)) or exists(select 1 from public.kas_mutasi where ref_type=''bmt_akad'' and ref_id=new.id) then raise exception ''Pencairan sudah tercatat''; end if;\ninsert into public.kas_mutasi(kas_id,tipe,kategori,jumlah,tanggal,keterangan,operator,ref_type,ref_id) values(new.kas_pencairan_id,''keluar'',''keluar'',v_cost,v_date,''Pencairan ''||new.no_akad||'' — ''||new.nama_jamaah,new.operator,''bmt_akad'',new.id);\nupdate public.kas set saldo=saldo-v_cost where id=new.kas_pencairan_id;\ninsert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from v_date)::int),v_date,''Pembelian/pencairan BMT ''||new.no_akad||'' — ''||new.objek_pembiayaan,''AKAD-''||new.id,v_cost,v_cost,''posted'',new.operator) returning id into v_jid;\ninsert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select v_jid,id,kode,nama,case when kode=case when new.jenis_akad=''Ijarah'' then ''1-115'' else ''1-111'' end then v_cost else 0 end,case when kode=v_code then v_cost else 0 end from public.coa where kode in (case when new.jenis_akad=''Ijarah'' then ''1-115'' else ''1-111'' end,v_code);\nif not exists(select 1 from public.jurnal_detail where jurnal_id=v_jid group by jurnal_id having sum(debit)=v_cost and sum(kredit)=v_cost) then raise exception ''Jurnal pembelian tidak balance''; end if;\nreturn new; end $function$\n"},{"schema":"public","name":"fn_jurnal_angsuran_bmt","definition":"CREATE OR REPLACE FUNCTION public.fn_jurnal_angsuran_bmt()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO ''pg_catalog'', ''public'', ''extensions'', ''pg_temp''\nAS $function$\nDECLARE\n  v_no TEXT; v_jid BIGINT; v_tgl DATE; v_nama TEXT;\n  v_pokok NUMERIC; v_margin NUMERIC;\n  c102 BIGINT; c111 BIGINT; c1112 BIGINT;\nBEGIN\n  v_tgl    := COALESCE(NEW.tanggal, CURRENT_DATE);\n  v_no     := fn_next_no_jurnal(EXTRACT(YEAR FROM v_tgl)::INT);\n  v_pokok  := COALESCE(NEW.pokok, NEW.jumlah, 0);\n  v_margin := COALESCE(NEW.margin, 0);\n  SELECT nama_jamaah INTO v_nama FROM bmt_akad WHERE id=NEW.akad_id;\n  SELECT id INTO c102  FROM coa WHERE kode=''1-102'';\n  SELECT id INTO c111  FROM coa WHERE kode=''1-111'';\n  SELECT id INTO c1112 FROM coa WHERE kode=''1-112'';\n\n  INSERT INTO jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator)\n  VALUES(v_no, v_tgl, ''Angsuran BMT - ''||COALESCE(v_nama,''Nasabah''), ''ANG-''||NEW.id,\n    NEW.jumlah, NEW.jumlah, ''posted'', ''sistem_auto'')\n  RETURNING id INTO v_jid;\n\n  -- Debit: Kas BMT masuk\n  INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)\n  VALUES(v_jid, c102, ''1-102'', ''Kas BMT'', NEW.jumlah, 0);\n\n  -- Kredit: Piutang Pokok berkurang\n  IF v_pokok > 0 THEN\n    INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)\n    VALUES(v_jid, c111, ''1-111'', ''Piutang Pokok Pembiayaan'', 0, v_pokok);\n  END IF;\n\n  -- Kredit: Piutang Laba berkurang (bukan lagi ke 4-301 Pendapatan)\n  IF v_margin > 0 THEN\n    INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)\n    VALUES(v_jid, c1112, ''1-112'', ''Piutang Laba Pembiayaan'', 0, v_margin);\n  END IF;\n\n  IF NEW.kelebihan>0 THEN\n    INSERT INTO public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) SELECT v_jid,id,kode,nama,0,NEW.kelebihan FROM public.coa WHERE kode=''4-301'';\n  END IF;\n  IF NOT EXISTS(SELECT 1 FROM public.jurnal_detail WHERE jurnal_id=v_jid GROUP BY jurnal_id HAVING sum(debit)=NEW.jumlah AND sum(kredit)=NEW.jumlah) THEN RAISE EXCEPTION ''Jurnal angsuran tidak balance''; END IF;\n  RETURN NEW;\nEND;\n$function$\n"},{"schema":"public","name":"fn_jurnal_wadiah_mutasi","definition":"CREATE OR REPLACE FUNCTION public.fn_jurnal_wadiah_mutasi()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''pg_catalog'', ''pg_temp''\nAS $function$\ndeclare j bigint; k text; d text; c text;\nbegin\nif new.tipe not in (''setor'',''tarik'') or new.jumlah<=0 or new.kas_id not in(1,5) or new.tanggal is null then raise exception ''Transaksi Wadiah tidak valid'';end if;\nselect kode_coa into strict k from public.kas where id=new.kas_id;\nd:=case when new.tipe=''setor'' then k else ''2-105'' end;c:=case when new.tipe=''setor'' then ''2-105'' else k end;\ninsert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tanggal)::int),new.tanggal,initcap(new.tipe)||'' Wadiah'',''WAD-''||new.id,new.jumlah,new.jumlah,''posted'',new.operator) returning id into j;\ninsert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode=d then new.jumlah else 0 end,case when kode=c then new.jumlah else 0 end from public.coa where kode in(d,c);\nif not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=new.jumlah and sum(kredit)=new.jumlah) then raise exception ''Jurnal Wadiah tidak seimbang'';end if;return new;end $function$\n"},{"schema":"public","name":"fn_sync_angsuran_edit","definition":"CREATE OR REPLACE FUNCTION public.fn_sync_angsuran_edit()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO ''pg_catalog'', ''public'', ''extensions'', ''pg_temp''\nAS $function$\nDECLARE\n  v_penyertaan  bmt_penyertaan_eksternal%ROWTYPE;\n  v_no_akad     text;\n  v_nama        text;\n  v_no          text;\n  v_jid         bigint;\n  c102 bigint; c111 bigint; c1112 bigint;\n  v_bh          bmt_penyertaan_bh_eksternal%ROWTYPE;\n  v_bh_mitra    numeric; v_bh_ubnb numeric;\n  v_delta_pokok numeric;\nBEGIN\n  SELECT nama_jamaah, no_akad INTO v_nama, v_no_akad FROM bmt_akad WHERE id = NEW.akad_id;\n\n  -- 1) JURNAL: hapus referensi ANG-<id> lalu buat ulang dengan nilai baru\n  PERFORM fn_hapus_jurnal_by_referensi(''ANG-'' || NEW.id);\n\n  SELECT id INTO c102  FROM coa WHERE kode=''1-102'';\n  SELECT id INTO c111  FROM coa WHERE kode=''1-111'';\n  SELECT id INTO c1112 FROM coa WHERE kode=''1-112'';\n  v_no := fn_next_no_jurnal(EXTRACT(YEAR FROM COALESCE(NEW.tanggal, CURRENT_DATE))::int);\n\n  INSERT INTO jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator)\n  VALUES(v_no, COALESCE(NEW.tanggal, CURRENT_DATE),\n         ''Angsuran BMT - '' || COALESCE(v_nama,''Nasabah''),\n         ''ANG-'' || NEW.id, NEW.jumlah, NEW.jumlah, ''posted'', ''sistem_auto_edit'')\n  RETURNING id INTO v_jid;\n\n  INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)\n  VALUES(v_jid, c102, ''1-102'', ''Kas BMT'', NEW.jumlah, 0);\n\n  IF COALESCE(NEW.pokok,0) > 0 THEN\n    INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)\n    VALUES(v_jid, c111, ''1-111'', ''Piutang Pokok Pembiayaan'', 0, NEW.pokok);\n  END IF;\n\n  IF COALESCE(NEW.margin,0) > 0 THEN\n    INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)\n    VALUES(v_jid, c1112, ''1-112'', ''Piutang Laba Pembiayaan'', 0, NEW.margin);\n  END IF;\n\n  -- 2) KAS_MUTASI: update best-effort berdasarkan nilai lama + nomor akad\n  UPDATE kas_mutasi\n  SET jumlah = NEW.jumlah, tanggal = NEW.tanggal\n  WHERE id = (\n    SELECT id FROM kas_mutasi\n    WHERE tipe=''masuk'' AND kategori=''angsuran''\n      AND jumlah = OLD.jumlah AND tanggal = OLD.tanggal\n      AND keterangan LIKE ''%'' || COALESCE(v_no_akad,''###NOMATCH###'') || ''%''\n    ORDER BY id DESC LIMIT 1\n  );\n\n  -- 3) BH EKSTERNAL: sinkron hanya yang BELUM dibayar\n  SELECT * INTO v_bh FROM bmt_penyertaan_bh_eksternal\n  WHERE angsuran_id = NEW.id ORDER BY id DESC LIMIT 1;\n\n  IF FOUND THEN\n    IF v_bh.sudah_dibayar THEN\n      RAISE NOTICE ''[sync_angsuran_edit] BH id % sudah dibayar, tidak diubah (perlu cek manual)'', v_bh.id;\n    ELSE\n      SELECT * INTO v_penyertaan FROM bmt_penyertaan_eksternal WHERE id = v_bh.penyertaan_id;\n      v_bh_mitra    := ROUND(COALESCE(NEW.margin,0) * (v_penyertaan.nisbah_mitra_pct / 100.0));\n      v_bh_ubnb     := ROUND(COALESCE(NEW.margin,0) * (v_penyertaan.nisbah_ubnb_pct  / 100.0));\n      v_delta_pokok := COALESCE(NEW.pokok,0) - COALESCE(v_bh.pokok_ke_mitra,0);\n\n      UPDATE bmt_penyertaan_bh_eksternal\n      SET angsuran_masuk = COALESCE(NEW.jumlah,0),\n          pokok_nasabah  = COALESCE(NEW.pokok,0),\n          ujroh_nasabah  = COALESCE(NEW.margin,0),\n          pokok_ke_mitra = COALESCE(NEW.pokok,0),\n          bh_ke_mitra    = v_bh_mitra,\n          bh_ubnb        = v_bh_ubnb,\n          total_ke_mitra = COALESCE(NEW.pokok,0) + v_bh_mitra,\n          tgl_angsuran   = NEW.tanggal\n      WHERE id = v_bh.id;\n\n      UPDATE bmt_penyertaan_eksternal\n      SET total_pokok_kembali = GREATEST(0, COALESCE(total_pokok_kembali,0) + v_delta_pokok),\n          updated_at = now()\n      WHERE id = v_bh.penyertaan_id;\n    END IF;\n  END IF;\n\n  RETURN NEW;\n\nEXCEPTION WHEN OTHERS THEN\n  RAISE NOTICE ''[sync_angsuran_edit] ERROR angsuran_id=%: %'', NEW.id, SQLERRM;\n  RETURN NEW;\nEND;\n$function$\n"},{"schema":"public","name":"fn_sync_angsuran_on_update","definition":"CREATE OR REPLACE FUNCTION public.fn_sync_angsuran_on_update()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''pg_catalog'', ''public'', ''extensions'', ''pg_temp''\nAS $function$\nDECLARE\n  v_no TEXT; v_jid BIGINT; v_tgl DATE; v_nama TEXT; v_no_akad TEXT;\n  v_pokok NUMERIC; v_margin NUMERIC;\n  c102 BIGINT; c111 BIGINT; c1112 BIGINT;\n  v_kas_count INT; v_mutasi_id bigint; v_kas_id bigint; v_kas_lama numeric;\n  v_pen RECORD;\n  v_bh_mitra NUMERIC; v_bh_ubnb NUMERIC;\nBEGIN\n  -- Hanya jalan kalau ada perubahan relevan\n  IF NEW.jumlah  IS NOT DISTINCT FROM OLD.jumlah\n AND NEW.pokok   IS NOT DISTINCT FROM OLD.pokok\n AND NEW.margin  IS NOT DISTINCT FROM OLD.margin\n AND NEW.tanggal IS NOT DISTINCT FROM OLD.tanggal THEN\n    RETURN NEW;\n  END IF;\n\n  IF OLD.tanggal < DATE ''2026-01-01'' OR NEW.tanggal < DATE ''2026-01-01'' THEN RAISE EXCEPTION ''Periode 2025 dan sebelumnya sudah ditutup''; END IF;\n  IF NEW.akad_id IS DISTINCT FROM OLD.akad_id OR NEW.kas_id IS DISTINCT FROM OLD.kas_id THEN RAISE EXCEPTION ''Perubahan akad/kas tidak didukung oleh prosedur edit''; END IF;\n  IF NEW.jumlah<=0 OR COALESCE(NEW.pokok,0)<0 OR COALESCE(NEW.margin,0)<0 OR COALESCE(NEW.denda,0)<>0 OR NEW.jumlah<>COALESCE(NEW.pokok,0)+COALESCE(NEW.margin,0) THEN RAISE EXCEPTION ''Jumlah harus sama dengan pokok + margin; denda perlu prosedur terpisah''; END IF;\n  IF EXISTS(SELECT 1 FROM public.bmt_penyertaan_bh_eksternal WHERE angsuran_id=NEW.id AND sudah_dibayar) THEN RAISE EXCEPTION ''Bagi hasil sudah dibayar; koreksi melalui pengurus''; END IF;\n  v_tgl    := COALESCE(NEW.tanggal, CURRENT_DATE);\n  v_pokok  := COALESCE(NEW.pokok, NEW.jumlah, 0);\n  v_margin := COALESCE(NEW.margin, 0);\n  SELECT nama_jamaah, no_akad INTO v_nama, v_no_akad FROM bmt_akad WHERE id = NEW.akad_id;\n\n  -- 1) JURNAL: void lama (referensi ANG-<id>) lalu repost dgn nilai baru\n  PERFORM fn_hapus_jurnal_by_referensi(''ANG-'' || NEW.id);\n\n  SELECT id INTO c102  FROM coa WHERE kode=''1-102'';\n  SELECT id INTO c111  FROM coa WHERE kode=''1-111'';\n  SELECT id INTO c1112 FROM coa WHERE kode=''1-112'';\n  v_no := fn_next_no_jurnal(EXTRACT(YEAR FROM v_tgl)::INT);\n\n  INSERT INTO jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator)\n  VALUES(v_no, v_tgl, ''Angsuran BMT - ''||COALESCE(v_nama,''Nasabah''), ''ANG-''||NEW.id,\n    NEW.jumlah, NEW.jumlah, ''posted'', ''sistem_auto_edit'')\n  RETURNING id INTO v_jid;\n\n  INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)\n  VALUES(v_jid, c102, ''1-102'', ''Kas BMT'', NEW.jumlah, 0);\n  IF v_pokok > 0 THEN\n    INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)\n    VALUES(v_jid, c111, ''1-111'', ''Piutang Pokok Pembiayaan'', 0, v_pokok);\n  END IF;\n  IF v_margin > 0 THEN\n    INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)\n    VALUES(v_jid, c1112, ''1-112'', ''Piutang Laba Pembiayaan'', 0, v_margin);\n  END IF;\n\n  -- Match direct reference first; legacy fallback only if unique.\n  SELECT count(*), min(id) INTO v_kas_count, v_mutasi_id\n  FROM public.kas_mutasi WHERE tipe=''masuk'' AND ref_type=''bmt_angsuran'' AND ref_id=NEW.id;\n  IF v_kas_count=0 THEN\n    SELECT count(*),min(id) INTO v_kas_count,v_mutasi_id FROM public.kas_mutasi\n    WHERE tipe=''masuk'' AND ref_id IS NULL AND jumlah=OLD.jumlah AND tanggal=OLD.tanggal\n      AND keterangan ILIKE ''%''||v_no_akad||''%'' AND keterangan ILIKE ''Angsuran%'';\n  END IF;\n  IF v_kas_count<>1 THEN RAISE EXCEPTION ''Mutasi kas angsuran % tidak unik atau belum ditemukan; hubungi pengurus'',NEW.id; END IF;\n  SELECT kas_id,jumlah INTO STRICT v_kas_id,v_kas_lama FROM public.kas_mutasi WHERE id=v_mutasi_id FOR UPDATE;\n  IF v_kas_lama<>OLD.jumlah OR v_kas_id<>5 OR (NEW.kas_id IS NOT NULL AND NEW.kas_id<>v_kas_id) THEN RAISE EXCEPTION ''Mutasi kas angsuran % belum sesuai; perlu rekonsiliasi'',NEW.id; END IF;\n  UPDATE public.kas_mutasi SET jumlah=NEW.jumlah,tanggal=NEW.tanggal,ref_type=''bmt_angsuran'',ref_id=NEW.id WHERE id=v_mutasi_id;\n  UPDATE public.kas SET saldo=saldo+NEW.jumlah-v_kas_lama WHERE id=v_kas_id;\n\n  -- 3) BH EKSTERNAL: sync yang BELUM dibayar + koreksi total_pokok_kembali\n  FOR v_pen IN\n    SELECT pe.* FROM bmt_penyertaan_eksternal pe\n    WHERE NEW.akad_id = ANY(pe.akad_ids) AND pe.status=''aktif''\n  LOOP\n    v_bh_mitra := ROUND(v_margin * (v_pen.nisbah_mitra_pct/100.0));\n    v_bh_ubnb  := ROUND(v_margin * (v_pen.nisbah_ubnb_pct /100.0));\n\n    UPDATE bmt_penyertaan_bh_eksternal\n    SET angsuran_masuk = NEW.jumlah,\n        pokok_nasabah  = v_pokok,\n        ujroh_nasabah  = v_margin,\n        pokok_ke_mitra = v_pokok,\n        bh_ke_mitra    = v_bh_mitra,\n        bh_ubnb        = v_bh_ubnb,\n        total_ke_mitra = v_pokok + v_bh_mitra\n    WHERE angsuran_id = NEW.id\n      AND penyertaan_id = v_pen.id\n      AND sudah_dibayar = false;\n\n    IF EXISTS (SELECT 1 FROM bmt_penyertaan_bh_eksternal\n               WHERE angsuran_id=NEW.id AND penyertaan_id=v_pen.id AND sudah_dibayar=true) THEN\n      RAISE NOTICE ''[sync_angsuran] BH sudah dibayar utk angsuran %, nilai TIDAK diubah - cek manual'', NEW.id;\n    END IF;\n\n    UPDATE bmt_penyertaan_eksternal\n    SET total_pokok_kembali = (SELECT COALESCE(SUM(pokok_ke_mitra),0)\n                               FROM bmt_penyertaan_bh_eksternal WHERE penyertaan_id=v_pen.id),\n        updated_at = now()\n    WHERE id = v_pen.id;\n  END LOOP;\n\n  UPDATE public.bmt_akad a SET total_angsuran=s.paid+COALESCE(a.uang_muka,0),sisa_angsuran=GREATEST(0,a.total_pembiayaan-s.paid-COALESCE(a.uang_muka,0)),status=CASE WHEN s.paid+COALESCE(a.uang_muka,0)>=a.total_pembiayaan THEN ''Lunas'' ELSE ''Belum Lunas'' END FROM (SELECT COALESCE(sum(jumlah),0) paid FROM public.bmt_angsuran WHERE akad_id=NEW.akad_id) s WHERE a.id=NEW.akad_id;\n  IF NOT EXISTS(SELECT 1 FROM public.jurnal_detail WHERE jurnal_id=v_jid GROUP BY jurnal_id HAVING sum(debit)=NEW.jumlah AND sum(kredit)=NEW.jumlah) THEN RAISE EXCEPTION ''Jurnal angsuran tidak balance''; END IF;\n  RETURN NEW;\nEND;\n$function$\n"},{"schema":"public","name":"bmt_biaya_operasional_v1","definition":"CREATE OR REPLACE FUNCTION public.bmt_biaya_operasional_v1(p_request uuid, p_tanggal date, p_kas bigint, p_nominal numeric, p_keterangan text, p_bukti text)\n RETURNS bigint\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''pg_catalog'', ''pg_temp''\nAS $function$\ndeclare a jsonb; op text; v_id bigint; v_j bigint; v_m bigint; k public.kas%rowtype; v_old bmt_audit.biaya_operasional_v1%rowtype;\nbegin\nperform private.ubnb_assert_finance(true);\na:=private.ubnb_secure_actor(''staff'');op:=coalesce(a->>''username'',''backend'');\nif p_request is null or p_tanggal is null or p_tanggal<date ''2026-01-01'' or p_tanggal>(now() at time zone ''Asia/Jakarta'')::date or p_kas is null or p_kas not in(1,5) or p_nominal is null or p_nominal<=0 or p_nominal<>round(p_nominal) or length(trim(coalesce(p_keterangan,'''')))<5 or length(trim(coalesce(p_bukti,'''')))<3 then raise exception ''Tanggal, kas, nominal, keterangan dan bukti wajib valid'';end if;\nperform pg_advisory_xact_lock(hashtextextended(p_request::text,0));\nselect * into v_old from bmt_audit.biaya_operasional_v1 where request_id=p_request;\nif found then if (v_old.tanggal,v_old.kas_id,v_old.nominal,v_old.keterangan,v_old.bukti) is distinct from (p_tanggal,p_kas,p_nominal,p_keterangan,p_bukti) then raise exception ''Referensi permintaan telah dipakai'';end if;return v_old.id;end if;\nselect * into strict k from public.kas where id=p_kas for update;\nif k.saldo<p_nominal then raise exception ''Saldo kas tidak cukup'';end if;\nif exists(select 1 from bmt_audit.biaya_operasional_v1 where tanggal=p_tanggal and kas_id=p_kas and nominal=p_nominal and bukti=p_bukti) then raise exception ''Bukti biaya sudah tercatat'';end if;\ninsert into bmt_audit.biaya_operasional_v1(request_id,tanggal,kas_id,nominal,keterangan,bukti,operator) values(p_request,p_tanggal,p_kas,p_nominal,p_keterangan,p_bukti,op) returning id into v_id;\ninsert into public.kas_mutasi(kas_id,tipe,jumlah,tanggal,keterangan,operator,kategori,ref_type,ref_id) values(p_kas,''keluar'',p_nominal,p_tanggal,''Biaya BMT: ''||p_keterangan,op,''bmt'',''bmt_biaya_operasional'',v_id) returning id into v_m;\nupdate public.kas set saldo=saldo-p_nominal where id=p_kas;\ninsert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from p_tanggal)::int),p_tanggal,''Biaya BMT: ''||p_keterangan,''AUTO-BMT-BIAYA-''||v_id,p_nominal,p_nominal,''posted'',op) returning id into v_j;\ninsert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select v_j,id,kode,nama,case when kode=''6-102'' then p_nominal else 0 end,case when kode=k.kode_coa then p_nominal else 0 end from public.coa where kode in(''6-102'',k.kode_coa);\nif not exists(select 1 from public.jurnal_detail where jurnal_id=v_j group by jurnal_id having sum(debit)=p_nominal and sum(kredit)=p_nominal) then raise exception ''Jurnal biaya tidak seimbang'';end if;\nupdate bmt_audit.biaya_operasional_v1 set jurnal_id=v_j,mutasi_id=v_m where id=v_id;return v_id;end $function$\n"},{"schema":"public","name":"ubnb_recalc_kas_bmt_2026","definition":"CREATE OR REPLACE FUNCTION public.ubnb_recalc_kas_bmt_2026()\n RETURNS numeric\n LANGUAGE plpgsql\n SET search_path TO ''pg_catalog'', ''public'', ''pg_temp''\nAS $function$\ndeclare v_open numeric; v_net numeric; v_saldo numeric; begin\nperform 1 from public.kas where id=5 and kode_coa=''1-102'' for update;\nif not found then raise exception ''Kas BMT tidak ditemukan''; end if;\nselect saldo into strict v_open from public.neraca_snapshot where tahun=2025 and tgl_snapshot=date ''2025-12-31'' and kode_akun=''1-102'';\nif v_open<>3820000 then raise exception ''Saldo pembuka resmi berubah; perlu verifikasi pengurus''; end if;\nif exists(select 1 from public.kas_mutasi where kas_id=5 and tanggal is null) then raise exception ''Ada mutasi tanpa tanggal''; end if;\nselect coalesce(sum(case when tipe=''masuk'' then jumlah when tipe=''keluar'' then -jumlah else 0 end),0) into v_net from public.kas_mutasi where kas_id=5 and tanggal>=date ''2026-01-01'' and tanggal<=current_date;\nv_saldo:=v_open+v_net;\nupdate public.kas set saldo=v_saldo where id=5;\nreturn v_saldo; end $function$\n"}]'::jsonb,
'kas',(select jsonb_agg(to_jsonb(k)) from public.kas k where id in(1,5)),
'coa',(select to_jsonb(c) from public.coa c where kode='1-102'),
'cash_rows',(select jsonb_agg(to_jsonb(k)) from public.kas_mutasi k where kas_id=5 and tanggal>=date '2026-01-01'),
'payment_sources',(select jsonb_agg(to_jsonb(a)) from public.bmt_angsuran a where tanggal>=date '2026-01-01'),
'akad_sources',(select jsonb_agg(to_jsonb(a)) from public.bmt_akad a where tanggal_akad>=date '2026-01-01'),
'bh_sources',(select jsonb_agg(to_jsonb(b)) from public.bmt_penyertaan_bh_eksternal b where kas_id=5),
'gl_cash_lines',(select jsonb_agg(to_jsonb(d)) from public.jurnal_detail d join public.jurnal_umum j on j.id=d.jurnal_id where d.coa_id=2 and j.tanggal>=date '2026-01-01')),
jsonb_build_object('reason','Kas Utama melayani seluruh usaha termasuk BMT; belum ada alokasi kas khusus. Rp3.820.000 adalah tabungan di BMT eksternal, dikonfirmasi Setyo.','main_before',49598994,'bmt_2026_net_relocated',61266927,'main_after',110865921,'external_bmt_savings',3820000,'pnl_effect',0,'receivable_effect',0,'unidentified_receipt',700,'unidentified_cash_id',984,'unidentified_account','2-102, penampungan sementara untuk klarifikasi','report_basis','Saldo pembuka neraca_snapshot 31-12-2025 + mutasi jurnal 2026. Jurnal operasional 2025 tidak ditambahkan kembali di atas saldo pembuka.','physical_cash_verified',false);
end $guard$;
CREATE OR REPLACE FUNCTION bmt_audit.fn_modal_terima_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare akun text; ref text; j bigint; op text; jenis text;
begin
perform private.ubnb_assert_finance(true);
perform pg_advisory_xact_lock(782619,3);
if new.tgl_mulai is null or new.tgl_mulai<date '2026-01-01' or new.tgl_mulai>(now() at time zone 'Asia/Jakarta')::date or new.tgl_jatuh_tempo is null or new.tgl_jatuh_tempo<new.tgl_mulai or new.jumlah_modal is null or new.jumlah_modal<=0 or new.status is distinct from 'aktif' then raise exception 'Data penerimaan modal tidak valid';end if;
if new.tgl_mulai<greatest(coalesce((select max(tanggal) from bmt_audit.akad_pool_v3),date '2026-01-01'),coalesce((select max(tanggal) from bmt_audit.margin_pool_v3),date '2026-01-01')) then raise exception 'Setoran backdate perlu rekonstruksi pengurus';end if;
if tg_table_name='ubnb_modal_penyertaan' then
jenis:=to_jsonb(new)->>'jenis';if jenis is distinct from 'penuh' then raise exception 'Penyertaan spesifik internal belum didukung otomatisasi';end if;akun:='2-104';
else
jenis:=to_jsonb(new)->>'jenis_penyertaan';if jenis is distinct from 'spesifik' then raise exception 'Penyertaan eksternal umum belum didukung distribusi';end if;akun:='2-103';
end if;
ref:='AUTO-MODAL-'||tg_table_name||'-'||new.id;op:=coalesce(private.ubnb_secure_actor('staff')->>'username','backend');
perform 1 from public.kas where id=1 for update;
insert into public.kas_mutasi(kas_id,tipe,jumlah,tanggal,keterangan,operator,kategori,ref_type,ref_id) values(1,'masuk',new.jumlah_modal,new.tgl_mulai,'Penerimaan modal '||new.no_penyertaan,op,'bmt',tg_table_name,new.id);
update public.kas set saldo=saldo+new.jumlah_modal where id=1;
insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tgl_mulai)::int),new.tgl_mulai,'Penerimaan modal '||new.no_penyertaan,ref,new.jumlah_modal,new.jumlah_modal,'posted',op) returning id into j;
insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode='1-101' then new.jumlah_modal else 0 end,case when kode=akun then new.jumlah_modal else 0 end from public.coa where kode in('1-101',akun);
if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=new.jumlah_modal and sum(kredit)=new.jumlah_modal) then raise exception 'Jurnal modal tidak seimbang';end if;return new;end $function$
;
CREATE OR REPLACE FUNCTION bmt_audit.fn_post_bh_eksternal_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare j bigint; op text; v_saldo numeric;
begin
if tg_op='DELETE' then if old.sudah_dibayar then raise exception 'Pembayaran yang sudah dibukukan tidak boleh dihapus';end if;return old;end if;
if tg_op='INSERT' then if new.sudah_dibayar then raise exception 'Buat tagihan dahulu sebelum konfirmasi pembayaran';end if;return new;end if;
if old.sudah_dibayar then
 if new.sudah_dibayar is distinct from old.sudah_dibayar or new.total_ke_mitra is distinct from old.total_ke_mitra or new.pokok_ke_mitra is distinct from old.pokok_ke_mitra or new.bh_ke_mitra is distinct from old.bh_ke_mitra or new.tgl_bayar_mitra is distinct from old.tgl_bayar_mitra or new.penyertaan_id is distinct from old.penyertaan_id or new.angsuran_id is distinct from old.angsuran_id then raise exception 'Pembayaran sudah dibukukan; gunakan koreksi pengurus';end if;return new;
end if;
if not coalesce(new.sudah_dibayar,false) then return new;end if;
perform private.ubnb_assert_finance(true);
op:=coalesce(private.ubnb_secure_actor('staff')->>'username',new.dikonfirmasi_oleh,'backend');
if new.tgl_bayar_mitra is null or new.tgl_bayar_mitra<date '2026-01-01' or new.tgl_bayar_mitra>(now() at time zone 'Asia/Jakarta')::date or new.tgl_bayar_mitra<new.tgl_angsuran or new.total_ke_mitra is null or new.total_ke_mitra<=0 or new.pokok_ke_mitra is null or new.bh_ke_mitra is null or least(new.pokok_ke_mitra,new.bh_ke_mitra)<0 or new.total_ke_mitra<>new.pokok_ke_mitra+new.bh_ke_mitra then raise exception 'Data pembayaran bagi hasil tidak valid';end if;
if new.penyertaan_id is distinct from old.penyertaan_id or new.angsuran_id is distinct from old.angsuran_id or new.total_ke_mitra is distinct from old.total_ke_mitra or new.pokok_ke_mitra is distinct from old.pokok_ke_mitra or new.bh_ke_mitra is distinct from old.bh_ke_mitra then raise exception 'Nilai tagihan tidak boleh diubah saat pembayaran';end if;
if exists(select 1 from public.kas_mutasi where ref_type='bmt_bh_eksternal' and ref_id=new.id) or exists(select 1 from public.jurnal_umum where referensi in('AUD-BH-HARJA-'||new.id,'AUTO-BH-EXT-'||new.id)) then raise exception 'Pembayaran sudah tercatat';end if;
select k.saldo into strict v_saldo from public.kas k where id=1 for update;
if v_saldo<new.total_ke_mitra then raise exception 'Saldo Kas BMT tidak mencukupi';end if;
insert into public.kas_mutasi(kas_id,tipe,kategori,jumlah,tanggal,keterangan,operator,ref_type,ref_id) values(1,'keluar','bmt',new.total_ke_mitra,new.tgl_bayar_mitra,'Pembayaran bagi hasil dan pokok mitra #'||new.id,op,'bmt_bh_eksternal',new.id);
update public.kas set saldo=kas.saldo-new.total_ke_mitra where id=1;
insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tgl_bayar_mitra)::int),new.tgl_bayar_mitra,'Pembayaran bagi hasil mitra #'||new.id,'AUTO-BH-EXT-'||new.id,new.total_ke_mitra,new.total_ke_mitra,'posted',op) returning id into j;
insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case kode when '2-103' then new.pokok_ke_mitra when '6-107' then new.bh_ke_mitra else 0 end,case when kode='1-101' then new.total_ke_mitra else 0 end from public.coa where kode in('2-103','6-107','1-101');
if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=new.total_ke_mitra and sum(kredit)=new.total_ke_mitra) then raise exception 'Jurnal bagi hasil tidak balance';end if;
new.kas_id:=1;new.dikonfirmasi_oleh:=op;new.tgl_konfirmasi:=now();return new;
end $function$
;
CREATE OR REPLACE FUNCTION bmt_audit.fn_post_bh_umum_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare p public.ubnb_modal_penyertaan%rowtype; a bmt_audit.pengesahan_profit_v1%rowtype; v_paid numeric; v_saldo numeric; j bigint; op text;
begin
if tg_op='DELETE' then if old.sudah_dibayar then raise exception 'Pembayaran sudah dibukukan';end if;return old;end if;
if tg_op='UPDATE' and old.sudah_dibayar then if to_jsonb(new) is distinct from to_jsonb(old) then raise exception 'Pembayaran sudah dibukukan; koreksi melalui pengurus';end if;return new;end if;
select * into strict p from public.ubnb_modal_penyertaan where id=new.penyertaan_id for update;
if p.jenis<>'penuh' then if new.sudah_dibayar then raise exception 'Penyertaan spesifik internal perlu prosedur tersendiri';end if;return new;end if;
perform private.ubnb_assert_finance(true);
perform pg_advisory_xact_lock(782619,3);
if new.pengesahan_id is null then raise exception 'Hak profit harus disahkan terlebih dahulu';end if;
select * into strict a from bmt_audit.pengesahan_profit_v1 where id=new.pengesahan_id for update;
if a.penyertaan_id<>p.id or new.anggota_id<>p.anggota_id or new.jumlah_bagi_hasil<=0 then raise exception 'Data pembayaran tidak sesuai pengesahan';end if;
select coalesce(sum(jumlah_bagi_hasil),0) into v_paid from public.ubnb_modal_bagi_hasil where pengesahan_id=a.id and id<>new.id;
if new.jumlah_bagi_hasil+v_paid>a.nominal then raise exception 'Nominal melebihi pengesahan';end if;
if not coalesce(new.sudah_dibayar,false) then return new;end if;
if new.tgl_bayar is null or new.tgl_bayar<a.cutoff or new.tgl_bayar>(now() at time zone 'Asia/Jakarta')::date or new.tgl_bayar<date '2026-01-01' then raise exception 'Tanggal pembayaran tidak valid';end if;
if exists(select 1 from bmt_audit.akad_pool_v3 where tanggal>new.tgl_bayar) then raise exception 'Pembayaran backdate memerlukan rekonstruksi komposisi modal';end if;
if exists(select 1 from public.kas_mutasi where ref_type='bmt_bh_umum' and ref_id=new.id) then raise exception 'Pembayaran sudah tercatat';end if;
if coalesce((select sum(nominal) from bmt_audit.bh_akrual_v1 where penyertaan_id=p.id and cutoff<=new.tgl_bayar),0)-coalesce((select sum(jumlah_bagi_hasil) from public.ubnb_modal_bagi_hasil where penyertaan_id=p.id and sudah_dibayar and id<>new.id),0)<new.jumlah_bagi_hasil then raise exception 'Hak belum dibukukan; lakukan tutup periode sebelum pembayaran';end if;
op:=coalesce(private.ubnb_secure_actor('staff')->>'username',new.operator,'backend');
select saldo into strict v_saldo from public.kas where id=1 for update;
if v_saldo<new.jumlah_bagi_hasil then raise exception 'Saldo Kas BMT tidak mencukupi';end if;
insert into public.kas_mutasi(kas_id,tipe,kategori,jumlah,tanggal,keterangan,operator,ref_type,ref_id) values(1,'keluar','bmt',new.jumlah_bagi_hasil,new.tgl_bayar,'Bagi hasil '||p.no_penyertaan,op,'bmt_bh_umum',new.id);
update public.kas set saldo=saldo-new.jumlah_bagi_hasil where id=1;
insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tgl_bayar)::int),new.tgl_bayar,'Pembayaran bagi hasil '||p.no_penyertaan,'AUTO-BH-UMUM-'||new.id,new.jumlah_bagi_hasil,new.jumlah_bagi_hasil,'posted',op) returning id into j;
insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode='2-106' then new.jumlah_bagi_hasil else 0 end,case when kode='1-101' then new.jumlah_bagi_hasil else 0 end from public.coa where kode in('2-106','1-101');
if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=new.jumlah_bagi_hasil and sum(kredit)=new.jumlah_bagi_hasil) then raise exception 'Jurnal tidak balance';end if;
update public.ubnb_modal_penyertaan set total_bagi_hasil=coalesce(total_bagi_hasil,0)+new.jumlah_bagi_hasil where id=p.id;
new.operator:=op;return new;end $function$
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
select jsonb_build_object('angsuran',to_jsonb(s),'kas',to_jsonb(k),'akad',to_jsonb(a),'jurnal',(select jsonb_agg(jsonb_build_object('header',to_jsonb(j),'detail',(select jsonb_agg(to_jsonb(d)) from public.jurnal_detail d where d.jurnal_id=j.id))) from public.jurnal_umum j where j.referensi in('ANG-'||s.id,'AUD-BMT-REAL-'||s.id)),'margin',(select to_jsonb(m) from bmt_audit.margin_pool_v3 m where m.angsuran_id=s.id),'pemodal',(select jsonb_agg(to_jsonb(m)) from bmt_audit.margin_pemodal_v3 m where m.angsuran_id=s.id),'shu',(select jsonb_agg(to_jsonb(l)) from public.ubnb_shu_trx_log l where l.ref_tabel='bmt_angsuran' and l.ref_id=s.id)) into arsip;
insert into bmt_audit.koreksi_angsuran_v1(angsuran_id,alasan,operator,arsip) values(s.id,p_alasan,p_operator,arsip);
delete from bmt_audit.margin_pemodal_v3 where angsuran_id=s.id;
delete from bmt_audit.margin_pool_v3 where angsuran_id=s.id;
perform public.fn_hapus_jurnal_by_referensi('AUD-BMT-REAL-'||s.id);
delete from public.kas_mutasi where id=k.id;
update public.kas set saldo=saldo-s.jumlah where id=1;
perform set_config('bmt_audit.correction_id',s.id::text,true);
delete from public.bmt_angsuran where id=s.id;
perform set_config('bmt_audit.correction_id','',true);
if exists(select 1 from public.jurnal_umum where referensi in('ANG-'||s.id,'AUD-BMT-REAL-'||s.id)) or exists(select 1 from public.ubnb_shu_trx_log where ref_tabel='bmt_angsuran' and ref_id=s.id) then raise exception 'Pembersihan transaksi turunan gagal';end if;
select coalesce(sum(jumlah-kelebihan),0)+coalesce(a.uang_muka,0) into paid from public.bmt_angsuran where akad_id=a.id;
update public.bmt_akad set total_angsuran=paid,sisa_angsuran=greatest(0,a.total_pembiayaan-paid),status=case when paid>=a.total_pembiayaan then 'Lunas' else 'Belum Lunas' end where id=a.id;
if p_jumlah is not null then
insert into public.bmt_angsuran(akad_id,tanggal,jumlah,pokok,margin,kelebihan,kas_id,operator,catatan,posting_atomik) values(a.id,s.tanggal,p_jumlah,p_pokok,p_margin,p_lebih,1,p_operator,'Koreksi angsuran #'||s.id||': '||p_alasan,true) returning id into new_id;
update bmt_audit.koreksi_angsuran_v1 set pengganti_id=new_id where angsuran_id=s.id;
end if;
return new_id;
end $function$
;
CREATE OR REPLACE FUNCTION private.bmt_kas_pencairan_wajib_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$begin if new.kas_pencairan_id is null or new.kas_pencairan_id=5 then new.kas_pencairan_id:=1;end if;if new.tanggal_akad is null or new.tanggal_akad<date '2026-01-01' then raise exception 'Periode akad ditutup atau tanggal tidak valid';end if;if new.kas_pencairan_id is distinct from 1 then raise exception 'Akad baru wajib menggunakan Kas Utama';end if;return new;end $function$
;
CREATE OR REPLACE FUNCTION public.bmt_modal_kembali_v1(p_id bigint, p_tanggal date, p_bukti text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare r public.ubnb_modal_penyertaan%rowtype; n numeric; i bigint; j bigint; m bigint; op text; v_saldo numeric;
begin
perform private.ubnb_assert_finance(true);perform pg_advisory_xact_lock(782619,3);
select * into strict r from public.ubnb_modal_penyertaan where id=p_id for update;
if p_tanggal is null or p_tanggal<date '2026-01-01' or p_tanggal>(now() at time zone 'Asia/Jakarta')::date or r.tgl_jatuh_tempo is null or p_tanggal<r.tgl_jatuh_tempo or length(trim(coalesce(p_bukti,'')))<3 then raise exception 'Pengembalian wajib pada/setelah jatuh tempo dengan bukti pembayaran aktual';end if;
select id into i from bmt_audit.modal_kembali_v1 where penyertaan_id=p_id;
if found then if exists(select 1 from bmt_audit.modal_kembali_v1 where id=i and tanggal=p_tanggal and bukti=p_bukti) then return i;end if;raise exception 'Modal sudah dikembalikan';end if;
if r.jenis<>'penuh' or r.status<>'aktif' then raise exception 'Hanya modal umum aktif yang didukung';end if;
if exists(select 1 from bmt_audit.akad_pemodal_v3 x join public.bmt_akad a on a.id=x.akad_id where x.penyertaan_id=p_id and a.sisa_angsuran>0) then raise exception 'Masih ada akad aktif terkait; pengembalian perlu penyelesaian hak pemodal';end if;
if exists(select 1 from public.ubnb_modal_bagi_hasil where penyertaan_id=p_id and not sudah_dibayar) or coalesce((select sum(hak) from bmt_audit.margin_pemodal_v3 where penyertaan_id=p_id and periode in('berjalan','pasca_jatuh_tempo_review')),0)>coalesce((select sum(jumlah_bagi_hasil) from public.ubnb_modal_bagi_hasil where penyertaan_id=p_id and sudah_dibayar),0) then raise exception 'Hak bagi hasil belum tuntas';end if;
if p_tanggal<greatest(coalesce((select max(tanggal) from bmt_audit.akad_pool_v3),date '2026-01-01'),coalesce((select max(tanggal) from bmt_audit.margin_pool_v3),date '2026-01-01')) then raise exception 'Backdate pengembalian tidak didukung';end if;
n:=r.jumlah_modal;
select k.saldo into strict v_saldo from public.kas k where id=1 for update;
if v_saldo<n then raise exception 'Kas BMT tidak cukup';end if;
op:=coalesce(private.ubnb_secure_actor('staff')->>'username','backend');
insert into bmt_audit.modal_kembali_v1(penyertaan_id,tanggal,nominal,bukti,operator) values(p_id,p_tanggal,n,p_bukti,op) returning id into i;
insert into public.kas_mutasi(kas_id,tipe,jumlah,tanggal,keterangan,operator,kategori,ref_type,ref_id) values(1,'keluar',n,p_tanggal,'Pengembalian modal '||r.no_penyertaan,op,'bmt','bmt_modal_kembali',i) returning id into m;
update public.kas set saldo=public.kas.saldo-n where id=1;
insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from p_tanggal)::int),p_tanggal,'Pengembalian modal '||r.no_penyertaan,'AUTO-MODAL-KEMBALI-'||i,n,n,'posted',op) returning id into j;
insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode='2-104' then n else 0 end,case when kode='1-101' then n else 0 end from public.coa where kode in('2-104','1-101');
if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=n and sum(kredit)=n) then raise exception 'Jurnal pengembalian tidak balance';end if;
update public.ubnb_modal_penyertaan set status='selesai' where id=p_id;
update bmt_audit.modal_kembali_v1 set jurnal_id=j,mutasi_id=m where id=i;
return i;end $function$
;
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
CREATE OR REPLACE FUNCTION public.fn_bmt_guard_angsuran_v3()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
begin
 if tg_op='UPDATE' and current_user='postgres' and current_setting('bmt_audit.cash_migration',true)='pooled_20261128' and old.tanggal>=date '2026-01-01' and new.kas_id=1 and (to_jsonb(new)-'kas_id')=(to_jsonb(old)-'kas_id') then return new;end if;
 if tg_op='INSERT' and (new.kas_id is null or new.kas_id=5) then new.kas_id:=1;end if;
 if tg_op='INSERT' then
   if new.tanggal is null or new.tanggal<date '2026-01-01' then raise exception 'Periode 2025 sudah ditutup'; end if;
   if new.jumlah is null or new.jumlah<=0 or new.pokok is null or new.margin is null or new.pokok<0 or new.margin<0 or new.jumlah<>new.pokok+new.margin+new.kelebihan or coalesce(new.denda,0)<>0 then raise exception 'Angsuran wajib sama dengan pokok + margin; denda perlu prosedur khusus';end if;
   if new.kas_id is not null and new.kas_id<>1 then raise exception 'Penerimaan angsuran wajib melalui Kas Utama';end if;
   if new.kelebihan<0 or (new.kelebihan>0 and not new.posting_atomik) then raise exception 'Kelebihan hanya untuk posting atomik'; end if;
   return new;
 end if;
 if tg_op='UPDATE' and (new.kelebihan is distinct from old.kelebihan or new.posting_atomik is distinct from old.posting_atomik) then raise exception 'Penanda posting tidak boleh diubah';end if;
 if tg_op='UPDATE' and new.akad_id is not distinct from old.akad_id and new.kas_id is not distinct from old.kas_id and new.tanggal is not distinct from old.tanggal and new.jumlah is not distinct from old.jumlah and new.pokok is not distinct from old.pokok and new.margin is not distinct from old.margin and new.denda is not distinct from old.denda then return new; end if;
 if old.tanggal<date '2026-01-01' then raise exception 'Periode 2025 sudah ditutup'; end if;
 if tg_op='DELETE' and current_user='postgres' and current_setting('bmt_audit.correction_id',true)=old.id::text then return old;end if;
 if tg_op='UPDATE' then
   if new.akad_id is distinct from old.akad_id or new.kas_id is distinct from old.kas_id or new.denda is distinct from old.denda then raise exception 'Perubahan akad, kas atau denda memerlukan prosedur koreksi pengurus';end if;
   if new.tanggal is null or new.tanggal<date '2026-01-01' then raise exception 'Tanggal angsuran tidak valid atau periode ditutup';end if;
 end if;
 if old.posting_atomik or exists(select 1 from public.jurnal_umum where referensi in ('AUD-BMT-REAL-'||old.id,'AUD-IJ-PAY-'||old.id)) or exists(select 1 from public.bmt_penyertaan_bh_eksternal where angsuran_id=old.id and sudah_dibayar) then raise exception 'Angsuran telah direkonsiliasi atau bagi hasil telah dibayar. Koreksi melalui pengurus agar jurnal, modal dan bagi hasil tetap sinkron';end if;
 if tg_op='DELETE' then raise exception 'Penghapusan langsung angsuran dinonaktifkan sampai prosedur pembatalan atomik tersedia';end if;
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
CREATE OR REPLACE FUNCTION public.fn_bmt_post_pembelian_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare v_cost numeric; v_code text; v_jid bigint; v_date date; begin
if new.kas_pencairan_id is null then return new; end if; if new.jenis_akad='Ijarah' and (new.ijarah_mulai is null or new.ijarah_akhir is null or new.ijarah_mulai<new.tanggal_akad or new.ijarah_akhir<new.ijarah_mulai or coalesce(new.uang_muka,0)<>0 or coalesce(new.diskon,0)<>0 or new.total_pembiayaan<>new.harga_beli+new.total_margin) then raise exception 'Ijarah wajib memiliki masa manfaat valid tanpa DP/diskon';end if;
v_date:=new.tanggal_akad;
v_cost:=coalesce(new.harga_beli,0)-coalesce(new.diskon,0);
if v_date < date '2026-01-01' or v_cost<=0 or coalesce(new.diskon,0)<0 or coalesce(new.no_akad,'')='' or coalesce(new.objek_pembiayaan,'')='' then raise exception 'Data pembelian akad tidak valid atau periode ditutup'; end if;
if new.jenis_akad='Murabahah' and (new.tgl_perolehan_barang is null or new.tgl_perolehan_barang>v_date or new.tgl_perolehan_barang<date '2026-01-01') then raise exception 'Tanggal perolehan barang wajib valid'; end if;
select kode_coa into strict v_code from public.kas where id=new.kas_pencairan_id for update;
if (select saldo from public.kas where id=new.kas_pencairan_id)<v_cost then raise exception 'Saldo kas tidak cukup';end if; if v_code not in ('1-101') or v_code is null then raise exception 'Kas pembiayaan harus Kas Utama'; end if;
if exists(select 1 from public.jurnal_umum where referensi in ('AKAD-'||new.id,'AUD-BMT-BELI-'||new.id)) or exists(select 1 from public.kas_mutasi where ref_type='bmt_akad' and ref_id=new.id) then raise exception 'Pencairan sudah tercatat'; end if;
insert into public.kas_mutasi(kas_id,tipe,kategori,jumlah,tanggal,keterangan,operator,ref_type,ref_id) values(new.kas_pencairan_id,'keluar','keluar',v_cost,v_date,'Pencairan '||new.no_akad||' — '||new.nama_jamaah,new.operator,'bmt_akad',new.id);
update public.kas set saldo=saldo-v_cost where id=new.kas_pencairan_id;
insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from v_date)::int),v_date,'Pembelian/pencairan BMT '||new.no_akad||' — '||new.objek_pembiayaan,'AKAD-'||new.id,v_cost,v_cost,'posted',new.operator) returning id into v_jid;
insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select v_jid,id,kode,nama,case when kode=case when new.jenis_akad='Ijarah' then '1-115' else '1-111' end then v_cost else 0 end,case when kode=v_code then v_cost else 0 end from public.coa where kode in (case when new.jenis_akad='Ijarah' then '1-115' else '1-111' end,v_code);
if not exists(select 1 from public.jurnal_detail where jurnal_id=v_jid group by jurnal_id having sum(debit)=v_cost and sum(kredit)=v_cost) then raise exception 'Jurnal pembelian tidak balance'; end if;
return new; end $function$
;
CREATE OR REPLACE FUNCTION public.fn_jurnal_angsuran_bmt()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_no TEXT; v_jid BIGINT; v_tgl DATE; v_nama TEXT;
  v_pokok NUMERIC; v_margin NUMERIC;
  c102 BIGINT; c111 BIGINT; c1112 BIGINT;
BEGIN
  v_tgl    := COALESCE(NEW.tanggal, CURRENT_DATE);
  v_no     := fn_next_no_jurnal(EXTRACT(YEAR FROM v_tgl)::INT);
  v_pokok  := COALESCE(NEW.pokok, NEW.jumlah, 0);
  v_margin := COALESCE(NEW.margin, 0);
  SELECT nama_jamaah INTO v_nama FROM bmt_akad WHERE id=NEW.akad_id;
  SELECT id INTO c102  FROM coa WHERE kode='1-101';
  SELECT id INTO c111  FROM coa WHERE kode='1-111';
  SELECT id INTO c1112 FROM coa WHERE kode='1-112';

  INSERT INTO jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator)
  VALUES(v_no, v_tgl, 'Angsuran BMT - '||COALESCE(v_nama,'Nasabah'), 'ANG-'||NEW.id,
    NEW.jumlah, NEW.jumlah, 'posted', 'sistem_auto')
  RETURNING id INTO v_jid;

  -- Debit: Kas BMT masuk
  INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)
  VALUES(v_jid, c102, '1-101', 'Kas Utama (Bendahara)', NEW.jumlah, 0);

  -- Kredit: Piutang Pokok berkurang
  IF v_pokok > 0 THEN
    INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)
    VALUES(v_jid, c111, '1-111', 'Piutang Pokok Pembiayaan', 0, v_pokok);
  END IF;

  -- Kredit: Piutang Laba berkurang (bukan lagi ke 4-301 Pendapatan)
  IF v_margin > 0 THEN
    INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)
    VALUES(v_jid, c1112, '1-112', 'Piutang Laba Pembiayaan', 0, v_margin);
  END IF;

  IF NEW.kelebihan>0 THEN
    INSERT INTO public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) SELECT v_jid,id,kode,nama,0,NEW.kelebihan FROM public.coa WHERE kode='4-301';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.jurnal_detail WHERE jurnal_id=v_jid GROUP BY jurnal_id HAVING sum(debit)=NEW.jumlah AND sum(kredit)=NEW.jumlah) THEN RAISE EXCEPTION 'Jurnal angsuran tidak balance'; END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_jurnal_wadiah_mutasi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare j bigint; k text; d text; c text;
begin
if new.kas_id=5 then new.kas_id:=1;end if;
if new.tipe not in ('setor','tarik') or new.jumlah<=0 or new.kas_id<>1 or new.tanggal is null then raise exception 'Transaksi Wadiah tidak valid';end if;
select kode_coa into strict k from public.kas where id=new.kas_id;
d:=case when new.tipe='setor' then k else '2-105' end;c:=case when new.tipe='setor' then '2-105' else k end;
insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from new.tanggal)::int),new.tanggal,initcap(new.tipe)||' Wadiah','WAD-'||new.id,new.jumlah,new.jumlah,'posted',new.operator) returning id into j;
insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select j,id,kode,nama,case when kode=d then new.jumlah else 0 end,case when kode=c then new.jumlah else 0 end from public.coa where kode in(d,c);
if not exists(select 1 from public.jurnal_detail where jurnal_id=j group by jurnal_id having sum(debit)=new.jumlah and sum(kredit)=new.jumlah) then raise exception 'Jurnal Wadiah tidak seimbang';end if;return new;end $function$
;
CREATE OR REPLACE FUNCTION public.fn_sync_angsuran_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_penyertaan  bmt_penyertaan_eksternal%ROWTYPE;
  v_no_akad     text;
  v_nama        text;
  v_no          text;
  v_jid         bigint;
  c102 bigint; c111 bigint; c1112 bigint;
  v_bh          bmt_penyertaan_bh_eksternal%ROWTYPE;
  v_bh_mitra    numeric; v_bh_ubnb numeric;
  v_delta_pokok numeric;
BEGIN
  SELECT nama_jamaah, no_akad INTO v_nama, v_no_akad FROM bmt_akad WHERE id = NEW.akad_id;

  -- 1) JURNAL: hapus referensi ANG-<id> lalu buat ulang dengan nilai baru
  PERFORM fn_hapus_jurnal_by_referensi('ANG-' || NEW.id);

  SELECT id INTO c102  FROM coa WHERE kode='1-101';
  SELECT id INTO c111  FROM coa WHERE kode='1-111';
  SELECT id INTO c1112 FROM coa WHERE kode='1-112';
  v_no := fn_next_no_jurnal(EXTRACT(YEAR FROM COALESCE(NEW.tanggal, CURRENT_DATE))::int);

  INSERT INTO jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator)
  VALUES(v_no, COALESCE(NEW.tanggal, CURRENT_DATE),
         'Angsuran BMT - ' || COALESCE(v_nama,'Nasabah'),
         'ANG-' || NEW.id, NEW.jumlah, NEW.jumlah, 'posted', 'sistem_auto_edit')
  RETURNING id INTO v_jid;

  INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)
  VALUES(v_jid, c102, '1-101', 'Kas Utama (Bendahara)', NEW.jumlah, 0);

  IF COALESCE(NEW.pokok,0) > 0 THEN
    INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)
    VALUES(v_jid, c111, '1-111', 'Piutang Pokok Pembiayaan', 0, NEW.pokok);
  END IF;

  IF COALESCE(NEW.margin,0) > 0 THEN
    INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)
    VALUES(v_jid, c1112, '1-112', 'Piutang Laba Pembiayaan', 0, NEW.margin);
  END IF;

  -- 2) KAS_MUTASI: update best-effort berdasarkan nilai lama + nomor akad
  UPDATE kas_mutasi
  SET jumlah = NEW.jumlah, tanggal = NEW.tanggal
  WHERE id = (
    SELECT id FROM kas_mutasi
    WHERE tipe='masuk' AND kategori='angsuran'
      AND jumlah = OLD.jumlah AND tanggal = OLD.tanggal
      AND keterangan LIKE '%' || COALESCE(v_no_akad,'###NOMATCH###') || '%'
    ORDER BY id DESC LIMIT 1
  );

  -- 3) BH EKSTERNAL: sinkron hanya yang BELUM dibayar
  SELECT * INTO v_bh FROM bmt_penyertaan_bh_eksternal
  WHERE angsuran_id = NEW.id ORDER BY id DESC LIMIT 1;

  IF FOUND THEN
    IF v_bh.sudah_dibayar THEN
      RAISE NOTICE '[sync_angsuran_edit] BH id % sudah dibayar, tidak diubah (perlu cek manual)', v_bh.id;
    ELSE
      SELECT * INTO v_penyertaan FROM bmt_penyertaan_eksternal WHERE id = v_bh.penyertaan_id;
      v_bh_mitra    := ROUND(COALESCE(NEW.margin,0) * (v_penyertaan.nisbah_mitra_pct / 100.0));
      v_bh_ubnb     := ROUND(COALESCE(NEW.margin,0) * (v_penyertaan.nisbah_ubnb_pct  / 100.0));
      v_delta_pokok := COALESCE(NEW.pokok,0) - COALESCE(v_bh.pokok_ke_mitra,0);

      UPDATE bmt_penyertaan_bh_eksternal
      SET angsuran_masuk = COALESCE(NEW.jumlah,0),
          pokok_nasabah  = COALESCE(NEW.pokok,0),
          ujroh_nasabah  = COALESCE(NEW.margin,0),
          pokok_ke_mitra = COALESCE(NEW.pokok,0),
          bh_ke_mitra    = v_bh_mitra,
          bh_ubnb        = v_bh_ubnb,
          total_ke_mitra = COALESCE(NEW.pokok,0) + v_bh_mitra,
          tgl_angsuran   = NEW.tanggal
      WHERE id = v_bh.id;

      UPDATE bmt_penyertaan_eksternal
      SET total_pokok_kembali = GREATEST(0, COALESCE(total_pokok_kembali,0) + v_delta_pokok),
          updated_at = now()
      WHERE id = v_bh.penyertaan_id;
    END IF;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[sync_angsuran_edit] ERROR angsuran_id=%: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_sync_angsuran_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_no TEXT; v_jid BIGINT; v_tgl DATE; v_nama TEXT; v_no_akad TEXT;
  v_pokok NUMERIC; v_margin NUMERIC;
  c102 BIGINT; c111 BIGINT; c1112 BIGINT;
  v_kas_count INT; v_mutasi_id bigint; v_kas_id bigint; v_kas_lama numeric;
  v_pen RECORD;
  v_bh_mitra NUMERIC; v_bh_ubnb NUMERIC;
BEGIN
  -- Hanya jalan kalau ada perubahan relevan
  IF NEW.jumlah  IS NOT DISTINCT FROM OLD.jumlah
 AND NEW.pokok   IS NOT DISTINCT FROM OLD.pokok
 AND NEW.margin  IS NOT DISTINCT FROM OLD.margin
 AND NEW.tanggal IS NOT DISTINCT FROM OLD.tanggal THEN
    RETURN NEW;
  END IF;

  IF OLD.tanggal < DATE '2026-01-01' OR NEW.tanggal < DATE '2026-01-01' THEN RAISE EXCEPTION 'Periode 2025 dan sebelumnya sudah ditutup'; END IF;
  IF NEW.akad_id IS DISTINCT FROM OLD.akad_id OR NEW.kas_id IS DISTINCT FROM OLD.kas_id THEN RAISE EXCEPTION 'Perubahan akad/kas tidak didukung oleh prosedur edit'; END IF;
  IF NEW.jumlah<=0 OR COALESCE(NEW.pokok,0)<0 OR COALESCE(NEW.margin,0)<0 OR COALESCE(NEW.denda,0)<>0 OR NEW.jumlah<>COALESCE(NEW.pokok,0)+COALESCE(NEW.margin,0) THEN RAISE EXCEPTION 'Jumlah harus sama dengan pokok + margin; denda perlu prosedur terpisah'; END IF;
  IF EXISTS(SELECT 1 FROM public.bmt_penyertaan_bh_eksternal WHERE angsuran_id=NEW.id AND sudah_dibayar) THEN RAISE EXCEPTION 'Bagi hasil sudah dibayar; koreksi melalui pengurus'; END IF;
  v_tgl    := COALESCE(NEW.tanggal, CURRENT_DATE);
  v_pokok  := COALESCE(NEW.pokok, NEW.jumlah, 0);
  v_margin := COALESCE(NEW.margin, 0);
  SELECT nama_jamaah, no_akad INTO v_nama, v_no_akad FROM bmt_akad WHERE id = NEW.akad_id;

  -- 1) JURNAL: void lama (referensi ANG-<id>) lalu repost dgn nilai baru
  PERFORM fn_hapus_jurnal_by_referensi('ANG-' || NEW.id);

  SELECT id INTO c102  FROM coa WHERE kode='1-101';
  SELECT id INTO c111  FROM coa WHERE kode='1-111';
  SELECT id INTO c1112 FROM coa WHERE kode='1-112';
  v_no := fn_next_no_jurnal(EXTRACT(YEAR FROM v_tgl)::INT);

  INSERT INTO jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator)
  VALUES(v_no, v_tgl, 'Angsuran BMT - '||COALESCE(v_nama,'Nasabah'), 'ANG-'||NEW.id,
    NEW.jumlah, NEW.jumlah, 'posted', 'sistem_auto_edit')
  RETURNING id INTO v_jid;

  INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)
  VALUES(v_jid, c102, '1-101', 'Kas Utama (Bendahara)', NEW.jumlah, 0);
  IF v_pokok > 0 THEN
    INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)
    VALUES(v_jid, c111, '1-111', 'Piutang Pokok Pembiayaan', 0, v_pokok);
  END IF;
  IF v_margin > 0 THEN
    INSERT INTO jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)
    VALUES(v_jid, c1112, '1-112', 'Piutang Laba Pembiayaan', 0, v_margin);
  END IF;

  -- Match direct reference first; legacy fallback only if unique.
  SELECT count(*), min(id) INTO v_kas_count, v_mutasi_id
  FROM public.kas_mutasi WHERE tipe='masuk' AND ref_type='bmt_angsuran' AND ref_id=NEW.id;
  IF v_kas_count=0 THEN
    SELECT count(*),min(id) INTO v_kas_count,v_mutasi_id FROM public.kas_mutasi
    WHERE tipe='masuk' AND ref_id IS NULL AND jumlah=OLD.jumlah AND tanggal=OLD.tanggal
      AND keterangan ILIKE '%'||v_no_akad||'%' AND keterangan ILIKE 'Angsuran%';
  END IF;
  IF v_kas_count<>1 THEN RAISE EXCEPTION 'Mutasi kas angsuran % tidak unik atau belum ditemukan; hubungi pengurus',NEW.id; END IF;
  SELECT kas_id,jumlah INTO STRICT v_kas_id,v_kas_lama FROM public.kas_mutasi WHERE id=v_mutasi_id FOR UPDATE;
  IF v_kas_lama<>OLD.jumlah OR v_kas_id<>1 OR (NEW.kas_id IS NOT NULL AND NEW.kas_id<>v_kas_id) THEN RAISE EXCEPTION 'Mutasi kas angsuran % belum sesuai; perlu rekonsiliasi',NEW.id; END IF;
  UPDATE public.kas_mutasi SET jumlah=NEW.jumlah,tanggal=NEW.tanggal,ref_type='bmt_angsuran',ref_id=NEW.id WHERE id=v_mutasi_id;
  UPDATE public.kas SET saldo=saldo+NEW.jumlah-v_kas_lama WHERE id=v_kas_id;

  -- 3) BH EKSTERNAL: sync yang BELUM dibayar + koreksi total_pokok_kembali
  FOR v_pen IN
    SELECT pe.* FROM bmt_penyertaan_eksternal pe
    WHERE NEW.akad_id = ANY(pe.akad_ids) AND pe.status='aktif'
  LOOP
    v_bh_mitra := ROUND(v_margin * (v_pen.nisbah_mitra_pct/100.0));
    v_bh_ubnb  := ROUND(v_margin * (v_pen.nisbah_ubnb_pct /100.0));

    UPDATE bmt_penyertaan_bh_eksternal
    SET angsuran_masuk = NEW.jumlah,
        pokok_nasabah  = v_pokok,
        ujroh_nasabah  = v_margin,
        pokok_ke_mitra = v_pokok,
        bh_ke_mitra    = v_bh_mitra,
        bh_ubnb        = v_bh_ubnb,
        total_ke_mitra = v_pokok + v_bh_mitra
    WHERE angsuran_id = NEW.id
      AND penyertaan_id = v_pen.id
      AND sudah_dibayar = false;

    IF EXISTS (SELECT 1 FROM bmt_penyertaan_bh_eksternal
               WHERE angsuran_id=NEW.id AND penyertaan_id=v_pen.id AND sudah_dibayar=true) THEN
      RAISE NOTICE '[sync_angsuran] BH sudah dibayar utk angsuran %, nilai TIDAK diubah - cek manual', NEW.id;
    END IF;

    UPDATE bmt_penyertaan_eksternal
    SET total_pokok_kembali = (SELECT COALESCE(SUM(pokok_ke_mitra),0)
                               FROM bmt_penyertaan_bh_eksternal WHERE penyertaan_id=v_pen.id),
        updated_at = now()
    WHERE id = v_pen.id;
  END LOOP;

  UPDATE public.bmt_akad a SET total_angsuran=s.paid+COALESCE(a.uang_muka,0),sisa_angsuran=GREATEST(0,a.total_pembiayaan-s.paid-COALESCE(a.uang_muka,0)),status=CASE WHEN s.paid+COALESCE(a.uang_muka,0)>=a.total_pembiayaan THEN 'Lunas' ELSE 'Belum Lunas' END FROM (SELECT COALESCE(sum(jumlah),0) paid FROM public.bmt_angsuran WHERE akad_id=NEW.akad_id) s WHERE a.id=NEW.akad_id;
  IF NOT EXISTS(SELECT 1 FROM public.jurnal_detail WHERE jurnal_id=v_jid GROUP BY jurnal_id HAVING sum(debit)=NEW.jumlah AND sum(kredit)=NEW.jumlah) THEN RAISE EXCEPTION 'Jurnal angsuran tidak balance'; END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.bmt_biaya_operasional_v1(p_request uuid, p_tanggal date, p_kas bigint, p_nominal numeric, p_keterangan text, p_bukti text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare a jsonb; op text; v_id bigint; v_j bigint; v_m bigint; k public.kas%rowtype; v_old bmt_audit.biaya_operasional_v1%rowtype;
begin
if p_kas=5 then p_kas:=1;end if;
perform private.ubnb_assert_finance(true);
a:=private.ubnb_secure_actor('staff');op:=coalesce(a->>'username','backend');
if p_request is null or p_tanggal is null or p_tanggal<date '2026-01-01' or p_tanggal>(now() at time zone 'Asia/Jakarta')::date or p_kas is null or p_kas<>1 or p_nominal is null or p_nominal<=0 or p_nominal<>round(p_nominal) or length(trim(coalesce(p_keterangan,'')))<5 or length(trim(coalesce(p_bukti,'')))<3 then raise exception 'Tanggal, kas, nominal, keterangan dan bukti wajib valid';end if;
perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
select * into v_old from bmt_audit.biaya_operasional_v1 where request_id=p_request;
if found then if (v_old.tanggal,v_old.kas_id,v_old.nominal,v_old.keterangan,v_old.bukti) is distinct from (p_tanggal,p_kas,p_nominal,p_keterangan,p_bukti) then raise exception 'Referensi permintaan telah dipakai';end if;return v_old.id;end if;
select * into strict k from public.kas where id=p_kas for update;
if k.saldo<p_nominal then raise exception 'Saldo kas tidak cukup';end if;
if exists(select 1 from bmt_audit.biaya_operasional_v1 where tanggal=p_tanggal and kas_id=p_kas and nominal=p_nominal and bukti=p_bukti) then raise exception 'Bukti biaya sudah tercatat';end if;
insert into bmt_audit.biaya_operasional_v1(request_id,tanggal,kas_id,nominal,keterangan,bukti,operator) values(p_request,p_tanggal,p_kas,p_nominal,p_keterangan,p_bukti,op) returning id into v_id;
insert into public.kas_mutasi(kas_id,tipe,jumlah,tanggal,keterangan,operator,kategori,ref_type,ref_id) values(p_kas,'keluar',p_nominal,p_tanggal,'Biaya BMT: '||p_keterangan,op,'bmt','bmt_biaya_operasional',v_id) returning id into v_m;
update public.kas set saldo=saldo-p_nominal where id=p_kas;
insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,status,operator) values(public.fn_next_no_jurnal(extract(year from p_tanggal)::int),p_tanggal,'Biaya BMT: '||p_keterangan,'AUTO-BMT-BIAYA-'||v_id,p_nominal,p_nominal,'posted',op) returning id into v_j;
insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit) select v_j,id,kode,nama,case when kode='6-102' then p_nominal else 0 end,case when kode=k.kode_coa then p_nominal else 0 end from public.coa where kode in('6-102',k.kode_coa);
if not exists(select 1 from public.jurnal_detail where jurnal_id=v_j group by jurnal_id having sum(debit)=p_nominal and sum(kredit)=p_nominal) then raise exception 'Jurnal biaya tidak seimbang';end if;
update bmt_audit.biaya_operasional_v1 set jurnal_id=v_j,mutasi_id=v_m where id=v_id;return v_id;end $function$
;
CREATE OR REPLACE FUNCTION public.ubnb_recalc_kas_bmt_2026() RETURNS numeric LANGUAGE plpgsql SET search_path TO 'pg_catalog','public','pg_temp' AS $function$
declare v_open numeric;v_net numeric;v_saldo numeric;begin
perform 1 from public.kas where id=1 and kode_coa='1-101' for update;
if not found then raise exception 'Kas Utama tidak ditemukan';end if;
select saldo into strict v_open from public.neraca_snapshot where tahun=2025 and tgl_snapshot=date '2025-12-31' and kode_akun='1-101';
if exists(select 1 from public.kas_mutasi where kas_id=1 and tanggal is null) then raise exception 'Ada mutasi tanpa tanggal';end if;
select coalesce(sum(case when tipe='masuk' then jumlah when tipe='keluar' then -jumlah else 0 end),0) into v_net from public.kas_mutasi where kas_id=1 and tanggal>=date '2026-01-01' and tanggal<=(now() at time zone 'Asia/Jakarta')::date;
v_saldo:=v_open+v_net;update public.kas set saldo=v_saldo where id=1;return v_saldo;end $function$;
select set_config('bmt_audit.cash_migration','pooled_20261128',true);
alter table public.bmt_angsuran disable trigger trg_shu_bmt_angsuran;
update public.bmt_angsuran set kas_id=1 where tanggal>=date '2026-01-01' and (kas_id is null or kas_id=5);
alter table public.bmt_angsuran enable trigger trg_shu_bmt_angsuran;
select set_config('bmt_audit.cash_migration','',true);
update public.bmt_akad set kas_pencairan_id=1 where tanggal_akad>=date '2026-01-01' and (kas_pencairan_id is null or kas_pencairan_id=5);
update public.bmt_penyertaan_bh_eksternal set kas_id=1 where kas_id=5 and coalesce(tgl_bayar_mitra,tgl_angsuran)>=date '2026-01-01';
update public.kas_mutasi set kas_id=1 where kas_id=5 and tanggal>=date '2026-01-01';
update public.jurnal_detail d set coa_id=1,kode_akun='1-101',nama_akun='Kas Utama (Bendahara)' from public.jurnal_umum j where j.id=d.jurnal_id and d.coa_id=2 and j.tanggal>=date '2026-01-01';
update public.kas set saldo=saldo+61266927,modul='warung,ppob,bmt',keterangan='Kas gabungan seluruh usaha UBNB termasuk BMT; belum ada alokasi kas khusus BMT' where id=1;
update public.kas set saldo=3820000,nama='Tabungan di BMT Eksternal',modul='tabungan_external',keterangan='Saldo pembuka Rp3.820.000 merupakan tabungan pada BMT eksternal. Mutasi operasional BMT sejak 2026 dialihkan ke Kas Utama; mutasi sampai 2025 adalah arsip migrasi, bukan mutasi tabungan ini.' where id=5;
update public.coa set nama='Tabungan di BMT Eksternal',keterangan='Saldo awal 2026 dari neraca resmi Rp3.820.000; bukan dana kas terpisah pembiayaan internal.' where kode='1-102';
do $post$
declare j bigint; begin
insert into public.jurnal_umum(no_jurnal,tanggal,keterangan,referensi,total_debit,total_kredit,operator)
values(public.fn_next_no_jurnal(2026),date '2026-04-07','Pelengkapan jurnal penerimaan Rp700 mutasi 984; sumber belum jelas, ditampung sementara tanpa pendapatan','AUD-BMT-POOL-PENDING-984',700,700,'audit_bmt_pooled_cash_migration_v1') returning id into j;
insert into public.jurnal_detail(jurnal_id,coa_id,kode_akun,nama_akun,debit,kredit)
select j,id,kode,nama,case when kode='1-101' then 700 else 0 end,case when kode='2-102' then 700 else 0 end from public.coa where kode in('1-101','2-102');
if public.ubnb_recalc_kas_bmt_2026()<>110865921 then raise exception 'Main cache calculation differs';end if;
if exists(select 1 from public.kas_mutasi where kas_id=5 and tanggal>=date '2026-01-01') then raise exception 'BMT flow remains';end if;
if exists(select 1 from public.jurnal_detail d join public.jurnal_umum h on h.id=d.jurnal_id where d.coa_id=2 and h.tanggal>=date '2026-01-01') then raise exception 'External savings account contains operating flow';end if;
if exists(select 1 from public.jurnal_umum h join public.jurnal_detail d on d.jurnal_id=h.id where h.tanggal>=date '2026-01-01' group by h.id having sum(d.debit)<>sum(d.kredit)) then raise exception 'Unbalanced journal';end if;
end $post$;