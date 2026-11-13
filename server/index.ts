import 'dotenv/config';
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Pool, PoolClient } from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Role = 'customer' | 'admin' | 'kitchen' | 'delivery';
type AuthRequest = Request & { auth?: { id: string; role: Role } };
type Ingredient = { id:string; name:string; grams:number; price:number; kcal:number; protein:number; carbs:number; fat:number; basis:string; source:string };
const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || '';
if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
if (JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
const app = express();
app.disable('x-powered-by');
app.use(helmet());
if (process.env.APP_ORIGIN) {
  app.use(cors({ origin: process.env.APP_ORIGIN.split(',').map((x) => x.trim()), credentials: true }));
}
app.use(express.json({ limit: '256kb' }));
const authLimiter = rateLimit({ windowMs: 900000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api', apiLimiter);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
function asyncRoute(fn: (req: AuthRequest, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => { void fn(req as AuthRequest, res).catch(next); };
}
function authRequired(req: Request, res: Response, next: NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ error: 'يلزم تسجيل الدخول.' }); return; }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!payload.sub || !['customer','admin','kitchen','delivery'].includes(String(payload.role))) {
      res.status(401).json({ error: 'جلسة غير صالحة.' }); return;
    }
    (req as AuthRequest).auth = { id: String(payload.sub), role: payload.role as Role };
    next();
  } catch { res.status(401).json({ error: 'انتهت الجلسة أو أنها غير صالحة.' }); }
}
function requireRole(...roles: Role[]): RequestHandler {
  return (req, res, next) => {
    const auth = (req as AuthRequest).auth;
    if (!auth || !roles.includes(auth.role)) { res.status(403).json({ error: 'ليس لديك صلاحية.' }); return; }
    next();
  };
}
function cleanText(value: unknown, min = 1, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const result = value.trim();
  return result.length >= min && result.length <= max ? result : null;
}
function bounded(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function tokenFor(user: { id: string; role: Role }) {
  return jwt.sign({ role: user.role }, JWT_SECRET, { subject: user.id, expiresIn: '12h' });
}
function localDateAndHour() {
  const parts: Record<string,string> = {};
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).forEach((part) => { parts[part.type] = part.value; });
  return { date: parts.year + '-' + parts.month + '-' + parts.day, hour: Number(parts.hour) };
}
function addDays(date: string, days: number) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0,10);
}
function orderNumber() {
  return 'NF-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100000 + Math.random() * 900000);
}
async function audit(client: PoolClient, actor: string, action: string, type: string, id: string, details = {}) {
  await client.query(
    'INSERT INTO audit_log (actor_id,action,entity_type,entity_id,details) VALUES ($1,$2,$3,$4,$5)',
    [actor,action,type,id,JSON.stringify(details)]
  );
}

app.get('/api/health', asyncRoute(async (_req,res) => {
  await pool.query('SELECT 1');
  res.json({ status:'ok', database:'connected', service:'nutrifit-api' });
}));

app.post('/api/auth/register', authLimiter, asyncRoute(async (req,res) => {
  const name = cleanText(req.body?.name,2,100);
  const email = cleanText(req.body?.email,5,254)?.toLowerCase();
  const password = cleanText(req.body?.password,12,128);
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    res.status(400).json({ error:'أدخل اسماً وبريداً صحيحاً وكلمة مرور من 12 حرفاً على الأقل.' }); return;
  }
  try {
    const result = await pool.query(
      'INSERT INTO app_users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role',
      [name,email,await bcrypt.hash(password,12),'customer']
    );
    res.status(201).json({ user:result.rows[0], token:tokenFor(result.rows[0]) });
  } catch (error: any) {
    if (error?.code === '23505') { res.status(409).json({ error:'هذا البريد مسجل بالفعل.' }); return; }
    throw error;
  }
}));

app.post('/api/auth/login', authLimiter, asyncRoute(async (req,res) => {
  const email = cleanText(req.body?.email,5,254)?.toLowerCase();
  const password = cleanText(req.body?.password,1,128);
  if (!email || !password) { res.status(400).json({ error:'أدخل البريد وكلمة المرور.' }); return; }
  const result = await pool.query('SELECT id,name,email,password_hash,role FROM app_users WHERE email=$1',[email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password,user.password_hash))) {
    res.status(401).json({ error:'البريد أو كلمة المرور غير صحيحة.' }); return;
  }
  res.json({ user:{id:user.id,name:user.name,email:user.email,role:user.role}, token:tokenFor(user) });
}));

app.get('/api/auth/me', authRequired, asyncRoute(async (req,res) => {
  const auth = (req as AuthRequest).auth!;
  const result = await pool.query('SELECT id,name,email,role,created_at FROM app_users WHERE id=$1',[auth.id]);
  if (!result.rowCount) { res.status(404).json({ error:'الحساب غير موجود.' }); return; }
  res.json({ user:result.rows[0] });
}));

app.get('/api/foods', asyncRoute(async (_req,res) => {
  const result = await pool.query(
    "SELECT id,code,name_ar,name_fr,name_en,category,kcal_per_100,protein_per_100,carbs_per_100,fat_per_100,fiber_per_100,price_dzd_per_100,allergens,nutrition_basis,nutrition_source,source_record_id,edible_portion_pct,cooking_yield FROM foods WHERE active=true AND nutrition_verified=true AND nutrition_basis <> 'unspecified' ORDER BY category,name_ar"
  );
  res.json({ foods:result.rows });
}));
app.get('/api/zones', asyncRoute(async (_req,res) => {
  const result = await pool.query('SELECT id,title,areas,service_hours,fee_dzd FROM delivery_zones WHERE active=true ORDER BY title');
  res.json({ zones:result.rows });
}));

app.get('/api/profile', authRequired, asyncRoute(async (req,res) => {
  const auth = (req as AuthRequest).auth!;
  const result = await pool.query(
    'SELECT u.id,u.name,u.email,u.allergens,p.sex,p.age,p.height_cm,p.weight_kg,p.target_weight_kg,p.activity_band,p.pal,p.goal,p.goal_adjustment_pct,p.health_flags,p.lbm_kg,p.lbm_reliability_pct,p.lbm_method,p.profile_version FROM app_users u LEFT JOIN customer_profiles p ON p.user_id=u.id WHERE u.id=$1',
    [auth.id]
  );
  res.json({ profile:result.rows[0] ?? null });
}));

app.put('/api/profile', authRequired, requireRole('customer'), asyncRoute(async (req,res) => {
  const auth = (req as AuthRequest).auth!;
  const b = req.body ?? {};
  const allowed = new Set(['gluten','eggs','fish','milk','nuts']);
  const allergens = Array.isArray(b.allergens) ? b.allergens : [];
  if (allergens.some((x: unknown) => typeof x !== 'string' || !allowed.has(x))) {
    res.status(400).json({ error:'قائمة مسببات الحساسية غير صالحة.' }); return;
  }
  const sex = b.sex === 'm' || b.sex === 'f' ? b.sex : null;
  const age = bounded(b.age,18,100), height = bounded(b.heightCm,120,230);
  const weight = bounded(b.weightKg,30,300), target = bounded(b.targetWeightKg,30,300);
  const band = ['S','L','A','V'].includes(b.activityBand) ? b.activityBand : null;
  const pal = bounded(b.pal,1.2,2.4);
  const palRanges: Record<string,[number,number]> = { S:[1.2,1.39], L:[1.4,1.69], A:[1.7,1.99], V:[2.0,2.4] };
  const palValid = Boolean(band && pal !== null && pal >= palRanges[band][0] && pal <= palRanges[band][1]);
  const goal = ['bulk','cut','recomp','perf'].includes(b.goal) ? b.goal : null;
  const adjustment = bounded(b.goalAdjustmentPct,-25,25);
  const healthFlags = b.healthFlags && typeof b.healthFlags === 'object' && !Array.isArray(b.healthFlags) ? b.healthFlags : {};
  const healthFlagKeys = ['preg','kid','dia','ed'];
  const healthFlagsValid = healthFlagKeys.every((key) => typeof healthFlags[key] === 'boolean');
  const rawLbm = b.lbmKg === null || b.lbmKg === undefined || Number(b.lbmKg) === 0 ? null : bounded(b.lbmKg,1,300);
  const reliability = b.lbmReliabilityPct === null || b.lbmReliabilityPct === undefined ? null : bounded(b.lbmReliabilityPct,0,100);
  const lbmMethod = ['none','dexa','inbody','other'].includes(b.lbmMethod) ? b.lbmMethod : 'none';
  const lbm = rawLbm !== null && reliability !== null && reliability >= 70 && lbmMethod !== 'none' ? rawLbm : null;
  if (!sex || age === null || height === null || weight === null || target === null ||
      !band || pal === null || !palValid || !goal || adjustment === null || !healthFlagsValid ||
      (b.lbmKg !== null && b.lbmKg !== undefined && Number(b.lbmKg) !== 0 && rawLbm === null) ||
      (rawLbm !== null && rawLbm > weight)) {
    res.status(400).json({ error:'بيانات الملف ناقصة أو خارج الحدود.' }); return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE app_users SET allergens=$1 WHERE id=$2',[allergens,auth.id]);
    await client.query(
      'INSERT INTO customer_profiles (user_id,sex,age,height_cm,weight_kg,target_weight_kg,activity_band,pal,goal,goal_adjustment_pct,health_flags,lbm_kg,lbm_reliability_pct,lbm_method) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (user_id) DO UPDATE SET sex=EXCLUDED.sex,age=EXCLUDED.age,height_cm=EXCLUDED.height_cm,weight_kg=EXCLUDED.weight_kg,target_weight_kg=EXCLUDED.target_weight_kg,activity_band=EXCLUDED.activity_band,pal=EXCLUDED.pal,goal=EXCLUDED.goal,goal_adjustment_pct=EXCLUDED.goal_adjustment_pct,health_flags=EXCLUDED.health_flags,lbm_kg=EXCLUDED.lbm_kg,lbm_reliability_pct=EXCLUDED.lbm_reliability_pct,lbm_method=EXCLUDED.lbm_method,profile_version=customer_profiles.profile_version+1,updated_at=now()',
      [auth.id,sex,age,height,weight,target,band,pal,goal,adjustment,JSON.stringify(healthFlags),lbm,reliability,lbmMethod]
    );
    await audit(client,auth.id,'profile.updated','customer_profile',auth.id);
    await client.query('COMMIT');
    res.json({ saved:true });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

app.post('/api/orders', authRequired, requireRole('customer'), asyncRoute(async (req,res) => {
  const auth = (req as AuthRequest).auth!;
  const b = req.body ?? {};
  const zoneId = cleanText(b.zoneId,1,80);
  const mealCount = bounded(b.mealCount,1,8);
  const note = cleanText(b.note ?? '',0,1000);
  const items = b.items;
  if (!zoneId || mealCount === null || !Number.isInteger(mealCount) || note === null ||
      !Array.isArray(items) || items.length < 1 || items.length > 64) {
    res.status(400).json({ error:'بيانات الطلب غير مكتملة.' }); return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const configResult = await client.query('SELECT * FROM pricing_config WHERE id=1 FOR UPDATE');
    const config = configResult.rows[0];
    if (!config || Number(config.daily_capacity_boxes) < 1) {
      await client.query('ROLLBACK');
      res.status(503).json({ error:'الطاقة التشغيلية لم تعتمد بعد؛ لا نستقبل طلبات حالياً.' }); return;
    }
    const zoneResult = await client.query('SELECT id,title,fee_dzd FROM delivery_zones WHERE id=$1 AND active=true FOR SHARE',[zoneId]);
    if (!zoneResult.rowCount) {
      await client.query('ROLLBACK');
      res.status(409).json({ error:'منطقة الخدمة غير متاحة أو لم تعد معتمدة.' }); return;
    }
    const customer = await client.query('SELECT allergens FROM app_users WHERE id=$1 FOR SHARE',[auth.id]);
    const profileResult = await client.query(
      'SELECT age,health_flags,weight_kg,height_cm,goal FROM customer_profiles WHERE user_id=$1 FOR SHARE',
      [auth.id]
    );
    const customerProfile = profileResult.rows[0];
    if (!customer.rowCount || !customerProfile || !customerProfile.age || !customerProfile.weight_kg || !customerProfile.height_cm) {
      throw new Error('PROFILE_REQUIRED');
    }
    const health = customerProfile.health_flags ?? {};
    if (Number(customerProfile.age) < 18 || health.preg === true || health.kid === true || health.dia === true || health.ed === true) {
      throw new Error('HEALTH_REVIEW_REQUIRED');
    }
    const bmi = Number(customerProfile.weight_kg) / Math.pow(Number(customerProfile.height_cm) / 100,2);
    if (customerProfile.goal === 'cut' && bmi < 18.5) throw new Error('CUT_GOAL_BLOCKED');
    const blocked = new Set<string>(customer.rows[0]?.allergens ?? []);
    const normalized: Array<{slot:number;slotName:string;label:string;grams:number;kcal:number;protein:number;carbs:number;fat:number;ingredients:Ingredient[]}> = [];
    const slots = new Set<number>();

    for (const item of items) {
      const slot = bounded(item?.slot,0,mealCount-1);
      const slotName = cleanText(item?.slotName,1,80);
      if (slot === null || !Number.isInteger(slot) || !slotName) throw new Error('INVALID_ITEM');
      slots.add(slot);
      let ingredients: Ingredient[] = [];
      let label = '';
      if (item.kind === 'food') {
        const grams = bounded(item.grams,1,1500);
        if (grams === null) throw new Error('INVALID_GRAMS');
        const found = await client.query(
          "SELECT id,name_ar,kcal_per_100,protein_per_100,carbs_per_100,fat_per_100,price_dzd_per_100,allergens,nutrition_verified,nutrition_basis,nutrition_source FROM foods WHERE id=$1 AND active=true FOR SHARE",
          [item.id]
        );
        const food = found.rows[0];
        if (!food) throw new Error('FOOD_UNAVAILABLE');
        if (!food.nutrition_verified || food.nutrition_basis === 'unspecified' || !food.nutrition_source) throw new Error('FOOD_NOT_VERIFIED');
        if ((food.allergens ?? []).some((x:string) => blocked.has(x))) throw new Error('ALLERGEN_BLOCK');
        const factor = grams/100;
        ingredients = [{id:food.id,name:food.name_ar,grams,price:Number(food.price_dzd_per_100),
          kcal:Number(food.kcal_per_100)*factor,protein:Number(food.protein_per_100)*factor,
          carbs:Number(food.carbs_per_100)*factor,fat:Number(food.fat_per_100)*factor,basis:food.nutrition_basis,source:food.nutrition_source}];
        label = food.name_ar;
      } else if (item.kind === 'dish') {
        const multiplier = bounded(item.multiplier ?? 1,0.1,4);
        if (multiplier === null) throw new Error('INVALID_MULTIPLIER');
        const found = await client.query(
          "SELECT d.name_ar,di.grams,f.id AS food_id,f.name_ar AS food_name,f.kcal_per_100,f.protein_per_100,f.carbs_per_100,f.fat_per_100,f.price_dzd_per_100,f.allergens,f.nutrition_verified,f.nutrition_basis,f.nutrition_source FROM dishes d JOIN dish_ingredients di ON di.dish_id=d.id JOIN foods f ON f.id=di.food_id WHERE d.id=$1 AND d.active=true AND f.active=true FOR SHARE OF d,f",
          [item.id]
        );
        if (!found.rowCount) throw new Error('DISH_UNAVAILABLE');
        label = found.rows[0].name_ar;
        for (const row of found.rows) {
          if (!row.nutrition_verified || row.nutrition_basis === 'unspecified' || !row.nutrition_source) throw new Error('FOOD_NOT_VERIFIED');
          if ((row.allergens ?? []).some((x:string) => blocked.has(x))) throw new Error('ALLERGEN_BLOCK');
          const grams = Number(row.grams)*multiplier, factor = grams/100;
          ingredients.push({id:row.food_id,name:row.food_name,grams,price:Number(row.price_dzd_per_100),
            kcal:Number(row.kcal_per_100)*factor,protein:Number(row.protein_per_100)*factor,
            carbs:Number(row.carbs_per_100)*factor,fat:Number(row.fat_per_100)*factor,basis:row.nutrition_basis,source:row.nutrition_source});
        }
      } else if (item.kind === 'custom') {
        const entries = item.ingredients;
        if (!Array.isArray(entries) || entries.length < 1 || entries.length > 30) throw new Error('INVALID_CUSTOM_INGREDIENTS');
        label = cleanText(item.label,2,160) ?? 'وجبة مخصصة';
        for (const entry of entries) {
          const grams = bounded(entry?.grams,1,1500);
          const foodId = cleanText(entry?.foodId,1,80);
          if (grams === null || !foodId) throw new Error('INVALID_CUSTOM_INGREDIENTS');
          const found = await client.query(
            "SELECT id,name_ar,kcal_per_100,protein_per_100,carbs_per_100,fat_per_100,price_dzd_per_100,allergens,nutrition_verified,nutrition_basis,nutrition_source FROM foods WHERE id=$1 AND active=true FOR SHARE",
            [foodId]
          );
          const food = found.rows[0];
          if (!food) throw new Error('FOOD_UNAVAILABLE');
          if (!food.nutrition_verified || food.nutrition_basis === 'unspecified' || !food.nutrition_source) throw new Error('FOOD_NOT_VERIFIED');
          if ((food.allergens ?? []).some((x:string) => blocked.has(x))) throw new Error('ALLERGEN_BLOCK');
          const factor = grams/100;
          ingredients.push({id:food.id,name:food.name_ar,grams,price:Number(food.price_dzd_per_100),
            kcal:Number(food.kcal_per_100)*factor,protein:Number(food.protein_per_100)*factor,
            carbs:Number(food.carbs_per_100)*factor,fat:Number(food.fat_per_100)*factor,basis:food.nutrition_basis,source:food.nutrition_source});
        }
      } else throw new Error('INVALID_KIND');

      const totals = ingredients.reduce((sum,x) => ({
        grams:sum.grams+x.grams,kcal:sum.kcal+x.kcal,protein:sum.protein+x.protein,
        carbs:sum.carbs+x.carbs,fat:sum.fat+x.fat,
      }),{grams:0,kcal:0,protein:0,carbs:0,fat:0});
      normalized.push({slot,slotName,label,...totals,ingredients});
    }
    if (slots.size !== mealCount) throw new Error('INCOMPLETE_SLOTS');
    for (let slot=0;slot<mealCount;slot++) if (!slots.has(slot)) throw new Error('INCOMPLETE_SLOTS');

    const now = localDateAndHour();
    const deliveryDate = addDays(now.date,now.hour >= Number(config.cutoff_hour) ? 2 : 1);
    const capacity = await client.query("SELECT COALESCE(SUM(meal_count),0)::int AS used FROM customer_orders WHERE delivery_date=$1 AND order_status='confirmed'",[deliveryDate]);
    const used = Number(capacity.rows[0].used);
    const orderStatus = used + mealCount > Number(config.daily_capacity_boxes) ? 'waitlisted' : 'confirmed';
    const zone = zoneResult.rows[0];
    const flatIngredients = normalized.flatMap((item) => item.ingredients);
    const ingredientCost = flatIngredients.reduce((sum,x) => sum+x.price*x.grams/100,0);
    const handlingFee = ingredientCost*Number(config.handling_pct)/100;
    const serviceFee = mealCount*Number(config.service_fee_per_meal);
    const macros = normalized.reduce((sum,item) => ({
      kcal:sum.kcal+item.kcal,protein:sum.protein+item.protein,carbs:sum.carbs+item.carbs,fat:sum.fat+item.fat,
    }),{kcal:0,protein:0,carbs:0,fat:0});
    const number = orderNumber();
    const inserted = await client.query(
      'INSERT INTO customer_orders (order_number,customer_id,delivery_date,delivery_zone_id,delivery_zone_title,delivery_fee_dzd,meal_count,customer_note,ingredient_cost_dzd,handling_fee_dzd,service_fee_dzd,total_dzd,kcal_total,protein_total,carbs_total,fat_total,order_status,production_stage) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id,order_number,delivery_date,order_status,total_dzd,production_stage,delivery_fee_dzd,ingredient_cost_dzd,handling_fee_dzd,service_fee_dzd,kcal_total,protein_total,carbs_total,fat_total',
      [number,auth.id,deliveryDate,zone.id,zone.title,Number(zone.fee_dzd),mealCount,note,
       ingredientCost,handlingFee,serviceFee,ingredientCost+handlingFee+serviceFee+Number(zone.fee_dzd),
       macros.kcal,macros.protein,macros.carbs,macros.fat,orderStatus,orderStatus==='confirmed'?'queued':null]
    );
    const order = inserted.rows[0];
    for (const item of normalized) {
      const line = await client.query(
        'INSERT INTO order_items (order_id,slot,slot_name,label,grams,kcal,protein,carbs,fat) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
        [order.id,item.slot,item.slotName,item.label,item.grams,item.kcal,item.protein,item.carbs,item.fat]
      );
      for (const ingredient of item.ingredients) {
        await client.query(
          'INSERT INTO order_item_ingredients (order_item_id,food_id,food_name_snapshot,grams,unit_price_snapshot,kcal_snapshot,protein_snapshot,carbs_snapshot,fat_snapshot,nutrition_basis_snapshot,nutrition_source_snapshot) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
          [line.rows[0].id,ingredient.id,ingredient.name,ingredient.grams,ingredient.price,
           ingredient.kcal,ingredient.protein,ingredient.carbs,ingredient.fat,ingredient.basis,ingredient.source]
        );
      }
    }
    await audit(client,auth.id,'order.created','customer_order',order.id,{number,status:orderStatus,deliveryDate});
    await client.query('COMMIT');
    res.status(201).json({ order });
  } catch (error: any) {
    await client.query('ROLLBACK');
    const messages: Record<string,string> = {
      INVALID_ITEM:'أحد عناصر الطلب غير صالح.',INVALID_GRAMS:'وزن أحد المكونات خارج النطاق.',
      PROFILE_REQUIRED:'أكمل ملفك الغذائي قبل إرسال الطلب.',
      HEALTH_REVIEW_REQUIRED:'يتطلب ملفك مراجعة مختص قبل قبول الطلب؛ لا يمكن تجاوزه آلياً.',
      CUT_GOAL_BLOCKED:'لا يمكن قبول هدف خفض الوزن عند مؤشر كتلة جسم أقل من 18.5.',
      FOOD_UNAVAILABLE:'أحد المكونات غير متاح.',FOOD_NOT_VERIFIED:'لا يمكن طلب مكوّن غير موثق غذائياً.',
      ALLERGEN_BLOCK:'يتضمن الطلب مسبب حساسية مسجلاً في ملفك.',
      INVALID_MULTIPLIER:'حجم أحد الأطباق غير صالح.',DISH_UNAVAILABLE:'أحد الأطباق غير متاح.',
      INVALID_KIND:'نوع عنصر الطلب غير مدعوم.',INVALID_CUSTOM_INGREDIENTS:'مكونات الوجبة المخصصة أو أوزانها غير صالحة.',INCOMPLETE_SLOTS:'يجب أن تحتوي كل وجبة على عنصر واحد على الأقل.',
    };
    if (messages[error?.message]) { res.status(400).json({error:messages[error.message]}); return; }
    throw error;
  } finally { client.release(); }
}));

app.delete('/api/orders/:id', authRequired, requireRole('customer'), asyncRoute(async (req,res) => {
  if (!isUuid(req.params.id)) { res.status(400).json({error:'معرّف الطلب غير صالح.'}); return; }
  const auth = (req as AuthRequest).auth!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      "SELECT id,order_status,production_stage FROM customer_orders WHERE id=$1 AND customer_id=$2 FOR UPDATE",
      [req.params.id,auth.id]
    );
    if (!found.rowCount) {
      await client.query('ROLLBACK');
      res.status(404).json({error:'الطلب غير موجود في حسابك.'}); return;
    }
    const order = found.rows[0];
    if (!['confirmed','waitlisted'].includes(order.order_status) ||
        (order.production_stage && order.production_stage !== 'queued')) {
      await client.query('ROLLBACK');
      res.status(409).json({error:'بدأ تجهيز الطلب أو لم يعد قابلاً للإلغاء من الحساب. تواصل مع خدمة العملاء.'}); return;
    }
    await client.query(
      "UPDATE customer_orders SET order_status='cancelled',production_stage=NULL,updated_at=now() WHERE id=$1",
      [order.id]
    );
    await audit(client,auth.id,'order.cancelled','customer_order',order.id);
    await client.query('COMMIT');
    res.json({cancelled:true,id:order.id});
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

app.get('/api/orders', authRequired, requireRole('customer'), asyncRoute(async (req,res) => {
  const auth = (req as AuthRequest).auth!;
  const result = await pool.query(
    "SELECT id,order_number,delivery_date,delivery_zone_title,delivery_fee_dzd,meal_count,customer_note,ingredient_cost_dzd,handling_fee_dzd,service_fee_dzd,total_dzd,kcal_total,protein_total,carbs_total,fat_total,order_status,production_stage,payment_status,created_at FROM customer_orders WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 100",
    [auth.id]
  );
  const ids = result.rows.map((x) => x.id);
  const items = ids.length ? await pool.query(
    "SELECT oi.*,COALESCE(json_agg(json_build_object('name',ii.food_name_snapshot,'grams',ii.grams,'basis',ii.nutrition_basis_snapshot,'source',ii.nutrition_source_snapshot)) FILTER (WHERE ii.id IS NOT NULL),'[]'::json) AS ingredients FROM order_items oi LEFT JOIN order_item_ingredients ii ON ii.order_item_id=oi.id WHERE oi.order_id=ANY($1::uuid[]) GROUP BY oi.id ORDER BY oi.slot,oi.id",
    [ids]
  ) : { rows:[] as any[] };
  const grouped = new Map<string,any[]>();
  for (const item of items.rows) grouped.set(item.order_id,[...(grouped.get(item.order_id) ?? []),item]);
  res.json({ orders:result.rows.map((order) => ({...order,items:grouped.get(order.id) ?? []})) });
}));

app.get('/api/kitchen/orders', authRequired, requireRole('admin','kitchen'), asyncRoute(async (req,res) => {
  const date = cleanText(req.query.date,10,10);
  const params: unknown[] = [];
  let where = "WHERE o.order_status='confirmed'";
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) { params.push(date); where += ' AND o.delivery_date=$1'; }
  const result = await pool.query(
    'SELECT o.id,o.order_number,o.delivery_date,o.delivery_zone_title,o.meal_count,o.production_stage,o.customer_note,u.name AS customer_name FROM customer_orders o JOIN app_users u ON u.id=o.customer_id ' + where + ' ORDER BY o.delivery_date,o.created_at',
    params
  );
  const ids = result.rows.map((order) => order.id);
  const lines = ids.length ? await pool.query(
    "SELECT oi.*,COALESCE(json_agg(json_build_object('name',ii.food_name_snapshot,'grams',ii.grams,'basis',ii.nutrition_basis_snapshot,'source',ii.nutrition_source_snapshot)) FILTER (WHERE ii.id IS NOT NULL),'[]'::json) AS ingredients FROM order_items oi LEFT JOIN order_item_ingredients ii ON ii.order_item_id=oi.id WHERE oi.order_id=ANY($1::uuid[]) GROUP BY oi.id ORDER BY oi.slot,oi.id",
    [ids]
  ) : { rows:[] as any[] };
  const grouped = new Map<string,any[]>();
  for (const line of lines.rows) grouped.set(line.order_id,[...(grouped.get(line.order_id) ?? []),line]);
  res.json({ orders:result.rows.map((order) => ({...order,items:grouped.get(order.id) ?? []})) });
}));

app.patch('/api/kitchen/orders/:id/stage', authRequired, requireRole('admin','kitchen','delivery'), asyncRoute(async (req,res) => {
  if (!isUuid(req.params.id)) { res.status(400).json({error:'معرّف الطلب غير صالح.'}); return; }
  const auth = (req as AuthRequest).auth!;
  const stages = ['queued','preparing','packed','out_for_delivery','delivered'];
  const stage = req.body?.stage;
  if (!stages.includes(stage)) { res.status(400).json({error:'مرحلة تشغيل غير صالحة.'}); return; }
  if (auth.role === 'kitchen' && !['queued','preparing','packed'].includes(stage)) {
    res.status(403).json({error:'حساب المطبخ لا يحدّث مراحل التوصيل.'}); return;
  }
  if (auth.role === 'delivery' && !['out_for_delivery','delivered'].includes(stage)) {
    res.status(403).json({error:'حساب التوصيل لا يحدّث مراحل المطبخ.'}); return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      "SELECT id,production_stage FROM customer_orders WHERE id=$1 AND order_status='confirmed' AND ($2 <> 'delivery' OR delivery_user_id=$3) FOR UPDATE",
      [req.params.id,auth.role,auth.id]
    );
    if (!found.rowCount) { await client.query('ROLLBACK'); res.status(404).json({error:'الطلب غير موجود.'}); return; }
    const current = found.rows[0].production_stage ?? 'queued';
    const currentIndex = stages.indexOf(current);
    const nextIndex = stages.indexOf(stage);
    if (nextIndex < currentIndex) {
      await client.query('ROLLBACK'); res.status(409).json({error:'لا يمكن إرجاع الطلب إلى مرحلة سابقة.'}); return;
    }
    if (auth.role !== 'admin' && nextIndex > currentIndex + 1) {
      await client.query('ROLLBACK'); res.status(409).json({error:'يجب إكمال مرحلة التشغيل الحالية قبل الانتقال إلى المرحلة التالية.'}); return;
    }
    await client.query('UPDATE customer_orders SET production_stage=$1,updated_at=now() WHERE id=$2',[stage,req.params.id]);
    await audit(client,auth.id,'order.stage.updated','customer_order',req.params.id,{from:current,to:stage});
    await client.query('COMMIT');
    res.json({updated:true,stage});
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));


app.get('/api/dishes', asyncRoute(async (_req,res) => {
  const result = await pool.query(
    "SELECT d.id,d.name_ar,d.description,COALESCE(json_agg(json_build_object('foodId',f.id,'name',f.name_ar,'grams',di.grams,'kcal',f.kcal_per_100,'protein',f.protein_per_100,'carbs',f.carbs_per_100,'fat',f.fat_per_100)) FILTER (WHERE f.id IS NOT NULL),'[]'::json) AS ingredients FROM dishes d JOIN dish_ingredients di ON di.dish_id=d.id JOIN foods f ON f.id=di.food_id WHERE d.active=true AND f.active=true AND f.nutrition_verified=true AND f.nutrition_basis<>'unspecified' GROUP BY d.id ORDER BY d.name_ar"
  );
  res.json({dishes:result.rows});
}));

app.get('/api/admin/staff', authRequired, requireRole('admin'), asyncRoute(async (_req,res) => {
  const result = await pool.query("SELECT id,name,email,role,created_at FROM app_users WHERE role IN ('kitchen','delivery','admin') ORDER BY role,name");
  res.json({staff:result.rows});
}));

app.get('/api/admin/customers', authRequired, requireRole('admin'), asyncRoute(async (_req,res) => {
  const result = await pool.query(
    "SELECT u.id,u.name,u.email,u.role,u.allergens,u.created_at,p.goal,p.weight_kg,p.height_cm,p.activity_band,(SELECT count(*)::int FROM customer_orders o WHERE o.customer_id=u.id) AS orders_count FROM app_users u LEFT JOIN customer_profiles p ON p.user_id=u.id WHERE u.role='customer' ORDER BY u.created_at DESC LIMIT 250"
  );
  res.json({customers:result.rows});
}));

app.patch('/api/admin/staff/:id/role', authRequired, requireRole('admin'), asyncRoute(async (req,res) => {
  if (!isUuid(req.params.id)) { res.status(400).json({error:'معرّف الحساب غير صالح.'}); return; }
  const auth = (req as AuthRequest).auth!;
  const nextRole = req.body?.role;
  if (!['customer','kitchen','delivery','admin'].includes(nextRole)) {
    res.status(400).json({error:'الدور المطلوب غير صالح.'}); return;
  }
  if (req.params.id === auth.id && nextRole !== 'admin') {
    res.status(409).json({error:'لا يمكنك تغيير صلاحية حسابك الإداري النشط بنفسك.'}); return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'UPDATE app_users SET role=$1 WHERE id=$2 RETURNING id,name,email,role',
      [nextRole,req.params.id]
    );
    if (!result.rowCount) { await client.query('ROLLBACK'); res.status(404).json({error:'الحساب غير موجود.'}); return; }
    await audit(client,auth.id,'user.role.updated','app_user',req.params.id,{role:nextRole});
    await client.query('COMMIT');
    res.json({user:result.rows[0]});
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

app.get('/api/admin/audit', authRequired, requireRole('admin'), asyncRoute(async (_req,res) => {
  const result = await pool.query(
    'SELECT a.id,a.action,a.entity_type,a.entity_id,a.details,a.created_at,u.name AS actor_name,u.email AS actor_email FROM audit_log a LEFT JOIN app_users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 150'
  );
  res.json({logs:result.rows});
}));

app.get('/api/admin/settings', authRequired, requireRole('admin'), asyncRoute(async (_req,res) => {
  const result = await pool.query('SELECT handling_pct,service_fee_per_meal,cutoff_hour,daily_capacity_boxes,updated_at FROM pricing_config WHERE id=1');
  res.json({settings:result.rows[0] ?? null});
}));

app.patch('/api/admin/settings', authRequired, requireRole('admin'), asyncRoute(async (req,res) => {
  const b = req.body ?? {};
  const handling = bounded(b.handlingPct,0,100);
  const service = bounded(b.serviceFeePerMeal,0,100000);
  const cutoff = bounded(b.cutoffHour,8,23);
  const capacity = bounded(b.dailyCapacityBoxes,0,10000);
  if (handling === null || service === null || cutoff === null || capacity === null ||
      !Number.isInteger(cutoff) || !Number.isInteger(capacity)) {
    res.status(400).json({error:'إعدادات الأسعار أو الطاقة التشغيلية غير صالحة.'}); return;
  }
  const result = await pool.query(
    'UPDATE pricing_config SET handling_pct=$1,service_fee_per_meal=$2,cutoff_hour=$3,daily_capacity_boxes=$4,updated_at=now() WHERE id=1 RETURNING handling_pct,service_fee_per_meal,cutoff_hour,daily_capacity_boxes,updated_at',
    [handling,service,cutoff,capacity]
  );
  res.json({settings:result.rows[0]});
}));

app.get('/api/admin/foods', authRequired, requireRole('admin'), asyncRoute(async (_req,res) => {
  const result = await pool.query('SELECT * FROM foods ORDER BY created_at DESC');
  res.json({foods:result.rows});
}));

app.post('/api/admin/foods', authRequired, requireRole('admin'), asyncRoute(async (req,res) => {
  const auth = (req as AuthRequest).auth!;
  const b = req.body ?? {};
  const name = cleanText(b.name,2,160);
  const nameFr = cleanText(b.nameFr ?? '',0,160);
  const nameEn = cleanText(b.nameEn ?? '',0,160);
  const category = ['protein','carb','fat','veg','juice'].includes(b.category) ? b.category : null;
  const basis = ['raw','cooked','as_sold','unspecified'].includes(b.nutritionBasis) ? b.nutritionBasis : null;
  const source = cleanText(b.nutritionSource ?? '',0,500);
  const sourceId = cleanText(b.sourceRecordId ?? '',0,160);
  const ediblePortionPct = b.ediblePortionPct === undefined || b.ediblePortionPct === '' || b.ediblePortionPct === null
    ? null
    : bounded(b.ediblePortionPct,1,100);
  const cookingYield = b.cookingYield === undefined || b.cookingYield === '' || b.cookingYield === null
    ? null
    : bounded(b.cookingYield,0.05,5);
  const values = ['kcal','protein','carbs','fat','fiber','priceDzdPer100'].map((key) => bounded(b[key],0,100000));
  const allowed = new Set(['gluten','eggs','fish','milk','nuts']);
  const allergens = Array.isArray(b.allergens) && b.allergens.every((x:unknown) => typeof x === 'string' && allowed.has(x)) ? b.allergens : null;
  if (!name || nameFr === null || nameEn === null || !category || !basis || source === null || sourceId === null ||
      values.some((x) => x === null) || !allergens ||
      (b.ediblePortionPct !== undefined && b.ediblePortionPct !== '' && b.ediblePortionPct !== null && ediblePortionPct === null) ||
      (b.cookingYield !== undefined && b.cookingYield !== '' && b.cookingYield !== null && cookingYield === null)) {
    res.status(400).json({error:'أدخل الاسم والتصنيف والقيم والمصدر وحالة الوزن ومسببات الحساسية بشكل صحيح.'}); return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO foods (name_ar,name_fr,name_en,category,kcal_per_100,protein_per_100,carbs_per_100,fat_per_100,fiber_per_100,price_dzd_per_100,allergens,nutrition_verified,nutrition_basis,nutrition_source,source_record_id,edible_portion_pct,cooking_yield,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,$12,$13,$14,$15,$16,false) RETURNING id,name_ar,nutrition_verified,nutrition_basis,active',
      [name,nameFr || null,nameEn || null,category,...values,allergens,basis,source || null,sourceId || null,ediblePortionPct,cookingYield]
    );
    await audit(client,auth.id,'food.created','food',result.rows[0].id,{name,category,basis});
    await client.query('COMMIT');
    res.status(201).json({food:result.rows[0],note:'حُفظ العنصر كمسودة غير موثقة وغير نشطة.'});
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

app.patch('/api/admin/foods/:id/verification', authRequired, requireRole('admin'), asyncRoute(async (req,res) => {
  if (!isUuid(req.params.id)) { res.status(400).json({error:'معرّف المكوّن غير صالح.'}); return; }
  const auth = (req as AuthRequest).auth!;
  const verified = req.body?.verified;
  const basis = ['raw','cooked','as_sold','unspecified'].includes(req.body?.nutritionBasis) ? req.body.nutritionBasis : null;
  const source = cleanText(req.body?.nutritionSource ?? '',0,500);
  const sourceId = cleanText(req.body?.sourceRecordId ?? '',0,160);
  if (typeof verified !== 'boolean' || source === null || sourceId === null ||
      (verified && (!basis || basis === 'unspecified' || source.length < 3))) {
    res.status(400).json({error:'يتطلب اعتماد العنصر مصدرًا علميًا وحالة وزن محددة (نيء/مطبوخ/كما يباع).'}); return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'UPDATE foods SET nutrition_verified=$1,nutrition_basis=$2,nutrition_source=$3,source_record_id=$4,active=CASE WHEN $1=false THEN false ELSE active END,updated_at=now() WHERE id=$5 RETURNING id,nutrition_verified,nutrition_basis,active',
      [verified,basis ?? 'unspecified',source || null,sourceId || null,req.params.id]
    );
    if (!result.rowCount) { await client.query('ROLLBACK'); res.status(404).json({error:'العنصر غير موجود.'}); return; }
    await audit(client,auth.id,verified ? 'food.verified' : 'food.unverified','food',req.params.id,{basis,source});
    await client.query('COMMIT');
    res.json({food:result.rows[0]});
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

app.get('/api/admin/dishes', authRequired, requireRole('admin'), asyncRoute(async (_req,res) => {
  const result = await pool.query(
    "SELECT d.id,d.name_ar,d.description,d.active,COALESCE(json_agg(json_build_object('foodId',f.id,'name',f.name_ar,'grams',di.grams)) FILTER (WHERE f.id IS NOT NULL),'[]'::json) AS ingredients FROM dishes d LEFT JOIN dish_ingredients di ON di.dish_id=d.id LEFT JOIN foods f ON f.id=di.food_id GROUP BY d.id ORDER BY d.created_at DESC"
  );
  res.json({dishes:result.rows});
}));

app.patch('/api/admin/foods/:id/active', authRequired, requireRole('admin'), asyncRoute(async (req,res) => {
  if (!isUuid(req.params.id)) { res.status(400).json({error:'معرّف المكوّن غير صالح.'}); return; }
  const active = req.body?.active;
  if (typeof active !== 'boolean') { res.status(400).json({error:'قيمة التفعيل غير صالحة.'}); return; }
  const result = await pool.query(
    "UPDATE foods SET active=$1,updated_at=now() WHERE id=$2 AND ($1=false OR (nutrition_verified=true AND nutrition_basis<>'unspecified' AND length(trim(coalesce(nutrition_source,'')))>0)) RETURNING id,active",
    [active,req.params.id]
  );
  if (!result.rowCount) { res.status(409).json({error:'لا يمكن تفعيل عنصر غير موجود أو غير موثق غذائياً.'}); return; }
  res.json({food:result.rows[0]});
}));

app.post('/api/admin/dishes', authRequired, requireRole('admin'), asyncRoute(async (req,res) => {
  const name = cleanText(req.body?.name,2,160);
  const ingredients = req.body?.ingredients;
  if (!name || !Array.isArray(ingredients) || ingredients.length < 1 || ingredients.length > 30) {
    res.status(400).json({error:'اسم الطبق ومكوّناته مطلوبة.'}); return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dish = await client.query('INSERT INTO dishes (name_ar,description,active) VALUES ($1,$2,false) RETURNING id,name_ar,active',[name,cleanText(req.body?.description ?? '',0,500)]);
    for (const item of ingredients) {
      const grams = bounded(item?.grams,1,2000);
      if (!grams || !cleanText(item?.foodId,1,80)) throw new Error('INVALID_DISH_INGREDIENT');
      const food = await client.query(
        "SELECT id FROM foods WHERE id=$1 AND active=true AND nutrition_verified=true AND nutrition_basis<>'unspecified' AND length(trim(coalesce(nutrition_source,'')))>0",
        [item.foodId]
      );
      if (!food.rowCount) throw new Error('DISH_FOOD_UNVERIFIED');
      await client.query('INSERT INTO dish_ingredients (dish_id,food_id,grams) VALUES ($1,$2,$3)',[dish.rows[0].id,item.foodId,grams]);
    }
    await audit(client,(req as AuthRequest).auth!.id,'dish.created','dish',dish.rows[0].id);
    await client.query('COMMIT');
    res.status(201).json({dish:dish.rows[0],note:'الطبق غير نشط حتى مراجعته وتفعيله.'});
  } catch (error:any) {
    await client.query('ROLLBACK');
    if (error?.message === 'INVALID_DISH_INGREDIENT') { res.status(400).json({error:'أحد مكونات الطبق أو أوزانه غير صالح.'}); return; }
    if (error?.message === 'DISH_FOOD_UNVERIFIED') { res.status(409).json({error:'لا يمكن بناء وصفة من مكوّن غير موثق أو غير نشط.'}); return; }
    throw error;
  } finally { client.release(); }
}));

app.patch('/api/admin/dishes/:id/active', authRequired, requireRole('admin'), asyncRoute(async (req,res) => {
  if (!isUuid(req.params.id)) { res.status(400).json({error:'معرّف الطبق غير صالح.'}); return; }
  const active = req.body?.active;
  if (typeof active !== 'boolean') { res.status(400).json({error:'قيمة التفعيل غير صالحة.'}); return; }
  if (active) {
    const check = await pool.query(
      "SELECT count(*)::int AS total,count(*) FILTER (WHERE f.active=true AND f.nutrition_verified=true AND f.nutrition_basis<>'unspecified' AND length(trim(coalesce(f.nutrition_source,'')))>0)::int AS valid FROM dish_ingredients di JOIN foods f ON f.id=di.food_id WHERE di.dish_id=$1",
      [req.params.id]
    );
    if (!check.rows[0] || Number(check.rows[0].total) < 1 || Number(check.rows[0].total) !== Number(check.rows[0].valid)) {
      res.status(409).json({error:'لا يمكن تفعيل وصفة بلا مكونات موثقة ونشطة.'}); return;
    }
  }
  const result = await pool.query('UPDATE dishes SET active=$1 WHERE id=$2 RETURNING id,active',[active,req.params.id]);
  if (!result.rowCount) { res.status(404).json({error:'الطبق غير موجود.'}); return; }
  res.json({dish:result.rows[0]});
}));

app.get('/api/admin/zones', authRequired, requireRole('admin'), asyncRoute(async (_req,res) => {
  const result = await pool.query('SELECT * FROM delivery_zones ORDER BY created_at DESC');
  res.json({zones:result.rows});
}));

app.get('/api/admin/orders', authRequired, requireRole('admin'), asyncRoute(async (_req,res) => {
  const result = await pool.query(
    "SELECT o.id,o.order_number,o.delivery_date,o.delivery_zone_title,o.meal_count,o.total_dzd,o.order_status,o.production_stage,o.payment_status,o.customer_note,o.delivery_user_id,u.name AS customer_name,u.email AS customer_email,d.name AS delivery_user_name FROM customer_orders o JOIN app_users u ON u.id=o.customer_id LEFT JOIN app_users d ON d.id=o.delivery_user_id ORDER BY o.created_at DESC LIMIT 250"
  );
  const ids = result.rows.map((order) => order.id);
  const lines = ids.length ? await pool.query(
    "SELECT oi.*,COALESCE(json_agg(json_build_object('name',ii.food_name_snapshot,'grams',ii.grams,'basis',ii.nutrition_basis_snapshot,'source',ii.nutrition_source_snapshot)) FILTER (WHERE ii.id IS NOT NULL),'[]'::json) AS ingredients FROM order_items oi LEFT JOIN order_item_ingredients ii ON ii.order_item_id=oi.id WHERE oi.order_id=ANY($1::uuid[]) GROUP BY oi.id ORDER BY oi.slot,oi.id",
    [ids]
  ) : { rows:[] as any[] };
  const grouped = new Map<string,any[]>();
  for (const line of lines.rows) grouped.set(line.order_id,[...(grouped.get(line.order_id) ?? []),line]);
  res.json({orders:result.rows.map((order) => ({...order,items:grouped.get(order.id) ?? []}))});
}));

app.post('/api/admin/zones', authRequired, requireRole('admin'), asyncRoute(async (req,res) => {
  const title = cleanText(req.body?.title,2,120);
  const areas = cleanText(req.body?.areas,2,500);
  const hours = cleanText(req.body?.serviceHours,2,120);
  const fee = bounded(req.body?.feeDzd,0,100000);
  if (!title || !areas || !hours || fee === null) { res.status(400).json({error:'اسم المنطقة والأحياء وساعات الخدمة والرسوم مطلوبة.'}); return; }
  const result = await pool.query(
    'INSERT INTO delivery_zones (title,areas,service_hours,fee_dzd,active) VALUES ($1,$2,$3,$4,false) RETURNING *',
    [title,areas,hours,fee]
  );
  res.status(201).json({zone:result.rows[0],note:'أضيفت المنطقة متوقفة. فعّلها بعد اعتماد التغطية.'});
}));

app.patch('/api/admin/zones/:id', authRequired, requireRole('admin'), asyncRoute(async (req,res) => {
  if (!isUuid(req.params.id)) { res.status(400).json({error:'معرّف المنطقة غير صالح.'}); return; }
  const b = req.body ?? {};
  const current = await pool.query('SELECT * FROM delivery_zones WHERE id=$1',[req.params.id]);
  if (!current.rowCount) { res.status(404).json({error:'المنطقة غير موجودة.'}); return; }
  const old = current.rows[0];
  const title = b.title === undefined ? old.title : cleanText(b.title,2,120);
  const areas = b.areas === undefined ? old.areas : cleanText(b.areas,2,500);
  const hours = b.serviceHours === undefined ? old.service_hours : cleanText(b.serviceHours,2,120);
  const fee = b.feeDzd === undefined ? Number(old.fee_dzd) : bounded(b.feeDzd,0,100000);
  const active = b.active === undefined ? old.active : b.active;
  if (!title || !areas || !hours || fee === null || typeof active !== 'boolean') {
    res.status(400).json({error:'بيانات المنطقة غير صالحة.'}); return;
  }
  if (active && (areas.includes('غير معتمد') || hours.includes('تجريبي') || hours.includes('يُحدد'))) {
    res.status(409).json({error:'لا يمكن تفعيل نطاق تغطية تجريبي أو غير معتمد.'}); return;
  }
  const result = await pool.query(
    'UPDATE delivery_zones SET title=$1,areas=$2,service_hours=$3,fee_dzd=$4,active=$5 WHERE id=$6 RETURNING *',
    [title,areas,hours,fee,active,req.params.id]
  );
  res.json({zone:result.rows[0]});
}));

app.post('/api/admin/orders/:id/confirm', authRequired, requireRole('admin'), asyncRoute(async (req,res) => {
  if (!isUuid(req.params.id)) { res.status(400).json({error:'معرّف الطلب غير صالح.'}); return; }
  const auth = (req as AuthRequest).auth!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const config = await client.query('SELECT daily_capacity_boxes FROM pricing_config WHERE id=1 FOR UPDATE');
    const orderResult = await client.query("SELECT id,delivery_date,delivery_zone_id,meal_count FROM customer_orders WHERE id=$1 AND order_status='waitlisted' FOR UPDATE",[req.params.id]);
    if (!orderResult.rowCount) {
      await client.query('ROLLBACK'); res.status(404).json({error:'طلب الانتظار غير موجود.'}); return;
    }
    const order = orderResult.rows[0];
    const zone = await client.query('SELECT id FROM delivery_zones WHERE id=$1 AND active=true',[order.delivery_zone_id]);
    if (!zone.rowCount) {
      await client.query('ROLLBACK'); res.status(409).json({error:'منطقة الطلب لم تعد نشطة؛ راجعها قبل التأكيد.'}); return;
    }
    const capacity = await client.query("SELECT COALESCE(SUM(meal_count),0)::int AS used FROM customer_orders WHERE delivery_date=$1 AND order_status='confirmed'",[order.delivery_date]);
    const cap = Number(config.rows[0]?.daily_capacity_boxes ?? 0);
    if (cap < 1 || Number(capacity.rows[0].used) + Number(order.meal_count) > cap) {
      await client.query('ROLLBACK'); res.status(409).json({error:'لا توجد سعة كافية لتأكيد هذا الطلب بعد.'}); return;
    }
    await client.query("UPDATE customer_orders SET order_status='confirmed',production_stage='queued',updated_at=now() WHERE id=$1",[order.id]);
    await audit(client,auth.id,'order.confirmed_from_waitlist','customer_order',order.id);
    await client.query('COMMIT');
    res.json({confirmed:true});
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

app.post('/api/admin/orders/:id/cancel', authRequired, requireRole('admin'), asyncRoute(async (req,res) => {
  if (!isUuid(req.params.id)) { res.status(400).json({error:'معرّف الطلب غير صالح.'}); return; }
  const auth = (req as AuthRequest).auth!;
  const reason = cleanText(req.body?.reason ?? '',0,300) ?? '';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      "SELECT id,order_status,production_stage FROM customer_orders WHERE id=$1 FOR UPDATE",
      [req.params.id]
    );
    if (!found.rowCount) { await client.query('ROLLBACK'); res.status(404).json({error:'الطلب غير موجود.'}); return; }
    if (found.rows[0].order_status === 'cancelled') {
      await client.query('ROLLBACK'); res.status(409).json({error:'الطلب ملغى بالفعل.'}); return;
    }
    await client.query(
      "UPDATE customer_orders SET order_status='cancelled',production_stage=NULL,updated_at=now() WHERE id=$1",
      [req.params.id]
    );
    await audit(client,auth.id,'order.cancelled_by_admin','customer_order',req.params.id,{reason});
    await client.query('COMMIT');
    res.json({cancelled:true,id:req.params.id});
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

app.post('/api/admin/orders/:id/assign-delivery', authRequired, requireRole('admin'), asyncRoute(async (req,res) => {
  if (!isUuid(req.params.id)) { res.status(400).json({error:'معرّف الطلب غير صالح.'}); return; }
  const auth = (req as AuthRequest).auth!;
  const deliveryUserId = cleanText(req.body?.deliveryUserId,1,80);
  if (!deliveryUserId || !isUuid(deliveryUserId)) { res.status(400).json({error:'معرّف حساب التوصيل مطلوب وصالح.'}); return; }
  const driver = await pool.query("SELECT id FROM app_users WHERE id=$1 AND role='delivery'",[deliveryUserId]);
  if (!driver.rowCount) { res.status(404).json({error:'حساب التوصيل غير موجود.'}); return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "UPDATE customer_orders SET delivery_user_id=$1,updated_at=now() WHERE id=$2 AND order_status='confirmed' RETURNING id,delivery_user_id",
      [deliveryUserId,req.params.id]
    );
    if (!result.rowCount) { await client.query('ROLLBACK'); res.status(404).json({error:'الطلب غير موجود أو غير مؤكد.'}); return; }
    await audit(client,auth.id,'order.delivery_assigned','customer_order',req.params.id,{deliveryUserId});
    await client.query('COMMIT');
    res.json({assignment:result.rows[0]});
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

app.get('/api/delivery/orders', authRequired, requireRole('delivery'), asyncRoute(async (req,res) => {
  const auth = (req as AuthRequest).auth!;
  const result = await pool.query(
    "SELECT o.id,o.order_number,o.delivery_date,o.delivery_zone_title,o.production_stage,o.customer_note,o.total_dzd,o.payment_method,o.payment_status,u.name AS customer_name,(SELECT COALESCE(json_agg(json_build_object('label',oi.label,'grams',oi.grams,'slot_name',oi.slot_name)),'[]'::json) FROM order_items oi WHERE oi.order_id=o.id) AS items FROM customer_orders o JOIN app_users u ON u.id=o.customer_id WHERE o.delivery_user_id=$1 AND o.order_status='confirmed' ORDER BY o.delivery_date,o.created_at",
    [auth.id]
  );
  res.json({orders:result.rows});
}));

app.use('/api',(_req,res) => res.status(404).json({error:'مسار API غير موجود.'}));
app.use((error:any,_req:Request,res:Response,_next:NextFunction) => {
  if (Number(error?.status) >= 500 || !error?.status) console.error('[api-error]',error);
  res.status(Number(error?.status) || 500).json({error:'حدث خطأ داخلي. حاول لاحقاً.'});
});
const here = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.resolve(here,'../dist')));
app.get('*',(_req,res) => res.sendFile(path.resolve(here,'../dist/index.html')));
const server = app.listen(PORT,() => console.log('NutriFit API listening on port ' + PORT));
async function shutdown() { server.close(); await pool.end(); process.exit(0); }
process.on('SIGTERM',() => { void shutdown(); });
process.on('SIGINT',() => { void shutdown(); });
