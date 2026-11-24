-- Adapter for unchanged Dashboard Kelompok Acara UI; server enforces portal scope.
create or replace function public.ubaid_acara_asli(p_token text,p_rpc text,p_args jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.dk_attendance_session%rowtype; m private.ubaid_portal_member%rowtype;t text;result_ jsonb;
begin
 select * into s from private.dk_attendance_session where token=p_token and expires_at>now();
 if not found then raise exception 'Sesi berakhir. Silakan login kembali';end if;
 select * into m from private.ubaid_portal_member where user_id=s.legacy_user_id and enabled;
 if not found then raise exception 'Akses portal diperlukan';end if;
 if jsonb_typeof(p_args) is distinct from 'object' then raise exception 'Permintaan tidak valid';end if;
 t:=encode(extensions.gen_random_bytes(32),'hex');
 insert into private.dk_attendance_session(token,legacy_user_id,username,role,kelompok_scope,pengurus_did,expires_at)
 values(t,s.legacy_user_id,s.username,case when m.kelompok_scope is null then 'pemilik' else 'pengurus_kelompok' end,m.kelompok_scope,s.pengurus_did,now()+interval '1 minute');
 case p_rpc
 when 'dk_calendar_delete_schedule' then result_:=public.dk_calendar_delete_schedule(t,(p_args->>'p_jadwal_id')::bigint);
 when 'dk_attendance_set_slot_count' then result_:=public.dk_attendance_set_slot_count(t,(p_args->>'p_kegiatan_id')::bigint,(p_args->>'p_slot_id')::bigint,(p_args->>'p_count')::integer);
 when 'dk_invitation_delete' then result_:=public.dk_invitation_delete(t,(p_args->>'p_id')::bigint);
 when 'dk_invitation_generate' then result_:=public.dk_invitation_generate(t,(p_args->>'p_id')::bigint,coalesce(p_args->'p_payload', '{}'::jsonb),coalesce(p_args->'p_recipients', '[]'::jsonb));
 when 'dk_invitation_save_template' then result_:=public.dk_invitation_save_template(t,(p_args->>'p_id')::bigint,coalesce(p_args->'p_payload', '{}'::jsonb));
 when 'dk_invitation_delete_template' then result_:=public.dk_invitation_delete_template(t,(p_args->>'p_id')::bigint);
 when 'dk_calendar_update_schedule_future' then result_:=public.dk_calendar_update_schedule_future(t,(p_args->>'p_jadwal_id')::bigint,(p_args->>'p_effective_date')::date,coalesce(p_args->'p_payload', '{}'::jsonb));
 when 'dk_calendar_extras_snapshot' then result_:=public.dk_calendar_extras_snapshot(t);
 when 'dk_calendar_delete_exception' then result_:=public.dk_calendar_delete_exception(t,(p_args->>'p_jadwal_id')::bigint,(p_args->>'p_tanggal_asli')::date);
 when 'dk_calendar_save_targets' then result_:=public.dk_calendar_save_targets(t,(p_args->>'p_kegiatan_id')::bigint,(p_args->>'p_jadwal_id')::bigint,ARRAY(select jsonb_array_elements_text(coalesce(p_args->'p_dids','[]'::jsonb))));
 when 'dk_calendar_save_slots' then result_:=public.dk_calendar_save_slots(t,(p_args->>'p_kegiatan_id')::bigint,(p_args->>'p_jadwal_id')::bigint,coalesce(p_args->'p_slots', '[]'::jsonb));
 when 'dk_attendance_save_kegiatan' then result_:=public.dk_attendance_save_kegiatan(t,(p_args->>'p_id')::bigint,coalesce(p_args->'p_payload', '{}'::jsonb),coalesce(p_args->'p_peserta', '[]'::jsonb));
 when 'dk_attendance_delete_kegiatan' then result_:=public.dk_attendance_delete_kegiatan(t,(p_args->>'p_id')::bigint);
 when 'dk_attendance_set_hadir' then result_:=public.dk_attendance_set_hadir(t,(p_args->>'p_hadir_id')::bigint,(p_args->>'p_status')::text);
 when 'dk_attendance_bulk_hadir' then result_:=public.dk_attendance_bulk_hadir(t,(p_args->>'p_kegiatan_id')::bigint,(p_args->>'p_status')::text);
 when 'dk_attendance_absen_ids' then result_:=public.dk_attendance_absen_ids(t);
 when 'dk_attendance_enable_terminal' then result_:=public.dk_attendance_enable_terminal(t,(p_args->>'p_kegiatan_id')::bigint);
 when 'dk_attendance_recap_event' then result_:=public.dk_attendance_recap_event(t,(p_args->>'p_kegiatan_id')::bigint);
 when 'dk_attendance_close_event' then result_:=public.dk_attendance_close_event(t,(p_args->>'p_kegiatan_id')::bigint);
 when 'dk_attendance_reopen_event' then result_:=public.dk_attendance_reopen_event(t,(p_args->>'p_kegiatan_id')::bigint);
 when 'dk_attendance_save_template_peserta' then result_:=public.dk_attendance_save_template_peserta(t,(p_args->>'p_acara_id')::bigint,ARRAY(select jsonb_array_elements_text(coalesce(p_args->'p_dids','[]'::jsonb))),coalesce((p_args->>'p_use_custom')::boolean,true));
 when 'dk_event_document' then result_:=public.dk_event_document(t,(p_args->>'p_event_key')::text,coalesce((p_args->>'p_kind')::text,'minutes'),coalesce((p_args->>'p_action')::text,'load'),coalesce(p_args->'p_payload', '{}'::jsonb),coalesce((p_args->>'p_version')::integer,0));
 when 'dk_attendance_snapshot' then result_:=public.dk_attendance_snapshot(t);
 when 'dk_attendance_enable_online' then result_:=public.dk_attendance_enable_online(t,(p_args->>'p_kegiatan_id')::bigint);
 when 'dk_calendar_save_schedule' then result_:=public.dk_calendar_save_schedule(t,(p_args->>'p_id')::bigint,coalesce(p_args->'p_payload', '{}'::jsonb));
 when 'dk_calendar_save_exception' then result_:=public.dk_calendar_save_exception(t,(p_args->>'p_jadwal_id')::bigint,(p_args->>'p_tanggal_asli')::date,coalesce(p_args->'p_payload', '{}'::jsonb));
 when 'dk_calendar_generate_occurrence' then result_:=public.dk_calendar_generate_occurrence(t,(p_args->>'p_jadwal_id')::bigint,(p_args->>'p_occurrence_date')::date,coalesce(p_args->'p_peserta', '[]'::jsonb));
 when 'dk_calendar_participants_plan' then result_:=public.dk_calendar_participants_plan(t,(p_args->>'p_kegiatan_id')::bigint,(p_args->>'p_jadwal_id')::bigint,(p_args->>'p_occurrence_date')::date,coalesce(p_args->'p_peserta', '[]'::jsonb),coalesce((p_args->>'p_apply')::boolean,false),(p_args->>'p_expected_fingerprint')::text);
 when 'dk_attendance_generate_participants' then result_:=public.dk_attendance_generate_participants(t,(p_args->>'p_kegiatan_id')::bigint,coalesce(p_args->'p_peserta', '[]'::jsonb));
 else raise exception 'Fungsi acara tidak diizinkan';end case;
 delete from private.dk_attendance_session where token=t;
 return result_;
end $$;
revoke all on function public.ubaid_acara_asli(text,text,jsonb) from public;
grant execute on function public.ubaid_acara_asli(text,text,jsonb) to anon,authenticated;
