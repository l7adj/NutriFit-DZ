ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS lbm_kg NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS lbm_reliability_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS lbm_method TEXT NOT NULL DEFAULT 'none';

ALTER TABLE customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_lbm_method_check;
ALTER TABLE customer_profiles
  ADD CONSTRAINT customer_profiles_lbm_method_check
  CHECK (lbm_method IN ('none','dexa','inbody','other'));

ALTER TABLE customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_lbm_kg_check;
ALTER TABLE customer_profiles
  ADD CONSTRAINT customer_profiles_lbm_kg_check
  CHECK (lbm_kg IS NULL OR lbm_kg BETWEEN 1 AND 300);

ALTER TABLE customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_lbm_reliability_pct_check;
ALTER TABLE customer_profiles
  ADD CONSTRAINT customer_profiles_lbm_reliability_pct_check
  CHECK (lbm_reliability_pct IS NULL OR lbm_reliability_pct BETWEEN 0 AND 100);

ALTER TABLE customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profile_lbm_not_above_weight;
ALTER TABLE customer_profiles
  ADD CONSTRAINT customer_profile_lbm_not_above_weight
  CHECK (lbm_kg IS NULL OR weight_kg IS NULL OR lbm_kg <= weight_kg);
