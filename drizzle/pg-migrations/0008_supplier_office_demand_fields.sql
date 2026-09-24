ALTER TABLE "procurewise"."users" ADD COLUMN IF NOT EXISTS "officeName" varchar(180);
ALTER TABLE "procurewise"."suppliers" ADD COLUMN IF NOT EXISTS "philgepsRegistrationNumber" varchar(120);
ALTER TABLE "procurewise"."suppliers" ADD COLUMN IF NOT EXISTS "philgepsRegistrationDate" timestamp;
ALTER TABLE "procurewise"."suppliers" ADD COLUMN IF NOT EXISTS "philgepsExpirationDate" timestamp;
ALTER TABLE "procurewise"."letters_of_notice" ADD COLUMN IF NOT EXISTS "demandDueDate" timestamp;
ALTER TABLE "procurewise"."letters_of_notice" ADD COLUMN IF NOT EXISTS "demandReminderDate" timestamp;
ALTER TABLE "procurewise"."letters_of_notice" ADD COLUMN IF NOT EXISTS "demandReminderSentAt" timestamp;
CREATE INDEX IF NOT EXISTS "supplier_philgeps_expiration_idx" ON "procurewise"."suppliers" USING btree ("philgepsExpirationDate");
CREATE INDEX IF NOT EXISTS "notice_demand_reminder_idx" ON "procurewise"."letters_of_notice" USING btree ("demandReminderDate", "demandReminderSentAt");
