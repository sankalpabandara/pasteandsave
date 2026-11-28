// Spanish. Neutral Latin American Spanish that also reads naturally in Spain.
import type { Dict, ToolCopy, ToolName } from "./en";

export const dict: Dict = {
  meta: {
    homeTitle: "Descargador de videos gratis: MP4 y MP3 desde cualquier enlace",
    homeDescription:
      "Pega un enlace y guarda video o audio de TikTok, Instagram, Facebook, X y más de 1000 sitios. MP4 en HD y MP3 gratis, sin registro y sin instalar nada.",
    ogTitle: "{site}: descargador de videos gratis online",
    ogDescription:
      "Pega un enlace y guarda video o audio de TikTok, Instagram, Facebook, X y más de 1000 sitios. Gratis, en HD y sin registro.",
    twitterDescription:
      "Pega un enlace y guarda video o audio de TikTok, Instagram, Facebook, X y más de 1000 sitios.",
    appName: "{site}, descargador de videos",
    appDescription:
      "Descargador de videos online y gratis para TikTok, Instagram, Facebook, YouTube, X y más de 1000 sitios. Descarga un video desde su enlace en MP4 o MP3.",
    ogLocale: "es_ES",
  },
  nav: {
    tiktok: "TikTok",
    instagram: "Instagram",
    facebook: "Facebook",
    youtube: "YouTube",
    mp3: "Convertidor MP3",
    extension: "Extensión",
    blog: "Blog",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    theme: "Cambiar modo oscuro",
    language: "Idioma",
  },
  home: {
    h1Line1: "Descargador de videos",
    h1Line2: "gratis y online",
    lead: "Pega el enlace de un video de TikTok, Instagram, Facebook, YouTube, X o de cualquiera de los más de 1000 sitios compatibles y descárgalo en MP4 o MP3. Gratis, en HD, sin registro y sin instalar ningún programa.",
    aboutHeading: "Descarga videos desde un enlace, de cualquier red social",
    about1:
      "{site} es un descargador de videos online y gratuito que funciona con más de 1000 sitios web. Pega un enlace público de TikTok, Instagram, Facebook, YouTube, X, Pinterest, Reddit, LinkedIn, Threads, Vimeo, SoundCloud o de una plataforma más pequeña. El sitio se detecta solo, así que no hay ningún menú para elegir. Todas las calidades disponibles aparecen en una lista, desde archivos SD pequeños hasta Full HD y, cuando el original lo ofrece, 4K. Los archivos se guardan como MP4 normales que se reproducen en cualquier dispositivo, sin necesidad de otro programa.",
    about2Before:
      "Si solo necesitas el audio, cada página de aquí también sirve para descargar MP3. Un botón convierte el video a MP3 con la mejor calidad que ofrece el original, hasta 320 kbps. La gente lo usa para guardar sonidos de TikTok, música de YouTube, podcasts y notas de voz de Reels. También hay un ",
    about2Link: "convertidor de video a MP3",
    about2After: " para pasar directamente de un enlace al audio.",
    about3Before:
      "Todo funciona en el navegador, en iPhone, Android, Windows y Mac, sin iniciar sesión y sin registro. Descarga solo contenido que sea tuyo o que tengas permiso para usar. Nuestros ",
    about3Link: "Términos del servicio",
    about3After: " explican las reglas.",
  },
  platforms: {
    heading: "Funciona con más de 1000 sitios",
    intro:
      "Nunca tienes que elegir una plataforma. Pega el enlace y PasteAndSave detecta de qué sitio viene y te muestra las calidades disponibles. Estos son los más usados.",
    more: "Snapchat, Twitch, Bluesky, Tumblr, Bandcamp, Mixcloud, Rumble, Imgur, VK y Bilibili también funcionan, junto con muchos sitios más pequeños.",
    seeAll: "Ver la lista completa de sitios compatibles",
  },
  how: {
    heading: "Cómo funciona",
    steps: [
      {
        title: "Copia el enlace",
        body: "Abre la publicación, el reel o el video en la app o en el navegador y copia su enlace para compartir.",
      },
      {
        title: "Pégalo arriba",
        body: "Pon el enlace en la casilla de arriba de esta página y pulsa Descargar.",
      },
      {
        title: "Elige una calidad",
        body: "PasteAndSave muestra todas las resoluciones disponibles. Elige una y guarda el archivo.",
      },
    ],
  },
  faq: {
    heading: "Preguntas frecuentes",
    items: [
      {
        q: "¿Es gratis?",
        a: "Sí. Pega un enlace, elige una calidad y guarda el archivo. No necesitas una cuenta y no se añade nada a tu video.",
      },
      {
        q: "¿Puedo descargar publicaciones privadas?",
        a: "No. PasteAndSave solo puede obtener contenido público, lo mismo que verías en un navegador sin iniciar sesión.",
      },
      {
        q: "¿Qué sitios son compatibles?",
        a: "Funcionan más de 1000 sitios, entre ellos Instagram, TikTok, Facebook, X, YouTube, Pinterest, Reddit, Vimeo, SoundCloud y Twitch. El sitio se detecta a partir del enlace que pegas.",
      },
      {
        q: "¿Qué puedo descargar?",
        a: "Contenido tuyo, contenido que tienes permiso para usar y material con licencia para reutilizarlo. Respeta a las personas que crean los videos.",
      },
      {
        q: "¿Cómo descargo un video desde un enlace?",
        a: "Copia el enlace para compartir del sitio o de la app, pégalo en la casilla de arriba de esta página y pulsa Descargar. Todas las calidades disponibles aparecen en una lista, normalmente en menos de un minuto.",
      },
      {
        q: "¿Puedo convertir un enlace de video directamente a MP3?",
        a: "Sí. Después de pegar el enlace, abre la pestaña Audio en lugar de elegir una calidad de video. Solo se descarga la pista de audio.",
      },
    ],
  },
  bookmarklet: {
    heading: "Descarga desde cualquier página con un clic",
    body: "Arrastra este botón a tu barra de marcadores. Después, en cualquier video o publicación, haz clic en él para abrir {site} con el enlace ya cargado. Sin copiar ni pegar.",
    button: "Guardar con {site}",
    shareNote: "También puedes compartir un enlace listo para descargar:",
  },
  footer: {
    about:
      "Un descargador de videos online y gratuito que funciona con más de 1000 sitios. Pega un enlace, elige una calidad y guarda el archivo.",
    downloaders: "Descargadores",
    moreTools: "Más herramientas",
    extension: "Extensión para el navegador",
    terms: "Términos del servicio",
    privacy: "Política de privacidad",
    disclaimer:
      "PasteAndSave es una herramienta independiente y no está afiliada a ninguna de las plataformas que admite. Descarga solo contenido que tengas derecho a usar.",
    geo: "Geolocalización IP de DB-IP",
  },
  ads: {
    label: "Publicidad",
  },
  tool: {
    why: "¿Por qué usar el {name} de {site}?",
    howTo: "Cómo usar el {name}",
    faqHeading: "Preguntas frecuentes",
    others: "Otros descargadores gratis",
  },
  downloader: {
    placeholder: "Pega aquí el enlace de tu video",
    inputLabel: "Pega la URL del video",
    clear: "Borrar el enlace",
    clearTitle: "Borrar",
    paste: "Pegar",
    download: "Descargar",
    lookingUp: "Buscando...",
    reading: "Leyendo el enlace, espera un momento.",
    video: "Video",
    audio: "Audio",
    save: "Guardar",
    starting: "Iniciando…",
    downloading: "Descargando {n}%",
    converting: "Convirtiendo…",
    noFormats: "No se encontraron formatos para descargar en este enlace.",
    videosCount: "{n} videos",
    showingFirst: " (se muestran los primeros {n})",
    pickOne: "elige uno para descargar",
    emptyLink: "Primero pega el enlace de un video.",
    notALink: "Eso no parece un enlace. Copia la dirección completa desde tu navegador y pégala.",
    notHttp: "Solo se pueden descargar enlaces web que empiecen por http o https.",
    noHost: "A ese enlace le falta el nombre del sitio web. Revísalo e inténtalo de nuevo.",
    tooSlow: "El enlace tardó demasiado en leerse. Puede que el sitio esté ocupado ahora mismo, inténtalo de nuevo.",
    offline: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
    genericError: "Algo salió mal. Inténtalo de nuevo.",
    playlistError: "No se pudo leer esa lista de reproducción.",
    startFailed: "No se pudo iniciar.",
    jobFailed: "Algo salió mal con la descarga. Inténtalo de nuevo.",
    serverUnreachable: "No se pudo conectar con el servidor.",
    photo: "Foto",
    image: "Imagen",
  },
  errors: {
    UNSUPPORTED_SITE: "Ese enlace no es de un sitio desde el que podamos descargar.",
    SHARE_LINK_DEAD:
      "Ese enlace compartido ya no lleva a ningún video. Si todavía se abre para ti, copia el enlace de la barra de direcciones y pégalo.",
    RELAY_DOWN: "Las descargas de este sitio no están disponibles por un momento. Todo lo demás sigue funcionando.",
    SITE_UNAVAILABLE_HERE: "No podemos descargar de ese sitio desde aquí. Todo lo demás sigue funcionando.",
    AGE_CHECK_REGION:
      "Este sitio pide a los visitantes del país de nuestro servidor que demuestren su edad, así que no nos da el video. Los demás sitios siguen funcionando.",
    DRM_PROTECTED: "Este video tiene protección anticopia, así que no se puede descargar.",
    SITE_NOT_SUPPORTED: "No se admiten descargas de este sitio.",
    MEDIA_REMOVED: "Este video se eliminó o ya no está disponible.",
    NO_FORMATS: "No hay ningún video en ese enlace. Puede ser una foto, una historia o una publicación solo de texto.",
    LOGIN_REQUIRED: "Para verlo hay que iniciar sesión, así que no se puede descargar aquí.",
    LOGIN_ONLY: "Este video solo se puede ver con la sesión iniciada, o se retiró, así que no se puede descargar aquí.",
    EMBED_ONLY:
      "El dueño de este video solo deja que se reproduzca en su propio sitio web. Pega la dirección de la página donde lo viste.",
    AGE_RESTRICTED: "Este video tiene restricción de edad y pide iniciar sesión, así que no se puede obtener.",
    PRIVATE: "Es privado, así que no se puede descargar.",
    GEO_BLOCKED: "Este video está bloqueado en la región de nuestro servidor, así que no podemos acceder a él.",
    UPSTREAM_BLOCKED: "Este sitio está rechazando a nuestro servidor ahora mismo. Espera un minuto e inténtalo de nuevo.",
    EXTRACTOR_TIMEOUT: "Tardó demasiado y se agotó el tiempo. Inténtalo de nuevo.",
    NOT_MEDIA: "Este enlace es un documento, no un video, audio ni foto, así que no hay nada que guardar.",
    BUSY: "Estamos procesando muchos enlaces ahora mismo. Inténtalo de nuevo en un momento.",
    TOO_MANY: "Demasiadas solicitudes. Ve un poco más despacio.",
    UNKNOWN: "No se pudo leer ese enlace. Puede ser privado, estar bloqueado en tu región o el sitio cambió algo.",
  },
  review: {
    title: "¿Qué tal ha ido?",
    body: "Tu descarga ha empezado. Si tienes un minuto, cuenta a otros qué te parece PasteAndSave en Trustpilot. Buena o mala, cada opinión ayuda.",
    write: "Escribir una opinión",
    notNow: "Ahora no",
  },
};

export const toolNames: Record<string, ToolName> = {
  "tiktok-video-downloader": { navLabel: "TikTok", h1: "Descargador de videos de TikTok" },
  "instagram-video-downloader": { navLabel: "Instagram", h1: "Descargador de videos de Instagram" },
  "instagram-reels-downloader": { navLabel: "Reels", h1: "Descargador de Reels de Instagram" },
  "facebook-video-downloader": { navLabel: "Facebook", h1: "Descargador de videos de Facebook" },
  "facebook-reels-downloader": { navLabel: "FB Reels", h1: "Descargador de Reels de Facebook" },
  "youtube-video-downloader": { navLabel: "YouTube", h1: "Descargador de videos de YouTube" },
  "youtube-to-mp3": { navLabel: "YouTube MP3", h1: "Convertidor de YouTube a MP3" },
  "video-to-mp3-converter": { navLabel: "Convertidor MP3", h1: "Convertidor de video a MP3" },
  "twitter-video-downloader": { navLabel: "X / Twitter", h1: "Descargador de videos de Twitter (X)" },
  "pinterest-video-downloader": { navLabel: "Pinterest", h1: "Descargador de videos de Pinterest" },
  "reddit-video-downloader": { navLabel: "Reddit", h1: "Descargador de videos de Reddit" },
  "linkedin-video-downloader": { navLabel: "LinkedIn", h1: "Descargador de videos de LinkedIn" },
  "threads-video-downloader": { navLabel: "Threads", h1: "Descargador de videos de Threads" },
  "vimeo-video-downloader": { navLabel: "Vimeo", h1: "Descargador de videos de Vimeo" },
  "dailymotion-video-downloader": { navLabel: "Dailymotion", h1: "Descargador de videos de Dailymotion" },
  "soundcloud-mp3-downloader": { navLabel: "SoundCloud", h1: "Descargador de MP3 de SoundCloud" },
};

export const tools: Record<string, ToolCopy> = {
  "tiktok-video-downloader": {
    navLabel: "TikTok",
    h1: "Descargador de videos de TikTok",
    title: "Descargador de TikTok: guarda videos sin marca de agua",
    description:
      "Descargador de videos de TikTok gratis y sin marca de agua. Pega un enlace y guarda videos en MP4 HD o pasa TikTok a MP3. Sin registro y sin instalar apps.",
    keywords: [
      "descargar video de tiktok",
      "descargador de tiktok",
      "tiktok sin marca de agua",
      "descargar tiktok sin marca de agua",
      "guardar video de tiktok",
      "tiktok a mp3",
      "descargar audio de tiktok",
      "descargar tiktok en hd",
    ],
    tagline:
      "Guarda cualquier video público de TikTok en HD, sin marca de agua en el archivo. Funciona en tu navegador y nunca tienes que iniciar sesión.",
    placeholder: "Pega aquí el enlace de un video de TikTok",
    features: [
      {
        title: "Sin marca de agua",
        body: "El video guardado sale limpio. No verás el logo de TikTok ni el nombre de usuario encima del archivo.",
      },
      {
        title: "Calidad MP4 HD",
        body: "Obtienes la mejor calidad que TikTok ofrece para ese video, guardada como un MP4 normal.",
      },
      {
        title: "TikTok a MP3",
        body: "Si solo necesitas el sonido, descarga la pista de audio como MP3.",
      },
      {
        title: "Gratis",
        body: "Sin límites y sin cuenta. Abre la página, pega el enlace y descarga.",
      },
    ],
    stepsHeading: "Cómo descargar un video de TikTok",
    steps: [
      { title: "Copia el enlace", body: "Abre TikTok, toca Compartir en el video y luego Copiar enlace." },
      {
        title: "Pégalo aquí",
        body: "Vuelve a esta página, pega el enlace en la casilla y pulsa Descargar.",
      },
      { title: "Guarda el archivo", body: "Elige MP4 o MP3. El archivo se guarda en tu carpeta de descargas." },
    ],
    deviceNote:
      "El descargador funciona en el navegador, así que va igual en iPhone, Android, Windows y Mac. No hay nada que instalar.",
    faqs: [
      {
        q: "¿Cómo descargo un video de TikTok sin marca de agua?",
        a: "Copia el enlace del video en la app de TikTok con Compartir y luego Copiar enlace. Pégalo en la casilla de arriba y elige una opción MP4. El archivo guardado no lleva la marca de agua de TikTok.",
      },
      {
        q: "¿Este descargador de TikTok es gratis?",
        a: "Sí, es gratis y sin límite de descargas. No necesitas una cuenta ni una app.",
      },
      {
        q: "¿Puedo descargar videos de TikTok en iPhone?",
        a: "Abre esta página en Safari, pega el enlace y descarga. El video se guarda en la app Archivos en iOS 13 o posterior. Desde ahí puedes pasarlo a Fotos.",
      },
      {
        q: "¿Puedo convertir TikTok a MP3?",
        a: "Después de pegar el enlace, abre la pestaña Audio. Solo se descarga la pista de audio, guardada como archivo MP3.",
      },
      {
        q: "¿Puedo descargar videos privados de TikTok?",
        a: "No. La herramienta ve lo mismo que un navegador sin sesión iniciada, así que solo funcionan los videos públicos.",
      },
      {
        q: "¿Dónde se guardan los videos de TikTok descargados?",
        a: "En la ubicación normal de descargas de tu navegador. Es la carpeta Descargas en PC y Android, o la app Archivos en iPhone.",
      },
      {
        q: "¿Tengo que instalar una app o una extensión?",
        a: "No. Toda la herramienta funciona dentro de tu navegador, en cualquier dispositivo.",
      },
    ],
  },
  "instagram-video-downloader": {
    navLabel: "Instagram",
    h1: "Descargador de videos de Instagram",
    title: "Descargador de Instagram: Reels, historias y fotos en HD",
    description:
      "Descarga videos, Reels, historias, fotos y audio de Instagram en HD. Descargador de Instagram gratis que funciona en iPhone, Android y PC. Sin iniciar sesión.",
    keywords: [
      "descargar video de instagram",
      "descargador de instagram",
      "descargar reels de instagram",
      "descargar historias de instagram",
      "descargar fotos de instagram",
      "reels de instagram a mp3",
      "guardar video de instagram",
    ],
    tagline:
      "Guarda videos, Reels, historias y fotos de Instagram en HD. Nunca inicias sesión y no hay nada que instalar.",
    placeholder: "Pega aquí el enlace de un video, Reel o publicación de Instagram",
    features: [
      {
        title: "Reels, videos y fotos",
        body: "Una sola herramienta para Reels, videos del feed, publicaciones con fotos e historias públicas.",
      },
      {
        title: "Calidad Full HD",
        body: "Los archivos se descargan en la resolución más alta que da Instagram, hasta 1080p.",
      },
      {
        title: "Sin iniciar sesión",
        body: "Nunca pones tu cuenta de Instagram. La herramienta solo llega al contenido público.",
      },
      {
        title: "Audio en MP3",
        body: "Puedes sacar solo el audio de cualquier Reel en MP3. Muy útil para los sonidos originales.",
      },
    ],
    stepsHeading: "Cómo descargar un video de Instagram",
    steps: [
      {
        title: "Copia el enlace",
        body: "Toca el menú de tres puntos o el icono Compartir en la publicación o el Reel y elige Copiar enlace.",
      },
      { title: "Pégalo aquí", body: "Pon el enlace en la casilla de arriba de esta página y pulsa Descargar." },
      {
        title: "Elige una calidad",
        body: "Elige una resolución y el MP4 se guarda en tu dispositivo. También tienes MP3 si solo quieres el audio.",
      },
    ],
    deviceNote:
      "Funciona en iPhone, Android, Windows y Mac con cualquier navegador moderno. Sin app, sin extensión y sin iniciar sesión en Instagram.",
    faqs: [
      {
        q: "¿Cómo descargo un Reel de Instagram?",
        a: "Copia el enlace del Reel desde el menú Compartir, pégalo en la casilla de arriba y elige una calidad MP4. El Reel se guarda como un archivo de video normal.",
      },
      {
        q: "¿Los Reels de Instagram tienen marca de agua?",
        a: "Instagram no añade marca de agua a los Reels y esta herramienta tampoco. El archivo se descarga tal como lo sirve Instagram.",
      },
      {
        q: "¿Puedo descargar historias de Instagram?",
        a: "Las historias públicas funcionan mientras están activas. Pega el enlace de la historia de la misma forma. Las historias de cuentas privadas no están a nuestro alcance.",
      },
      {
        q: "¿Funciona sin iniciar sesión en Instagram?",
        a: "Sí. Nunca inicias sesión. La herramienta solo ve el contenido que es público.",
      },
      {
        q: "¿También puedo descargar fotos de Instagram?",
        a: "Pega el enlace de una publicación con fotos y obtendrás la imagen en resolución completa.",
      },
      {
        q: "¿Puedo sacar solo el audio de un Reel?",
        a: "Sí. Después de pegar el enlace, abre la pestaña Audio para quedarte solo con el sonido.",
      },
      {
        q: "¿Puedo guardar videos de Instagram en iPhone?",
        a: "Sí. Usa Safari, pega el enlace y descarga. El archivo llega a la app Archivos y luego puedes pasarlo a Fotos.",
      },
      {
        q: "¿Por qué falla una publicación privada?",
        a: "El descargador ve Instagram como un visitante sin sesión iniciada. El contenido privado o solo para seguidores queda fuera de su alcance.",
      },
    ],
  },
  "youtube-video-downloader": {
    navLabel: "YouTube",
    h1: "Descargador de videos de YouTube",
    title: "Descargador de videos de YouTube: guarda en MP4 HD",
    description:
      "Descargador de videos de YouTube gratis y online. Guarda videos y Shorts de YouTube en MP4 HD con la lista completa de calidades. Sin registro y sin programas.",
    keywords: [
      "descargar video de youtube",
      "descargador de youtube",
      "descargar videos de youtube online",
      "youtube a mp4",
      "descargar shorts de youtube",
      "descargador de youtube hd",
      "guardar video de youtube",
    ],
    tagline:
      "Guarda videos y Shorts de YouTube como archivos MP4. Aparecen todas las calidades disponibles para que elijas el tamaño que quieras.",
    placeholder: "Pega aquí el enlace de un video o Short de YouTube",
    features: [
      {
        title: "Todas las calidades",
        body: "Mira todas las resoluciones disponibles del video y elige la que quieras guardar.",
      },
      {
        title: "Compatible con Shorts",
        body: "Los enlaces de YouTube Shorts se descargan igual que los videos normales.",
      },
      { title: "MP4 y MP3", body: "Guarda el video completo en MP4 o quédate solo con el audio en MP3." },
      {
        title: "Sin programas",
        body: "El descargador funciona en tu navegador, en teléfonos, tabletas y computadoras.",
      },
    ],
    stepsHeading: "Cómo descargar un video de YouTube",
    steps: [
      {
        title: "Copia el enlace",
        body: "Usa Compartir y luego Copiar enlace en el video o el Short. Los enlaces youtu.be también funcionan.",
      },
      { title: "Pégalo aquí", body: "Pon el enlace en la casilla de arriba de esta página y pulsa Descargar." },
      {
        title: "Elige una resolución",
        body: "Elige en la lista de calidades y el archivo se guarda en tu dispositivo.",
      },
    ],
    deviceNote: "Funciona en Android, iPhone, Windows, Mac y Linux. No se instala nada.",
    faqs: [
      {
        q: "¿Cómo descargo un video de YouTube en MP4?",
        a: "Pega el enlace del video arriba y espera la lista de calidades. Elige una opción MP4 y el archivo se descarga al momento.",
      },
      {
        q: "¿Puedo descargar YouTube Shorts?",
        a: "Sí. Un enlace de Shorts funciona aquí igual que el de un video normal.",
      },
      {
        q: "¿Por qué algunas calidades dicen que no tienen audio?",
        a: "YouTube guarda sus resoluciones más altas como pistas solo de video. Las opciones con audio están listas para ver. Los archivos solo de video sirven para trabajos de edición.",
      },
      {
        q: "¿Puedo descargar una lista de reproducción completa?",
        a: "Sí. Pega el enlace de una lista y la herramienta muestra sus videos para que descargues cualquiera sin copiar cada enlace. Las listas grandes se muestran hasta un límite.",
      },
      {
        q: "¿Puedo descargar videos con restricción de edad o privados?",
        a: "No. Solo funcionan los videos que podrías ver en un navegador sin iniciar sesión.",
      },
      {
        q: "¿Hay un límite de duración o de tamaño?",
        a: "No hay un límite fijo. Los videos largos solo tardan más en procesarse.",
      },
      {
        q: "¿Está permitido descargar videos de YouTube?",
        a: "Descarga solo lo que tengas derecho a descargar: tus propios videos, material con licencia Creative Commons y videos cuyo dueño te dio permiso. Lo que hagas con la herramienta es tu responsabilidad.",
      },
    ],
  },
};
