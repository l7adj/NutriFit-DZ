import {
  ActivityBand,
  AllergenKey,
  AppState,
  DeliveryZone,
  DishItem,
  FoodItem,
  GoalType,
  PricingConfig,
} from '../types';

export const STATE_VERSION = 'nf-dz-v2';

export const ACTIVITY_BANDS: Record<
  ActivityBand,
  { min: number; max: number; def: number; label: string; desc: string }
> = {
  S: {
    min: 1.2,
    max: 1.39,
    def: 1.3,
    label: 'محدود الحركة',
    desc: 'عمل مكتبي مع حركة يومية محدودة وبدون تدريب منظم',
  },
  L: {
    min: 1.4,
    max: 1.69,
    def: 1.55,
    label: 'خفيف',
    desc: 'مكتبي أو حركة متوسطة وتدريب يومان أسبوعيًا',
  },
  A: {
    min: 1.7,
    max: 1.99,
    def: 1.7,
    label: 'نشط',
    desc: 'حركة يومية وتدريب 3 إلى 5 أيام في الأسبوع',
  },
  V: {
    min: 2.0,
    max: 2.4,
    def: 2.1,
    label: 'شديد',
    desc: 'عمل بدني شاق أو تدريب مكثف يوميًا',
  },
};

export const GOALS: Record<
  GoalType,
  {
    label: string;
    desc: string;
    multLabel: string;
    pct: number;
    proteinPerKg: number;
    targetRateKgWk: number;
  }
> = {
  bulk: {
    label: 'بناء عضل',
    desc: 'فائض طاقة مدروس لدعم الاستشفاء والبناء العضلي',
    multLabel: '×1.10 (+10%)',
    pct: 10,
    proteinPerKg: 1.8,
    targetRateKgWk: 0.25,
  },
  cut: {
    label: 'خسارة دهون',
    desc: 'عجز طاقة منضبط مع بروتين مرتفع لحفظ الكتلة العضلية',
    multLabel: '×0.80 (−20%)',
    pct: -20,
    proteinPerKg: 2.0,
    targetRateKgWk: -0.5,
  },
  recomp: {
    label: 'إعادة تشكيل',
    desc: 'عجز خفيف لتحسين التركيبة الجسدية تدريجيًا',
    multLabel: '×0.90 (−10%)',
    pct: -10,
    proteinPerKg: 1.6,
    targetRateKgWk: -0.15,
  },
  perf: {
    label: 'أداء رياضي',
    desc: 'توازن سعرات لدعم الشدة البدنية والثبات الوزني',
    multLabel: '×1.00 (ثبات)',
    pct: 0,
    proteinPerKg: 1.6,
    targetRateKgWk: 0,
  },
};

export const ALLERGENS: Record<AllergenKey, string> = {
  gluten: 'غلوتين',
  eggs: 'بيض',
  fish: 'سمك',
  milk: 'حليب',
  nuts: 'مكسرات',
};

export const DEFAULT_ZONES: DeliveryZone[] = [
  {
    id: 'pickup',
    title: 'استلام من المطبخ (مثال)',
    areas: 'موقع المطبخ — يُحدد لاحقًا',
    hours: 'نافذة الاستلام — تُحدد لاحقًا',
    fee: 0,
    active: false,
  },
  {
    id: 'z1',
    title: 'منطقة توصيل تجريبية 1',
    areas: 'نطاق جغرافي غير معتمد',
    hours: 'نافذة توصيل تجريبية',
    fee: 150,
    active: false,
  },
  {
    id: 'z2',
    title: 'منطقة توصيل تجريبية 2',
    areas: 'نطاق جغرافي غير معتمد',
    hours: 'نافذة توصيل تجريبية',
    fee: 300,
    active: false,
  },
  {
    id: 'z3',
    title: 'منطقة توصيل تجريبية 3',
    areas: 'نطاق جغرافي غير معتمد',
    hours: 'التوقيت — يُحدد لاحقًا',
    fee: 500,
    active: false,
  },
];

export const DEFAULT_PRICING: PricingConfig = {
  handlingPct: 7,
  serviceFeePerMeal: 200,
  cutoffHour: 16,
};

export const QUALITY_CHARTER: string[] = [
  'كل علبة تُوزن بالغرام بدقة ±1غ قبل التغليف.',
  'كل وصفة تعتمد غرامات ثابتة ومحسوبة مخبريًا.',
  'كل علبة تحمل اسم العميل وماكروز الوجبة ورمز QR للتتبع.',
  'الطعام طازج بالكامل، لا نشتري ولا نطبخ إلا بعد تأكيد الطلب.',
  'التبريد والحفظ الحراري جزء إلزامي من سلسلة التشغيل الليلية.',
  'الوجبة مخصصة للاستهلاك في نفس اليوم لضمان الجودة والسلامة.',
  'العميل يتابع وزنه أسبوعيًا لتقييم الاستجابة الحقيقية.',
  'السعر شفاف بالكامل: مكونات بسعر السوق + مناولة + أجر خدمة + توصيل.',
  'عدد الطلبات اليومي مضبوط بالطاقة التشغيلية للمطبخ لا بأوهام تسويقية.',
  'الهدف ليس أكبر عدد من المشتركين، بل أعلى دقة والتزام وخدمة.',
];

export const PICKUP_POINTS = [
  {
    name: 'موقع الاستلام الرئيسي (تجريبي)',
    area: 'المنطقة — تُحدد لاحقًا',
    hours: 'التوقيت — يُحدد لاحقًا',
    status: 'غير معتمد بعد',
    active: false,
  },
  {
    name: 'نقطة استلام شريكة (مقترحة)',
    area: 'موقع الشريك — يُحدد لاحقًا',
    hours: 'التوقيت — يُحدد لاحقًا',
    status: 'مقترحة — غير معتمدة',
    active: false,
  },
  {
    name: 'نقطة استلام شريكة إضافية (مقترحة)',
    area: 'موقع الشريك — يُحدد لاحقًا',
    hours: 'التوقيت — يُحدد لاحقًا',
    status: 'مقترحة — غير معتمدة',
    active: false,
  },
];

export function seedFoods(): FoodItem[] {
  const baseFoods: Omit<
    FoodItem,
    'nutritionDataStatus' | 'nutritionBasis' | 'nutritionSource'
  >[] = [
    { id: 'chk', emoji: '🍗', name: 'صدر دجاج مشوي', nameFr: 'Blanc de poulet grillé', nameEn: 'Grilled chicken breast', cat: 'protein', per100: { kcal: 165, p: 31, c: 0, f: 3.6, fiber: 0 }, price: 52, al: [], available: true },
    { id: 'sal', emoji: '🐟', name: 'فيليه سلمون', nameFr: 'Filet de saumon', nameEn: 'Salmon fillet', cat: 'protein', per100: { kcal: 206, p: 22, c: 0, f: 12, fiber: 0 }, price: 165, al: ['fish'], available: true },
    { id: 'tun', emoji: '🐟', name: 'تونة طبيعية بالماء', nameFr: 'Thon au naturel', nameEn: 'Canned tuna in water', cat: 'protein', per100: { kcal: 116, p: 26, c: 0, f: 0.8, fiber: 0 }, price: 95, al: ['fish'], available: true },
    { id: 'egg', emoji: '🥚', name: 'بيض مسلوق', nameFr: 'Œuf dur', nameEn: 'Hard-boiled egg', cat: 'protein', per100: { kcal: 155, p: 13, c: 1.1, f: 11, fiber: 0 }, price: 28, al: ['eggs'], available: true },
    { id: 'beef', emoji: '🥩', name: 'لحم بقري قليل الدسم', nameFr: 'Bœuf maigre', nameEn: 'Lean beef', cat: 'protein', per100: { kcal: 215, p: 27, c: 0, f: 11, fiber: 0 }, price: 110, al: [], available: true },
    { id: 'cot', emoji: '🧀', name: 'جبن قريش طازج', nameFr: 'Fromage blanc / cottage', nameEn: 'Cottage cheese', cat: 'protein', per100: { kcal: 98, p: 11, c: 3.4, f: 4.3, fiber: 0 }, price: 45, al: ['milk'], available: true },
    { id: 'len', emoji: '🥘', name: 'عدس مطبوخ', nameFr: 'Lentilles cuites', nameEn: 'Cooked lentils', cat: 'protein', per100: { kcal: 116, p: 9, c: 20, f: 0.4, fiber: 7.9 }, price: 14, al: [], available: true },

    { id: 'ric', emoji: '🍚', name: 'أرز بسمتي أبيض', nameFr: 'Riz basmati blanc', nameEn: 'White basmati rice', cat: 'carb', per100: { kcal: 130, p: 2.7, c: 28, f: 0.3, fiber: 0.4 }, price: 14, al: [], available: true },
    { id: 'pas', emoji: '🍝', name: 'معكرونة قمح', nameFr: 'Pâtes de blé', nameEn: 'Wheat pasta', cat: 'carb', per100: { kcal: 158, p: 5.8, c: 31, f: 0.9, fiber: 1.8 }, price: 16, al: ['gluten'], available: true },
    { id: 'swp', emoji: '🍠', name: 'بطاطا حلوة مشوية', nameFr: 'Patate douce rôtie', nameEn: 'Roasted sweet potato', cat: 'carb', per100: { kcal: 90, p: 2, c: 21, f: 0.2, fiber: 3.3 }, price: 12, al: [], available: true },
    { id: 'pot', emoji: '🥔', name: 'بطاطا مسلوقة', nameFr: 'Pomme de terre bouillie', nameEn: 'Boiled potato', cat: 'carb', per100: { kcal: 87, p: 1.9, c: 20, f: 0.1, fiber: 1.8 }, price: 9, al: [], available: true },
    { id: 'oat', emoji: '🥣', name: 'شوفان مطبوخ', nameFr: 'Flocons d’avoine cuits', nameEn: 'Cooked oats', cat: 'carb', per100: { kcal: 71, p: 2.5, c: 12, f: 1.5, fiber: 1.7 }, price: 18, al: ['gluten'], available: true },
    { id: 'brd', emoji: '🍞', name: 'خبز كامل', nameFr: 'Pain complet', nameEn: 'Whole wheat bread', cat: 'carb', per100: { kcal: 247, p: 13, c: 41, f: 3.4, fiber: 7 }, price: 10, al: ['gluten'], available: true },

    { id: 'oil', emoji: '🫒', name: 'زيت زيتون بكر', nameFr: 'Huile d’olive vierge', nameEn: 'Extra virgin olive oil', cat: 'fat', per100: { kcal: 884, p: 0, c: 0, f: 100, fiber: 0 }, price: 75, al: [], available: true },
    { id: 'alm', emoji: '🌰', name: 'لوز طبيعي', nameFr: 'Amandes naturelles', nameEn: 'Raw almonds', cat: 'fat', per100: { kcal: 579, p: 21, c: 22, f: 50, fiber: 12.5 }, price: 135, al: ['nuts'], available: true },
    { id: 'avc', emoji: '🥑', name: 'أفوكادو طازج', nameFr: 'Avocat frais', nameEn: 'Fresh avocado', cat: 'fat', per100: { kcal: 160, p: 2, c: 9, f: 15, fiber: 7 }, price: 65, al: [], available: true },

    { id: 'bro', emoji: '🥦', name: 'بروكلي على البخار', nameFr: 'Brocoli vapeur', nameEn: 'Steamed broccoli', cat: 'veg', per100: { kcal: 35, p: 2.4, c: 7.2, f: 0.4, fiber: 3.3 }, price: 18, al: [], available: true },
    { id: 'grb', emoji: '🫛', name: 'لوبيا خضراء', nameFr: 'Haricots verts', nameEn: 'Green beans', cat: 'veg', per100: { kcal: 31, p: 1.8, c: 7, f: 0.2, fiber: 2.7 }, price: 15, al: [], available: true },
    { id: 'sald', emoji: '🥗', name: 'سلطة خضراء موسمية', nameFr: 'Salade verte de saison', nameEn: 'Seasonal green salad', cat: 'veg', per100: { kcal: 20, p: 1.2, c: 3.6, f: 0.2, fiber: 1.8 }, price: 12, al: [], available: true },

    { id: 'j_ora', emoji: '🍊', name: 'عصير برتقال طبيعي', nameFr: 'Jus d’orange frais', nameEn: 'Fresh orange juice', cat: 'juice', unitLabel: '100مل', per100: { kcal: 45, p: 0.7, c: 10.4, f: 0.2, fiber: 0.2 }, price: 22, al: [], available: true },
    { id: 'j_app', emoji: '🍏', name: 'عصير تفاح طازج', nameFr: 'Jus de pomme frais', nameEn: 'Fresh apple juice', cat: 'juice', unitLabel: '100مل', per100: { kcal: 46, p: 0.1, c: 11.3, f: 0.1, fiber: 0.2 }, price: 24, al: [], available: true },
    { id: 'j_pom', emoji: '🍷', name: 'عصير رمان صافي', nameFr: 'Jus de grenade pur', nameEn: 'Pure pomegranate juice', cat: 'juice', unitLabel: '100مل', per100: { kcal: 54, p: 0.2, c: 13.1, f: 0.3, fiber: 0.1 }, price: 32, al: [], available: true },
    { id: 'j_car', emoji: '🥕', name: 'عصير جزر طازج', nameFr: 'Jus de carotte frais', nameEn: 'Fresh carrot juice', cat: 'juice', unitLabel: '100مل', per100: { kcal: 40, p: 0.9, c: 9.3, f: 0.2, fiber: 0.8 }, price: 20, al: [], available: true },
    { id: 'j_ban', emoji: '🍌', name: 'سموذي موز وحليب', nameFr: 'Smoothie banane lait', nameEn: 'Banana milk smoothie', cat: 'juice', unitLabel: '100مل', per100: { kcal: 76, p: 3.1, c: 13.5, f: 1.2, fiber: 0.9 }, price: 28, al: ['milk'], available: true },
    { id: 'j_str', emoji: '🍓', name: 'سموذي فراولة', nameFr: 'Smoothie fraise', nameEn: 'Strawberry smoothie', cat: 'juice', unitLabel: '100مل', per100: { kcal: 42, p: 0.8, c: 9.6, f: 0.3, fiber: 1.4 }, price: 30, al: [], available: true },
    { id: 'j_avc', emoji: '🥑', name: 'سموذي أفوكادو', nameFr: 'Smoothie avocat', nameEn: 'Avocado smoothie', cat: 'juice', unitLabel: '100مل', per100: { kcal: 112, p: 2.1, c: 8.5, f: 8.2, fiber: 3.1 }, price: 42, al: [], available: true },
    { id: 'j_lem', emoji: '🍋', name: 'ليمونادة طازجة بالنعناع', nameFr: 'Citronnade menthe fraîche', nameEn: 'Fresh mint lemonade', cat: 'juice', unitLabel: '100مل', per100: { kcal: 28, p: 0.3, c: 7.2, f: 0.1, fiber: 0.2 }, price: 18, al: [], available: true },
  ];

  return baseFoods.map((food) => ({
    ...food,
    // Seed values are illustrative until each ingredient is linked to a
    // traceable source, preparation state and verified edible-portion record.
    nutritionDataStatus: 'unverified' as const,
    nutritionBasis: 'unspecified' as const,
    nutritionSource: 'TODO_VERIFY',
  }));
}

export function seedDishes(): DishItem[] {
  return [
    { id: 'd1', emoji: '🍗', name: 'دجاج مشوي مع أرز وبروكلي', ing: [['chk', 180], ['ric', 200], ['bro', 100]], available: true },
    { id: 'd2', emoji: '🐟', name: 'سلمون مع بطاطا حلوة وبروكلي', ing: [['sal', 160], ['swp', 220], ['bro', 100]], available: true },
    { id: 'd3', emoji: '🥘', name: 'عدس مع أرز وزيت زيتون', ing: [['len', 250], ['ric', 150], ['oil', 10]], available: true },
    { id: 'd4', emoji: '🍝', name: 'تونة مع معكرونة وزيت زيتون', ing: [['tun', 150], ['pas', 220], ['oil', 8]], available: true },
    { id: 'd5', emoji: '🥣', name: 'شوفان مع بيض مسلوق ولوز', ing: [['oat', 250], ['egg', 120], ['alm', 20]], available: true },
    { id: 'd6', emoji: '🧀', name: 'جبن قريش مع خبز كامل ولوز', ing: [['cot', 220], ['brd', 70], ['alm', 20]], available: true },
  ];
}

export const DEFAULT_MEAL_NAMES: string[] = [
  'الوجبة الأولى · صباحية',
  'الوجبة الثانية · بعد التمرين',
  'الوجبة الثالثة · عشاء',
  'الوجبة الرابعة · إضافية',
  'الوجبة الخامسة · مسائية',
];

export function createInitialState(): AppState {
  const now = new Date();
  const fmt = (daysAgo: number) => {
    const d = new Date(now.getTime() - daysAgo * 86400000);
    return d.toISOString().slice(0, 10);
  };
  return {
    ver: STATE_VERSION,
    ob: 0,
    name: '',
    sex: 'm',
    age: 28,
    h: 178,
    w: 82.4,
    targetWeight: 80,
    lbm: 0,
    rel: 0,
    lbmMethod: 'none',
    band: 'A',
    pal: 1.7,
    goal: 'recomp',
    pct: -10,
    al: [],
    fl: { preg: false, kid: false, dia: false, ed: false },
    sup: false,
    supg: 30,
    foods: seedFoods(),
    dishes: seedDishes(),
    zones: DEFAULT_ZONES.map((z) => ({ ...z })),
    pricingConfig: { ...DEFAULT_PRICING },
    meals: [],
    n: 3,
    activeSlot: 0,
    mealNames: [...DEFAULT_MEAL_NAMES],
    zoneId: 'z1',
    orderNote: '',
    ord: [],
    jr: [],
    photos: [],
    cap: 60,
    adh: 92,
    cal: [],
    calDismissedDate: null,
    tab: 'home',
    adminMode: false,
    menuFilter: 'dishes',
    ingFilter: 'all',
    menuSearch: '',
    chartRange: '1m',
  };
}
