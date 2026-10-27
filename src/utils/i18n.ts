import { AppLanguage, NotationSystem, InstrumentType } from '../types/vocal';

export interface Translations {
  appName: string;
  appTagline: string;
  piano: string;
  profiler: string;
  games: string;
  warmup: string;
  trainer: string;
  stats: string;
  settings: string;
  enableMic: string;
  micActive: string;
  installApp: string;
  cloudSync: string;
  verticalPiano: string;
  horizontalPiano: string;
  fullscreen: string;
  exitFullscreen: string;
  myRange: string;
  fullRange: string;
  labels: string;
  instrument: string;
  notation: string;
  lowNotes: string;
  highNotes: string;
  topMax: string;
  bottomMin: string;
  midRegister: string;
  target: string;
  hit: string;
  centerMid: string;
  singPrompt: string;
  inTune: string;
  sharp: string;
  flat: string;
  voiceProfilerTitle: string;
  voiceProfilerDesc: string;
  stepLowestTitle: string;
  stepLowestDesc: string;
  stepHighestTitle: string;
  stepHighestDesc: string;
  holdStability: string;
  captured: string;
  retryNote: string;
  confirmNext: string;
  analyzeResults: string;
  saveVocalProfile: string;
  voiceClassification: string;
  octavesSpan: string;
  closestSinger: string;
  gamesHubTitle: string;
  gamesHubDesc: string;
  pitchHeroTitle: string;
  pitchHeroDesc: string;
  intervalTitle: string;
  intervalDesc: string;
  memoryTitle: string;
  memoryDesc: string;
  playGame: string;
  score: string;
  streak: string;
  timeLeft: string;
  hitZone: string;
  singNow: string;
  gameOver: string;
  playAgain: string;
  returnToHub: string;
  listenAnswer: string;
  correctNext: string;
  skipQuestion: string;
  warmupTitle: string;
  warmupDesc: string;
  practice: string;
  startWarmup: string;
  pauseWarmup: string;
  saveExit: string;
  recommendedVowel: string;
  tempo: string;
  direction: string;
  pitchAccuracy: string;
  practiceStreak: string;
  totalPractice: string;
  activeRange: string;
  overallAccuracy: string;
  recentHistory: string;
  precisionHeatmap: string;
  settingsTitle: string;
  languageLabel: string;
  notationLabel: string;
  instrumentLabel: string;
  referencePitch: string;
  tuningTolerance: string;
  hapticFeedback: string;
  keepScreenAwake: string;
  autoVerticalFs: string;
  close: string;
}

export const translations: Record<AppLanguage, Translations> = {
  en: {
    appName: 'VocalMaster',
    appTagline: 'Professional Vocal Training & Voice Profiler',
    piano: 'Piano',
    profiler: 'Profiler',
    games: 'Games',
    warmup: 'Warm-ups',
    trainer: 'Trainer',
    stats: 'Stats',
    settings: 'Settings',
    enableMic: 'Enable Mic',
    micActive: 'Mic Active',
    installApp: 'Install App',
    cloudSync: 'Cloud Sync',
    verticalPiano: 'Vertical (Android)',
    horizontalPiano: 'Horizontal',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    myRange: 'My Range',
    fullRange: 'Full C1–C7',
    labels: 'Labels',
    instrument: 'Voice / Instrument',
    notation: 'Notation',
    lowNotes: 'Low Notes (Bass)',
    highNotes: 'High Notes (Soprano)',
    topMax: 'TOP RANGE (MAX)',
    bottomMin: 'BOTTOM RANGE (MIN)',
    midRegister: 'MID REGISTER',
    target: 'TARGET',
    hit: 'HIT',
    centerMid: 'Center on middle register →',
    singPrompt: 'Sing into microphone to see pitch light up',
    inTune: 'In-Tune',
    sharp: 'Sharp',
    flat: 'Flat',
    voiceProfilerTitle: 'Voice Profiler™ Wizard',
    voiceProfilerDesc: 'Automated vocal register measurement',
    stepLowestTitle: 'Sing Your Lowest Comfortable Note',
    stepLowestDesc: 'Hum or sing on "Oo" or "Ah" at your lowest chest tone and sustain for ~1.5s.',
    stepHighestTitle: 'Sing Your Highest Comfortable Note',
    stepHighestDesc: 'Glide upwards smoothly on "Ah" or "Ee" without straining. Hold for ~1.5s.',
    holdStability: 'Hold stability',
    captured: 'Captured',
    retryNote: 'Retry Note',
    confirmNext: 'Confirm & Next',
    analyzeResults: 'Analyze Results',
    saveVocalProfile: 'Save to Vocal Profile',
    voiceClassification: 'Your Voice Classification',
    octavesSpan: 'Octaves Span',
    closestSinger: 'Vocal Match',
    gamesHubTitle: 'Gamified Pitch Arena',
    gamesHubDesc: 'Interactive ear-training mini-games calibrated to your vocal range',
    pitchHeroTitle: 'Pitch Hero: Falling Notes',
    pitchHeroDesc: 'Notes glide down the vertical hit track. Sing the matching pitch in the hit zone to burst notes and build combos!',
    intervalTitle: 'Interval Ear Challenge',
    intervalDesc: 'Listen to the root note, then calculate and sing musical intervals (3rds, 4ths, 5ths, Octaves) using real song mnemonics.',
    memoryTitle: 'Note Memory Match',
    memoryDesc: 'Listen to a hidden reference tone, retain it in your mind, and sing the exact pitch from memory!',
    playGame: 'Play Game',
    score: 'Score',
    streak: 'Streak',
    timeLeft: 'Time Left',
    hitZone: 'HIT ZONE',
    singNow: 'SING NOW 🎙️',
    gameOver: 'Challenge Complete!',
    playAgain: 'Play Again',
    returnToHub: 'Return to Hub',
    listenAnswer: 'Listen to Answer',
    correctNext: 'Correct! Next',
    skipQuestion: 'Skip Question',
    warmupTitle: 'Adaptive Warm-ups & Vocalises',
    warmupDesc: 'Auto-calibrated for your active vocal range',
    practice: 'Practice',
    startWarmup: 'Start Warmup',
    pauseWarmup: 'Pause Warmup',
    saveExit: 'Save & Exit',
    recommendedVowel: 'Recommended Vowel',
    tempo: 'Tempo',
    direction: 'Direction',
    pitchAccuracy: 'Pitch Accuracy',
    practiceStreak: 'Practice Streak',
    totalPractice: 'Total Practice',
    activeRange: 'Active Range',
    overallAccuracy: 'Overall Accuracy',
    recentHistory: 'Recent Training History',
    precisionHeatmap: 'Note-by-Note Vocal Precision Heatmap',
    settingsTitle: 'Vocal Settings & Instrument',
    languageLabel: 'App Language',
    notationLabel: 'Note Naming System',
    instrumentLabel: 'Reference Instrument Sound',
    referencePitch: 'Concert Pitch Calibration (A4)',
    tuningTolerance: 'Tuning Tolerance (Cents)',
    hapticFeedback: 'Tactile Haptic Feedback (Android)',
    keepScreenAwake: 'Keep Screen Awake During Exercises',
    autoVerticalFs: 'Auto-Switch to Vertical Piano on Fullscreen',
    close: 'Close',
  },
  ar: {
    appName: 'فوكال ماستر برو',
    appTagline: 'تدريب الصوت الاحترافي وقياس الطبقات الصوتية',
    piano: 'البيانو',
    profiler: 'محلل الصوت',
    games: 'الألعاب',
    warmup: 'الإحماء',
    trainer: 'المدرب',
    stats: 'الإحصائيات',
    settings: 'الإعدادات',
    enableMic: 'تشغيل المايك',
    micActive: 'المايك نشط',
    installApp: 'تثبيت التطبيق',
    cloudSync: 'المزامنة السحابية',
    verticalPiano: 'رأسي (أندرويد)',
    horizontalPiano: 'أفقي',
    fullscreen: 'شاشة كاملة',
    exitFullscreen: 'إنهاء الشاشة الكاملة',
    myRange: 'طبقتي الصوتية',
    fullRange: 'المدى الكامل C1–C7',
    labels: 'أسماء النغمات',
    instrument: 'الصوت / الآلة الموسيقية',
    notation: 'طريقة تسمية النغمات',
    lowNotes: 'النغمات المنخفضة (الجهير / باص)',
    highNotes: 'النغمات المرتفعة (السوبرانو)',
    topMax: 'أعلى نغمة (الحد الأقصى)',
    bottomMin: 'أخفض نغمة (الحد الأدنى)',
    midRegister: 'المنطقة المتوسطة',
    target: 'الهدف',
    hit: 'إصابة',
    centerMid: 'التوسيط على النغمة المتوسطة ←',
    singPrompt: 'غنِّ في الميكروفون لتضيء النغمة مباشرة',
    inTune: 'صحيح النغمة',
    sharp: 'حاد (دييز)',
    flat: 'هابط (بيمول)',
    voiceProfilerTitle: 'معالج تحليل وقياس المدى الصوتي',
    voiceProfilerDesc: 'قياس دقيق لطبقات صوتك ومداك الطبيعي',
    stepLowestTitle: 'غنِّ أخفض نغمة مريحة بالنسبة لك',
    stepLowestDesc: 'أصدر صوتاً عميقاً بصوت "أووو" أو "آآآه" عند أعمق نغمة مريحة وثبّتها لثانية ونصف.',
    stepHighestTitle: 'غنِّ أعلى نغمة مريحة بالنسبة لك',
    stepHighestDesc: 'اصعد بصوتك بسلاسة بنبرة "آآآه" أو "إيـيـه" دون شد أحبالك الصوتية وثبّتها.',
    holdStability: 'ثبات النبرة',
    captured: 'تم التقاط النغمة',
    retryNote: 'إعادة المحاولة',
    confirmNext: 'تأكيد والانتقال',
    analyzeResults: 'تحليل النتائج',
    saveVocalProfile: 'حفظ في الملف الصوتي',
    voiceClassification: 'تصنيف طبقتك الصوتية',
    octavesSpan: 'عدد الأوكتافات',
    closestSinger: 'أقرب مغنٍ لصوتك',
    gamesHubTitle: 'ساحة الألعاب وتدريب الأذن والنبرة',
    gamesHubDesc: 'ألعاب تفاعلية لتدريب دقة الصوت والأذن الموسيقية مطابقة لطبقتك',
    pitchHeroTitle: 'بطل النغمات: التقاط الفقاعات',
    pitchHeroDesc: 'تهبط النغمات على المسار الرأسي. غنِّ النغمة الصحيحة عند وصولها لمنطقة الهدف لكسب النقاط والمضاعفات!',
    intervalTitle: 'تحدي المسافات الصوتية (الإنترفال)',
    intervalDesc: 'استمع للنغمة الأساسية، ثم احسب وغنِّ المسافة الموسيقية (الثالثة، الرابعة، الخامسة، الأوكتاف).',
    memoryTitle: 'تطابق الذاكرة السمعية',
    memoryDesc: 'استمع إلى نغمة مرجعية، احفظها في ذاكرتك، ثم غنِّ النغمة المطابقة بدقة بعد اختفائها!',
    playGame: 'ابدأ اللعبة',
    score: 'النقاط',
    streak: 'التتابع المتتالي',
    timeLeft: 'الوقت المتبقي',
    hitZone: 'منطقة الإصابة',
    singNow: 'غنِّ الآن 🎙️',
    gameOver: 'اكتمل التحدي!',
    playAgain: 'العب مرة أخرى',
    returnToHub: 'العودة لمركز الألعاب',
    listenAnswer: 'الاستماع للجواب',
    correctNext: 'صحيح! التالي',
    skipQuestion: 'تخطي السؤال',
    warmupTitle: 'تمارين الإحماء والفوكاليز التكيفية',
    warmupDesc: 'مولدة تلقائياً بما يتناسب مع حدود طبقتك الصوتية',
    practice: 'تمرين',
    startWarmup: 'بدء الإحماء',
    pauseWarmup: 'إيقاف مؤقت',
    saveExit: 'حفظ وخروج',
    recommendedVowel: 'حرف المد الموصى به',
    tempo: 'السرعة (BPM)',
    direction: 'الاتجاه',
    pitchAccuracy: 'دقة النغمة',
    practiceStreak: 'أيام التمرين المتتالية',
    totalPractice: 'إجمالي التمرين',
    activeRange: 'المدى الصوتي النشط',
    overallAccuracy: 'الدقة العامة',
    recentHistory: 'سجل التمارين الأخيرة',
    precisionHeatmap: 'الخريطة الحرارية لدقة النغمات',
    settingsTitle: 'إعدادات الصوت والآلات الموسيقية',
    languageLabel: 'لغة التطبيق',
    notationLabel: 'نظام تسمية النوتات الموسيقية',
    instrumentLabel: 'صوت الآلة المرجعية',
    referencePitch: 'معايرة تردد النغمة المرجعية A4',
    tuningTolerance: 'سماحية الدقة بالنغمات (بالسنت Cents)',
    hapticFeedback: 'الاهتزاز اللمسي على أندرويد (Haptics)',
    keepScreenAwake: 'منع قفل الشاشة أثناء التمارين',
    autoVerticalFs: 'التحويل التلقائي للبيانو الرأسي عند ملء الشاشة',
    close: 'إغلاق',
  },
};

export const INSTRUMENT_NAMES: Record<InstrumentType, { en: string; ar: string; icon: string }> = {
  piano: { en: 'Grand Piano', ar: 'بيانو كلاسيكي', icon: '🎹' },
  oud: { en: 'Arabic Oud', ar: 'عود عربي أصيل', icon: '🪕' },
  guitar: { en: 'Acoustic Guitar', ar: 'غيتار صوتي', icon: '🎸' },
  vocal: { en: 'Pure Vocal Tone', ar: 'صوت بشري نقي', icon: '🎤' },
  strings: { en: 'Strings / Cello', ar: 'تشيلو ووتريات', icon: '🎻' },
};

export const NOTATION_OPTIONS: Record<NotationSystem, { en: string; ar: string; example: string }> = {
  english: { en: 'English (C, D, E, F...)', ar: 'إنجليزي (C, D, E, F...)', example: 'C4, D#4, F4' },
  solfege: { en: 'Solfège (Do, Re, Mi...)', ar: 'صولفيج (دو، ري، مي...)', example: 'Do4, Re#4, Fa4' },
  arabic: { en: 'Arabic (دو، ري، مي...)', ar: 'عربي مع علامات التحويل', example: 'دو4، ري♯4، فا4' },
};
