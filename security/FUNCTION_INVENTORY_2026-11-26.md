# Inventaris fungsi public — 26 November 2026

Sumber kode: main a5490b1. Sumber fungsi: katalog database langsung. Cakupan: semua overload public, termasuk invoker. Ini inventaris awal, bukan persetujuan keamanan. Referensi adalah kemunculan nama dalam kode/SQL, bukan bukti bahwa jalur benar-benar dipakai. Pemanggil dinamis, private, trigger dan perangkat eksternal masih perlu ditelusuri. Tidak ada hak akses diubah.

Kategori konservatif: internal untuk trigger atau fungsi tanpa hak klien; perlu guard/review untuk seluruh endpoint lainnya sampai isi fungsi, scope, dan pemanggil terbukti. Endpoint login/publik belum dinyatakan aman hanya berdasarkan nama.

Prioritas P1: endpoint klien dan pemeriksaan identitas/scope; P2: internal serta dependensi. Tidak ada pencabutan EXECUTE berdasarkan ketiadaan referensi.

## skltbmcrqutevmtcxqxj

352 overload.

| Fungsi dan argumen | Definer | anon/auth | Klasifikasi | Prioritas | Referensi kandidat |
|---|---|---|---|---|---|
| `af_api(payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `af.html`; `a&f.html` |
| `af_unlock(payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `af.html`; `a&f.html` |
| `af_users(payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `af.html` |
| `bmt_complete_akad_signer(p_token_hash text, p_pin_hash text, p_signer_name text, p_consent_text text, p_signature_data text, p_signature_sha256 text, p_photo_data text, p_photo_sha256 text, p_user_agent text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `akad-sign.html` |
| `bmt_complete_akad_signing(p_token_hash text, p_pin_hash text, p_signer_name text, p_consent_text text, p_signature_data text, p_signature_sha256 text, p_photo_data text, p_photo_sha256 text, p_user_agent text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `bmt_complete_nasabah_with_saksi(p_token_hash text, p_pin_hash text, p_signer_name text, p_consent_text text, p_signature_data text, p_signature_sha256 text, p_photo_data text, p_photo_sha256 text, p_saksi_name text, p_saksi_signature_data text, p_saksi_signature_sha256 text, p_saksi_consent boolean, p_user_agent text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `akad-sign.html` |
| `bmt_complete_penyertaan_signer(p_token_hash text, p_pin_hash text, p_signer_name text, p_consent_text text, p_signature_data text, p_signature_sha256 text, p_user_agent text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `penyertaan-sign.html` |
| `bmt_complete_saksi_via_nasabah(p_token_hash text, p_pin_hash text, p_saksi_name text, p_saksi_signature_data text, p_saksi_signature_sha256 text, p_saksi_consent boolean, p_user_agent text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `akad-sign.html` |
| `bmt_create_akad_signing(p_akad_id bigint, p_document_html text, p_document_hash text, p_phone text, p_operator text, p_token_hash text, p_pin_hash text, p_expiry_days integer)` | True | False/False | internal; dependensi perlu diverifikasi | P2 | `bmt.html` |
| `bmt_create_akad_signing_secure(p_akad_id bigint, p_document_html text, p_document_hash text, p_phone text, p_operator text, p_admin_user_id bigint, p_admin_password_hash text, p_token_hash text, p_pin_hash text, p_expiry_days integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `bmt_create_akad_signing_v2_secure(p_akad_id bigint, p_document_html text, p_document_hash text, p_phone_nasabah text, p_pengurus_name text, p_phone_pengurus text, p_saksi_name text, p_phone_saksi text, p_operator text, p_admin_user_id bigint, p_admin_password_hash text, p_token_hash_nasabah text, p_pin_hash_nasabah text, p_token_hash_pengurus text, p_pin_hash_pengurus text, p_token_hash_saksi text, p_pin_hash_saksi text, p_expiry_days integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `bmt.html` |
| `bmt_create_penyertaan_signing_secure(p_source_type text, p_penyertaan_id bigint, p_document_html text, p_document_hash text, p_phone_pemodal text, p_phone_ketua text, p_phone_bendahara text, p_operator text, p_admin_user_id bigint, p_admin_password_hash text, p_token_hash_pemodal text, p_pin_hash_pemodal text, p_token_hash_ketua text, p_pin_hash_ketua text, p_token_hash_bendahara text, p_pin_hash_bendahara text, p_expiry_days integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `bmt.html` |
| `bmt_get_akad_portal(p_access_code uuid, p_pin_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `portal-akad.html`; `bmt.html` |
| `bmt_get_akad_portal_admin_secure(p_akad_id bigint, p_operator text, p_admin_user_id bigint, p_admin_password_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `bmt.html` |
| `bmt_get_akad_signer(p_token_hash text, p_pin_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `akad-sign.html` |
| `bmt_get_akad_signing(p_token_hash text, p_pin_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `bmt_get_penyertaan_signer(p_token_hash text, p_pin_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `penyertaan-sign.html` |
| `bmt_penyertaan_sign_events_secure(p_after timestamp with time zone, p_operator text, p_admin_user_id bigint, p_admin_password_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `bmt.html` |
| `bmt_penyertaan_sign_status_secure(p_source_type text, p_penyertaan_id bigint, p_operator text, p_admin_user_id bigint, p_admin_password_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `bmt.html` |
| `bmt_portal_code_by_verify(p_verify_code uuid)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `akad-sign.html` |
| `bmt_prepare_additional_signers_secure(p_akad_id bigint, p_pengurus_name text, p_phone_pengurus text, p_saksi_name text, p_phone_saksi text, p_operator text, p_admin_user_id bigint, p_admin_password_hash text, p_token_hash_pengurus text, p_pin_hash_pengurus text, p_token_hash_saksi text, p_pin_hash_saksi text, p_expiry_days integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `bmt_refresh_penyertaan_signers_secure(p_source_type text, p_penyertaan_id bigint, p_phone_pemodal text, p_phone_ketua text, p_phone_bendahara text, p_operator text, p_admin_user_id bigint, p_admin_password_hash text, p_token_hash_pemodal text, p_pin_hash_pemodal text, p_token_hash_ketua text, p_pin_hash_ketua text, p_token_hash_bendahara text, p_pin_hash_bendahara text, p_expiry_days integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `bmt.html` |
| `bmt_refresh_signers_secure(p_akad_id bigint, p_phone_nasabah text, p_pengurus_name text, p_phone_pengurus text, p_saksi_name text, p_phone_saksi text, p_operator text, p_admin_user_id bigint, p_admin_password_hash text, p_token_hash_nasabah text, p_pin_hash_nasabah text, p_token_hash_pengurus text, p_pin_hash_pengurus text, p_token_hash_saksi text, p_pin_hash_saksi text, p_expiry_days integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `bmt.html` |
| `bmt_reset_penyertaan_signer_secure(p_source_type text, p_penyertaan_id bigint, p_role text, p_phone text, p_operator text, p_admin_user_id bigint, p_admin_password_hash text, p_token_hash text, p_pin_hash text, p_expiry_days integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `bmt.html` |
| `bmt_reset_saksi_secure(p_akad_id bigint, p_operator text, p_admin_user_id bigint, p_admin_password_hash text, p_new_token_hash text, p_new_pin_hash text, p_reason text, p_expiry_days integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `bmt.html` |
| `bmt_sign_status(p_akad_id bigint)` | True | False/False | internal; dependensi perlu diverifikasi | P2 | `bmt.html` |
| `bmt_sign_status_list_secure(p_operator text, p_admin_user_id bigint, p_admin_password_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `bmt.html` |
| `bmt_sign_status_secure(p_akad_id bigint, p_operator text, p_admin_user_id bigint, p_admin_password_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `bmt.html` |
| `bmt_upsert_akad_portal_secure(p_akad_id bigint, p_phone text, p_pin_hash text, p_operator text, p_admin_user_id bigint, p_admin_password_hash text, p_reset_pin boolean)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `bmt.html` |
| `bmt_verify_penyertaan_signed(p_verify_code uuid)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `penyertaan-sign.html` |
| `bmt_verify_signed_akad(p_verify_code uuid)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `akad-sign.html` |
| `change_user_name(p_user_id bigint, p_new_name text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `portal.html`; `security/verify.sql`; `security/rpc-guards.sql` |
| `change_user_password(p_user_id bigint, p_old_hash text, p_new_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `portal.html`; `security/rpc-guards.sql` |
| `dashboard_activity_log(p_editor_did text, p_aksi text, p_detail jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `assets/js/dashboard-core.js` |
| `dashboard_isrun_code_admin_set(p_token text, p_scope_key text, p_new_code text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `assets/js/dashboard-current.js` |
| `dashboard_isrun_code_admin_status(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `assets/js/dashboard-current.js` |
| `dashboard_isrun_code_verify(p_token text, p_code text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `assets/js/dashboard-current.js` |
| `dashboard_jamaah_create(p_editor_did text, p_payload jsonb, p_is_kk boolean, p_kk_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `migrations/20261124_penerobosan_popup_editor.sql`; `assets/js/dashboard-core.js` |
| `dashboard_jamaah_deceased_preview(p_editor_did text, p_target_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html` |
| `dashboard_jamaah_duplicate_archives(p_editor_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dashboard-kelompok.html`; `migrations/20261125_jamaah_duplicate_review.sql` |
| `dashboard_jamaah_duplicate_resolve(p_editor_did text, p_review_id bigint, p_action text, p_note text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dashboard-kelompok.html`; `migrations/20261125_jamaah_duplicate_review.sql`; `migrations/20261125_jamaah_duplicate_identifier_archive.sql` |
| `dashboard_jamaah_duplicate_resolve_guarded(p_editor_did text, p_review_id bigint, p_action text, p_note text)` | True | False/False | internal; dependensi perlu diverifikasi | P2 | `migrations/20261125_jamaah_duplicate_identifier_archive.sql` |
| `dashboard_jamaah_duplicate_restore(p_editor_did text, p_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dashboard-kelompok.html`; `migrations/20261125_jamaah_duplicate_review.sql`; `migrations/20261125_jamaah_duplicate_identifier_archive.sql` |
| `dashboard_jamaah_duplicate_restore_guarded(p_editor_did text, p_did text)` | True | False/False | internal; dependensi perlu diverifikasi | P2 | `migrations/20261125_jamaah_duplicate_identifier_archive.sql` |
| `dashboard_jamaah_duplicate_reviews(p_editor_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dashboard-kelompok.html`; `migrations/20261125_jamaah_duplicate_review.sql` |
| `dashboard_jamaah_mark_deceased(p_editor_did text, p_target_did text, p_new_head_did text, p_death_date date, p_set_new_head_janda_duda boolean)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html` |
| `dashboard_jamaah_undo_deceased(p_editor_did text, p_log_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `dashboard_login_lock_grant_check(p_did text, p_grant_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `assets/js/dashboard-current.js` |
| `dashboard_login_lock_prompt_dismiss(p_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `assets/js/dashboard-current.js` |
| `dashboard_login_lock_set_pin(p_did text, p_pin text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `assets/js/dashboard-current.js` |
| `dashboard_login_lock_status(p_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `assets/js/dashboard-current.js` |
| `dashboard_login_lock_verify_pin(p_did text, p_pin text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `assets/js/dashboard-current.js` |
| `dashboard_marriage_editor(p_token text, p_action text, p_target text, p_payload jsonb)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | `marriage-editor-audit.js`; `supabase/migrations/20261124230500_marriage_mt_audit_restore.sql` |
| `dashboard_marriage_process(p_editor_did text, p_payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `marriage-editor-audit.js`; `dashboard-kelompok.html`; `ubaid/acara.html`; `supabase/migrations/20261124230500_marriage_mt_audit_restore.sql`; `assets/js/dashboard-core.js` |
| `dashboard_marriage_process_legacy(p_editor_did text, p_payload jsonb)` | True | False/False | internal; dependensi perlu diverifikasi | P2 | `supabase/migrations/20261124230500_marriage_mt_audit_restore.sql` |
| `dashboard_marriage_summary(p_editor_did text, p_year integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `supabase/migrations/20261124230500_marriage_mt_audit_restore.sql`; `assets/js/dashboard-core.js` |
| `dashboard_marriage_youth_list(p_editor_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `supabase/migrations/20261124230500_marriage_mt_audit_restore.sql`; `assets/js/dashboard-core.js` |
| `dashboard_marriage_youth_profile(p_editor_did text, p_jamaah_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `supabase/migrations/20261124230500_marriage_mt_audit_restore.sql`; `assets/js/dashboard-core.js` |
| `dashboard_marriage_youth_save(p_editor_did text, p_jamaah_did text, p_payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `marriage-editor-audit.js`; `dashboard-kelompok.html`; `ubaid/acara.html`; `supabase/migrations/20261124230500_marriage_mt_audit_restore.sql`; `assets/js/dashboard-core.js` |
| `dashboard_penerobosan_archive(p_token text, p_scope text, p_periode text, p_snapshot jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `penerobosan-umum.js` |
| `dashboard_penerobosan_edit_jamaah(p_token text, p_scope text, p_action text, p_did text, p_payload jsonb, p_is_kk boolean, p_kk_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `penerobosan-umum.js`; `migrations/20261124_penerobosan_popup_editor.sql` |
| `dashboard_penerobosan_edit_pengurus(p_token text, p_scope text, p_action text, p_id bigint, p_did text, p_dapukan text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `penerobosan-umum.js`; `migrations/20261124_penerobosan_popup_editor.sql` |
| `dashboard_penerobosan_mubaligh_counts()` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `penerobosan-umum.js`; `migrations/20261124_penerobosan_status_mubaligh.sql` |
| `dashboard_penerobosan_save(p_token text, p_scope text, p_rincian jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `penerobosan-umum.js` |
| `dashboard_pengurus_profile(p_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `supabase/migrations/20261124230500_marriage_mt_audit_restore.sql`; `assets/js/ppg.js`; `assets/js/dashboard-core.js` |
| `dashboard_pengurus_reorder(p_editor_did text, p_level text, p_kelompok_nama text, p_order_ids bigint[])` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `assets/js/dashboard-core.js` |
| `dashboard_pengurus_reorder(p_editor_did text, p_level text, p_kelompok_nama text, p_unit_nama text, p_order_ids bigint[])` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `assets/js/dashboard-core.js` |
| `dashboard_senja_export(p_token text, p_dids text[])` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dashboard-kelompok.html`; `ubaid/acara.html` |
| `dashboard_spouse_overrides(p_editor_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `assets/js/dashboard-core.js` |
| `dashboard_webauthn_auth_complete(p_did text, p_credential_id text, p_new_counter bigint)` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `dashboard_webauthn_credentials(p_did text)` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `dashboard_webauthn_register_complete(p_did text, p_credential_id text, p_public_key_b64 text, p_counter bigint, p_transports jsonb, p_device_type text, p_backed_up boolean)` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `dashboard_webauthn_store_challenge(p_did text, p_kind text, p_challenge text)` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `dashboard_webauthn_take_challenge(p_did text, p_kind text)` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `dashboard_webauthn_user(p_did text)` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `dk_attendance_absen_ids(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_attendance_add_master(p_token text, p_nama text, p_kelompok text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `dk_attendance_bulk_hadir(p_token text, p_kegiatan_id bigint, p_status text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_attendance_close_event(p_token text, p_kegiatan_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_attendance_delete_kegiatan(p_token text, p_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_attendance_delete_master(p_token text, p_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `dk_attendance_enable_online(p_token text, p_kegiatan_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/acara_asli.sql` |
| `dk_attendance_enable_terminal(p_token text, p_kegiatan_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_attendance_generate_participants(p_token text, p_kegiatan_id bigint, p_peserta jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_attendance_login(p_username text, p_password_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `login.html`; `dashboard.html`; `dashboard-kelompok.html`; `ubaid/login.html`; `ubaid/dashboard.html`; `ubaid/acara.html`; `ubaid/sumber/portal.js`; `assets/js/dashboard-current.js`; `assets/js/dashboard-core.js` |
| `dk_attendance_login_editor(p_jamaah_id integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `dk_attendance_login_pengurus(p_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `assets/js/dashboard-current.js`; `assets/js/dashboard-core.js` |
| `dk_attendance_login_pengurus(p_did text, p_unlock_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `assets/js/dashboard-current.js`; `assets/js/dashboard-core.js` |
| `dk_attendance_logout(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `login.html`; `dashboard.html`; `dashboard-kelompok.html`; `ubaid/login.html`; `ubaid/dashboard.html`; `ubaid/acara.html`; `ubaid/sumber/portal.js`; `assets/js/dashboard-core.js` |
| `dk_attendance_recap_event(p_token text, p_kegiatan_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `sambung.html`; `raport-kbm.html`; `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_attendance_reopen_event(p_token text, p_kegiatan_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_attendance_save_kegiatan(p_token text, p_id bigint, p_payload jsonb, p_peserta jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_attendance_save_template_peserta(p_token text, p_acara_id bigint, p_dids text[], p_use_custom boolean)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_attendance_set_hadir(p_token text, p_hadir_id bigint, p_status text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_attendance_set_slot_count(p_token text, p_kegiatan_id bigint, p_slot_id bigint, p_count integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_attendance_snapshot(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `sambung.html`; `raport-kbm.html`; `peninjau-daerah.html`; `kontrol-absen.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_calendar_delete_exception(p_token text, p_jadwal_id bigint, p_tanggal_asli date)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_calendar_delete_schedule(p_token text, p_jadwal_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_calendar_extras_snapshot(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_calendar_generate_occurrence(p_token text, p_jadwal_id bigint, p_occurrence_date date, p_peserta jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_calendar_participants_plan(p_token text, p_kegiatan_id bigint, p_jadwal_id bigint, p_occurrence_date date, p_peserta jsonb, p_apply boolean, p_expected_fingerprint text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql` |
| `dk_calendar_save_exception(p_token text, p_jadwal_id bigint, p_tanggal_asli date, p_payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_calendar_save_schedule(p_token text, p_id bigint, p_payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_calendar_save_slots(p_token text, p_kegiatan_id bigint, p_jadwal_id bigint, p_slots jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_calendar_save_targets(p_token text, p_kegiatan_id bigint, p_jadwal_id bigint, p_dids text[])` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_calendar_update_schedule_future(p_token text, p_jadwal_id bigint, p_effective_date date, p_payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_daerah_login(p_username text, p_password text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html` |
| `dk_daerah_read(p_token text, p_resource text, p_args jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html` |
| `dk_event_document(p_token text, p_event_key text, p_kind text, p_action text, p_payload jsonb, p_version integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql` |
| `dk_invitation_delete(p_token text, p_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_invitation_delete_template(p_token text, p_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_invitation_generate(p_token text, p_id bigint, p_payload jsonb, p_recipients jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_invitation_public(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `undangan.html` |
| `dk_invitation_save_template(p_token text, p_id bigint, p_payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `ubaid/sumber/acara_asli.sql`; `assets/js/dashboard-core.js` |
| `dk_public_attendance_get(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `absen-kegiatan.html` |
| `dk_public_attendance_ki_contact(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `absen-kegiatan.html` |
| `dk_public_attendance_lookup_id(p_token text, p_code text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `absen-kegiatan.html` |
| `dk_public_attendance_mark(p_token text, p_hadir_id bigint, p_gps jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `absen-kegiatan.html` |
| `dk_public_attendance_mark(p_token text, p_hadir_id bigint, p_status text, p_reason text, p_gps jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `absen-kegiatan.html` |
| `dk_public_attendance_search_name(p_token text, p_query text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `absen-kegiatan.html` |
| `dk_terminal_attendance_get(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `absen-terminal.html` |
| `dk_terminal_attendance_mark(p_token text, p_code text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `absen-terminal.html` |
| `dk_terminal_attendance_recent(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `dk_terminal_attendance_search_name(p_token text, p_query text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `dk_terminal_table(p_token text, p_operator_token text, p_action text, p_did text, p_field text, p_value text, p_revision text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `absen-terminal.html` |
| `dk_terminal_table_add(p_token text, p_operator_token text, p_query text, p_did text, p_name text, p_gender text, p_request_id uuid)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `absen-terminal.html` |
| `fn_aj_kesanggupan_updated()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_audit_log()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | `security/audit-identity.sql` |
| `fn_auto_kode_coa_kas()` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_autofill_hutang_ppob_refid()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_baca_semua_notif(p_jamaah_did text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `fn_backup_snapshot()` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_bridge_ppob_transaksi_to_lama()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_cascade_delete_shu_log_bmt_angsuran()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_cascade_delete_shu_log_laundry()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_cascade_delete_shu_log_ppob()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_cascade_delete_shu_log_saham_trx()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_cascade_delete_shu_log_service()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_cascade_delete_shu_log_transaksi()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_cascade_delete_shu_log_wadiah()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_cleanup_bh_eksternal_on_angsuran_delete()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_delete_jurnal_angsuran_bmt()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_delete_jurnal_laundry()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_delete_jurnal_pembelian()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_delete_jurnal_ppob()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_delete_jurnal_saham()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_delete_jurnal_service()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_delete_jurnal_transaksi_warung()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_delete_jurnal_wadiah()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_ensure_sopram_user(p_jamaah_did text, p_nama text, p_no_wa text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_ezi_normalize_payment_state()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_get_or_create_dm_admin(p_jamaah_did text, p_nama text, p_no_wa text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_hapus_jurnal_by_referensi(p_ref text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_harga_saham(p_tgl date)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_hitung_badge_jamaah(p_jamaah_did text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | `sw.js`; `jawara.html`; `index.html` |
| `fn_hitung_harga_saham_baru(p_tahun integer, p_laba_ditahan numeric, p_total_lembar integer)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_jp_updated_at()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_jurnal_angsuran_bmt()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_jurnal_deposit_digiflazz(p_nominal numeric, p_jenis text, p_keterangan text, p_operator text, p_tanggal date, p_log_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_jurnal_laundry()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_jurnal_pembelian()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_jurnal_ppob()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_jurnal_saham_trx()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_jurnal_service()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_jurnal_transaksi_warung()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | `warung.html` |
| `fn_jurnal_transaksi_warung_backup_v1()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_jurnal_wadiah_mutasi()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_kalkulasi_harga_saham(p_tahun integer)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | `saham.html` |
| `fn_kalkulasi_harga_saham(p_tahun integer, p_pct_ld numeric)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | `saham.html` |
| `fn_kalkulasi_harga_saham(p_tahun integer, p_pct_ld numeric, p_tgl_mpps date)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | `saham.html` |
| `fn_kalkulasi_shu_per_anggota(p_periode text, p_total_shu numeric, p_shu_per_lembar numeric)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | `shu-dashboard.html` |
| `fn_kalkulasi_shu_per_lembar(p_tahun integer, p_pct_ukhro numeric, p_pct_ld_mpps numeric, p_laba_bmt_realisasi numeric)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | `saham.html` |
| `fn_kbm_log_jenjang_change()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_kbm_update_timestamp()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_kode_coa_dari_kas(p_kas_id bigint)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_ku_jurnal_number_guard_v1()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_list_notif_jamaah(p_jamaah_did text, p_limit integer)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `fn_member_jamaah_did(p_member_id bigint)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_mk_produk_updated_at()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_mk_toko_updated_at()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_next_no_jurnal(p_tahun integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_notif_jawara_post_baru()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_notif_jawara_post_comment()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_notif_jawara_post_like()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_notif_ppob_member_baru()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_notif_sopram_chat_message()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_post_owner_jamaah_did(p_post_id bigint)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_ppob_new_transaction_default_unpaid()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_recalc_ppob_member_piutang()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_reset_pesanan_from_deleted_transaksi()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_set_jatuh_tempo_angsuran()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_log_bmt_angsuran()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_log_laundry()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_log_ppob()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_log_saham_trx()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_log_service()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_log_transaksi()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_log_wadiah()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_upsert_bmt_angsuran()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_upsert_laundry()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_upsert_ppob()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_upsert_saham_trx()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_upsert_service()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_upsert_transaksi()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_shu_upsert_wadiah()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_sync_angsuran_edit()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_sync_angsuran_on_update()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_sync_jp_like_count()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_sync_jumlah_lembar()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_sync_lunas_hutang_to_ppob_transaksi()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_sync_pesanan_from_transaksi()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_sync_ppob_status_to_ppob_transaksi()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_sync_ppob_to_hutang()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_topup_bukalapak(p_jumlah integer, p_operator text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `warung.html` |
| `fn_track_hutang_pelunasan()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_trigger_bh_eksternal()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_trigger_kas_new_coa()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | `keuangan.html` |
| `fn_tutup_buku(p_tahun integer, p_operator text, p_shu numeric)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `keuangan.html` |
| `fn_ubnb_pengurus_touch()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_validate_jurnal_balance()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_validate_transaksi_warung()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `generate_kode_pesanan()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `generate_no_antrian(prefix text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `generate_no_penyertaan()` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `generate_no_penyertaan_eksternal()` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `generate_nomor_pesanan()` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `gk_update_harga_rata2()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `hitung_bagi_hasil_pesanan()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `increment_counter(counter_key text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `increment_laporan_token_open(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `laporan-saya.html` |
| `jamaah_create_with_audit(p_editor_jamaah_id integer, p_payload jsonb, p_is_kk boolean, p_kk_did text, p_client_meta jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dbjmpw.html` |
| `jamaah_edit_history(p_editor_jamaah_id integer, p_did text, p_limit integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dbjmpw.html` |
| `jamaah_editor_profile(p_jamaah_id integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dbjmpw.html` |
| `jamaah_hitung_kelas_usia(p_tgl_lahir date, p_status_nikah text, p_ref_date date)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `jamaah_refresh_kelas_usia()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `jamaah_sensus_delete(p_editor_jamaah_id integer, p_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `jamaah_sensus_save(p_editor_jamaah_id integer, p_payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `jamaah_sync_kelas_usia_row()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `jamaah_undo_edit(p_editor_jamaah_id integer, p_log_id bigint, p_client_meta jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dbjmpw.html` |
| `jamaah_update_with_audit(p_editor_jamaah_id integer, p_did text, p_patch jsonb, p_client_meta jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dbjmpw.html` |
| `jw_admin_list_pesanan(p_admin_user_id bigint, p_admin_password_hash text, p_status text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_admin_update_pesanan_status(p_admin_user_id bigint, p_admin_password_hash text, p_pesanan_id bigint, p_status text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_admin_verify(p_username text, p_password_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara-admin-chat-monitor.html` |
| `jw_create_comment(p_member_id bigint, p_post_id bigint, p_isi text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_create_pesanan(p_kode text, p_member_id bigint, p_anggota_id bigint, p_jamaah_did text, p_nama text, p_wa text, p_alamat text, p_subtotal numeric, p_biaya_kirim numeric, p_total numeric, p_metode_bayar text, p_items jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_create_post(p_member_id bigint, p_jenis text, p_produk_id integer, p_judul text, p_isi text, p_media_urls jsonb, p_media_types jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_ezi_riwayat_admin()` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `jw_ezi_riwayat_anggota(p_jamaah_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `security/rpc-guards.sql` |
| `jw_post_approve(p_admin_user_id bigint, p_admin_password_hash text, p_post_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_post_reject(p_admin_user_id bigint, p_admin_password_hash text, p_post_id bigint, p_alasan text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_produk_create(p_member_id integer, p_nama text, p_harga numeric, p_kategori_id integer, p_deskripsi text, p_harga_coret numeric, p_satuan text, p_foto_urls text[])` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_produk_delete(p_member_id integer, p_produk_id integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_produk_update(p_member_id integer, p_produk_id integer, p_nama text, p_harga numeric, p_kategori_id integer, p_deskripsi text, p_harga_coret numeric, p_satuan text, p_foto_urls text[], p_stok_tersedia boolean, p_status text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_toggle_like(p_member_id bigint, p_post_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html`; `security/verify.sql` |
| `jw_toko_approve(p_admin_user_id bigint, p_admin_password_hash text, p_toko_id integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_toko_create(p_member_id integer, p_nama_toko text, p_deskripsi text, p_no_wa text, p_alamat text, p_jam_buka text, p_foto_toko text, p_sediakan_kirim boolean, p_kirim_gratis boolean, p_biaya_kirim_toko numeric)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_toko_get_mine(p_member_id integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_toko_pending_list(p_admin_user_id bigint, p_admin_password_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_toko_pesanan_masuk(p_member_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_toko_reject(p_admin_user_id bigint, p_admin_password_hash text, p_toko_id integer, p_alasan text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_toko_update(p_member_id integer, p_toko_id integer, p_nama_toko text, p_deskripsi text, p_no_wa text, p_alamat text, p_jam_buka text, p_foto_toko text, p_sediakan_kirim boolean, p_kirim_gratis boolean, p_biaya_kirim_toko numeric)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `jw_toko_update_pesanan_status(p_member_id bigint, p_pesanan_id bigint, p_status text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `jawara.html`; `index.html` |
| `kbm_child_login(p_child_id text, p_group text, p_code text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `raport-kbm.html` |
| `kbm_child_logout(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `raport-kbm.html` |
| `kbm_child_report(p_token text, p_month text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `raport-kbm.html` |
| `kbm_child_suggest(p_query text, p_group text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `raport-kbm.html` |
| `kbm_family_login(p_code text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `kbm_family_logout(p_token text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `sambung.html` |
| `kbm_family_name_login(p_name text, p_group text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `kbm_family_report(p_token text, p_month text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `sambung.html` |
| `kbm_family_suggest(p_query text, p_group text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `krasti_login(p_username text, p_password text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `krasti_logout()` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `krasti_session_check()` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `krasti_set_password(p_password text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ku_simpan_jurnal_v1(p_header jsonb, p_entries jsonb, p_id bigint)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | `keuangan.html` |
| `lunasi_hutang(p_hutang_id bigint, p_operator text, p_metode text, p_kas_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `mk_set_updated_at()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `pembelaan_talangan_api(p_action text, p_token text, p_data jsonb)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | `desa/index.html` |
| `ppg_capture_state_history()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `ppg_class_attendance_correction(p_token text, p_scope text, p_session_id text, p_changes jsonb, p_expected_revision text, p_reason text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dashboard-kelompok.html`; `ubaid/acara.html` |
| `ppg_class_list(p_editor_did text, p_scope text, p_date date)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ppg_class_merge_legacy(p_editor_did text, p_scope text, p_payload jsonb)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ppg_class_merge_students(p_old jsonb, p_new jsonb)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ppg_class_owner_delete(p_editor_did text, p_scope text, p_session_id text, p_reason text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html` |
| `ppg_class_owner_update(p_editor_did text, p_scope text, p_session_id text, p_payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html` |
| `ppg_class_reopen(p_editor_did text, p_scope text, p_session_id text, p_reason text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html` |
| `ppg_class_status_rank(p_status text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ppg_class_update(p_editor_did text, p_scope text, p_session_id text, p_expected_version bigint, p_payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ppg_correct_class_date(p_editor_did text, p_scope text, p_session_id text, p_expected_date date, p_new_date date)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dashboard-kelompok.html`; `assets/js/ppg.js` |
| `ppg_deleted_session_ids(p_editor_did text, p_scope text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `sambung.html`; `raport-kbm.html`; `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html` |
| `ppg_merge_classes_owned(p_old jsonb, p_new jsonb, p_editor_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ppg_merge_shared_state(p_key text, p_old jsonb, p_new jsonb)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ppg_owner_can_manage(p_editor_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ppg_state_can_access(p_editor_did text, p_scope text, p_write boolean)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ppg_state_delete(p_editor_did text, p_scope text, p_state_key text, p_owner_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `assets/js/ppg.js` |
| `ppg_state_save(p_editor_did text, p_scope text, p_state_key text, p_payload jsonb, p_owner_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `assets/js/ppg.js` |
| `ppg_state_save_batch(p_editor_did text, p_scope text, p_items jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `assets/js/ppg.js` |
| `ppg_state_snapshot(p_editor_did text, p_scope text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `sambung.html`; `raport-kbm.html`; `peninjau-daerah.html`; `dashboard-kelompok.html`; `ubaid/acara.html`; `assets/js/ppg.js` |
| `ppob_set_kode_bayar(p_member_id bigint, p_pin_hash text, p_kode_bayar_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `security/rpc-guards.sql` |
| `ppob_verify_kode_bayar(p_member_id bigint, p_kode_bayar_hash text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `pw4_tur_admin_responses(p_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `survei-tur-adm.html` |
| `sambung_find_absen_id(p_query text, p_group text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `sambung.html` |
| `sambung_member_login(p_member_id text, p_group text, p_code text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `sambung.html` |
| `sambung_member_suggest(p_query text, p_group text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `sambung.html` |
| `save_menu_layout(p_user_id bigint, p_layout jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `portal.html`; `security/rpc-guards.sql` |
| `sensus_add_member(p_token text, p_request_id uuid, p_keluarga_id bigint, p_status_sambung text, p_values jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `sensus_call(p_token text, p_action text, p_payload jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `sensus_login(p_kelompok text, p_code text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `sensus_progress()` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `sensus_sheet_export(p_token text, p_spreadsheet_id text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `set_audit_user(p_username text, p_user_id integer)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `ubnb-auth.js`; `security/verify.sql`; `security/audit-identity.sql` |
| `set_ppob_request_updated_at()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `sopram_auto_add_user_to_default_rooms()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `sopram_create_notif_on_comment()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `sopram_create_notif_on_like()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `sopram_story_view_count()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `sopram_update_post_comments_count()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `sopram_update_post_likes_count()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `sync_produk_terjual()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `sync_toko_stats()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `trg_ppob_autoset_jamaah_did()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `ubaid_acara_asli(p_token text, p_rpc text, p_args jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `ubaid/acara.html`; `ubaid/sumber/acara_asli.sql` |
| `ubaid_admin(p_token text, p_action text, p_device_id bigint, p_kegiatan_id bigint, p_label text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dashboard-kelompok.html`; `ubaid/acara.html` |
| `ubaid_calendar(p_token text, p_action text, p_data jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `ubaid/dashboard.html`; `ubaid/acara.html`; `ubaid/sumber/test_calendar.sql`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/calendar.js` |
| `ubaid_card_capture(p_register text, p_key text, p_session uuid, p_uid text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ubaid_card_direct(p_code text, p_action text, p_uid text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `ubaid/kartu.html`; `ubaid/sumber/pendaftaran_kode_langsung.sql` |
| `ubaid_card_mark(p_register text, p_key text, p_assignment_id bigint, p_uid text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ubaid_card_registration(p_token text, p_action text, p_data jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `ubaid/sumber/pendaftaran_kartu.sql`; `ubaid/sumber/pendaftaran-admin.js` |
| `ubaid_cards_admin(p_token text, p_action text, p_device_id bigint, p_did text, p_query text, p_session uuid, p_card_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ubaid_cards_phone(p_token text, p_did text, p_uid text, p_action text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ubaid_mark(p_register text, p_key text, p_assignment_id bigint, p_code text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ubaid_offline_snapshot(p_register text, p_key text, p_revision text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ubaid_offline_sync(p_register text, p_key text, p_events jsonb)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ubaid_poll(p_register text, p_key text, p_firmware text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ubaid_portal(p_token text, p_action text, p_data jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `login.html`; `dashboard.html`; `ubaid/login.html`; `ubaid/dashboard.html`; `ubaid/acara.html`; `ubaid/sumber/portal.js`; `ubaid/sumber/pendaftaran_kartu.sql`; `ubaid/sumber/calendar_private.sql`; `ubaid/sumber/calendar_api.sql`; `ubaid/sumber/acara_asli.sql` |
| `ubaid_raw_snapshot(p_register text, p_key text, p_revision text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ubaid_raw_sync(p_register text, p_key text, p_events jsonb)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `ubnb_public_member_names()` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `security/session-support.sql` |
| `ubnb_request_family_access(p_family text, p_phone text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `dashboard-keluarga.html`; `security/operational-support.sql` |
| `ubnb_secure_login(p_kind text, p_identifier text, p_secret text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `ubnb-security.js`; `security/verify.sql`; `security/verify-login.sql`; `security/session-support.sql` |
| `ubnb_secure_logout(p_kind text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `ubnb-security.js`; `security/verify.sql`; `security/session-support.sql` |
| `ubnb_secure_member_register(p_name text, p_phone text, p_pin text, p_anggota_id bigint, p_jamaah_did text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `ubnb-security.js`; `security/verify.sql`; `security/verify-login.sql`; `security/session-support.sql` |
| `ubnb_secure_reauth(p_user_id bigint, p_password text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `warung.html`; `warung-v1.html`; `security/verify.sql`; `security/verify-login.sql`; `security/session-support.sql` |
| `ubnb_secure_session(p_kind text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `ubnb-security.js`; `security/verify.sql`; `security/verify-login.sql`; `security/session-support.sql` |
| `ubnb_sopram_admin_update(p_id bigint, p_status text, p_admin boolean)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `sopram-admin.html`; `security/access-policy.sql` |
| `ubnb_sopram_register(p_did text, p_phone text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `sopram.html`; `security/operational-support.sql` |
| `update_user_activity(p_user_id bigint, p_action text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `ubnb-auth.js`; `security/verify.sql`; `security/rpc-guards.sql` |
| `validate_transaksi_totals()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `verify_user_session(p_user_id bigint)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | `security/rpc-guards.sql` |
| `wci_api(payload jsonb)` | False | False/True | perlu guard/review; belum diverifikasi | P1 | `i&f.html` |
| `wci_vps_api(payload jsonb, p_account_id uuid, p_email text, p_name text)` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
## sswslwddemackxrrbpre

52 overload.

| Fungsi dan argumen | Definer | anon/auth | Klasifikasi | Prioritas | Referensi kandidat |
|---|---|---|---|---|---|
| `add_draft_item(p_calc_input_id text, p_section text, p_name text, p_part_number text, p_unit text, p_qty numeric, p_unit_price numeric, p_component_id integer, p_note text, p_user_id text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `add_master_component(p_part_number text, p_name text, p_unit text, p_price numeric, p_category text, p_user_id text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `batch_update_draft_fields(p_calc_input_id text, p_changes jsonb, p_user_id text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `calc_bom_item_subtotal()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `calculate_acdb(p_calc_input_id text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `calculate_dcdb_110v(p_calc_input_id text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `calculate_dcdb_48v(p_calc_input_id text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `calculate_lvdp(p_calc_input_id text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `calculate_ups(p_calc_input_id text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `clean_subnote(p_text text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `commit_calc_to_bom(p_calc_input_id text, p_target_bom_id text, p_bom_title text, p_user_id text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `deactivate_master_component(p_id integer, p_user_id text, p_reason text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `delete_calc_session(p_calc_input_id text, p_user_id text, p_force boolean)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `delete_draft_item(p_calc_input_id text, p_sort_order integer, p_user_id text, p_reason text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `derive_acdb_vars(p_params jsonb)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `derive_dcdb_110v_vars(p_params jsonb)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `derive_dcdb_48v_vars(p_params jsonb)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `derive_lvdp_vars(p_params jsonb)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `eval_qty_formula(p_formula text, p_vars jsonb)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `expire_pending_commands()` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_laporan_bulanan(p_month integer, p_year integer)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `fn_recalc_pk_total()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_timeline_touch_updated_at()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `fn_updated_at_pk()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `format_bom_section_label(p_section text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `generate_number(seq_type text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `handle_new_user()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `log_sizing_rules_changes()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `override_draft_item(p_calc_input_id text, p_sort_order integer, p_new_qty numeric, p_new_unit_price numeric, p_reason text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `panel_public_product(p_serial text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `panel_secure_login(p_username text, p_password text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `panel_secure_logout()` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `panel_session_user()` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `pv_admin_reset_hmi_pin(p_serial text)` | True | False/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `pv_alarm_reconcile_open_rows()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `pv_change_hmi_pin(p_serial text, p_current_pin text, p_new_pin text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `pv_has_org_access(target_org uuid)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `pv_rbc02_alarm_guard()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `pv_rbc02_reconcile_from_latest()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `pv_set_panel_phase_profile(p_serial text, p_pin text, p_phase_count smallint, p_active_phase text)` | False | False/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `pv_sync_public_live()` | True | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `pv_touch_updated_at()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `pv_verify_hmi_pin(p_serial text, p_pin text)` | True | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `reset_draft_item(p_calc_input_id text, p_sort_order integer)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `set_updated_at()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `substitute_template(p_template text, p_vars jsonb)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `update_draft_field(p_calc_input_id text, p_sort_order integer, p_field text, p_new_value text, p_user_id text, p_reason text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `update_master_component(p_id integer, p_part_number text, p_name text, p_unit text, p_price numeric, p_category text, p_user_id text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `update_master_price(p_component_id integer, p_rule_id integer, p_new_price numeric, p_user_id text, p_reason text)` | False | True/True | perlu guard/review; belum diverifikasi | P1 | belum ditemukan di repo UBNB |
| `update_po_updated_at()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `update_updated_at()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
| `update_updated_at_calc()` | False | False/False | internal; dependensi perlu diverifikasi | P2 | belum ditemukan di repo UBNB |
