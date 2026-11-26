// Indonesian. Everyday Bahasa Indonesia, the way download sites are searched for.
import type { Dict, ToolCopy, ToolName } from "./en";

export const dict: Dict = {
  meta: {
    homeTitle: "Download Video Gratis Online: MP4 dan MP3 dari Link Apa Saja",
    homeDescription:
      "Tempel link dan simpan video atau audio dari TikTok, Instagram, Facebook, X dan lebih dari 1200 situs. MP4 HD dan MP3 gratis, tanpa daftar dan tanpa install.",
    ogTitle: "{site}: download video gratis online",
    ogDescription:
      "Tempel link dan simpan video atau audio dari TikTok, Instagram, Facebook, X dan lebih dari 1200 situs. Gratis, HD, tanpa daftar.",
    twitterDescription:
      "Tempel link dan simpan video atau audio dari TikTok, Instagram, Facebook, X dan lebih dari 1200 situs.",
    appName: "{site}, pengunduh video",
    appDescription:
      "Pengunduh video online gratis untuk TikTok, Instagram, Facebook, YouTube, X dan lebih dari 1200 situs. Download video dari link sebagai MP4 atau MP3.",
    ogLocale: "id_ID",
  },
  nav: {
    tiktok: "TikTok",
    instagram: "Instagram",
    facebook: "Facebook",
    youtube: "YouTube",
    mp3: "Konverter MP3",
    extension: "Ekstensi",
    blog: "Blog",
    openMenu: "Buka menu",
    closeMenu: "Tutup menu",
    theme: "Ganti mode gelap",
    language: "Bahasa",
  },
  home: {
    h1Line1: "Download Video",
    h1Line2: "Gratis dan Online",
    lead: "Tempel link video dari TikTok, Instagram, Facebook, YouTube, X atau salah satu dari lebih dari 1200 situs lain, lalu download sebagai MP4 atau MP3. Gratis, kualitas HD, tanpa daftar dan tanpa perlu install aplikasi.",
    aboutHeading: "Download video dari link, dari media sosial mana saja",
    about1:
      "{site} adalah pengunduh video online gratis yang bisa dipakai di lebih dari 1200 situs. Tempel link publik dari TikTok, Instagram, Facebook, YouTube, X, Pinterest, Reddit, LinkedIn, Threads, Vimeo, SoundCloud atau platform yang lebih kecil. Situsnya dikenali otomatis, jadi tidak ada menu yang perlu dipilih. Semua kualitas yang tersedia muncul dalam daftar, dari file SD kecil sampai Full HD dan, kalau sumbernya menyediakan, 4K. File tersimpan sebagai MP4 biasa yang bisa diputar di perangkat apa pun, tanpa perlu aplikasi lain.",
    about2Before:
      "Kalau kamu hanya butuh audionya, setiap halaman di sini juga bisa dipakai untuk download MP3. Satu tombol mengubah video menjadi MP3 dengan kualitas terbaik dari sumbernya, sampai 320 kbps. Orang memakainya untuk menyimpan sound TikTok, musik YouTube, podcast dan rekaman suara dari Reels. Ada juga ",
    about2Link: "konverter video ke MP3",
    about2After: " untuk langsung mengubah link menjadi audio.",
    about3Before:
      "Semuanya berjalan di browser, di iPhone, Android, Windows dan Mac, tanpa login dan tanpa daftar. Hanya download konten milikmu sendiri atau yang boleh kamu pakai. ",
    about3Link: "Ketentuan Layanan",
    about3After: " kami menjelaskan aturannya.",
  },
  platforms: {
    heading: "Bisa dipakai di lebih dari 1200 situs",
    intro:
      "Kamu tidak perlu memilih platform. Tempel link, lalu PasteAndSave mengenali asal situsnya dan menampilkan pilihan kualitas. Ini yang paling populer.",
    more: "Snapchat, Twitch, Bluesky, Tumblr, Bandcamp, Mixcloud, Rumble, Imgur, VK dan Bilibili juga bisa, begitu juga banyak situs kecil lainnya.",
  },
  how: {
    heading: "Cara kerjanya",
    steps: [
      {
        title: "Salin link",
        body: "Buka postingan, reel atau video di aplikasi atau browser, lalu salin link bagikannya.",
      },
      {
        title: "Tempel di atas",
        body: "Masukkan link ke kotak di bagian atas halaman ini lalu tekan Download.",
      },
      {
        title: "Pilih kualitas",
        body: "PasteAndSave menampilkan semua resolusi yang tersedia. Pilih satu dan simpan filenya.",
      },
    ],
  },
  faq: {
    heading: "Pertanyaan yang sering diajukan",
    items: [
      {
        q: "Apakah ini gratis?",
        a: "Ya. Tempel link, pilih kualitas dan simpan filenya. Kamu tidak perlu akun, dan tidak ada apa pun yang ditambahkan ke videomu.",
      },
      {
        q: "Bisakah saya download postingan privat?",
        a: "Tidak. PasteAndSave hanya bisa mengambil konten publik, sama seperti membukanya di browser tanpa login.",
      },
      {
        q: "Situs apa saja yang didukung?",
        a: "Lebih dari 1200 situs bisa dipakai di sini, termasuk Instagram, TikTok, Facebook, X, YouTube, Pinterest, Reddit, Vimeo, SoundCloud dan Twitch. Situsnya dikenali dari link yang kamu tempel.",
      },
      {
        q: "Apa yang boleh saya download?",
        a: "Konten milikmu, konten yang kamu punya izin untuk dipakai, dan materi yang lisensinya boleh dipakai ulang. Hargai orang yang membuat videonya.",
      },
      {
        q: "Bagaimana cara download video dari link?",
        a: "Salin link bagikan dari situs atau aplikasinya, tempel ke kotak di bagian atas halaman ini, lalu tekan Download. Semua kualitas yang tersedia muncul dalam daftar, biasanya kurang dari semenit.",
      },
      {
        q: "Bisakah link video langsung diubah ke MP3?",
        a: "Bisa. Setelah menempel link, buka tab Audio dan jangan pilih kualitas video. Hanya trek audionya yang didownload.",
      },
    ],
  },
  bookmarklet: {
    heading: "Download dari halaman mana saja dengan satu klik",
    body: "Seret tombol ini ke bilah bookmark kamu. Lalu, di video atau postingan mana pun, klik tombolnya untuk membuka {site} dengan link yang sudah terisi. Tanpa salin dan tempel.",
    button: "Simpan dengan {site}",
    shareNote: "Kamu juga bisa membagikan link yang siap didownload:",
  },
  footer: {
    about:
      "Pengunduh video online gratis yang bisa dipakai di lebih dari 1200 situs. Tempel link, pilih kualitas dan simpan filenya.",
    downloaders: "Pengunduh",
    moreTools: "Alat lainnya",
    extension: "Ekstensi Browser",
    terms: "Ketentuan Layanan",
    privacy: "Kebijakan Privasi",
    disclaimer:
      "PasteAndSave adalah alat independen dan tidak berafiliasi dengan platform mana pun yang didukungnya. Hanya download konten yang berhak kamu gunakan.",
    geo: "Geolokasi IP oleh DB-IP",
  },
  ads: {
    label: "Iklan",
  },
  tool: {
    why: "Kenapa memakai {name} dari {site}?",
    howTo: "Cara memakai {name}",
    faqHeading: "Pertanyaan yang sering diajukan",
    others: "Pengunduh gratis lainnya",
  },
  downloader: {
    placeholder: "Tempel link video kamu di sini",
    inputLabel: "Tempel URL video",
    clear: "Hapus link",
    clearTitle: "Hapus",
    paste: "Tempel",
    download: "Download",
    lookingUp: "Mencari...",
    reading: "Sedang membaca link, tunggu sebentar.",
    video: "Video",
    audio: "Audio",
    save: "Simpan",
    starting: "Memulai…",
    downloading: "Mendownload {n}%",
    converting: "Mengonversi…",
    noFormats: "Tidak ada format yang bisa didownload dari link ini.",
    videosCount: "{n} video",
    showingFirst: " (menampilkan {n} pertama)",
    pickOne: "pilih satu untuk didownload",
    emptyLink: "Tempel link video dulu.",
    notALink: "Itu sepertinya bukan link. Salin alamat lengkap dari browser kamu lalu tempel di sini.",
    notHttp: "Hanya link web yang diawali http atau https yang bisa didownload.",
    noHost: "Link itu tidak punya nama situs. Periksa lalu coba lagi.",
    tooSlow: "Link terlalu lama dibaca. Situsnya mungkin sedang sibuk, coba lagi.",
    offline: "Tidak bisa terhubung ke server. Periksa koneksi kamu lalu coba lagi.",
    genericError: "Ada yang salah. Coba lagi.",
    playlistError: "Playlist itu tidak bisa dibaca.",
    startFailed: "Gagal memulai.",
    jobFailed: "Ada yang salah dengan download ini. Coba lagi.",
    serverUnreachable: "Tidak bisa terhubung ke server.",
    photo: "Foto",
    image: "Gambar",
  },
  errors: {
    UNSUPPORTED_SITE: "Link itu bukan dari situs yang bisa kami download.",
    SHARE_LINK_DEAD:
      "Link bagikan itu sudah tidak mengarah ke video. Kalau masih bisa dibuka di perangkatmu, salin link dari bilah alamat lalu tempel di sini.",
    RELAY_DOWN: "Download dari situs ini sedang tidak tersedia sebentar. Fitur lain tetap berjalan.",
    SITE_UNAVAILABLE_HERE: "Kami tidak bisa mengambil dari situs itu di sini. Fitur lain tetap berjalan.",
    AGE_CHECK_REGION:
      "Situs ini meminta pengunjung dari negara server kami untuk membuktikan umur, jadi videonya tidak diberikan. Situs lain tetap bisa.",
    DRM_PROTECTED: "Video ini dilindungi dari penyalinan, jadi tidak bisa didownload.",
    SITE_NOT_SUPPORTED: "Download dari situs ini tidak didukung.",
    MEDIA_REMOVED: "Video ini sudah dihapus atau tidak tersedia lagi.",
    NO_FORMATS: "Tidak ada video di link itu. Mungkin itu foto, story atau postingan berisi teks saja.",
    LOGIN_REQUIRED: "Video ini perlu login untuk ditonton, jadi tidak bisa didownload di sini.",
    LOGIN_ONLY: "Video ini hanya bisa ditonton setelah login, atau sudah diturunkan, jadi tidak bisa didownload di sini.",
    EMBED_ONLY:
      "Pemilik video ini hanya mengizinkannya diputar di situsnya sendiri. Tempel alamat halaman tempat kamu menontonnya.",
    AGE_RESTRICTED: "Video ini dibatasi umur dan perlu login, jadi tidak bisa diambil.",
    PRIVATE: "Konten ini privat, jadi tidak bisa didownload.",
    GEO_BLOCKED: "Video ini diblokir di wilayah server kami, jadi tidak bisa kami akses.",
    UPSTREAM_BLOCKED: "Situs ini sedang menolak server kami. Tunggu sebentar lalu coba lagi.",
    EXTRACTOR_TIMEOUT: "Terlalu lama dan waktunya habis. Coba lagi.",
    NOT_MEDIA: "Link ini adalah dokumen, bukan video, audio atau foto, jadi tidak ada yang bisa disimpan.",
    BUSY: "Kami sedang memproses banyak link. Coba lagi sebentar lagi.",
    TOO_MANY: "Terlalu banyak permintaan. Pelan pelan saja.",
    UNKNOWN: "Link itu tidak bisa dibaca. Mungkin privat, diblokir di wilayahmu, atau situsnya mengubah sesuatu.",
  },
  review: {
    title: "Bagaimana hasilnya?",
    body: "Download kamu sudah dimulai. Kalau ada waktu sebentar, ceritakan pendapatmu tentang PasteAndSave di Trustpilot. Bagus atau jelek, setiap ulasan membantu.",
    write: "Tulis ulasan",
    notNow: "Nanti saja",
  },
};

export const toolNames: Record<string, ToolName> = {
  "tiktok-video-downloader": { navLabel: "TikTok", h1: "Download Video TikTok" },
  "instagram-video-downloader": { navLabel: "Instagram", h1: "Download Video Instagram" },
  "instagram-reels-downloader": { navLabel: "Reels", h1: "Download Reels Instagram" },
  "facebook-video-downloader": { navLabel: "Facebook", h1: "Download Video Facebook" },
  "facebook-reels-downloader": { navLabel: "FB Reels", h1: "Download Reels Facebook" },
  "youtube-video-downloader": { navLabel: "YouTube", h1: "Download Video YouTube" },
  "youtube-to-mp3": { navLabel: "YouTube MP3", h1: "Konverter YouTube ke MP3" },
  "video-to-mp3-converter": { navLabel: "Konverter MP3", h1: "Konverter Video ke MP3" },
  "twitter-video-downloader": { navLabel: "X / Twitter", h1: "Download Video Twitter (X)" },
  "pinterest-video-downloader": { navLabel: "Pinterest", h1: "Download Video Pinterest" },
  "reddit-video-downloader": { navLabel: "Reddit", h1: "Download Video Reddit" },
  "linkedin-video-downloader": { navLabel: "LinkedIn", h1: "Download Video LinkedIn" },
  "threads-video-downloader": { navLabel: "Threads", h1: "Download Video Threads" },
  "vimeo-video-downloader": { navLabel: "Vimeo", h1: "Download Video Vimeo" },
  "dailymotion-video-downloader": { navLabel: "Dailymotion", h1: "Download Video Dailymotion" },
  "soundcloud-mp3-downloader": { navLabel: "SoundCloud", h1: "Download MP3 SoundCloud" },
};

export const tools: Record<string, ToolCopy> = {
  "tiktok-video-downloader": {
    navLabel: "TikTok",
    h1: "Download Video TikTok",
    title: "Download Video TikTok Tanpa Watermark, Gratis",
    description:
      "Download video TikTok tanpa watermark secara gratis. Tempel link dan simpan video dalam MP4 HD, atau ubah TikTok ke MP3. Tanpa login, tanpa aplikasi, tanpa daftar.",
    keywords: [
      "download video tiktok",
      "download tiktok tanpa watermark",
      "tiktok downloader",
      "simpan video tiktok",
      "tiktok ke mp3",
      "download lagu tiktok",
      "download tiktok hd",
      "unduh video tiktok",
    ],
    tagline:
      "Simpan video TikTok publik apa pun dalam HD tanpa watermark di filenya. Berjalan di browser dan kamu tidak perlu login.",
    placeholder: "Tempel link video TikTok di sini",
    features: [
      {
        title: "Tanpa watermark",
        body: "Video yang tersimpan bersih. Tidak ada logo TikTok atau nama pengguna di atas videonya.",
      },
      {
        title: "Kualitas MP4 HD",
        body: "Kamu mendapat kualitas terbaik yang disediakan TikTok untuk video itu, tersimpan sebagai MP4 biasa.",
      },
      {
        title: "TikTok ke MP3",
        body: "Kalau hanya butuh suaranya, download trek audionya sebagai MP3.",
      },
      {
        title: "Gratis dipakai",
        body: "Tidak ada batas dan tidak perlu akun. Buka halamannya, tempel link dan download.",
      },
    ],
    stepsHeading: "Cara download video TikTok",
    steps: [
      { title: "Salin link", body: "Buka TikTok, ketuk Bagikan pada video, lalu ketuk Salin tautan." },
      { title: "Tempel di sini", body: "Kembali ke halaman ini, tempel link di kotak lalu tekan Download." },
      { title: "Simpan file", body: "Pilih MP4 atau MP3. Filenya masuk ke folder download kamu." },
    ],
    deviceNote:
      "Pengunduh ini berjalan di browser, jadi hasilnya sama di iPhone, Android, Windows dan Mac. Tidak ada yang perlu diinstall.",
    faqs: [
      {
        q: "Bagaimana cara download video TikTok tanpa watermark?",
        a: "Salin link video di aplikasi TikTok lewat Bagikan, lalu Salin tautan. Tempel di kotak di atas dan pilih opsi MP4. File yang tersimpan tidak punya watermark TikTok.",
      },
      {
        q: "Apakah pengunduh TikTok ini gratis?",
        a: "Ya, gratis dan tanpa batas download. Kamu tidak perlu akun atau aplikasi.",
      },
      {
        q: "Bisakah download video TikTok di iPhone?",
        a: "Buka halaman ini di Safari, tempel link dan download. Videonya masuk ke aplikasi File di iOS 13 ke atas. Dari sana kamu bisa memindahkannya ke Foto.",
      },
      {
        q: "Bisakah TikTok diubah ke MP3?",
        a: "Setelah menempel link, buka tab Audio. Hanya trek audionya yang didownload, tersimpan sebagai file MP3.",
      },
      {
        q: "Bisakah download video TikTok yang privat?",
        a: "Tidak. Alat ini melihat sama seperti browser tanpa login, jadi hanya video publik yang bisa.",
      },
      {
        q: "Di mana video TikTok yang didownload tersimpan?",
        a: "Di lokasi download biasa di browser kamu. Itu folder Download di PC dan Android, atau aplikasi File di iPhone.",
      },
      {
        q: "Apakah saya perlu install aplikasi atau ekstensi?",
        a: "Tidak. Seluruh alat ini berjalan di dalam browser, di perangkat apa pun.",
      },
    ],
  },
  "instagram-video-downloader": {
    navLabel: "Instagram",
    h1: "Download Video Instagram",
    title: "Download Video Instagram: Reels, Story dan Foto HD",
    description:
      "Download video, Reels, story, foto dan audio Instagram dalam HD. Pengunduh Instagram gratis yang bisa dipakai di iPhone, Android dan PC. Tidak perlu login.",
    keywords: [
      "download video instagram",
      "download reels instagram",
      "download story instagram",
      "download foto instagram",
      "instagram downloader",
      "reels instagram ke mp3",
      "simpan video instagram",
    ],
    tagline:
      "Simpan video, Reels, story dan foto Instagram dalam HD. Kamu tidak pernah login dan tidak ada yang perlu diinstall.",
    placeholder: "Tempel link video, Reel atau postingan Instagram di sini",
    features: [
      {
        title: "Reels, video dan foto",
        body: "Satu alat untuk Reels Instagram, video feed, postingan foto dan story publik.",
      },
      {
        title: "Kualitas Full HD",
        body: "File didownload dalam resolusi tertinggi yang disediakan Instagram, sampai 1080p.",
      },
      {
        title: "Tanpa login",
        body: "Kamu tidak pernah memasukkan akun Instagram. Alat ini hanya menjangkau konten publik.",
      },
      {
        title: "Pilihan audio MP3",
        body: "Kamu bisa mengambil audionya saja dari Reel mana pun sebagai MP3. Cocok untuk sound original.",
      },
    ],
    stepsHeading: "Cara download video Instagram",
    steps: [
      {
        title: "Salin link",
        body: "Ketuk menu titik tiga atau ikon Bagikan di postingan atau Reel, lalu pilih Salin tautan.",
      },
      { title: "Tempel di sini", body: "Masukkan link ke kotak di bagian atas halaman ini lalu tekan Download." },
      {
        title: "Pilih kualitas",
        body: "Pilih resolusi dan MP4 tersimpan di perangkatmu. Ada juga MP3 kalau kamu hanya butuh audionya.",
      },
    ],
    deviceNote:
      "Bisa di iPhone, Android, Windows dan Mac lewat browser modern apa pun. Tanpa aplikasi, tanpa ekstensi dan tanpa login Instagram.",
    faqs: [
      {
        q: "Bagaimana cara download Reel Instagram?",
        a: "Salin link Reel dari menu Bagikan, tempel di kotak di atas dan pilih kualitas MP4. Reel tersimpan sebagai file video biasa.",
      },
      {
        q: "Apakah Reels Instagram ada watermarknya?",
        a: "Instagram tidak menambahkan watermark ke Reels, dan alat ini juga tidak. File didownload persis seperti yang diberikan Instagram.",
      },
      {
        q: "Bisakah download story Instagram?",
        a: "Story publik bisa selama masih aktif. Tempel link story dengan cara yang sama. Story dari akun privat tidak bisa dijangkau.",
      },
      {
        q: "Apakah bisa tanpa login ke Instagram?",
        a: "Bisa. Kamu tidak pernah login. Alat ini hanya melihat konten yang terlihat publik.",
      },
      {
        q: "Bisakah download foto Instagram juga?",
        a: "Tempel link postingan foto dan kamu mendapat gambarnya dalam resolusi penuh.",
      },
      {
        q: "Bisakah mengambil audio saja dari Reel?",
        a: "Bisa. Setelah menempel link, buka tab Audio untuk mendapat suaranya saja.",
      },
      {
        q: "Bisakah menyimpan video Instagram di iPhone?",
        a: "Bisa. Pakai Safari, tempel link dan download. Filenya masuk ke aplikasi File, lalu bisa kamu pindahkan ke Foto.",
      },
      {
        q: "Kenapa postingan privat gagal?",
        a: "Pengunduh ini melihat Instagram seperti pengunjung yang tidak login. Konten privat atau khusus pengikut memang tidak bisa dijangkau.",
      },
    ],
  },
  "youtube-video-downloader": {
    navLabel: "YouTube",
    h1: "Download Video YouTube",
    title: "Download Video YouTube: Simpan Sebagai MP4 HD",
    description:
      "Pengunduh video YouTube online gratis. Simpan video dan Shorts YouTube sebagai MP4 HD dengan daftar kualitas lengkap. Tanpa daftar dan tanpa aplikasi.",
    keywords: [
      "download video youtube",
      "youtube downloader",
      "download youtube online",
      "youtube ke mp4",
      "download shorts youtube",
      "download youtube hd",
      "simpan video youtube",
    ],
    tagline:
      "Simpan video dan Shorts YouTube sebagai file MP4. Semua kualitas yang tersedia ditampilkan supaya kamu bisa memilih ukuran yang diinginkan.",
    placeholder: "Tempel link video atau Shorts YouTube di sini",
    features: [
      {
        title: "Semua kualitas tampil",
        body: "Lihat semua resolusi yang tersedia untuk video itu dan pilih yang ingin kamu simpan.",
      },
      {
        title: "Shorts didukung",
        body: "Link YouTube Shorts didownload dengan cara yang sama seperti video biasa.",
      },
      { title: "MP4 dan MP3", body: "Simpan video lengkap sebagai MP4, atau ambil audionya saja sebagai MP3." },
      {
        title: "Tanpa aplikasi",
        body: "Pengunduh ini berjalan di browser, di ponsel, tablet dan komputer.",
      },
    ],
    stepsHeading: "Cara download video YouTube",
    steps: [
      {
        title: "Salin link",
        body: "Pakai Bagikan lalu Salin link di video atau Shorts. Link youtu.be biasa juga bisa.",
      },
      { title: "Tempel di sini", body: "Masukkan link ke kotak di bagian atas halaman ini lalu tekan Download." },
      { title: "Pilih resolusi", body: "Pilih dari daftar kualitas dan filenya tersimpan di perangkatmu." },
    ],
    deviceNote: "Bisa di Android, iPhone, Windows, Mac dan Linux. Tidak ada yang diinstall.",
    faqs: [
      {
        q: "Bagaimana cara download video YouTube sebagai MP4?",
        a: "Tempel link video di atas dan tunggu daftar kualitasnya. Pilih opsi MP4 dan filenya langsung didownload.",
      },
      {
        q: "Bisakah download YouTube Shorts?",
        a: "Bisa. Link Shorts bekerja di sini persis seperti link video biasa.",
      },
      {
        q: "Kenapa beberapa kualitas tertulis tanpa audio?",
        a: "YouTube menyimpan resolusi tertingginya sebagai trek video saja. Opsi yang ada audionya siap ditonton. File video saja cocok untuk keperluan editing.",
      },
      {
        q: "Bisakah download satu playlist penuh?",
        a: "Bisa. Tempel link playlist dan alat ini menampilkan videonya supaya kamu bisa download yang mana saja tanpa menyalin link satu per satu. Playlist besar ditampilkan sampai batas tertentu.",
      },
      {
        q: "Bisakah download video yang dibatasi umur atau privat?",
        a: "Tidak. Hanya video yang bisa kamu tonton di browser tanpa login yang bisa didownload.",
      },
      {
        q: "Apakah ada batas durasi atau ukuran?",
        a: "Tidak ada batas tetap. Video panjang hanya butuh waktu lebih lama untuk diproses.",
      },
      {
        q: "Apakah download video YouTube diperbolehkan?",
        a: "Download hanya yang berhak kamu download: unggahanmu sendiri, materi Creative Commons, dan video yang pemiliknya memberi izin. Apa yang kamu lakukan dengan alat ini adalah tanggung jawabmu.",
      },
    ],
  },
};
