const strings = {
  tr: {
    title: 'Pasaport Fotoğrafı',
    subtitle: 'ABD pasaportu için 2x2 inç fotoğraf ve 4x6 baskı sayfası',
    privacy: 'Fotoğrafınız cihazınızdan çıkmaz. Tüm işlem bu tarayıcıda yapılır, fotoğraf hiçbir sunucuya yüklenmez. Yüz tanıma için kullanılan Google MediaPipe kütüphanesi, Google\'a fotoğraf içermeyen performans ve kullanım bilgisi gönderir.',
    upload: 'Fotoğraf seçin veya buraya sürükleyin',
    uploadHint: 'En iyi sonuç için: kameraya düz bakın, gözler açık, omuzlar görünür, yüzde eşit ışık.',
    loadingModels: 'Modeller yükleniyor (ilk seferde yaklaşık 20 MB)...',
    processing: 'Fotoğraf işleniyor...',
    decodeError: 'Bu dosya açılamadı. HEIC ise JPEG olarak kaydedip tekrar deneyin.',
    modelError: 'Modeller yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.',
    processError: 'Fotoğraf işlenirken bir hata oluştu. Başka bir fotoğraf deneyin.',
    sourceTitle: 'Yüklenen fotoğraf',
    facesNone: 'Yüz bulunamadı. Kişiyi kutuyla seçmeyi deneyin.',
    facesOne: 'Bir yüz bulundu.',
    facesMany: '{n} yüz bulundu. Başka bir kişiyi seçmek için yüzüne dokunun.',
    selectBox: 'Kişiyi kutuyla seç',
    selectBoxCancel: 'Kutu seçimini iptal et',
    selectBoxHint: 'Kişinin başını ve omuzlarını içine alan bir kutu çizin.',
    resultTitle: 'Pasaport fotoğrafı',
    verdictOk: 'Uygun görünüyor.',
    verdictWarn: 'Uygun, ama aşağıdakilere dikkat edin.',
    verdictReject: 'Bu fotoğraf uygun değil. Lütfen daha düzgün bir fotoğraf yükleyin.',
    noFace: 'Fotoğrafta yüz bulunamadı. Kişiyi kutuyla seçin veya başka bir fotoğraf yükleyin.',
    turned: 'Yüz sağa veya sola dönük. Kameraya tam karşıdan bakarak çekilmiş bir fotoğraf yükleyin.',
    tiltedUpDown: 'Baş yukarı veya aşağı eğik. Kamera göz hizasında olacak şekilde çekin.',
    tilted: 'Baş yana çok yatık. Başınız dik olacak şekilde çekin.',
    eyesClosed: 'Gözler kapalı görünüyor. İki göz de açık olmalı.',
    headCut: 'Başın tepesi veya çene fotoğrafın dışında kalmış. Başın etrafında boşluk bırakarak çekin.',
    lowRes: 'Yüz çok küçük veya fotoğraf düşük çözünürlüklü. Daha yakından veya daha yüksek çözünürlükte çekin.',
    lowResWarn: 'Çözünürlük sınıra yakın, baskı hafif yumuşak olabilir.',
    noFit: 'Baş, kurallara uygun bir kadraja sığmıyor. Başın üstünde ve omuzlarda boşluk bırakarak çekin.',
    shouldersMissing: 'Fotoğrafın alt kısmı eksik. Omuzlarınız görünecek şekilde çekin.',
    otherPerson: 'Kadraja başka bir kişi giriyor. Tek başınıza çekilmiş bir fotoğraf kullanın.',
    sidesCut: 'Fotoğraf yanlardan dar: omuzlar fotoğrafın kenarında kesiliyor ve kenarlarda düz bir kesik görünüyor. Biraz daha uzaktan çekilmiş bir fotoğraf daha iyi sonuç verir.',
    shadow: 'Yüzde belirgin gölge var. "Yüzdeki gölgeyi azalt" seçeneğini deneyin veya eşit ışıkta tekrar çekin.',
    sumHead: 'Baş yüksekliği',
    sumEyes: 'Göz hizası (alttan)',
    sumPose: 'Yüz açısı',
    sumEyesOpen: 'Gözler',
    sumResolution: 'Kaynakta baş yüksekliği',
    sumShadow: 'Sol ve sağ ışık farkı',
    eyesOpen: 'açık',
    eyesClosedShort: 'kapalı',
    poseValue: 'sağ-sol {yaw}°, yukarı-aşağı {pitch}°, yatıklık {roll}°',
    guides: 'Kılavuz çizgilerini göster',
    background: 'Arka planı beyaz yap',
    backgroundNote: 'ABD Dışişleri Bakanlığı fotoğrafın dijital olarak değiştirilmemesini önerir. Fotoğraf zaten düz, açık renk bir zeminde çekildiyse bunu kapatın.',
    shadowLift: 'Yüzdeki gölgeyi azalt',
    strength: 'Güç',
    headSize: 'Baş yüksekliği',
    position: 'Konum',
    moveUp: 'Yukarı',
    moveDown: 'Aşağı',
    moveLeft: 'Sola',
    moveRight: 'Sağa',
    reset: 'Sıfırla',
    sheetTitle: '4x6 baskı sayfası',
    downloadDigital: 'Dijital fotoğrafı indir ({size}x{size})',
    downloadSheet: '4x6 baskı sayfasını indir',
    downloadsDisabled: 'Fotoğraf uygun olmadığı için indirme kapalı.',
    printTitle: 'Nasıl bastırılır',
    print1: '4x6 sayfa dosyasını CVS Photo sitesine, uygulamasına veya mağazadaki kioska (ya da herhangi bir fotoğraf baskı yerine) yükleyin.',
    print2: 'Baskı boyutu olarak 4x6 seçin. Kırpma yapmayın, dosya zaten tam 4x6 oranında.',
    print3: 'Bastıktan sonra cetveli ölçün. Tam 1 inç (25.4 mm) olmalı. Değilse baskı ölçeklenmiştir ve fotoğraflar geçersiz olur.',
    print4: 'Gri çizgi ve işaretlerden keserek 4 adet 2x2 inç fotoğraf elde edin.',
    digitalNote: 'Dijital fotoğraf online pasaport yenileme için kare JPEG olarak hazırlanır.',
    rulesTitle: 'Hatırlatmalar',
    rule1: 'Fotoğraf son 6 ay içinde çekilmiş olmalı.',
    rule2: 'Gözlük takmayın.',
    rule3: 'Doğal bir ifade ve iki göz açık olmalı.',
    rule4: 'Şapka veya başlık olmamalı (dini veya tıbbi sebep hariç).',
    rule5: 'Bu araç resmi değildir. Fotoğrafın kabulüne her zaman pasaport ofisi karar verir.',
  },
  en: {
    title: 'Passport Photo',
    subtitle: 'A 2x2 inch US passport photo and a 4x6 print sheet',
    privacy: 'Your photo never leaves your device. Everything runs in this browser and the photo is not uploaded to any server. The Google MediaPipe library used for face detection sends Google performance and usage data that does not include your photo.',
    upload: 'Choose a photo or drop it here',
    uploadHint: 'For best results: look straight at the camera, eyes open, shoulders visible, even light on the face.',
    loadingModels: 'Loading models (about 20 MB the first time)...',
    processing: 'Processing the photo...',
    decodeError: 'This file could not be opened. If it is HEIC, save it as JPEG and try again.',
    modelError: 'The models could not be loaded. Check your internet connection and reload the page.',
    processError: 'Something went wrong while processing the photo. Try another photo.',
    sourceTitle: 'Uploaded photo',
    facesNone: 'No face found. Try selecting the person with a box.',
    facesOne: 'One face found.',
    facesMany: '{n} faces found. Tap a face to choose another person.',
    selectBox: 'Select person with a box',
    selectBoxCancel: 'Cancel box selection',
    selectBoxHint: 'Draw a box around the person\'s head and shoulders.',
    resultTitle: 'Passport photo',
    verdictOk: 'Looks good.',
    verdictWarn: 'Usable, but check the notes below.',
    verdictReject: 'This photo is not suitable. Please upload a better photo.',
    noFace: 'No face was found. Select the person with a box or upload another photo.',
    turned: 'The face is turned left or right. Upload a photo taken looking straight at the camera.',
    tiltedUpDown: 'The head is tilted up or down. Take the photo with the camera at eye level.',
    tilted: 'The head leans too far to the side. Keep your head upright.',
    eyesClosed: 'The eyes look closed. Both eyes must be open.',
    headCut: 'The top of the head or the chin is outside the photo. Leave space around the head.',
    lowRes: 'The face is too small or the photo resolution is too low. Take it closer or at a higher resolution.',
    lowResWarn: 'Resolution is close to the limit, the print may look slightly soft.',
    noFit: 'The head does not fit a valid frame. Leave space above the head and around the shoulders.',
    shouldersMissing: 'The bottom of the photo is missing. Take it so your shoulders are visible.',
    otherPerson: 'Another person is in the frame. Use a photo of you alone.',
    sidesCut: 'The photo is too narrow: the shoulders are cut off at the edge of the photo and show a straight edge. A photo taken from a little further away works better.',
    shadow: 'There is a clear shadow on the face. Try "Reduce face shadow" or retake the photo in even light.',
    sumHead: 'Head height',
    sumEyes: 'Eye line (from bottom)',
    sumPose: 'Face angle',
    sumEyesOpen: 'Eyes',
    sumResolution: 'Head height in source',
    sumShadow: 'Left to right light difference',
    eyesOpen: 'open',
    eyesClosedShort: 'closed',
    poseValue: 'left-right {yaw}°, up-down {pitch}°, lean {roll}°',
    guides: 'Show guide lines',
    background: 'Make the background white',
    backgroundNote: 'The US State Department advises against digitally altered photos. If the photo was already taken on a plain light background, turn this off.',
    shadowLift: 'Reduce face shadow',
    strength: 'Strength',
    headSize: 'Head height',
    position: 'Position',
    moveUp: 'Up',
    moveDown: 'Down',
    moveLeft: 'Left',
    moveRight: 'Right',
    reset: 'Reset',
    sheetTitle: '4x6 print sheet',
    downloadDigital: 'Download digital photo ({size}x{size})',
    downloadSheet: 'Download 4x6 print sheet',
    downloadsDisabled: 'Downloads are off because the photo is not suitable.',
    printTitle: 'How to print',
    print1: 'Upload the 4x6 sheet to the CVS Photo website, app or in-store kiosk (or any photo print shop).',
    print2: 'Choose a 4x6 print. Do not crop, the file already has the exact 4x6 shape.',
    print3: 'After printing, measure the ruler. It must be exactly 1 inch (25.4 mm). If not, the print was scaled and the photos are not valid.',
    print4: 'Cut along the grey lines and marks to get four 2x2 inch photos.',
    digitalNote: 'The digital photo is a square JPEG for online passport renewal.',
    rulesTitle: 'Reminders',
    rule1: 'The photo must be taken within the last 6 months.',
    rule2: 'Do not wear glasses.',
    rule3: 'Neutral expression with both eyes open.',
    rule4: 'No hat or head covering (except for religious or medical reasons).',
    rule5: 'This tool is not official. The passport agency always decides whether a photo is accepted.',
  },
}

const STORAGE_KEY = 'passport-photo-lang'
let current = initialLanguage()

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && strings[saved]) return saved
  } catch {}
  return (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en'
}

export function getLanguage() {
  return current
}

export function setLanguage(lang) {
  if (!strings[lang]) return
  current = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {}
}

export function t(key, vars = {}) {
  const text = strings[current][key] ?? strings.en[key] ?? key
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : `{${name}}`))
}

export function applyTranslations(root = document) {
  document.documentElement.lang = current
  document.title = t('title')
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n)
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria))
}
