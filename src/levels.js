export const LEVELS = [
  {
    name: 'Taman Bunga', theme: 'park', seed: 11, time: 90, stars: [10, 20, 34], maxCats: 6,
    mix: { oren: 1 }, dogs: 0, crabs: 0, powers: ['tulang', 'bintang', 'jam'], golden: [],
    intro: 'Kucing-kucing kabur ke taman! Tangkap sebanyak-banyaknya sebelum waktu habis.',
    tip: { cat: 'oren', text: 'Kejar Kucing Oren lalu tabrak dia untuk menangkap!' },
    missions: [
      { id: 'combo3', text: 'Tangkap 3 kucing berturut-turut (COMBO x3)' },
      { id: 'air', text: 'Tangkap kucing sambil melompat' },
    ],
    tutorial: true,
  },
  {
    name: 'Desa Kotak', theme: 'village', seed: 22, time: 90, stars: [11, 21, 33], maxCats: 7,
    mix: { oren: 3, abu: 2, belang: 2 }, dogs: 1, crabs: 0, powers: ['tulang', 'jam', 'bintang'], golden: [],
    intro: 'Ada kucing di atas atap! Naik tumpukan kotak buat mengejar mereka.',
    tip: { cat: 'abu', text: 'Kucing Abu larinya cepat. Tekan TERKAM untuk melesat!' },
    warn: 'Awas anjing penjaga! Kalau ketabrak, kamu pusing sebentar.',
    missions: [
      { id: 'roof', text: 'Tangkap kucing di atas atap rumah' },
      { id: 'nodog', text: 'Selesaikan level tanpa ketabrak anjing' },
    ],
  },
  {
    name: 'Hutan Pinus', theme: 'forest', seed: 33, time: 100, stars: [9, 17, 27], maxCats: 8,
    mix: { oren: 3, abu: 2, ninja: 2, belang: 1 }, dogs: 2, crabs: 0, powers: ['tulang', 'ikan', 'jam', 'bintang'], golden: [55],
    intro: 'Hutannya luas! Lompat di jamur merah untuk terbang tinggi.',
    tip: { cat: 'ninja', text: 'Kucing Ninja bisa menghilang. Tekan AUUU biar dia kaget dan diam!' },
    missions: [
      { id: 'ninja2', text: 'Tangkap 2 Kucing Ninja' },
      { id: 'howl3', text: 'Tangkap 3 kucing yang lagi kaget karena AUUU' },
    ],
  },
  {
    name: 'Pantai Ceria', theme: 'beach', seed: 44, time: 100, stars: [20, 40, 62], maxCats: 8,
    mix: { oren: 2, belang: 2, gendut: 2, abu: 1 }, dogs: 1, crabs: 3, powers: ['tulang', 'ikan', 'jam', 'bintang'], golden: [25, 65],
    intro: 'Pantai penuh kucing! Di air kamu jadi lambat, dan hati-hati sama kepiting.',
    tip: { cat: 'gendut', text: 'Kucing Gendut berat banget. Harus pakai TERKAM!' },
    missions: [
      { id: 'gold', text: 'Tangkap Kucing Emas' },
      { id: 'fat3', text: 'Tangkap 3 Kucing Gendut' },
    ],
  },
  {
    name: 'Istana Salju', theme: 'snow', seed: 55, time: 120, stars: [15, 30, 46], maxCats: 8,
    mix: { oren: 2, abu: 2, belang: 1, ninja: 1, gendut: 1 }, dogs: 2, crabs: 0, powers: ['tulang', 'ikan', 'jam', 'bintang'], golden: [70], boss: true,
    intro: 'Raja Kucing tinggal di istana es! Lantai es itu licin, hati-hati belok.',
    tip: { cat: 'raja', text: 'TERKAM Raja Kucing 3 kali untuk menangkapnya!' },
    missions: [
      { id: 'boss', text: 'Tangkap Raja Kucing' },
      { id: 'combo5', text: 'Tangkap 5 kucing berturut-turut (COMBO x5)' },
    ],
  },
];
