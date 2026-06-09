// Daftar lengkap Kecamatan & Kelurahan/Desa di Kota Administrasi Jakarta Barat
// Sumber: Permendagri 137/2017 (kode wilayah) — 8 kecamatan, 56 kelurahan.

export const KELURAHAN_PER_KECAMATAN: Record<string, string[]> = {
  Cengkareng: [
    "Kedaung Kali Angke",
    "Kapuk",
    "Cengkareng Barat",
    "Cengkareng Timur",
    "Rawa Buaya",
    "Duri Kosambi",
  ],
  "Grogol Petamburan": [
    "Tomang",
    "Grogol",
    "Jelambar",
    "Jelambar Baru",
    "Wijaya Kusuma",
    "Tanjung Duren Utara",
    "Tanjung Duren Selatan",
  ],
  "Taman Sari": [
    "Pinangsia",
    "Glodok",
    "Keagungan",
    "Krukut",
    "Tamansari",
    "Maphar",
    "Tangki",
    "Mangga Besar",
  ],
  Tambora: [
    "Tanah Sereal",
    "Tambora",
    "Roa Malaka",
    "Pekojan",
    "Jembatan Lima",
    "Krendang",
    "Duri Utara",
    "Duri Selatan",
    "Kalianyar",
    "Jembatan Besi",
    "Angke",
  ],
  "Kebon Jeruk": [
    "Duri Kepa",
    "Kedoya Selatan",
    "Kedoya Utara",
    "Kebon Jeruk",
    "Sukabumi Utara",
    "Sukabumi Selatan",
    "Kelapa Dua",
  ],
  Kalideres: [
    "Kamal",
    "Tegal Alur",
    "Pegadungan",
    "Kalideres",
    "Semanan",
  ],
  Palmerah: [
    "Palmerah",
    "Slipi",
    "Kota Bambu Utara",
    "Kota Bambu Selatan",
    "Jatipulo",
    "Kemanggisan",
  ],
  Kembangan: [
    "Kembangan Utara",
    "Kembangan Selatan",
    "Meruya Utara",
    "Meruya Selatan",
    "Srengseng",
    "Joglo",
  ],
};

export const KECAMATAN_LIST = Object.keys(KELURAHAN_PER_KECAMATAN);

// Pilihan jenis hak (sesuai standar BPN)
export const JENIS_HAK_OPTIONS = [
  "HGB",   // Hak Guna Bangunan
  "HGU",   // Hak Guna Usaha
  "HP",    // Hak Pakai
  "HPL",   // Hak Pengelolaan
  "HMSRS", // Hak Milik atas Satuan Rumah Susun
  "HM",    // Hak Milik (singkat)
  "WAKAF",
];
