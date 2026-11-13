ALTER TABLE order_item_ingredients
  ADD COLUMN IF NOT EXISTS nutrition_basis_snapshot TEXT NOT NULL DEFAULT 'unspecified',
  ADD COLUMN IF NOT EXISTS nutrition_source_snapshot TEXT;

ALTER TABLE order_item_ingredients
  DROP CONSTRAINT IF EXISTS order_item_ingredients_basis_snapshot_check;
ALTER TABLE order_item_ingredients
  ADD CONSTRAINT order_item_ingredients_basis_snapshot_check
  CHECK (nutrition_basis_snapshot IN ('raw','cooked','as_sold','unspecified'));

CREATE INDEX IF NOT EXISTS idx_order_ingredients_food_snapshot
  ON order_item_ingredients(food_id);
