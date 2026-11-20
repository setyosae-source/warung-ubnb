UBAID PORTAL PERWIRA — HTML UNTUK GITHUB PAGES

ISI
index.html       Halaman landing
login.html       Login pengurus
dashboard.html  Dashboard (memerlukan login)
CSS, JavaScript, dan gambar sudah ditanam di masing-masing HTML.
Tidak perlu Node.js, npm, build, PHP, atau server aplikasi.

CARA PAKAI
1. Ekstrak ZIP ini.
2. Unggah seluruh isinya ke folder yang diterbitkan oleh GitHub Pages.
   Letakkan index.html, login.html, dan dashboard.html bersebelahan.
   Jangan hanya mengunggah ZIP; GitHub Pages membutuhkan file hasil ekstrak.
3. Aktifkan GitHub Pages untuk repository tersebut dan buka URL HTTPS-nya.
   Tautan relatif juga mendukung repository pada subfolder /nama-repository/.
4. Login memakai username Setyo dan password Dashboard Kelompok yang sudah ada.
   Pengurus tambahan harus diberi akses oleh Setyo melalui menu Pengguna.

KONEKSI
Portal memakai backend Perwira yang sudah dipasang. Publishable key bukan
kunci admin. Hak akses, lingkup kelompok, dan validasi login ditangani server.
Tidak ada password akun, device key, atau data jamaah yang ditanam di HTML.
Untuk login dan membaca/menulis data tetap memerlukan internet.
Gunakan URL HTTPS GitHub Pages, bukan sekadar membuka file HTML dari komputer.

BATASAN
Pembacaan UID KTP melalui NFC HP membutuhkan aplikasi Android native;
browser biasa belum menjamin fungsi ini. Tombol manual UID tetap tersedia.
Aplikasi Android lama belum otomatis diarahkan ke URL GitHub Pages Anda.
Sumber Android perlu menyesuaikan alamat portal setelah URL final diketahui.
Fitur baterai tidak termasuk.

VALIDASI
Diekspor dari portal Perwira yang dipublikasikan 20 November 2026.
Syntax JavaScript dan tautan antarfile diperiksa. Belum diuji login melalui
URL GitHub Pages karena URL repository tujuan belum ditentukan.
