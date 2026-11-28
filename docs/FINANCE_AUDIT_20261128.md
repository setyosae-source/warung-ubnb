# Keuangan UBNB, 28 November 2026

## Perubahan

- `keuangan-audit.js` menambahkan rekonsiliasi uang aktual dan bukti pembayaran. Data tersimpan pada `keuangan_rekonsiliasi`, terpisah dari kas/jurnal; tidak ada posting penyeimbang otomatis.
- Pemilik (termasuk Setyo dan Sukamto), admin, bendahara, dan keuangan menggunakan sesi staf server yang sudah ada. RLS menolak akses tanpa sesi; penulis catatan dan nilai sebelum/sesudah dicatat pada audit_log.
- 2026 memakai jurnal posted dan NERACA-2025. Jurnal rekap pendapatan 2025 tidak dihitung ulang. Laba rugi memakai tanggal jurnal, pendapatan/HPP/biaya bersih debit-kredit dan koreksi. Neraca memakai saldo kontra-aset bertanda negatif dan semua kewajiban serta ekuitas, tanpa tambahan manual atau nilai saham hasil harga pasar.
- Laporan 2025/2024 lama tetap tersedia. Perbandingan neraca 2025 memakai saldo pembuka resmi akhir tahun.
- Dashboard, neraca, laba rugi dan ekspor 2026 memakai perhitungan yang sama dan tanggal batas yang terlihat.
- Pengambilan jurnal/detail/mutasi dipaginasi. Pemeriksaan saldo tidak lagi menimpa saldo kas dengan penjumlahan seluruh riwayat impor saham.

## Kontrol

Saldo kas, aset, laba dan keseimbangan neraca diuji terhadap agregat jurnal database pada tanggal ekstraksi. Angka posisi keuangan dan bukti pembayaran disimpan dalam database berakses sesi, tidak disertakan sebagai fixture publik. Skenario uji meliputi cutoff, jurnal pembalik, draft/future, saldo awal dan duplikasi pemuatan.

## Batas laporan sementara / pekerjaan audit tersisa

1. Laporan kas Akbar, bukti rekening/provider bertanggal sama dan pemetaan BMT RA terhadap tabungan eksternal serta penempatan lama; hindari menghitung uang yang sama dua kali.
2. Rincian piutang pembiayaan, usaha Warung/PPOB dan pelunasan setelah tanggal laporan. Piutang talangan/penggantian pengurus tidak menjadi uang kas.
3. Utang supplier bersaldo debit dan tanggal pembayaran pembelian; selesaikan rekonsiliasi per supplier sebelum reklasifikasi.
4. Harga pokok/FIFO dan persediaan lokasi lain. Stok lokasi lain lokasi lain belum didukung opname baru; sebagian biaya barang masih sementara.
5. Daftar aset renovasi toko, tanggal siap digunakan, hak penggunaan lokasi, umur manfaat serta penyusutan; saat ini kapitalisasi masih sementara.
6. Bagi hasil BMT per pemodal, margin ditangguhkan, ekuitas transisi, dan saldo pembuka; jangan menganggap mutasi kas sebagai laba.
7. Rekap SHU berbeda dari jumlah rincian penerima. Penyerahan kepada kelompok sudah dicatat; bukan bukti bahwa setiap anggota menerima.
8. Setelah sumber lengkap: laporan arus kas, perubahan ekuitas, kebijakan akuntansi/catatan laporan dan proses tutup buku. Laporan yang seimbang belum berarti selesai audit atau telah tersertifikasi memenuhi seluruh standar.

## Pengujian

- `validate-finance.cjs`: perhitungan neraca/laba terhadap kontrol database; selisih neraca nol; cutoff; alokasi usaha; jurnal draft/future dan rekap2025 dikecualikan; pagination1257 baris.
- SQL: RLS tanpa sesi mengembalikan nol baris; bukti yang tidak sama nominal dengan mutasi ditolak (pengujian di-rollback).
- Pemeriksaan sintaks JS dan skrip HTML. Uji browser lokal disiapkan pada `test-finance-ui.py`; biner Chromium tidak tersedia dan unduhan runtime diblokir jaringan, sehingga visual/sesi pengguna belum terverifikasi.
