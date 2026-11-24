CREATE OR REPLACE FUNCTION public.ubaid_calendar(p_token text,p_action text DEFAULT 'snapshot',p_data jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s private.dk_attendance_session%rowtype;m private.ubaid_portal_member%rowtype;
 t text;res jsonb;extra jsonb;rows_ jsonb;people_ jsonb;pengurus_ jsonb;payload_ jsonb;
 kid bigint;jid bigint;hid bigint;mid bigint;row_scope text;row_group text;rec record;eventkey text;rid bigint;
BEGIN
 SELECT * INTO s FROM private.dk_attendance_session WHERE token=p_token AND expires_at>now();
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Silakan login kembali');END IF;
 SELECT * INTO m FROM private.ubaid_portal_member WHERE user_id=s.legacy_user_id AND enabled;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Akses Portal UBAID diperlukan');END IF;
 IF jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Permintaan tidak valid';END IF;
 kid:=nullif(p_data->>'event_id','')::bigint;jid:=nullif(p_data->>'schedule_id','')::bigint;
 hid:=nullif(p_data->>'attendance_id','')::bigint;
 IF hid IS NOT NULL THEN SELECT kegiatan_id INTO kid FROM public.ubnb_kegiatan_hadir WHERE id=hid;IF NOT FOUND THEN RAISE EXCEPTION 'Peserta tidak ditemukan';END IF;END IF;
 eventkey:=p_data->>'event_key';
 IF eventkey IS NOT NULL THEN
  IF eventkey ~ '^K[0-9]+$' THEN kid:=substring(eventkey from 2)::bigint;
  ELSIF eventkey ~ '^S[0-9]+:[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN jid:=split_part(substring(eventkey from 2),':',1)::bigint;
  ELSE RAISE EXCEPTION 'Identitas acara tidak valid';END IF;
 END IF;
 IF kid IS NOT NULL THEN
  SELECT scope_level,scope_kelompok INTO row_scope,row_group FROM public.ubnb_kegiatan WHERE id=kid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Acara tidak ditemukan';END IF;
  IF m.kelompok_scope IS NOT NULL AND (row_scope<>'kelompok' OR row_group IS DISTINCT FROM m.kelompok_scope) THEN RAISE EXCEPTION 'Acara di luar lingkup portal';END IF;
 END IF;
 IF jid IS NOT NULL THEN
  SELECT am.scope_level,am.scope_kelompok INTO row_scope,row_group FROM private.ubnb_acara_jadwal j JOIN public.ubnb_acara_master am ON am.id=j.acara_id WHERE j.id=jid FOR UPDATE OF j;
  IF NOT FOUND THEN RAISE EXCEPTION 'Jadwal tidak ditemukan';END IF;
  IF m.kelompok_scope IS NOT NULL AND (row_scope<>'kelompok' OR row_group IS DISTINCT FROM m.kelompok_scope) THEN RAISE EXCEPTION 'Jadwal di luar lingkup portal';END IF;
 END IF;
 IF kid IS NOT NULL AND p_action IN ('save','participants','attendance','slot_count','delete_event') AND EXISTS(SELECT 1 FROM public.ubnb_kegiatan WHERE id=kid AND (closed_at IS NOT NULL OR status='selesai')) THEN RAISE EXCEPTION 'Acara telah difinalisasi. Buka kembali untuk koreksi';END IF;
 IF p_action='save' AND p_data ? 'slots' AND EXISTS(SELECT 1 FROM private.ubnb_acara_slot sl JOIN private.ubnb_acara_slot_hadir sh ON sh.slot_id=sl.id WHERE sh.jumlah_hadir>0 AND ((kid IS NOT NULL AND sl.kegiatan_id=kid) OR (jid IS NOT NULL AND sl.jadwal_id=jid))) THEN RAISE EXCEPTION 'Slot sudah memiliki kehadiran; pertahankan slot yang ada';END IF;
 IF p_data ? 'template_id' THEN
 mid:=(p_data->>'template_id')::bigint;SELECT scope_level,scope_kelompok INTO row_scope,row_group FROM public.ubnb_acara_master WHERE id=mid FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Template tidak ditemukan';END IF;IF m.kelompok_scope IS NOT NULL AND (row_scope<>'kelompok' OR row_group IS DISTINCT FROM m.kelompok_scope) THEN RAISE EXCEPTION 'Template di luar lingkup portal';END IF;END IF;
 -- An ephemeral, unreturned token applies portal scope to the existing business logic.
 t:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO private.dk_attendance_session(token,legacy_user_id,username,role,kelompok_scope,pengurus_did,expires_at)
 VALUES(t,s.legacy_user_id,s.username,CASE WHEN m.kelompok_scope IS NULL THEN 'pemilik' ELSE 'pengurus_kelompok' END,m.kelompok_scope,s.pengurus_did,now()+interval '1 minute');
 BEGIN
 CASE p_action
 WHEN 'snapshot' THEN
  res:=private.ubaid_cal_dk_attendance_snapshot(t);extra:=private.ubaid_cal_dk_calendar_extras_snapshot(t);
  IF m.kelompok_scope IS NOT NULL THEN
   SELECT coalesce(jsonb_agg(x),'[]') INTO rows_ FROM jsonb_array_elements(res->'kegiatan')x WHERE x->>'scope_level'='kelompok' AND x->>'scope_kelompok'=m.kelompok_scope;res:=jsonb_set(res,'{kegiatan}',rows_);
   SELECT coalesce(jsonb_agg(x),'[]') INTO rows_ FROM jsonb_array_elements(res->'masters')x WHERE x->>'scope_level'='kelompok' AND x->>'scope_kelompok'=m.kelompok_scope;res:=jsonb_set(res,'{masters}',rows_);
   SELECT coalesce(jsonb_agg(x),'[]') INTO rows_ FROM jsonb_array_elements(res->'hadir')x WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(res->'kegiatan')k WHERE k->>'id'=x->>'kegiatan_id');res:=jsonb_set(res,'{hadir}',rows_);
   SELECT coalesce(jsonb_agg(x),'[]') INTO rows_ FROM jsonb_array_elements(res->'jadwal')x WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(res->'masters')am WHERE am->>'id'=x->>'acara_id');res:=jsonb_set(res,'{jadwal}',rows_);
   SELECT coalesce(jsonb_agg(x),'[]') INTO rows_ FROM jsonb_array_elements(res->'exceptions')x WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(res->'jadwal')j WHERE j->>'id'=x->>'jadwal_id');res:=jsonb_set(res,'{exceptions}',rows_);
   SELECT coalesce(jsonb_agg(x),'[]') INTO rows_ FROM jsonb_array_elements(res->'template_peserta')x WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(res->'masters')am WHERE am->>'id'=x->>'acara_id');res:=jsonb_set(res,'{template_peserta}',rows_);
   FOREACH row_scope IN ARRAY ARRAY['targets','slots','slot_hadir'] LOOP
    SELECT coalesce(jsonb_agg(x),'[]') INTO rows_ FROM jsonb_array_elements(extra->row_scope)x WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(res->'kegiatan')k WHERE k->>'id'=x->>'kegiatan_id') OR EXISTS(SELECT 1 FROM jsonb_array_elements(res->'jadwal')j WHERE j->>'id'=x->>'jadwal_id');extra:=jsonb_set(extra,ARRAY[row_scope],rows_);
   END LOOP;
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('did',j.did,'nama',j.nama,'nama_kk',j.nama_kk,'keluarga_id',j.keluarga_id,'kelompok_nama',j.kelompok_nama,'jenis_kelamin',j.jenis_kelamin,'tgl_lahir',j.tgl_lahir,'status_nikah',j.status_nikah,'status_sambung',j.status_sambung,'kelas_usia',j.kelas_usia,'kelas_kbm',j.kelas_kbm,'is_sarjana',j.is_sarjana,'is_haji',j.is_haji,'is_aghnia',j.is_aghnia,'tgl_meninggal',j.tgl_meninggal) ORDER BY j.nama),'[]') INTO people_ FROM public.jamaah_desa j WHERE m.kelompok_scope IS NULL OR j.kelompok_nama=m.kelompok_scope;
  SELECT coalesce(jsonb_agg(to_jsonb(p)-'created_at'-'updated_at'),'[]') INTO pengurus_ FROM public.ubnb_pengurus p WHERE p.aktif AND (m.kelompok_scope IS NULL OR (p.level='kelompok' AND p.kelompok_nama=m.kelompok_scope));
  res:=res||jsonb_build_object('spouses',(SELECT coalesce(jsonb_agg(jsonb_build_object('suami_did',o.suami_did,'istri_did',o.istri_did)),'[]') FROM private.jamaah_spouse_override o WHERE o.aktif AND (m.kelompok_scope IS NULL OR EXISTS(SELECT 1 FROM public.jamaah_desa jp WHERE jp.did=o.suami_did AND jp.kelompok_nama=m.kelompok_scope) AND EXISTS(SELECT 1 FROM public.jamaah_desa jp WHERE jp.did=o.istri_did AND jp.kelompok_nama=m.kelompok_scope))),'targets',extra->'targets','slots',extra->'slots','slot_hadir',extra->'slot_hadir','people',people_,'pengurus',pengurus_);
 WHEN 'save' THEN
  payload_:=p_data->'payload';IF jsonb_typeof(payload_) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Isi acara wajib';END IF;
  IF m.kelompok_scope IS NOT NULL THEN payload_:=payload_||jsonb_build_object('scope_level','kelompok','scope_kelompok',m.kelompok_scope,'kelompok',m.kelompok_scope);END IF;
  IF p_data->>'kind'='routine' THEN
   IF jid IS NOT NULL THEN res:=private.ubaid_cal_dk_calendar_update_schedule_future(t,jid,(p_data->>'effective_date')::date,payload_);
   ELSE res:=private.ubaid_cal_dk_calendar_save_schedule(t,NULL,payload_);END IF;
   rid:=coalesce((res->>'new_jadwal_id')::bigint,(res#>>'{data,id}')::bigint,jid);jid:=rid;kid:=NULL;
  ELSE res:=private.ubaid_cal_dk_attendance_save_kegiatan(t,kid,payload_,'[]');rid:=(res#>>'{data,id}')::bigint;kid:=rid;jid:=NULL;END IF;
  IF res->>'ok'='true' THEN
   IF p_data ? 'targets' THEN extra:=private.ubaid_cal_dk_calendar_save_targets(t,kid,jid,ARRAY(SELECT jsonb_array_elements_text(p_data->'targets')));IF extra->>'ok'<>'true' THEN RAISE EXCEPTION '%',extra->>'error';END IF;END IF;
   IF p_data ? 'slots' THEN extra:=private.ubaid_cal_dk_calendar_save_slots(t,kid,jid,p_data->'slots');IF extra->>'ok'<>'true' THEN RAISE EXCEPTION '%',extra->>'error';END IF;END IF;
  END IF;
 WHEN 'template_participants' THEN res:=private.ubaid_cal_dk_attendance_save_template_peserta(t,mid,ARRAY(SELECT jsonb_array_elements_text(p_data->'dids')),coalesce((p_data->>'custom')::boolean,true));
 WHEN 'participants' THEN res:=private.ubaid_cal_dk_calendar_participants_plan(t,kid,jid,nullif(p_data->>'date','')::date,coalesce(p_data->'participants','[]'),coalesce((p_data->>'apply')::boolean,false),p_data->>'fingerprint');
 WHEN 'attendance' THEN res:=private.ubaid_cal_dk_attendance_set_hadir(t,hid,p_data->>'status');
 WHEN 'slot_count' THEN res:=private.ubaid_cal_dk_attendance_set_slot_count(t,kid,(p_data->>'slot_id')::bigint,(p_data->>'count')::int);
 WHEN 'report' THEN res:=private.ubaid_cal_dk_attendance_recap_event(t,kid);
 WHEN 'close' THEN res:=private.ubaid_cal_dk_attendance_close_event(t,kid);
 WHEN 'reopen' THEN res:=private.ubaid_cal_dk_attendance_reopen_event(t,kid);
 WHEN 'exception' THEN res:=private.ubaid_cal_dk_calendar_save_exception(t,jid,(p_data->>'date')::date,p_data->'payload');
 WHEN 'restore_exception' THEN res:=private.ubaid_cal_dk_calendar_delete_exception(t,jid,(p_data->>'date')::date);
 WHEN 'disable_schedule' THEN res:=private.ubaid_cal_dk_calendar_delete_schedule(t,jid);
 WHEN 'delete_event' THEN res:=private.ubaid_cal_dk_attendance_delete_kegiatan(t,kid);
 WHEN 'document' THEN res:=private.ubaid_cal_dk_event_document(t,eventkey,coalesce(p_data->>'kind','minutes'),coalesce(p_data->>'action','load'),coalesce(p_data->'payload','{}'),coalesce((p_data->>'version')::int,0));
 ELSE res:=jsonb_build_object('ok',false,'error','Tindakan tidak dikenal');
 END CASE;
 DELETE FROM private.dk_attendance_session WHERE token=t;
 IF p_action NOT IN ('snapshot','report') AND NOT (p_action='document' AND coalesce(p_data->>'action','load') IN ('load','file')) AND res->>'ok'='true' THEN
  INSERT INTO private.ubaid_portal_audit(actor,action,detail) VALUES(s.username,'calendar:'||p_action,jsonb_build_object('event_id',kid,'schedule_id',jid,'event_key',eventkey));
 END IF;
 RETURN res;
 EXCEPTION WHEN OTHERS THEN DELETE FROM private.dk_attendance_session WHERE token=t;RAISE;END;
END $$;
REVOKE ALL ON FUNCTION public.ubaid_calendar(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ubaid_calendar(text,text,jsonb) TO anon,authenticated;
