CREATE TABLE `abstracts_of_canvass` (
	`id` int AUTO_INCREMENT NOT NULL,
	`abstractNumber` varchar(40) NOT NULL,
	`preCanvassId` int NOT NULL,
	`recommendedSupplierId` int NOT NULL,
	`recommendationReason` text NOT NULL,
	`status` enum('recommended','approved','rejected') NOT NULL DEFAULT 'recommended',
	`preparedById` int NOT NULL,
	`decidedById` int,
	`decisionRemarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `abstracts_of_canvass_id` PRIMARY KEY(`id`),
	CONSTRAINT `abstracts_of_canvass_abstractNumber_unique` UNIQUE(`abstractNumber`),
	CONSTRAINT `abstracts_of_canvass_preCanvassId_unique` UNIQUE(`preCanvassId`)
);
--> statement-breakpoint
CREATE TABLE `delivery_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`receiptNumber` varchar(40) NOT NULL,
	`deliveredAt` timestamp NOT NULL DEFAULT (now()),
	`receivedById` int NOT NULL,
	`remarks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `delivery_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_receipts_purchaseOrderId_unique` UNIQUE(`purchaseOrderId`),
	CONSTRAINT `delivery_receipts_receiptNumber_unique` UNIQUE(`receiptNumber`)
);
--> statement-breakpoint
CREATE TABLE `pmr_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`pmrNumber` varchar(40) NOT NULL,
	`remarks` text,
	`loggedById` int NOT NULL,
	`loggedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pmr_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `pmr_logs_purchaseOrderId_unique` UNIQUE(`purchaseOrderId`),
	CONSTRAINT `pmr_logs_pmrNumber_unique` UNIQUE(`pmrNumber`)
);
--> statement-breakpoint
CREATE TABLE `pre_canvass_quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`preCanvassId` int NOT NULL,
	`supplierId` int NOT NULL,
	`totalPrice` decimal(14,2) NOT NULL,
	`deliveryDays` int NOT NULL,
	`isCompliant` int NOT NULL DEFAULT 1,
	`notes` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pre_canvass_quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `pre_canvass_quote_supplier_unique` UNIQUE(`preCanvassId`,`supplierId`)
);
--> statement-breakpoint
CREATE TABLE `pre_canvasses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`preCanvassNumber` varchar(40) NOT NULL,
	`purchaseRequestId` int NOT NULL,
	`status` enum('draft','submitted','reviewed','abstracted','approved','rejected') NOT NULL DEFAULT 'draft',
	`preparedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pre_canvasses_id` PRIMARY KEY(`id`),
	CONSTRAINT `pre_canvasses_preCanvassNumber_unique` UNIQUE(`preCanvassNumber`),
	CONSTRAINT `pre_canvasses_purchaseRequestId_unique` UNIQUE(`purchaseRequestId`)
);
--> statement-breakpoint
ALTER TABLE `audit_trails` MODIFY COLUMN `performedByRole` enum('user','end_user','procurement_officer','administrative_approver','admin','bac','supply_officer','budget_officer') NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_orders` MODIFY COLUMN `rfqId` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` MODIFY COLUMN `status` enum('draft','procurement_review','approval_review','approved','rejected','po_issued','delivered','pmr_logged','closed','budget_review','supply_review','bac_review','returned','rfq','po') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','end_user','procurement_officer','administrative_approver','admin','bac','supply_officer','budget_officer') NOT NULL DEFAULT 'end_user';--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `preCanvassId` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `ppmpEntryId` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `procurementReviewedById` int;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `administrativeApprovedById` int;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_preCanvassId_unique` UNIQUE(`preCanvassId`);