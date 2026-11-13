# NEXT ARENA 🏆

> **Nusantara Next Competition Management System (CMS)** — Sistem Manajemen Pertandingan Turnamen Modern & Real-Time Arena Display.

---

## 📌 Ringkasan

**NEXT ARENA** adalah sistem manajemen kompetisi dan scoring board interaktif yang dirancang khusus untuk turnamen robotika, esport, maupun perlombaan berbasis arena. Dilengkapi dengan kontrol timer hotkey keyboard yang aman, sinkronisasi antar layar (layar proyektor, arena monitor, dan konsol operator), kalkulasi babak bertingkat (Penyisihan, 8 Besar, Semifinal, Final), stopwatch presisi tinggi milidetik/sentidetik, sistem review log pertandingan, dan database SQLite lokal berkinerja tinggi.

---

## ⚠️ Prasyarat Sistem (System Requirements)

> [!IMPORTANT]
> **Wajib Menggunakan Node.js Versi 22 LTS atau Lebih Baru (`>= 22.0.0`)**
> 
> NEXT ARENA menggunakan database lokal performa tinggi [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) v13 yang membutuhkan runtime **Node.js $\ge$ 22**. 
> Jika Anda menggunakan Node.js versi lama (Node 18 atau Node 20), server akan mengalami crash (*Native Segfault / Exit*) saat memuat database dan browser akan menampilkan error **`Failed to fetch`**.

Cek versi Node.js di komputer Anda:
```bash
node -v
```
* **Jika versi Node.js masih `< 22`**, silakan update terlebih dahulu:
  - **Download installer resmi**: [https://nodejs.org](https://nodejs.org) (Pilih versi **LTS v22.x**).
  - **Atau via Windows PowerShell (Run as Administrator)**:
    ```powershell
    winget install OpenJS.NodeJS.LTS
    ```
  - Setelah instalasi selesai, tutup semua terminal lalu buka terminal baru dan pastikan `node -v` menunjukkan `v22.x.x`.

---

## ✨ Fitur Utama

### 1. ⏱️ Stopwatch Presisi Tinggi (Milidetik & Sentidetik)
- **Akurasi Tinggi (`MM:SS.cs`)**: Stopwatch hitung maju menampilkan satuan menit, detik, dan dua digit sentidetik/milidetik (contoh: `00:45.28` vs `00:45.89`).
- **Mencegah Skor/Waktu Seri**: Menghindari hasil imbang pada penilaian berbasis kecepatan waktu lintasan arena.
- **Tampilan Giant Display**: Tampilan angka sentidetik dengan visual aksen amber terang di layar monitor utama dan konsol tanding.

### 2. ⚔️ Arena Tanding & Live Battle HUD
- **Sistem Ronde 2x Main (Tukar Sisi)**: Mendukung format 1x Main maupun 2x Main (tukar sisi merah & biru).
- **Jeda Review Log & Revisi Poin**: Setelah ronde/leg pertama selesai, pertandingan berhenti sejenak menampilkan rekap skor dan log nilai. Operator dapat merevisi poin sebelum menyetujui (ACC) untuk masuk ke ronde kedua.
- **Hotkey Keyboard Terproteksi**: Hotkey keyboard (tambah/kurang skor, bonus, penalti) hanya aktif saat pertandingan berada di status **"Mulai Bertanding"**, mencegah salah tekan saat persiapan atau jeda.
- **Sound Effects & Audio Buzzer**: Efek suara persiapan, hitung mundur 3-2-1, buzzer mulai, dan peluit selesai yang dapat dikustomisasi.

### 3. 📊 Bagan Turnamen Interaktif (Acak & Susun Manual)
- **Acak Otomatis vs Susun Manual**: Pasangan lawan tanding dapat diacak otomatis oleh sistem atau diinput secara manual sesuai undian fisik panitia.
- **Sinkronisasi Babak Lanjutan**: Tim yang dinyatakan lolos dari babak sebelumnya otomatis muncul di tab babak selanjutnya (8 Besar, Semifinal, Final).
- **Pilihan Acak / Manual Babak Lanjutan**: Tim yang lolos dapat diacak ulang atau dipasangkan secara manual.
- **Reset Poin & Reset Babak**:
  - *Reset Poin*: Mengembalikan semua skor peserta ke angka 0.
  - *Reset Babak*: Mengembalikan seluruh peserta ke babak pertama dan mengosongkan jadwal babak lanjutan.

### 4. 🖥️ Monitor Dashboard & Layar Utama
- **Klasemen Dinamis Per Babak**: Tab klasemen terpisah per babak lomba (Penyisihan, 8 Besar, Semifinal, Final) agar data lebih fokus dan tertata.
- **View Ranking Auto-Scroll**: Tampilan klasemen fullscreen proyektor dengan scrolling lambat (*ping-pong auto-scroll*) saat break kompetisi.
- **Sinkronisasi Multi-Tab**: Sinkronisasi data real-time antar layar menggunakan BroadcastChannel dan SQLite polling tanpa perlu koneksi internet.
- **Running Text Pengumuman**: Marquee berita berjalan di bawah layar untuk informasi panitia.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router & Webpack)
- **UI & Styling**: [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database**: [SQLite](https://www.sqlite.org/) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (Singleton Connection & Safe WAL Fallback)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

---

## 🚀 Panduan Menjalankan (Quick Start)

### 1. Clone atau Ambil Kode Terbaru
```bash
git clone https://github.com/bintangpz/NEXT-ARENA.git
cd NEXT-ARENA
```
Jika sudah pernah clone sebelumnya:
```bash
git fetch upstream
git merge upstream/main
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Jalankan Development Server
```bash
npm run dev
```

Buka browser di alamat:
- **Monitor Utama / Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Konsol Pengaturan & Bagan**: [http://localhost:3000/pengaturan](http://localhost:3000/pengaturan)
- **Arena Tanding**: [http://localhost:3000/tanding](http://localhost:3000/tanding)

> **Catatan untuk Layar Monitor di Komputer Lain / HP:**  
> Akses menggunakan Network IP yang tertera di terminal, contoh: `http://192.168.x.x:3000`.

### 4. Build untuk Production
```bash
npm run build
npm run start
```

---

## 🔧 Panduan Troubleshooting (Masalah Umum di Windows)

### 1. Server Langsung Mati / Muncul Error `Failed to fetch`
* **Penyebab**: Versi Node.js di komputer masih versi 18 atau 20. Modul SQLite membutuhkan Node.js v22+.
* **Solusi**:
  1. Update Node.js ke **v22 LTS** melalui [nodejs.org](https://nodejs.org).
  2. Buka terminal baru dan pastikan `node -v` menghasilkan `v22.x.x`.
  3. Hapus cache lama:
     ```powershell
     Remove-Item -Recurse -Force data, .next -ErrorAction SilentlyContinue
     npm install
     npm run dev
     ```

### 2. Port 3000 Terkunci / Bentrok (*EADDRINUSE*)
* **Penyebab**: Ada proses `node.exe` lama yang masih berjalan di latar belakang Windows.
* **Solusi di PowerShell**:
  ```powershell
  Stop-Process -Name node -Force -ErrorAction SilentlyContinue
  npm run dev
  ```
  Atau gunakan port alternatif:
  ```powershell
  npm run dev -- -p 3001
  ```

### 3. Database Terkunci / Ingin Mulai dari Nol
Hapus database SQLite lokal untuk mengulang dari data awal:
```powershell
Remove-Item -Recurse -Force data -ErrorAction SilentlyContinue
```
Database baru yang bersih akan dibuat secara otomatis saat server berjalan.

---

## 🧪 Pengujian Otomatis (Unit Tests)

Jalankan test suite untuk memverifikasi seluruh fungsionalitas sistem:
```bash
# Pengujian Stopwatch Presisi Milidetik & Sentidetik
node tests/stopwatch-millisecond-precision.test.mjs

# Pengujian Bagan Turnamen, Tab Babak, Reset Poin/Babak, dan Input Manual
node tests/bracket-tab-refinements.test.mjs

# Pengujian Fitur Lainnya
node tests/participant-table-actions.test.mjs
node tests/view-ranking-modal.test.mjs
node tests/ticker-running-text.test.mjs
node tests/pengaturan-header.test.mjs
node tests/shutter-transition-fix.test.mjs
node tests/arena-battle-ui-refinements.test.mjs
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).


