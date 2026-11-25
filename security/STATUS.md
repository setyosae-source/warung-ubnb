# Status perbaikan akses UBNB — 25 November 2026

Perbaikan siap ditinjau. Publikasi situs dan aktivasi aturan akses baru belum dilakukan karena pemeriksaan persetujuan otomatis meminta izin publikasi yang eksplisit untuk perubahan luas pada cabang utama repositori publik.

## Yang sudah diterapkan di database

- Fungsi sesi terverifikasi yang dibuat sebelum pekerjaan terputus tetap tersedia.
- Fungsi permintaan kode keluarga mencatat permintaan tanpa mengembalikan kode atau mengganti kode keluarga.
- Registrasi Sopram melalui fungsi server membatasi akun baru menjadi pengguna biasa.
- Fungsi login menolak hash tersimpan sebagai pengganti password, menyatukan pembatasan percobaan untuk variasi format nomor HP, dan menolak masukan registrasi kosong.
- Perubahan password membatalkan validitas sesi yang memakai kredensial lama.

## Perubahan situs yang disiapkan

- Portal, kasir, warung, BMT, keluarga, JAWARA dan Sopram memakai sesi yang diverifikasi server.
- Keluar akun mencabut token sesi yang benar; jenis akun lain tidak ikut tercabut.
- Halaman keluarga dan Sopram memverifikasi sesi tersimpan sebelum masuk kembali.
- Permintaan kode keluarga dan lupa PIN tetap tersedia tanpa membaca rahasia akun dari browser.
- Versi skrip autentikasi diperbarui untuk mencegah pemakaian skrip lama dari cache.
- Pembaruan profil jamaah pada commit 4bc70e1 ikut tergabung; perubahan tersebut tidak ditimpa.

## Aturan database yang telah diuji, belum diaktifkan

- Pembatasan lima tabel akses: users, ppob_member, sopram_user, keluarga_akses, anggota_akses.
- Pembatasan kolom password/PIN/kode Sopram dan pencegahan perubahan hak admin melalui penyimpanan profil.
- Verifikasi sesi dan identitas pada RPC JAWARA serta pengelolaan profil pengguna.
- Pencatatan pelaku audit berdasarkan sesi terverifikasi serta penghilangan salinan kredensial dari riwayat audit.

Aturan tidak diterapkan merata ke seluruh tabel. Pembatasan tabel operasional lain masih memerlukan pemetaan alur dan pengujian tersendiri; paket ini belum menyatakan seluruh database UBNB sudah aman.

## Hasil verifikasi

- 359 skrip inline: lolos pemeriksaan sintaks.
- Uji JavaScript: header sesi, isolasi permintaan ke layanan lain, pemilihan kolom, pencabutan token yang tepat, dan login server lolos.
- Uji database: kasir, viewer, admin, pengurus desa, pengurus kelompok, anggota, keluarga, dan Sopram lolos login/pemulihan sesi.
- Uji negatif: akses tanpa sesi, pemalsuan ID pengguna/anggota, pembacaan hash, dan eskalasi admin ditolak.
- Uji password: password benar/legacy berfungsi; hash ditolak; perubahan password membatalkan sesi; variasi nomor HP memakai pembatasan percobaan yang sama.
- Pengujian calon aturan berjalan dalam subtransaksi yang dibatalkan. Pemeriksaan setelahnya memastikan calon aturan belum aktif dan akun/data uji tidak tertinggal.
- Uji antarmuka situs yang baru belum dilakukan karena publikasi tertahan.

## Urutan penerapan setelah izin publikasi diberikan

1. Periksa ulang perubahan terbaru di repositori, lalu publikasikan situs termasuk ubnb-security.js dan ubnb-auth.js beserta versi skripnya.
2. Pastikan hasil deploy tersedia dan uji permintaan login melalui halaman baru.
3. Terapkan rpc-guards.sql, access-policy.sql dan audit-identity.sql dalam satu migrasi atomik. Simpan definisi sebelumnya dalam tabel private yang disiapkan skrip. Jalankan verify.sql dalam subtransaksi yang dibatalkan; gagalkan seluruh migrasi jika verifikasi gagal.
4. Uji lagi login, simpan profil, pengaturan pengguna, keluarga dan JAWARA setelah aktivasi. Periksa advisori keamanan yang tersisa; jangan menyimpulkan seluruh tabel sudah terlindungi.
5. Pengguna dengan identitas lokal lama tanpa token terverifikasi perlu masuk ulang. Akun dan data operasional tidak dihapus.
