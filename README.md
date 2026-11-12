# NEXT ARENA 🏆

> **Nusantara Next Competition Management System (CMS)** — Sistem Manajemen Pertandingan Turnamen Modern & Real-Time Arena Display.

---

## 📌 Ringkasan

**NEXT ARENA** adalah sistem manajemen kompetisi dan scoring board interaktif yang dirancang khusus untuk turnamen robotika, esport, maupun perlombaan berbasis arena. Dilengkapi dengan kontrol timer hotkey, sinkronisasi antar layar (layar proyektor, arena monitor, dan konsol operator), kalkulasi babak bertingkat (Penyisihan, 8 Besar, Semifinal, Final), dan database SQLite lokal berkinerja tinggi.

---

## ✨ Fitur Utama

### 1. 🖥️ Monitor Dashboard & Klasemen
- **Klasemen Dinamis Per Babak**: Filter klasemen berdasarkan babak perlombaan (Babak 1, Babak 2, dst.) atau akumulasi seluruh babak.
- **View Ranking Auto-Scroll**: Modal tampilan klasemen fullscreen otomatis dengan fitur scrolling lambat (ping-pong) saat jeda/break pertandingan.
- **Running Text Pengumuman**: Ticker berita dan pengumuman berjalan (*marquee*) di bagian bawah layar monitor.

### 2. ⚔️ Arena Tanding & Live Battle HUD
- **Stopwatch & Timer Persiapan**: Timer hitung mundur persiapan (10 detik) dan stopwatch hitung maju dengan batas waktu arena.
- **Mode 2x Main (Tukar Sisi)**: Sistem tanding tukar sudut merah & biru secara otomatis dengan kalkulasi skor rata-rata dua putaran.
- **Hotkey Keyboard Cepat**: Tambah/kurang skor sudut merah dan biru langsung menggunakan hotkey keyboard secara real-time.
- **Sound Effects & Audio Buzzer**: Sound buzzer persiapan, hitung mundur 3-2-1, mulai, dan selesai (bisa menggunakan preset studio maupun kustom audio).

### 3. ⚙️ Konsol Pengaturan Turnamen
- **Manajemen Peserta**: Pendaftaran tim, asal instansi/sekolah, kategori lomba, status diskualifikasi/gugur, dan promosi ke babak selanjutnya.
- **Pengaturan Babak & Format Tanding**: Buat dan hapus babak (Penyisihan, 8 Besar, dll.) serta tentukan format perputaran (1x Main / 2x Main).
- **Aturan Poin Kustom**: Tambahkan kriteria tombol poin khusus sesuai regulasi perlombaan.
- **Reset & Keamanan Data**: Fitur reset skor dan database bersih dengan modal konfirmasi aman.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI & Styling**: [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database**: [SQLite](https://www.sqlite.org/) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (WAL mode)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

---

## 🚀 Memulai (Quick Start)

### 1. Clone Repositori
```bash
git clone https://github.com/bintangpz/NEXT-ARENA.git
cd NEXT-ARENA
```

### 2. Instal Dependensi
```bash
npm install
```

### 3. Jalankan Development Server
```bash
npm run dev
```

Buka browser dan akses:
- **Dashboard Monitor**: [http://localhost:3000](http://localhost:3000)
- **Konsol Pengaturan**: [http://localhost:3000/pengaturan](http://localhost:3000/pengaturan)

### 4. Build untuk Production
```bash
npm run build
npm run start
```

---

## 🧪 Pengujian (Unit Tests)

Jalankan rangkaian test otomatis:
```bash
node tests/bracket-tab-refinements.test.mjs
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

