SISTEM PENGENDALIAN ABT 2026 — FINAL FULL 6.0

Paket tunggal production: frontend GitHub Pages + backend Google Apps Script + Google Sheets.
Alur: Login → Master → PIC → Pemeriksaan/Konfirmasi → Dashboard → Kartu Kendali → Monitoring → Hambatan → Corrective Action → Risk Register → Laporan → Dokumentasi.

Backend hanya Code.gs. Frontend: index.html, styles.css, app.js, config.js, assets/.
PIC menerima master kegiatan ringan; detail transaksi diminta saat kegiatan dipilih. Pengendali menampilkan master lebih dahulu lalu dashboard dimuat asinkron. Pimpinan menggunakan endpoint ringkas. Cache server 5 menit. API memiliki retry satu kali dan timeout 10 detik.

Kode akses: PIC2026; kendali2026 untuk Pengendali dan Laporan.
