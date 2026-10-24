ALTER TABLE "merchant_users" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'merchant_users_language_check' AND conrelid = 'merchant_users'::regclass) THEN
    ALTER TABLE "merchant_users" ADD CONSTRAINT "merchant_users_language_check" CHECK ("language" IN ('en', 'sw'));
  END IF;
END $$;
