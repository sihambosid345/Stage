-- Align licenses table with schema (CIMR flag + regimes from license).
-- IF NOT EXISTS keeps this safe if a database was already updated via db push.

ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "cimrEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "availableRegimes" TEXT[] NOT NULL DEFAULT ARRAY['MOROCCO_STANDARD']::TEXT[];
