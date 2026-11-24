-- Pendaftaran langsung menggunakan kode absen; tidak memerlukan undangan/approval.
create or replace function public.ubaid_card_direct(p_code text,p_action text,p_uid text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare person_ record; card_ text; iid_ bigint;
begin
 if p_action is null or p_action not in ('lookup','register') then raise exception 'Tindakan tidak valid'; end if;
 if p_code is null or btrim(p_code) !~ '^[0-9]{4}$' then raise exception 'Masukkan kode absen 4 digit'; end if;
 select j.did,j.nama,j.kelompok_nama into person_ from private.ubnb_absen_id a
 join public.jamaah_desa j on j.did=a.jamaah_did where a.absen_code=btrim(p_code) and a.retired_at is null for share of a;
 if not found then raise exception 'Kode absen tidak ditemukan atau sudah tidak aktif'; end if;
 if p_action='lookup' then return jsonb_build_object('ok',true,'nama',person_.nama,'kelompok',person_.kelompok_nama);end if;
 card_:=upper(btrim(coalesce(p_uid,'')));
 if card_ !~ '^([0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})$' then raise exception 'UID kartu tidak valid';end if;
 perform pg_advisory_xact_lock(hashtextextended('ubaid-card:'||card_,0));
 if exists(select 1 from public.ubnb_jamaah_identifier where jenis='rfid' and nilai=card_ and jamaah_did<>person_.did) then raise exception 'Kartu sudah terdaftar atas nama orang lain';end if;
 insert into public.ubnb_jamaah_identifier(jamaah_did,jenis,nilai,aktif,metadata)
 values(person_.did,'rfid',card_,true,jsonb_build_object('source','UBAID-NFC-DIRECT'))
 on conflict(jenis,nilai) do update set aktif=true,updated_at=now()
 where public.ubnb_jamaah_identifier.jamaah_did=excluded.jamaah_did returning id into iid_;
 if iid_ is null then raise exception 'Kartu sudah terdaftar atas nama orang lain';end if;
 insert into private.ubaid_card_audit(actor,action,jamaah_did,identifier_id)
 values('jamaah:'||person_.did,'pair_self_code',person_.did,iid_);
 return jsonb_build_object('ok',true,'nama',person_.nama,'kelompok',person_.kelompok_nama,'uid',card_,'status','active');
end $$;
revoke all on function public.ubaid_card_direct(text,text,text) from public;
grant execute on function public.ubaid_card_direct(text,text,text) to anon,authenticated;
