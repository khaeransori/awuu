# Awuu! Serigala Tangkap Kucing

Game 3D kotak-kotak ala Roblox untuk anak. Kamu jadi serigala dan harus menangkap kucing sebanyak-banyaknya sebelum waktu habis. Game ini dimainkan dengan sentuhan di HP, bisa jalan tanpa internet, dan semuanya ada dalam satu file HTML.

**Main sekarang:** https://khaeransori.github.io/awuu/

## Main di HP

1. Buka https://khaeransori.github.io/awuu/ di Chrome (Android) atau Safari (iPhone).
2. Android: menu titik tiga › **Instal aplikasi** / **Tambahkan ke Layar utama**.
   iPhone: tombol Bagikan › **Tambah ke Layar Utama**.
3. Setelah itu game bisa dimainkan tanpa internet, dan progresnya (bintang, medali, skin) tersimpan di HP.

Alternatif tanpa hosting: unduh [awuu.html](https://khaeransori.github.io/awuu/awuu.html) lalu buka di Chrome. Di beberapa HP Android, progres tidak tersimpan kalau dibuka dari file. Kalau itu terjadi, game otomatis membuka semua pulau.

## Isi game

- **5 pulau:** Taman Bunga, Desa Kotak, Hutan Pinus, Pantai Ceria, Istana Salju (bos: Raja Kucing).
- **7 jenis kucing:** Oren, Abu (cepat), Belang (zig-zag), Ninja (bisa menghilang), Gendut (harus diterkam), Emas (langka), Raja Kucing.
- **Kontrol:** joystick kiri, tombol LOMPAT, TERKAM, AUUU. Di laptop: WASD/panah, Spasi, J, K, P.
- **Tantangan:** target 1–3 bintang, 2 misi bonus per pulau, combo, anjing penjaga, kepiting, air, dan es licin.
- **Bonus:** power-up, 6 skin serigala, album kucing, mode Main Bebas, dan tutorial di pulau pertama.
- Musik dan efek suara dibuat langsung dengan WebAudio, tanpa file audio.

## Pengembangan

```bash
npm ci
npm run build     # hasil di dist/
npm run serve     # buka http://localhost:8080
```

Hasil build:

| File | Kegunaan |
| --- | --- |
| `dist/awuu.html` | Satu file offline, lengkap dengan font dan semua kode |
| `dist/pwa/` | Versi aplikasi (manifest, service worker, ikon) untuk di-hosting |
| `dist/awuu-pwa.zip` | Isi `dist/pwa/` dalam bentuk zip |
| `dist/awuu-artifact.html` | Versi untuk Claude Artifact |

### Tes

Butuh Chromium: `npx playwright install chromium`.

```bash
npm run test:smoke   # main level 1 otomatis, cek error, simpan screenshot ke test-shots/
npm run test:ui      # alur menu di layar portrait + joystick sentuh
npm run test:levels  # screenshot pulau 2–5
npm run test:boss    # alur lawan Raja Kucing
npm run test:pwa     # cek PWA tetap jalan saat offline
npm run sim          # bot main semua pulau, untuk kalibrasi target bintang
npm run perf         # jumlah draw call dan segitiga per pulau
```

### Struktur kode

| File | Isi |
| --- | --- |
| `src/main.js` | Renderer, loop, layar menu, HUD, input sentuh dan keyboard |
| `src/game.js` | Fisika, serigala, AI kucing, anjing, kepiting, power-up, skor, misi, kamera |
| `src/world.js` | Generator 5 pulau dan dekorasinya |
| `src/models.js` | Model kotak-kotak: serigala, kucing, anjing, kepiting, power-up, data skin |
| `src/levels.js` | Konfigurasi pulau: waktu, target bintang, jenis kucing, misi |
| `src/audio.js` | Efek suara dan musik sintetis |
| `src/fx.js` | Partikel, bayangan, gelombang, ikon di atas kepala |
| `src/blocks.js` | Pembuat geometri blok, tekstur, material |
| `src/art.js` | Wajah kucing dan serigala (SVG) untuk menu |
| `src/body.html`, `src/style.css` | Markup dan gaya UI |

Target bintang diatur di `src/levels.js` (`stars: [1★, 2★, 3★]`).

## Deploy

Workflow `.github/workflows/pages.yml` membangun game dan menerbitkannya ke GitHub Pages setiap ada push ke `main`. Aktifkan sekali di **Settings › Pages › Source: GitHub Actions**.
