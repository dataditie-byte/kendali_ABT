# SISTEM PENGENDALIAN ABT 2026 — FINAL-3.3

Versi produksi tanpa data demo/contoh dan tanpa riwayat input PIC di frontend. Seluruh data berasal dari Google Sheets melalui Google Apps Script.

## Hak akses
- PIC Kegiatan — `PIC2026` — hanya Input Data PIC.
- Pengendali — `kendali2026` — Dashboard lengkap dan seluruh modul pengendalian.
- Pimpinan / Laporan — `kendali2026` — hanya Laporan.

## Backend
`Code.gs` sudah menggunakan Spreadsheet ID produksi:
`1kRLF6cqTeqdKHzUi7Gc4otlKRjAkzuUwSqPMK7DiEYY`

URL Web App produksi yang sudah dipasang di `config.js`:
`https://script.google.com/macros/s/AKfycbzCnFZ3rhS1COkGSftXjFuotjmrm1muUhceCPTp_B0A0jKV0Ice4EfX1Nme3sQJruAG/exec`

## Yang perlu diganti
1. Jika deployment Apps Script diganti, ganti hanya `API_URL` di `config.js` dengan URL Web App baru yang berakhiran `/exec`.
2. Jika memakai Spreadsheet berbeda, ganti `CFG.SPREADSHEET_ID` di `Code.gs`.
3. Setelah mengubah `Code.gs`: Deploy → Manage deployments → Edit → New version → Deploy.
4. Jika URL Web App berubah, masukkan URL baru ke `config.js` lalu upload `config.js`, `app.js`, `index.html`, `styles.css`, `Code.gs`, dan folder `assets` ke GitHub.

## Struktur data
Backend memakai sheet `01_MASTER_KEGIATAN` sampai `14_INPUT_PIC` sesuai definisi `SHEETS` dan `SHEET_NAMES` di `Code.gs`.

`seedRKK_()` hanya mengisi baseline RKK ketika sheet kegiatan dan anggaran masih kosong; ini bukan data demo Dashboard. Jika database sudah berisi data, seed tidak dijalankan.

## Tes backend
- `.../exec` → harus mengembalikan JSON `ABT API aktif`.
- `.../exec?api=health` → harus mengembalikan `ok:true` dan nama Spreadsheet.
- `.../exec?api=validateAccess&role=PIC&code=PIC2026` → harus mengembalikan `ok:true`.
- `.../exec?api=getBootstrapData` → harus mengembalikan data ABT dengan `ok:true`.

Jangan menggunakan URL `script.googleusercontent.com/macros/echo?...` sebagai `API_URL`; gunakan URL Web App `/exec`.


## URUTAN PEMASANGAN FINAL-3.3

1. GitHub Pages: ganti `config.js`, `app.js`, `index.html`, `styles.css`, `assets/` dari paket ini.
2. Google Apps Script: ganti seluruh isi `Code.gs` dengan `Code.gs` dari paket ini.
3. Di Apps Script pilih **Deploy → Manage deployments → Edit → New version → Deploy**.
4. Web App: **Execute as = Me**, **Who has access = Anyone**.
5. Jalankan fungsi `setup()` **satu kali** dari editor Apps Script jika database/sheet belum pernah diinisialisasi. Jika sheet sudah ada dan berisi data, fungsi ini tidak menimpa isi data kegiatan/anggaran yang sudah ada.
6. Setelah deployment baru, URL `/exec` tetap digunakan pada `config.js`. Jika Google membuat URL deployment baru, ganti hanya nilai `API_URL`.
7. Tes `.../exec?api=health` terlebih dahulu. Setelah itu buka GitHub Pages dan login.

## PERUBAHAN PENTING FINAL-3.3

- `getBootstrapData()` sekarang read-only; tidak menjalankan setup/format/seed setiap kali Dashboard dibuka.
- Tidak ada data demo/fallback.
- Jika API gagal, Dashboard tidak lagi menampilkan `Rp 0` seolah-olah data memang nol; sistem menampilkan status/error koneksi.
- PIC, Pengendali, dan Pimpinan mengambil data dari sumber Google Sheets yang sama.
- Kode akses: PIC `PIC2026`; Pengendali `kendali2026`; Pimpinan/Laporan `kendali2026`.
