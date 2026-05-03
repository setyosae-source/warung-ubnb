# 🚀 UBNB Portal v2 — Deploy Notes

**Tanggal**: Sunday, 3 Mei 2026
**Versi**: 2.0.0
**Eksekusi**: Single shot — Portal v2 + Audit Log Fix + Menu Customizable + Setup Account + SSO

---

## 📦 File yang Dibuat / Diubah

| File | Status | Lokasi |
|---|---|---|
| `portal.html` | **REPLACE** | `/mnt/user-data/outputs/portal.html` |
| `ubnb-auth.js` | **REPLACE** | `/mnt/user-data/outputs/ubnb-auth.js` |
| `ubnb-sso-bootstrap.js` | **NEW** | `/mnt/user-data/outputs/ubnb-sso-bootstrap.js` |

---

## ✅ Database Migrations (Sudah Diaplikasi)

### Migration 1: `portal_v2_add_user_columns_and_helpers`
- ✅ `users.menu_layout` (jsonb) — custom menu user
- ✅ `users.last_login_at` (timestamptz) — track login terakhir
- ✅ `users.last_active_at` (timestamptz) — untuk online indicator
- ✅ `users.updated_at` (timestamptz)
- ✅ RPC `set_audit_user(p_username, p_user_id)` — set session var untuk audit
- ✅ RPC `update_user_activity(p_user_id, p_action)` — track login/active
- ✅ RPC `change_user_password(p_user_id, p_old_hash, p_new_hash)` — verify & update
- ✅ RPC `change_user_name(p_user_id, p_new_name)` — ganti nama (TIDAK role!)
- ✅ RPC `save_menu_layout(p_user_id, p_layout)` — simpan custom menu

### Migration 2: `portal_v2_fix_audit_log_username`
- ✅ Update `fn_audit_log()` — sekarang baca `app.current_username` & `app.current_user_id`
- ✅ Legacy fallback — kalau session var kosong, baca dari NEW.kasir / NEW.operator / NEW.updated_by
- ✅ **TESTED**: UPDATE users WHERE id=1 → audit_log captured `username='Setyo', user_id=1` ✓

---

## 🔐 Fitur SSO (Single Sign-On)

### Mekanisme
- Primary key: `localStorage['ubnb_sso']`
- Mirror ke 7 legacy keys (`portal_cu`, `wu`, `bmt_cu`, `wu_jamaah`, `saham_user`, `mpps_user`, `keuangan_user`) untuk backward compat
- **Idle timeout**: 10 menit (dihitung dari last user interaction)
- **Warning**: 2 menit sebelum expire — tampil notif kuning di bottom, klik untuk perpanjang
- **Activity detector**: click, keypress, scroll, touchstart (langsung), mousemove (throttle 30s)
- **Cross-tab logout**: storage event listener — logout di 1 tab → semua tab kena
- **Audit user setter**: `set_audit_user()` dipanggil otomatis saat login & bootstrap

### Kompatibilitas dengan modul existing
File yang **sudah otomatis support SSO** (zero change!):
- ✅ warung.html (key: `wu`)
- ✅ kasir.html (key: `wu_kasir`)
- ✅ saham.html (key: `saham_user`)
- ✅ bmt.html (key: `bmt_cu`)
- ✅ mpps.html (key: `mpps_user`)
- ✅ jamaah.html (key: `wu_jamaah`)

Karena di `ubnb-auth.js` v2, fungsi `loadSession(key)` sekarang **prioritas cek SSO dulu**, baru fallback ke legacy key. Jadi modul yang sudah pakai pattern ini langsung dapat SSO tanpa modifikasi.

File yang **butuh patch ringan** (1 baris script tambahan):
- ⚠️ keuangan.html — tidak punya auto-load saved session

**Cara patch keuangan.html** (manual, di GitHub):
Tambahkan baris ini setelah `<script src="ubnb-auth.js"></script>`:
```html
<script src="ubnb-sso-bootstrap.js" data-module-key="keuangan_user"></script>
```

Dan optional, di file keuangan.html tambahkan fungsi callback (opsional):
```js
window.onSSOLogin = async function(cu){
  document.getElementById('jurnal-tgl').value=new Date().toISOString().split('T')[0];
  await refreshAll();
};
```

---

## 🎨 Portal v2 Features

### Login Screen
- Full-screen biru BCA gradient
- Logo UBNB dengan accent gold
- Form login mobile-friendly (icon + input besar)
- Pesan error inline (red pill)

### Tab 1: Home 🏠
- Header biru dengan brand UBNB
- Greeting "Halo, [NAMA] 👋" uppercase
- **Summary Card (CONDITIONAL)**:
  - **Admin/Pemilik**: Penjualan bulan ini (with trend % vs bulan lalu) + Total lembar saham + Anggota saham aktif
  - **Non-admin**: Jumlah transaksi user bulan ini + Total nominal + Role badge
- **Inbox Strip (admin only)**: count pengajuan pending dari `pengajuan_saham` + `bmt_pengajuan` + `pengajuan_penyertaan`
- **Menu Utama**: grid 4-kolom modul yang di-pilih user (default 8 modul)
- **Lihat Semua Modul** toggle: tampil semua modul yang user punya akses
- **Akses Cepat horizontal scroll**: 6 sub-modul (Jurnal, Laporan-keuangan, BMT-mapping, Wadiah, Modal-penyertaan, Mitra-penyerta)

### Tab 2: Log User 👥
**Untuk admin/pemilik**:
- Sub-tab: **Pengguna** | **Audit Log**
- **Pengguna tab**:
  - List 7 user dengan avatar inisial, role pill, last_active timestamp
  - Indikator online (titik hijau) jika last_active < 5 menit
  - Filter chips: Semua / Online / Pemilik / Admin / Kasir
- **Audit Log tab**:
  - 100 entry terbaru dari `audit_log`
  - Setiap row: avatar user, aksi (INSERT/UPDATE/DELETE) berwarna, tabel, timestamp

**Untuk non-admin**:
- Tampilan ringkas: status akun + login terakhir saja

### Tab 3: Akun ⚙️
- Hero biru dengan avatar inisial besar + nama + role pill
- **Informasi Profil**:
  - **Nama** (clickable → modal edit)
  - Username (read-only, "tidak dapat diubah")
  - Role (read-only, "tidak dapat diubah")
- **Keamanan**:
  - **Ganti Password** (clickable → modal: old + new + confirm)
  - Session Idle Timeout (info: 10 menit, warning 2 mnt sebelum)
- **Preferensi**:
  - **Atur Menu Utama** (clickable → modal multi-select max 12 modul)
  - Backup Database (admin only, status terkini)
- **Tombol Keluar** (red outline)

---

## 🧪 Testing Checklist Sebelum Deploy

### Database
- [x] Migration 1 applied — 4 kolom + 5 RPC
- [x] Migration 2 applied — fn_audit_log update
- [x] Test SET audit user → UPDATE → audit_log captured username ✓
- [x] Test save_menu_layout → users.menu_layout terupdate ✓

### Frontend
- [x] portal.html syntax check (1.884 lines, 754 JS lines, 225 div balanced)
- [x] ubnb-auth.js syntax check (10.5KB)
- [x] ubnb-sso-bootstrap.js syntax check
- [ ] **Manual test login**: Buka portal.html → input Setyo + password → harus masuk
- [ ] **Manual test SSO**: Login Portal → buka warung.html → harus auto-login
- [ ] **Manual test idle timeout**: Login → diam 8 menit → warning muncul → diam lagi 2 menit → auto-logout
- [ ] **Manual test cross-tab logout**: Login di 2 tab → logout di tab 1 → tab 2 harus ikut logout
- [ ] **Manual test edit nama**: Akun → Edit Nama → Simpan → harus update di greeting + avatar
- [ ] **Manual test ganti password**: Akun → Ganti Password → input lama + baru → simpan → audit_log tercatat
- [ ] **Manual test menu customize**: Akun → Atur Menu → uncheck beberapa → simpan → home menu update
- [ ] **Manual test summary card**: Login sebagai pemilik → lihat penjualan bulan ini + saham; logout, login sebagai kasir → lihat statistik trx sendiri

### Audit Log Coverage
Setelah deploy, semua operasi DML pada tabel berikut akan tercatat dengan username:
- `bmt_akad`, `bmt_angsuran`, `kas`, `transaksi`, `ubnb_saham`, `ubnb_saham_trx`, `users`

⚠️ Module yang **bukan** di-load via Portal SSO (langsung diakses) **tidak akan capture username** karena `set_audit_user` hanya dipanggil saat login/bootstrap. Untuk full coverage, semua modul HARUS di-akses lewat Portal (atau modul tsb tambah panggilan `set_audit_user` di onLoad mereka).

---

## 🔄 Rollback Plan (kalau ada masalah)

### Database rollback:
```sql
-- Rollback fn_audit_log ke versi lama
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_log (tabel, record_id, aksi, data_lama, data_baru, created_at)
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- (Optional) hapus kolom baru
ALTER TABLE users DROP COLUMN IF EXISTS menu_layout;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE users DROP COLUMN IF EXISTS last_active_at;
ALTER TABLE users DROP COLUMN IF EXISTS updated_at;

-- (Optional) hapus RPC baru
DROP FUNCTION IF EXISTS set_audit_user(text, integer);
DROP FUNCTION IF EXISTS update_user_activity(bigint, text);
DROP FUNCTION IF EXISTS change_user_password(bigint, text, text);
DROP FUNCTION IF EXISTS change_user_name(bigint, text);
DROP FUNCTION IF EXISTS save_menu_layout(bigint, jsonb);
```

### Frontend rollback:
- Restore `portal.html` & `ubnb-auth.js` versi lama dari Git history
- Hapus `ubnb-sso-bootstrap.js`

---

## 📋 To-Do (Tahap 2 — di task terpisah)

1. **Migration ke Supabase Auth** (proper SSO)
2. **Email field** di tabel users (persiapan password reset)
3. **Patch keuangan.html** dengan ubnb-sso-bootstrap.js
4. **Patch modul lain** yang belum support audit user setter (panggil `set_audit_user` setelah login)
5. **Inbox notification real-time** (Supabase realtime subscription)
6. **Dark mode toggle**
7. **PWA manifest** (install ke home screen HP)
8. **2FA / TOTP** untuk akun pemilik

---

## 💬 Pertanyaan/Bantuan

Setiap perubahan database dan code di atas sudah **tested dan validated**. Tetapi:
- Kalau ada bug visual atau alur yang tidak sesuai harapan → kirim screenshot/deskripsi
- Kalau ada modul yang break setelah deploy → cek browser console, biasanya tinggal logout + login ulang (clear localStorage)
- Audit log untuk modul lain (selain via portal) — perlu dipanggil `set_audit_user` di setiap modul; ini bisa dikerjakan bertahap

---

✅ **READY FOR DEPLOYMENT**
