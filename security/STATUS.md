# Checkpoint keamanan — 27 November 2026

Sumber: main 2f2414a dan katalog/definisi database langsung. Menggantikan checkpoint 25 November yang tertinggal; jangan menerapkan ulang paket lama dari status tersebut.

## Advisor terbaru

UBNB: ERROR 0, WARN 428 (213 anon definer + 213 authenticated definer + extension 1 + leaked password 1), INFO 84. Panel-system: ERROR 0, WARN 16 (7 + 8 + password 1), INFO 20. Warning tetap dibanding 26 November; bukan bukti seluruh akses aman.

## Tahap terbatas: verifikasi jalur login pengurus lama

Tahap 1 belum selesai. Inventaris 26 November tetap merupakan inventaris awal; klasifikasi berdasarkan nama saja belum cukup. Run ini meninjau isi empat fungsi public dan dua helper private, serta pemanggil pada main terbaru.

| Fungsi | Klasifikasi dan bukti | Prioritas |
|---|---|---|
| dashboard_pengurus_profile | Perlu guard/review: menerima DID, mengembalikan nama/scope/peran/can_edit tanpa verifikasi sesi di badan fungsi. Pemanggil dashboard-core.js baris 236/540, dashboard-kelompok.html 1921/2225, peninjau-daerah.html 1909/2214, ubaid/acara.html 1860. Respons ini tidak boleh menjadi bukti identitas. | P1 |
| dashboard_login_lock_set_pin | Perlu guard: hanya memeriksa pengurus aktif dan format PIN serta belum adanya kunci. Tidak membuktikan kepemilikan DID sebelum memasang PIN pertama dan menerbitkan grant. Risiko pendaftaran kunci oleh pihak lain; belum diuji eksploitasi pada akun nyata. Pemanggil assets/js/dashboard-current.js:3155. | P1 |
| dashboard_login_lock_verify_pin | Publik diperlukan untuk login, review lanjutan: crypt terhadap hash dan pembatasan 5 kegagalan/10 menit sudah ada; penerbitan grant 8 jam. Scope, konkurensi limit, status aktif dan konsumsi grant belum selesai diverifikasi. | P1 |
| dashboard_login_lock_status | Perlu guard/review privasi: DID mengungkap status/metode/waktu verifikasi. Pemeriksaan FOUND setelah SELECT count tidak membuktikan keberadaan record lock; kandidat bug fungsional, belum diubah. | P1 |
| private.ubnb_pengurus_active | Internal: hanya memeriksa keberadaan pengurus aktif, bukan identitas pemanggil. | P2 |
| private.ubnb_login_issue_grant | Internal: token acak 32 byte, simpan SHA256, expiry 8 jam; helper mempercayai DID dari pemanggil, sehingga guard wajib di endpoint penerbitnya. | P1 |

## Perubahan dan pengujian

Tidak ada perubahan perilaku database/frontend; tidak ada data finansial, data pengguna, akun atau kredensial dipublikasikan. Pemeriksaan berupa pembacaan definisi database dan pencocokan referensi main. Tidak menjalankan fungsi mutasi, membuat fixture, atau mengeluarkan grant. Uji positif/negatif dalam transaksi rollback belum dilakukan; wajib dilakukan saat menyiapkan pengganti. Tidak ada akun uji dibuat. Rollback dokumentasi dengan revert commit.

## Berikutnya

Selesaikan pemetaan sesi/grant pengurus dan seluruh pemanggil sebelum membatasi endpoint. Siapkan pembuktian identitas untuk enrollment PIN pertama dan pengikatan DID; publikasikan frontend pengganti dan verifikasi situs sebelum pembatasan database. Jangan mencabut jalur lama sekarang. Inventaris fungsi lain, panel/perangkat, scope editor, keuangan dan regresi masih belum selesai. pg_net tidak disentuh; perlindungan password bocor belum diaktifkan, tidak ada perubahan paket/biaya.


# Pembaruan 28 November 2026

Main terbaru yang diamati: f3e29e2085329e6ee261c9630f06b4b9d2221d02. Tahap 1 tetap belum selesai; tidak ada pembatasan login baru diaktifkan.

Advisor langsung: UBNB ERROR 0, WARN 446 (222 anon definer + 222 authenticated definer + extension 1 + password 1), INFO 97. Panel ERROR 0, WARN 16 (7+8+1), INFO 20. UBNB naik 18 warning dibanding kemarin; penyebab individual belum dipastikan. Query katalog memastikan tabel public UBNB tanpa RLS = 0.

Bukti tambahan dari definisi database:
- dashboard_login_lock_grant_check memanggil private.ubnb_login_grant_valid. Helper mengikat hash token pada DID dan expiry; tidak memeriksa pengurus masih aktif. Ini kandidat kebutuhan pencabutan saat peran berubah, bukan perubahan yang sudah diterapkan.
- private.ubnb_secure_actor membaca sesi ber-fingerprint kredensial lewat x-ubnb-staff, atau fallback sesi dk_attendance_session lewat x-ubnb-dk. Tidak membaca grant Kunci Login. Jadi validitas grant tidak otomatis memberi sesi staff terverifikasi.
- private.ubnb_assert_editor mengikat pengurus_did bila tersedia; admin/pemilik dikecualikan, fallback lain mencocokkan nama/username dengan nama jamaah. Pencocokan nama belum merupakan identitas unik dan perlu pengganti berbasis pemetaan akun eksplisit.
- ubnb_assert_legacy_editor juga memiliki fallback pencocokan nama. Keduanya masuk kategori internal perlu penguatan P1; jangan memotong fallback sebelum pemetaan dan pengganti tersedia.

Pengujian: BEGIN, SET LOCAL ROLE anon, headers kosong dan JWT role anon; dashboard_login_lock_grant_check untuk DID/token sintetis tidak valid mengembalikan ok=false; ROLLBACK berhasil. Tidak ada fixture akun, grant, transaksi finansial atau data pengguna dibuat. Uji positif dan lintas akun belum selesai. Pembacaan assets/js/dashboard-core.js lewat konektor mengembalikan konten kosong; tidak dipakai sebagai bukti pemanggil terbaru. Referensi pemanggil 27 November bersifat historis sampai diverifikasi ulang dari checkout terbaru.

Perubahan run ini hanya checkpoint. Rollback: revert commit dokumentasi. Berikutnya: ambil checkout main baru untuk pemanggil sesi aktual, periksa schema sesi dan pemetaan staff-pengurus, buat fixture terisolasi dalam rollback untuk uji positif/negatif sebelum menyiapkan guard pengganti. Inventaris menyeluruh, panel/perangkat, keuangan dan regresi tetap belum selesai. Tidak ada klaim seluruh warning aman; pg_net dan paket biaya tidak diubah.
