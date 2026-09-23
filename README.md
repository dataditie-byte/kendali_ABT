# SISTEM PENGENDALIAN ABT 2026 — FINAL-2

## 1. Arsitektur final

Sistem ini **dipisahkan dari sistem Monitoring IE 2026**. Gunakan database dan Apps Script khusus ABT.

```text
GitHub Pages
    │
    ▼
Frontend ABT 2026
(index.html + app.js + styles.css + config.js)
    │
    ▼
Google Apps Script Web App
(Code.gs FINAL-2)
    │
    ▼
Google Spreadsheet BARU
Database Pengendalian ABT 2026
```

## 2. Yang harus dibuat

Buat **1 Google Spreadsheet baru** dengan nama yang mudah dikenali, misalnya:

`DATABASE PENGENDALIAN ABT BNN 2026`

Jangan menggunakan Spreadsheet Monitoring IE 2026.

Setelah Spreadsheet dibuat:

1. Buka **Extensions → Apps Script**.
2. Hapus kode contoh bawaan.
3. Salin seluruh isi `Code.gs` dari paket ini.
4. Simpan.
5. Jalankan fungsi **`setup()`** satu kali.
6. Berikan izin Google saat diminta.
7. Kembali ke Spreadsheet dan pastikan sheet otomatis muncul.

## 3. Sheet yang dibuat otomatis

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
- `14_INPUT_PIC`

`setup()` juga menyiapkan baseline RKK awal apabila database masih kosong.

### Baseline awal

- Total ABT: **Rp12.364.101.000**
- PEF: **Rp3.666.940.000**
- QDE: **Rp223.100.000**
- UBA: **Rp8.248.839.000**
- UBB: **Rp225.222.000**

**Catatan:** baseline ini adalah seed awal paket. Jika Bro Tije memiliki RKK final yang lebih rinci, data master dapat diganti/ditambahkan di Spreadsheet tanpa mengubah struktur aplikasi.

## 4. Deploy Apps Script

Di Apps Script:

**Deploy → New deployment → Web app**

Gunakan:

- Execute as: **Me**
- Who has access: **Anyone with the link**

Salin URL yang berakhiran `/exec`.

Contoh format:

`https://script.google.com/macros/s/DEPLOYMENT_ID/exec`

## 5. Hubungkan frontend

Buka `config.js`.

Semula:

```javascript
const API_URL = '';
const DEMO_MODE = true;
```

Setelah Web App aktif, ubah menjadi:

```javascript
const API_URL = 'URL_WEB_APP_ANDA';
const DEMO_MODE = false;
```

Contoh:

```javascript
const API_URL = 'https://script.google.com/macros/s/xxxxxxxx/exec';
const DEMO_MODE = false;
```

Kemudian upload seluruh folder ke repository GitHub Pages.

## 6. Alur data produksi

Ketika `DEMO_MODE=false`, dashboard **tidak lagi membaca angka demo**.

Dashboard mengambil data langsung dari Spreadsheet melalui Apps Script:

- Total Pagu → `02_MASTER_ANGGARAN`
- Kebutuhan Dana → `03_KEBUTUHAN_DANA`
- Rencana Pencairan → `04_RENCANA_PENCAIRAN`
- Pencairan Aktual → `05_REALISASI_PENCAIRAN`
- Realisasi Belanja → `06_REALISASI_BELANJA`
- Fisik/Output → `07_MONITORING_MINGGUAN` atau input PIC bila monitoring belum tersedia
- Hambatan → `08_HAMBATAN_ROOTCAUSE`
- Corrective Action → `09_CORRECTIVE_ACTION`
- Risk Register → `10_RISK_REGISTER`
- Input PIC → `14_INPUT_PIC`

Tren keuangan dihitung kumulatif per bulan Januari–Desember 2026 dari transaksi yang benar-benar terisi.

## 7. Perbaikan FINAL-2

FINAL-2 memperbaiki beberapa masalah pada versi sebelumnya:

1. Field backend `need` diseragamkan menjadi `kebutuhan` agar kartu Kebutuhan Dana tidak menjadi Rp0.
2. Dashboard produksi membaca data Spreadsheet, bukan tabel demo.
3. Rencana pencairan dihitung dari `04_RENCANA_PENCAIRAN`.
4. Pencairan aktual dihitung dari `05_REALISASI_PENCAIRAN`.
5. Realisasi belanja dihitung dari `06_REALISASI_BELANJA`.
6. Tren Januari–Desember dibuat dari transaksi aktual.
7. Kartu Kendali membaca kegiatan dan transaksi aktual.
8. Monitoring, hambatan, corrective action dan risk register membaca sheet masing-masing.
9. Status kegiatan tidak lagi menampilkan `MASTER RKK` sebagai status pengendalian.
10. Input PIC setelah disimpan langsung memuat ulang data dari backend.
11. Validasi kode akses menggunakan endpoint Apps Script pada mode produksi.
12. Perhitungan persentase dibuat aman sehingga pembagi kosong menghasilkan `0%`, bukan `NaN%`.
13. ID kegiatan asli digunakan saat input PIC, bukan kode tampilan.

## 8. Kode akses

Kode awal pada `Code.gs`:

`kendali2026`

Jika ingin mengganti kode akses, ubah:

```javascript
ACCESS_CODE: 'kendali2026'
```

di `Code.gs`, lalu deploy ulang Web App setelah perubahan.

## 9. Prinsip pengisian data

Spreadsheet adalah **sumber data utama**. Website membaca dan menyajikan data tersebut.

Jangan memasukkan angka aktual ke `app.js` untuk menggantikan data Spreadsheet.

Jika ada revisi RKK, masukkan pada master Spreadsheet. Jika ada realisasi, masukkan pada sheet transaksi yang sesuai. Jika ada progres, masukkan pada monitoring/PIC.

## 10. Urutan pemasangan yang disarankan

```text
1. Buat Spreadsheet BARU
        ↓
2. Pasang Code.gs FINAL-2
        ↓
3. Jalankan setup()
        ↓
4. Cek semua sheet muncul
        ↓
5. Cek baseline RKK
        ↓
6. Deploy Apps Script sebagai Web App
        ↓
7. Masukkan URL /exec ke config.js
        ↓
8. DEMO_MODE = false
        ↓
9. Upload ke GitHub Pages
        ↓
10. Uji Akses → Dashboard → Input PIC → Refresh
```

## 11. File paket

- `index.html` — halaman utama.
- `styles.css` — desain.
- `app.js` — aplikasi frontend.
- `config.js` — konfigurasi API.
- `Code.gs` — backend FINAL-2.
- `README.md` — panduan pemasangan.
- `assets/` — aset visual.

## 12. Catatan keamanan

Kode akses sederhana pada sistem ini ditujukan sebagai **gerbang aplikasi**, bukan sistem autentikasi tingkat tinggi. Untuk tahap berikutnya, bila diperlukan, dapat ditingkatkan menjadi autentikasi berbasis akun Google/otorisasi pengguna.
