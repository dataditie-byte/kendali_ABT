# SISTEM PENGENDALIAN ABT 2026 — FINAL-2.1

Frontend GitHub Pages + Google Apps Script + Google Sheets.

## Perubahan FINAL-2.1

### 1. Akses wajib sebelum sistem terbuka
Saat URL dibuka, **dashboard tidak ditampilkan**. Pengguna langsung melihat halaman **Akses Sistem** dan harus memilih peran serta memasukkan kode akses.

### 2. Pemisahan hak akses
- **PIC Kegiatan** → hanya menu **Input Data PIC**.
- **Pengendali** → hanya **Dashboard Ringkas** dan **Laporan**.
- **Pimpinan / Laporan** → **Dashboard Ringkas** dan **Laporan**, dengan tampilan awal Laporan.

Modul Kartu Kendali, Rencana & Realisasi, Monitoring Mingguan, Hambatan, Corrective Action, Risk Register, dan Master Data tidak ditampilkan pada akun PIC/Pengendali/Pimpinan melalui frontend publik.

### 3. Logo BNN
Logo BNN menggunakan file resmi yang diberikan pada percakapan ini: `assets/logo-bnn.webp`.

## Arsitektur

```text
GitHub Pages
    |
    | JSONP API
    v
Google Apps Script (Code.gs)
    |
    v
Google Sheets — Database ABT 2026
```

## Instalasi

1. Buat **Spreadsheet BARU** khusus Pengendalian ABT 2026.
2. Buka **Extensions → Apps Script**.
3. Salin `Code.gs` dari paket ini.
4. Jalankan fungsi `setup()` / fungsi inisialisasi yang tersedia pada `Code.gs` sampai sheet database terbentuk.
5. Deploy sebagai **Web app**:
   - Execute as: **Me**
   - Who has access: sesuai kebijakan organisasi (untuk GitHub Pages dapat menggunakan akses publik dengan kode akses aplikasi).
6. Salin URL `/exec` hasil deployment.
7. Buka `config.js` dan isi:

```javascript
const API_URL = 'URL_WEB_APP_APPS_SCRIPT_ANDA';
const DEMO_MODE = false;
```

8. Upload seluruh folder ke GitHub Pages.

## Database

Backend menyediakan struktur sheet ABT, antara lain:

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

## Catatan PIC

Form PIC pada versi ini sengaja dibatasi hanya pada fungsi input PIC. Dashboard dan modul pengendalian tidak menjadi ruang kerja PIC.

Jika terdapat **Excel Sheet 1 khusus yang menjadi acuan field PIC**, mapping field tersebut harus dijadikan sumber kebenaran sebelum produksi final. Paket ini menggunakan schema PIC yang sudah tersedia pada database ABT (`14_INPUT_PIC`) sebagai baseline teknis.

## Baseline RKK

Baseline awal yang tersedia berasal dari RKK CEGAH ABT T.A. 2026 dengan total alokasi **Rp12.364.101.000**. Data aktual pencairan, belanja, monitoring, hambatan, dan tindak lanjut dibaca dari sheet masing-masing.

## Keamanan

Kode akses frontend bukan pengganti autentikasi organisasi. Untuk penggunaan resmi dengan data sensitif, deployment Apps Script sebaiknya dibatasi sesuai akun/organisasi BNN atau ditambah mekanisme autentikasi yang sesuai.
