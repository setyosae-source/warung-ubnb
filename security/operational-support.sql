-- Additive support for existing request/registration screens.
create or replace function public.ubnb_request_family_access(p_family text,p_phone text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_family is null or length(trim(p_family))<2 or length(p_family)>200 or p_phone is null or p_phone !~ '^[+0-9 ()-]{9,25}$' then raise exception 'Nama atau nomor WhatsApp tidak valid';end if;
 if not exists(select 1 from public.ubnb_saham where nama_keluarga=p_family) then raise exception 'Nama keluarga tidak ditemukan';end if;
 if exists(select 1 from public.permintaan_kode_akses where nama_keluarga=p_family and no_wa=p_phone and created_at>now()-interval '15 minutes') then return;end if;
 insert into public.permintaan_kode_akses(nama_keluarga,no_wa,kode_akses,status) values(p_family,p_phone,null,'pending');
end $$;
revoke all on function public.ubnb_request_family_access(text,text) from public;
grant execute on function public.ubnb_request_family_access(text,text) to anon,authenticated;
create or replace function public.ubnb_sopram_register(p_did text,p_phone text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare n text;u text;c text;new_id bigint;
begin
 if p_phone is null or p_phone !~ '^08[0-9]{8,12}$' then raise exception 'Nomor WhatsApp tidak valid';end if;
 select nama into n from public.jamaah_desa where did=p_did;
 if n is null then raise exception 'Jamaah tidak ditemukan';end if;
 if exists(select 1 from public.sopram_user where jamaah_did=p_did) then raise exception 'Akun sudah tersedia. Silakan login atau hubungi admin.';end if;
 c:=upper(encode(extensions.gen_random_bytes(5),'hex'));
 u:=left(lower(regexp_replace(n,'[^a-zA-Z0-9]+','_','g')),20)||'_'||left(encode(extensions.gen_random_bytes(5),'hex'),10);
 insert into public.sopram_user(jamaah_did,username,kode_akses,no_wa,is_admin,status) values(p_did,u,c,p_phone,false,'aktif') returning id into new_id;
 return jsonb_build_object('id',new_id,'kode_akses',c);
end $$;
revoke all on function public.ubnb_sopram_register(text,text) from public;
grant execute on function public.ubnb_sopram_register(text,text) to anon,authenticated;
