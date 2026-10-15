ALTER TABLE "procurewise"."letters_of_notice"
  ADD COLUMN IF NOT EXISTS "servedById" integer,
  ADD COLUMN IF NOT EXISTS "servedAt" timestamp,
  ADD COLUMN IF NOT EXISTS "recipientName" varchar(180),
  ADD COLUMN IF NOT EXISTS "deliveryMode" varchar(32),
  ADD COLUMN IF NOT EXISTS "serviceRemarks" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'letters_of_notice_servedById_users_id_fk'
  ) THEN
    ALTER TABLE "procurewise"."letters_of_notice"
      ADD CONSTRAINT "letters_of_notice_servedById_users_id_fk"
      FOREIGN KEY ("servedById") REFERENCES "procurewise"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
