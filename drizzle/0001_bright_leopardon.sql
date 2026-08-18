CREATE TABLE `app_ppmp_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fiscalYear` int NOT NULL,
	`officeId` int NOT NULL,
	`objectOfExpenditureId` int NOT NULL,
	`description` text NOT NULL,
	`plannedAmount` decimal(14,2) NOT NULL,
	`actualAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`status` enum('draft','submitted','approved','monitored') NOT NULL DEFAULT 'draft',
	`preparedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_ppmp_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_trails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`performedById` int NOT NULL,
	`performedByRole` enum('user','end_user','bac','supply_officer','budget_officer','admin') NOT NULL,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_trails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_allotments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`officeId` int NOT NULL,
	`objectOfExpenditureId` int NOT NULL,
	`fiscalYear` int NOT NULL,
	`allottedAmount` decimal(14,2) NOT NULL,
	`committedAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budget_allotments_id` PRIMARY KEY(`id`),
	CONSTRAINT `budget_allotment_office_object_year_unique` UNIQUE(`officeId`,`objectOfExpenditureId`,`fiscalYear`)
);
--> statement-breakpoint
CREATE TABLE `objects_of_expenditure` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(180) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `objects_of_expenditure_id` PRIMARY KEY(`id`),
	CONSTRAINT `objects_of_expenditure_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `offices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `offices_id` PRIMARY KEY(`id`),
	CONSTRAINT `offices_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poNumber` varchar(40) NOT NULL,
	`purchaseRequestId` int NOT NULL,
	`rfqId` int NOT NULL,
	`supplierId` int NOT NULL,
	`totalAmount` decimal(14,2) NOT NULL,
	`status` enum('draft','pending_approval','approved','issued','delivered','closed') NOT NULL DEFAULT 'draft',
	`generatedById` int NOT NULL,
	`approvedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_poNumber_unique` UNIQUE(`poNumber`),
	CONSTRAINT `purchase_orders_purchaseRequestId_unique` UNIQUE(`purchaseRequestId`),
	CONSTRAINT `purchase_orders_rfqId_unique` UNIQUE(`rfqId`)
);
--> statement-breakpoint
CREATE TABLE `purchase_request_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseRequestId` int NOT NULL,
	`description` text NOT NULL,
	`specification` text,
	`quantity` decimal(12,2) NOT NULL,
	`unit` varchar(40) NOT NULL,
	`estimatedUnitCost` decimal(14,2) NOT NULL,
	`totalCost` decimal(14,2) NOT NULL,
	CONSTRAINT `purchase_request_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prNumber` varchar(40) NOT NULL,
	`purpose` text NOT NULL,
	`fundSource` varchar(160),
	`officeId` int NOT NULL,
	`objectOfExpenditureId` int NOT NULL,
	`totalEstimate` decimal(14,2) NOT NULL,
	`status` enum('draft','budget_review','supply_review','bac_review','approved','returned','rfq','po','closed') NOT NULL DEFAULT 'draft',
	`requestedById` int NOT NULL,
	`budgetReviewedById` int,
	`supplyReviewedById` int,
	`bacReviewedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`submittedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_requests_prNumber_unique` UNIQUE(`prNumber`)
);
--> statement-breakpoint
CREATE TABLE `quotation_abstracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfqId` int NOT NULL,
	`recommendedSupplierId` int NOT NULL,
	`recommendationReason` text NOT NULL,
	`status` enum('draft','recommended','approved','rejected') NOT NULL DEFAULT 'draft',
	`preparedById` int NOT NULL,
	`approvedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotation_abstracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotation_abstracts_rfqId_unique` UNIQUE(`rfqId`)
);
--> statement-breakpoint
CREATE TABLE `rfqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfqNumber` varchar(40) NOT NULL,
	`purchaseRequestId` int NOT NULL,
	`status` enum('draft','canvass','abstracted','approved','closed') NOT NULL DEFAULT 'draft',
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rfqs_id` PRIMARY KEY(`id`),
	CONSTRAINT `rfqs_rfqNumber_unique` UNIQUE(`rfqNumber`),
	CONSTRAINT `rfqs_purchaseRequestId_unique` UNIQUE(`purchaseRequestId`)
);
--> statement-breakpoint
CREATE TABLE `supplier_quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfqId` int NOT NULL,
	`supplierId` int NOT NULL,
	`totalPrice` decimal(14,2) NOT NULL,
	`deliveryDays` int NOT NULL,
	`isCompliant` int NOT NULL DEFAULT 1,
	`notes` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_quotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_quote_rfq_supplier_unique` UNIQUE(`rfqId`,`supplierId`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierCode` varchar(40) NOT NULL,
	`companyName` varchar(180) NOT NULL,
	`contactPerson` varchar(140),
	`email` varchar(320),
	`phone` varchar(80),
	`address` text,
	`offerings` text,
	`accreditationStatus` enum('pending','accredited','suspended') NOT NULL DEFAULT 'pending',
	`isActive` int NOT NULL DEFAULT 1,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_supplierCode_unique` UNIQUE(`supplierCode`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','end_user','bac','supply_officer','budget_officer','admin') NOT NULL DEFAULT 'end_user';--> statement-breakpoint
CREATE INDEX `app_ppmp_office_year_idx` ON `app_ppmp_entries` (`officeId`,`fiscalYear`);--> statement-breakpoint
CREATE INDEX `audit_entity_created_idx` ON `audit_trails` (`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `budget_allotment_office_year_idx` ON `budget_allotments` (`officeId`,`fiscalYear`);--> statement-breakpoint
CREATE INDEX `pr_item_pr_idx` ON `purchase_request_items` (`purchaseRequestId`);--> statement-breakpoint
CREATE INDEX `pr_requester_status_idx` ON `purchase_requests` (`requestedById`,`status`);--> statement-breakpoint
CREATE INDEX `pr_office_status_idx` ON `purchase_requests` (`officeId`,`status`);--> statement-breakpoint
CREATE INDEX `supplier_company_idx` ON `suppliers` (`companyName`);