SISTEM PENGENDALIAN ABT 2026 — FINAL 5.0

PAKET FULL / BASELINE BARU
- Tampilan dikembalikan ke gaya versi awal: logo BNN, hero gedung BNN, identitas War On Drugs for Humanity dan Indonesia Bersinar.
- PIC: bootstrap ringan hanya Master Kegiatan + Anggaran; detail keuangan diambil saat memilih kegiatan.
- Kegiatan selalu ditampilkan sebagai KODE — NAMA KEGIATAN, dengan tujuan, sasaran, output dan target master.
- Pagu PIC selalu dihitung dari Master Anggaran, tidak diinput manual.
- Data PIC baru berstatus BELUM DIPERIKSA.
- Pengendali dapat melihat, mengedit, mengonfirmasi dan menghapus data PIC. Edit mengembalikan status BELUM DIPERIKSA.
- Dashboard, Kartu Kendali, Rencana & Realisasi, Monitoring, Hambatan, Corrective Action, Risk Register, Master Data, Laporan dan Dokumentasi tersedia.
- Loading Pengendali dibuat per modul agar login tidak menarik seluruh database sekaligus.
- Tidak ada Code.js. Backend tunggal adalah Code.gs.

GITHUB PAGES: index.html, styles.css, app.js, config.js, assets/
APPS SCRIPT: Code.gs
URL API dipertahankan sesuai deployment yang sudah digunakan.

Catatan: jalankan setup() hanya jika struktur sheet belum tersedia. Jangan menjalankan setup berulang jika database produksi sudah ada.
