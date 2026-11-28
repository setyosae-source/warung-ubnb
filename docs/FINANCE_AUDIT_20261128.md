# Keuangan UBNB, 28 November 2026

## Perubahan

- `keuangan-audit.js` menambahkan rekonsiliasi uang aktual dan bukti pembayaran. Data tersimpan pada `keuangan_rekonsiliasi`, terpisah dari kas/jurnal; tidak ada posting penyeimbang otomatis.
- Pemilik (termasuk Setyo dan Sukamto), admin, bendahara, dan keuangan menggunakan sesi staf server yang sudah ada. RLS menolak akses tanpa sesi; penulis catatan dan nilai sebelum/sesudah dicatat pada audit_log.
- 2026 memakai jurnal posted dan NERACA-2025. Jurnal rekap pendapatan 2025 tidak dihitung ulang. Laba rugi memakai tanggal jurnal, pendapatan/HPP/biaya bersih debit-kredit dan koreksi. Neraca memakai saldo kontra-aset bertanda negatif dan semua kewajiban serta ekuitas, tanpa tambahan manual atau nilai saham hasil harga pasar.
- Laporan 2025/2024 lama tetap tersedia. Perbandingan neraca 2025 memakai saldo pembuka resmi akhir tahun.
- Dashboard, neraca, laba rugi dan ekspor 2026 memakai perhitungan yang sama dan tanggal batas yang terlihat.
- Pengambilan jurnal/detail/mutasi dipaginasi. Pemeriksaan saldo tidak lagi menimpa saldo kas dengan penjumlahan seluruh riwayat impor saham.

## Kontrol pada ekstraksi 28 November

- Kas jurnal seluruhnya Rp81.847.155; kas utama Rp76.976.719.
- Aset Rp256.048.753; neraca selisih Rp0.
- Laba Januari-Oktober Rp31.519.049 (termasuk admin renovasi Rp500).
- Laba sampai 28 November Rp29.845.920; transaksi hari ini dapat mengubah nilai setelah ekstraksi.
- Posisi uang teridentifikasi Rp63.647.758. Selisih sementara Rp18.199.397. Akbar belum diketahui; Indogrosir dan Digiflazz masih memakai saldo aplikasi.
- 18 bukti pengeluaran yang baru diaudit, total Rp37.201.802, ditautkan ke mutasi yang sudah diposting; bukan pengeluaran baru.

## Batas laporan sementara / pekerjaan audit tersisa

1. Laporan kas Akbar, bukti rekening/provider bertanggal sama dan pemetaan BMT RA Rp11.978.293 terhadap tabungan eksternal serta penempatan lama; hindari menghitung uang yang sama dua kali.
2. Rincian piutang pembiayaan, usaha Warung/PPOB dan pelunasan setelah tanggal laporan. Piutang talangan/penggantian pengurus tidak menjadi uang kas.
3. Utang supplier bersaldo debit Rp390.000 dan tanggal pembayaran pembelian; selesaikan rekonsiliasi per supplier sebelum reklasifikasi.
4. Harga pokok/FIFO dan persediaan lokasi lain. Stok lokasi lain Rp2.637.181 belum didukung opname baru; sebagian biaya barang masih sementara.
5. Daftar aset renovasi Rp9.167.000, tanggal siap digunakan, hak penggunaan lokasi, umur manfaat serta penyusutan; saat ini kapitalisasi masih sementara.
6. Bagi hasil BMT per pemodal, margin ditangguhkan, ekuitas transisi, dan saldo pembuka; jangan menganggap mutasi kas sebagai laba.
7. Rekap SHU Rp21.241.500 berbeda Rp10.000 dari rincian penerima Rp21.231.500. Penyerahan kepada kelompok sudah dicatat; bukan bukti bahwa setiap anggota menerima.
8. Setelah sumber lengkap: laporan arus kas, perubahan ekuitas, kebijakan akuntansi/catatan laporan dan proses tutup buku. Laporan yang seimbang belum berarti selesai audit atau telah tersertifikasi memenuhi seluruh standar.

## Pengujian

- `validate-finance.cjs`: perhitungan neraca/laba terhadap kontrol database; selisih neraca nol; cutoff; alokasi usaha; jurnal draft/future dan rekap2025 dikecualikan; pagination1257 baris.
- SQL: RLS tanpa sesi mengembalikan nol baris; bukti yang tidak sama nominal dengan mutasi ditolak (pengujian di-rollback).
- Pemeriksaan sintaks JS dan skrip HTML. Uji browser lokal disiapkan pada `test-finance-ui.py`; biner Chromium tidak tersedia dan unduhan runtime diblokir jaringan, sehingga visual/sesi pengguna belum terverifikasi.
