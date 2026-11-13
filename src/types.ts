export type Sex = 'm' | 'f';
export type ActivityBand = 'S' | 'L' | 'A' | 'V';
export type GoalType = 'bulk' | 'cut' | 'recomp' | 'perf';
export type AllergenKey = 'gluten' | 'eggs' | 'fish' | 'milk' | 'nuts';
export type FoodCategory = 'protein' | 'carb' | 'fat' | 'veg' | 'juice';
export type AppTab = 'home' | 'menu' | 'cart' | 'jr' | 'me' | 'admin';

export interface SafetyFlags {
  preg: boolean;
  kid: boolean;
  dia: boolean;
  ed: boolean;
}

export interface MacroPer100 {
  kcal: number;
  p: number;
  c: number;
  f: number;
  fiber: number;
}

export interface FoodItem {
  id: string;
  emoji: string;
  name: string;
  nameFr?: string;
  nameEn?: string;
  cat: FoodCategory;
  unitLabel?: string;
  imageUrl?: string;
  per100: MacroPer100;
  price: number; // DZD per 100g or 100ml
  al: AllergenKey[];
  available?: boolean;
  nutritionDataStatus?: 'verified' | 'unverified';
  nutritionBasis?: 'raw' | 'cooked' | 'as_sold' | 'unspecified';
  nutritionSource?: string;
  sourceRecordId?: string;
  ediblePortionPct?: number;
  cookingYield?: number;
}

export interface DishItem {
  id: string;
  emoji: string;
  name: string;
  imageUrl?: string;
  ing: [string, number][]; // [foodId, grams]
  available?: boolean;
}

export interface DeliveryZone {
  id: string;
  title: string;
  areas: string;
  hours: string;
  fee: number;
  active: boolean;
}

export interface PricingConfig {
  handlingPct: number; // default 7%
  serviceFeePerMeal: number; // default 200 DZD
  cutoffHour: number; // default 16 (16:00 Africa/Algiers)
}

export type CartItemKind = 'food' | 'dish' | 'custom';

export interface CartItem {
  uid: string;
  kind: CartItemKind;
  id: string;
  name?: string;
  emoji?: string;
  grams?: number;
  mult?: number;
  ing?: [string, number][];
  slot: number; // 0..(n-1)
}

export interface OrderItemSnapshot {
  label: string;
  grams: number;
  kcal: number;
  p: number;
  slot: number;
  slotName: string;
  rawIngredients: [string, number][];
}

export interface Order {
  id: string;
  createdAt: string;
  date: string;
  n: number;
  zoneTitle: string;
  zoneFee: number;
  note: string;
  ingCost: number;
  handling: number;
  service: number;
  total: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
  status: 'C' | 'W' | 'X';
  productionStage?: 'queued' | 'preparing' | 'packed' | 'out_for_delivery' | 'delivered';
  items: OrderItemSnapshot[];
}

export interface WeightEntry {
  d: string;
  w: number;
}

export interface CalibrationLog {
  d: string;
  deltaPct: number;
  rateKgPerWeek: number;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  weight: number;
  dataUrl: string;
  note?: string;
}

export interface AppState {
  ver: string;
  ob: number;
  name: string;
  sex: Sex;
  age: number;
  h: number;
  w: number;
  targetWeight: number;
  lbm: number;
  rel: number;
  lbmMethod?: 'none' | 'dexa' | 'inbody' | 'other';
  band: ActivityBand;
  pal: number;
  goal: GoalType;
  pct: number;
  al: AllergenKey[];
  fl: SafetyFlags;
  sup: boolean;
  supg: number;
  foods: FoodItem[];
  dishes: DishItem[];
  zones: DeliveryZone[];
  pricingConfig: PricingConfig;
  meals: CartItem[];
  n: number;
  activeSlot: number;
  mealNames: string[];
  zoneId: string;
  orderNote: string;
  ord: Order[];
  jr: WeightEntry[];
  photos: ProgressPhoto[];
  cap: number;
  adh: number;
  cal: CalibrationLog[];
  calDismissedDate: string | null;
  tab: AppTab;
  adminMode: boolean;
  menuFilter: 'dishes' | 'ingredients' | 'juices';
  ingFilter: 'all' | 'protein' | 'carb' | 'fat' | 'veg';
  menuSearch: string;
  chartRange: '1m' | '3m' | 'all';
}

export interface CalcResult {
  err: string | null;
  kat: boolean;
  bmi: number;
  bmr: number;
  tdee: number;
  kcal: number;
  P: number;
  F: number;
  C: number;
  fiber: number;
  pg: number;
  cg: number;
  sc: number;
  sp: number;
  ev: string;
  fp: number;
  warn: string[];
}

export interface MacroTotals {
  kcal: number;
  p: number;
  c: number;
  f: number;
  fiber: number;
  price: number;
}

export interface MacroGaps {
  kcal: number;
  P: number;
  C: number;
  F: number;
}
