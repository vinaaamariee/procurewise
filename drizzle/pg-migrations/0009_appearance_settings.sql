ALTER TABLE "procurewise"."procurement_settings" ADD COLUMN IF NOT EXISTS "appearanceTheme" varchar(32) DEFAULT 'light' NOT NULL;
ALTER TABLE "procurewise"."procurement_settings" ADD COLUMN IF NOT EXISTS "appearanceFont" varchar(40) DEFAULT 'public_sans' NOT NULL;
ALTER TABLE "procurewise"."procurement_settings" ADD COLUMN IF NOT EXISTS "appearanceFontScale" varchar(16) DEFAULT '100' NOT NULL;
ALTER TABLE "procurewise"."procurement_settings" ADD COLUMN IF NOT EXISTS "appearanceDensity" varchar(16) DEFAULT 'comfortable' NOT NULL;
ALTER TABLE "procurewise"."procurement_settings" ADD COLUMN IF NOT EXISTS "appearanceAccent" varchar(16) DEFAULT 'maroon' NOT NULL;
ALTER TABLE "procurewise"."procurement_settings" ADD COLUMN IF NOT EXISTS "appearanceCorners" varchar(16) DEFAULT 'sharp' NOT NULL;
ALTER TABLE "procurewise"."procurement_settings" ADD COLUMN IF NOT EXISTS "appearanceReducedMotion" integer DEFAULT 0 NOT NULL;
ALTER TABLE "procurewise"."procurement_settings" ALTER COLUMN "appearanceFont" SET DEFAULT 'public_sans';
UPDATE "procurewise"."procurement_settings" SET "appearanceFont" = 'public_sans' WHERE "appearanceFont" IS NULL OR "appearanceFont" = 'system';
