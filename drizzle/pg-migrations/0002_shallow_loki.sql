ALTER TABLE "supplier_evaluations" ADD COLUMN "purchaseRequestId" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "officeId" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "evaluationAudience" varchar(32) DEFAULT 'procurement_office' NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "goodsServicesType" varchar(220);--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "supplierRegistryReference" varchar(160);--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "supplierRegistryRegisteredAt" timestamp;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "supplierRegistryExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "responseScores" json;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "respondentName" varchar(180);--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "respondentSignedAt" timestamp;