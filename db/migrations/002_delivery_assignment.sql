ALTER TABLE customer_orders
  ADD COLUMN IF NOT EXISTS delivery_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_user
  ON customer_orders(delivery_user_id, delivery_date);
