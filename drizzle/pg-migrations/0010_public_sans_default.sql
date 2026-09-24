ALTER TABLE "procurewise"."procurement_settings" ALTER COLUMN "appearanceFont" SET DEFAULT 'public_sans';
UPDATE "procurewise"."procurement_settings" SET "appearanceFont" = 'public_sans' WHERE "appearanceFont" IS NULL OR "appearanceFont" = 'system';
