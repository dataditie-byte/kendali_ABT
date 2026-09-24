# SISTEM PENGENDALIAN ABT 2026 — FINAL-3.0

Frontend GitHub Pages + Google Apps Script + Google Sheets untuk Pengendalian ABT 2026 Deputi Bidang Pencegahan BNN.

## Prinsip FINAL-3.0

Versi ini **tidak menggunakan data contoh/demo** dan **tidak menampilkan riwayat input PIC** pada frontend. Dashboard, laporan, dan form PIC membaca data melalui Google Apps Script dari Google Sheets.

### Hak akses
- **PIC Kegiatan** — kode `PIC2026`; hanya **Input Data PIC**.
- **Pengendali** — kode `kendali2026`; **Dashboard lengkap + seluruh modul pengendalian**.
- **Pimpinan / Laporan** — kode `kendali2026`; hanya **Laporan**.

### Dropdown Input PIC
- Periode: September 2026, Oktober 2026, Nopember 2026, Desember 2026.
- Direktorat: Direktorat Informasi & Edukasi; Direktorat Advokasi.

## Alur data

```text
GitHub Pages / app.js
        |
        | JSONP
        v
Google Apps Script / Code.gs
        |
        v
Google Sheets — Database ABT 2026
        |
        v
Dashboard / Laporan / Input PIC
```

Tidak ada data demo/fallback. Jika API belum terhubung, sistem menampilkan pesan konfigurasi API dan tidak mengarang angka.

## Instalasi backend

1. Gunakan Spreadsheet khusus Pengendalian ABT 2026.
2. Buka **Extensions → Apps Script**.
3. Salin `Code.gs` dari paket ini.
4. Jalankan fungsi `setup()` / inisialisasi yang tersedia sampai struktur sheet terbentuk.
5. Deploy sebagai **Web app**.
6. Salin URL deployment yang berakhiran `/exec`.

## Konfigurasi frontend

Buka `config.js` dan isi: 

```javascript
const API_URL = 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec';
const APP_VERSION = 'ABT-2026-FINAL-3.0.0';
```

**Jangan menambahkan `DEMO_MODE`.** FINAL-3.0 memang tidak mempunyai mode demo.

Kemudian upload seluruh file ke GitHub Pages.

## Database backend

Backend menggunakan sheet utama ABT, termasuk:
- `01_MASTER_KEGIATAN`
- `02_MASTER_ANGGARAN`
- `03_KEBUTUHAN_DANA`
- `04_RENCANA_PENCAIRAN`
- `05_REALISASI_PENCAIRAN`
- `06_REALISASI_BELANJA`
- `07_MONITORING_MINGGUAN`
- `08_HAMBATAN_ROOTCAUSE`
- `09_CORRECTIVE_ACTION`
- `10_RISK_REGISTER`
- `11_DOKUMEN_PENDUKUNG`
- `12_LOG_AKTIVITAS`
- `13_DASHBOARD`
- `14_INPUT_PIC`

`14_INPUT_PIC` tetap menjadi tempat penyimpanan input PIC. Yang dihapus adalah **tampilan riwayat input di frontend**, bukan penyimpanan data yang sudah diinput.

## Baseline RKK

Baseline RKK CEGAH ABT T.A. 2026 menggunakan total alokasi **Rp12.364.101.000**. Data aktual tidak berasal dari angka demo; data dibaca dari database Spreadsheet.

## Kode akses FINAL-3.0

```text
PIC          = PIC2026
PENGENDALI   = kendali2026
PIMPINAN     = kendali2026
```

Kode akses juga diperiksa oleh `Code.gs`, bukan hanya oleh tampilan frontend.

## Catatan produksi

- Setelah mengganti `Code.gs`, lakukan **Deploy → Manage deployments → Edit → New version** pada Web App.
- Pastikan URL frontend menggunakan file FINAL-3.0.
- Jika browser/HP masih menampilkan file lama, versi query pada `config.js` dan `app.js` sudah dinaikkan ke `3.0.0` untuk membantu menghindari cache.
- Jangan memasukkan data contoh ke Spreadsheet produksi.
