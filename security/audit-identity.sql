-- Audit actor comes from the verified request, never a caller-supplied user ID.
create or replace function public.set_audit_user(p_username text,p_user_id integer) returns void
language plpgsql security definer set search_path='' as $$
declare a jsonb:=private.ubnb_secure_actor('staff');
begin
 if a is null or a->>'id' is distinct from p_user_id::text then raise exception 'Sesi pengelola tidak valid' using errcode='42501';end if;
 perform set_config('app.current_username',a->>'username',true);
 perform set_config('app.current_user_id',a->>'id',true);
end $$;
create or replace function public.fn_audit_log() returns trigger
language plpgsql security definer set search_path='' as $$
declare a jsonb:=private.ubnb_secure_actor('staff');old_row jsonb;new_row jsonb;legacy text;
begin
 if TG_OP in ('UPDATE','DELETE') then old_row:=to_jsonb(OLD)-array['password_hash','pin_hash','kode_bayar_hash','kode_akses'];end if;
 if TG_OP in ('UPDATE','INSERT') then new_row:=to_jsonb(NEW)-array['password_hash','pin_hash','kode_bayar_hash','kode_akses'];end if;
 legacy:=coalesce(new_row->>'kasir',new_row->>'operator',new_row->>'updated_by');
 insert into public.audit_log(tabel,record_id,aksi,user_id,username,data_lama,data_baru,created_at)
 values(TG_TABLE_NAME,coalesce(new_row->>'id',old_row->>'id')::bigint,TG_OP,nullif(a->>'id','')::integer,coalesce(a->>'username',legacy),old_row,new_row,now());
 return coalesce(NEW,OLD);
end $$;
revoke all on function public.set_audit_user(text,integer) from public;
grant execute on function public.set_audit_user(text,integer) to anon,authenticated;
revoke all on function public.fn_audit_log() from public,anon,authenticated;
-- Remove historical credential copies, retaining all other audit information.
update public.audit_log set
 data_lama=data_lama-array['password_hash','pin_hash','kode_bayar_hash','kode_akses'],
 data_baru=data_baru-array['password_hash','pin_hash','kode_bayar_hash','kode_akses']
where data_lama ?| array['password_hash','pin_hash','kode_bayar_hash','kode_akses'] or data_baru ?| array['password_hash','pin_hash','kode_bayar_hash','kode_akses'];
