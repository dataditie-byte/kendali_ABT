SISTEM PENGENDALIAN ABT 2026 — FINAL 4.0

Isi paket:
- index.html : antarmuka aplikasi
- styles.css : tampilan responsif
- app.js     : logika frontend dan alur peran
- config.js  : konfigurasi URL layanan dan versi
- Code.gs    : backend Google Apps Script

ALUR FINAL:
RKK/Master -> PIC -> Data Masuk PIC -> Pemeriksaan Pengendali -> Konfirmasi -> Dashboard/Kartu Kendali/Monitoring -> Hambatan -> Corrective Action -> Risk Register -> Laporan.

PENTING:
1. Pagu kegiatan dihitung dari Master Anggaran; PIC tidak dapat mengetik/mengubah Pagu.
2. Data PIC baru berstatus BELUM DIPERIKSA.
3. Edit Pengendali mengembalikan status menjadi BELUM DIPERIKSA.
4. Konfirmasi Pengendali mengubah status menjadi DIKONFIRMASI.
5. Hapus PIC dicatat pada LOG AKTIVITAS.
6. KPI yang datanya belum tersedia ditampilkan sebagai tanda — pada frontend.
7. Periode PIC dibatasi September, Oktober, Nopember, Desember 2026.
8. Jalankan setup()/initializeSystem() pada project Apps Script sebelum digunakan bila sheet belum siap.
9. Setelah Code.gs diperbarui, deploy versi Web App baru pada deployment yang dipakai config.js.
