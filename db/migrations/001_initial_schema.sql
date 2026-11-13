CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin','kitchen','delivery')),
  allergens TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name_ar TEXT NOT NULL,
  name_fr TEXT,
  name_en TEXT,
  category TEXT NOT NULL CHECK (category IN ('protein','carb','fat','veg','juice')),
  kcal_per_100 NUMERIC(8,2) NOT NULL CHECK (kcal_per_100 >= 0),
  protein_per_100 NUMERIC(8,2) NOT NULL CHECK (protein_per_100 >= 0),
  carbs_per_100 NUMERIC(8,2) NOT NULL CHECK (carbs_per_100 >= 0),
  fat_per_100 NUMERIC(8,2) NOT NULL CHECK (fat_per_100 >= 0),
  fiber_per_100 NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (fiber_per_100 >= 0),
  price_dzd_per_100 NUMERIC(10,2) NOT NULL CHECK (price_dzd_per_100 >= 0),
  allergens TEXT[] NOT NULL DEFAULT '{}',
  nutrition_verified BOOLEAN NOT NULL DEFAULT false,
  nutrition_basis TEXT NOT NULL DEFAULT 'unspecified' CHECK (nutrition_basis IN ('raw','cooked','as_sold','unspecified')),
  nutrition_source TEXT,
  source_record_id TEXT,
  edible_portion_pct NUMERIC(5,2) CHECK (edible_portion_pct BETWEEN 0 AND 100),
  cooking_yield NUMERIC(7,4) CHECK (cooking_yield > 0),
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    NOT nutrition_verified OR (
      nutrition_basis <> 'unspecified'
      AND length(trim(coalesce(nutrition_source,''))) > 0
    )
  )
);

CREATE TABLE IF NOT EXISTS dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dish_ingredients (
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE RESTRICT,
  grams NUMERIC(9,2) NOT NULL CHECK (grams > 0),
  PRIMARY KEY (dish_id, food_id)
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  areas TEXT NOT NULL,
  service_hours TEXT NOT NULL,
  fee_dzd NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (fee_dzd >= 0),
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pricing_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  handling_pct NUMERIC(5,2) NOT NULL DEFAULT 7 CHECK (handling_pct BETWEEN 0 AND 100),
  service_fee_per_meal NUMERIC(10,2) NOT NULL DEFAULT 200 CHECK (service_fee_per_meal >= 0),
  cutoff_hour SMALLINT NOT NULL DEFAULT 16 CHECK (cutoff_hour BETWEEN 8 AND 23),
  daily_capacity_boxes INTEGER NOT NULL DEFAULT 0 CHECK (daily_capacity_boxes >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO pricing_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  sex TEXT CHECK (sex IN ('m','f')),
  age SMALLINT CHECK (age BETWEEN 18 AND 100),
  height_cm NUMERIC(5,1) CHECK (height_cm BETWEEN 120 AND 230),
  weight_kg NUMERIC(6,2) CHECK (weight_kg BETWEEN 30 AND 300),
  target_weight_kg NUMERIC(6,2),
  activity_band TEXT CHECK (activity_band IN ('S','L','A','V')),
  pal NUMERIC(4,2),
  goal TEXT CHECK (goal IN ('bulk','cut','recomp','perf')),
  goal_adjustment_pct NUMERIC(5,2) CHECK (goal_adjustment_pct BETWEEN -25 AND 25),
  health_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  profile_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  delivery_date DATE NOT NULL,
  delivery_zone_id UUID NOT NULL REFERENCES delivery_zones(id) ON DELETE RESTRICT,
  delivery_zone_title TEXT NOT NULL,
  delivery_fee_dzd NUMERIC(10,2) NOT NULL,
  meal_count SMALLINT NOT NULL CHECK (meal_count BETWEEN 1 AND 8),
  customer_note TEXT NOT NULL DEFAULT '',
  ingredient_cost_dzd NUMERIC(12,2) NOT NULL,
  handling_fee_dzd NUMERIC(12,2) NOT NULL,
  service_fee_dzd NUMERIC(12,2) NOT NULL,
  total_dzd NUMERIC(12,2) NOT NULL,
  kcal_total NUMERIC(12,2) NOT NULL,
  protein_total NUMERIC(12,2) NOT NULL,
  carbs_total NUMERIC(12,2) NOT NULL,
  fat_total NUMERIC(12,2) NOT NULL,
  order_status TEXT NOT NULL CHECK (order_status IN ('confirmed','waitlisted','cancelled')),
  production_stage TEXT CHECK (production_stage IN ('queued','preparing','packed','out_for_delivery','delivered')),
  payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 0 AND 7),
  slot_name TEXT NOT NULL,
  label TEXT NOT NULL,
  grams NUMERIC(9,2) NOT NULL,
  kcal NUMERIC(10,2) NOT NULL,
  protein NUMERIC(10,2) NOT NULL,
  carbs NUMERIC(10,2) NOT NULL,
  fat NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  food_id UUID REFERENCES foods(id) ON DELETE SET NULL,
  food_name_snapshot TEXT NOT NULL,
  grams NUMERIC(9,2) NOT NULL,
  unit_price_snapshot NUMERIC(10,2) NOT NULL,
  kcal_snapshot NUMERIC(10,2) NOT NULL,
  protein_snapshot NUMERIC(10,2) NOT NULL,
  carbs_snapshot NUMERIC(10,2) NOT NULL,
  fat_snapshot NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON customer_orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON customer_orders(delivery_date, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_production ON customer_orders(production_stage, delivery_date);
CREATE INDEX IF NOT EXISTS idx_foods_active_verified ON foods(active, nutrition_verified);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);
