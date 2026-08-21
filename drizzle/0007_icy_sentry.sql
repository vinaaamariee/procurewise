CREATE TABLE `bac_transmittals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transmittalNumber` varchar(48) NOT NULL,
	`purchaseRequestId` int,
	`fromOffice` varchar(180) NOT NULL,
	`toOffice` varchar(180) NOT NULL,
	`subject` varchar(220) NOT NULL,
	`remarks` text,
	`status` enum('draft','sent','acknowledged') NOT NULL DEFAULT 'draft',
	`preparedById` int NOT NULL,
	`sentAt` timestamp,
	`acknowledgedByName` varchar(180),
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bac_transmittals_id` PRIMARY KEY(`id`),
	CONSTRAINT `bac_transmittals_transmittalNumber_unique` UNIQUE(`transmittalNumber`)
);
--> statement-breakpoint
CREATE TABLE `historical_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemDescription` varchar(220) NOT NULL,
	`unit` varchar(40) NOT NULL,
	`unitPrice` decimal(14,2) NOT NULL,
	`supplierId` int,
	`purchaseOrderId` int,
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`recordedById` int NOT NULL,
	CONSTRAINT `historical_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `letters_of_notice` (
	`id` int AUTO_INCREMENT NOT NULL,
	`noticeNumber` varchar(48) NOT NULL,
	`noticeType` enum('award','disqualification','clarification','other') NOT NULL DEFAULT 'other',
	`purchaseRequestId` int,
	`supplierId` int,
	`subject` varchar(220) NOT NULL,
	`body` text NOT NULL,
	`status` enum('draft','issued','cancelled') NOT NULL DEFAULT 'draft',
	`issuedById` int NOT NULL,
	`issuedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `letters_of_notice_id` PRIMARY KEY(`id`),
	CONSTRAINT `letters_of_notice_noticeNumber_unique` UNIQUE(`noticeNumber`)
);
--> statement-breakpoint
CREATE TABLE `mcdm_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`preCanvassId` int NOT NULL,
	`recommendedSupplierId` int NOT NULL,
	`priceScore` decimal(7,2) NOT NULL,
	`deliveryScore` decimal(7,2) NOT NULL,
	`complianceScore` decimal(7,2) NOT NULL,
	`totalScore` decimal(7,2) NOT NULL,
	`rationale` text NOT NULL,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mcdm_recommendations_id` PRIMARY KEY(`id`),
	CONSTRAINT `mcdm_recommendations_preCanvassId_unique` UNIQUE(`preCanvassId`)
);
--> statement-breakpoint
CREATE TABLE `supplier_evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`purchaseOrderId` int,
	`qualityScore` int NOT NULL,
	`deliveryScore` int NOT NULL,
	`pricingScore` int NOT NULL,
	`complianceScore` int NOT NULL,
	`remarks` text,
	`evaluatedById` int NOT NULL,
	`evaluatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_evaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `procurement_settings` ADD `defaultNoticeSignatory` varchar(180);--> statement-breakpoint
ALTER TABLE `procurement_settings` ADD `sessionTimeoutMinutes` int DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `procurement_settings` ADD `enableInAppNotifications` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `procurement_settings` ADD `notificationRefreshSeconds` int DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `trackingToken` varchar(48);--> statement-breakpoint
UPDATE `purchase_requests` SET `trackingToken` = REPLACE(UUID(), '-', '') WHERE `trackingToken` IS NULL;--> statement-breakpoint
ALTER TABLE `purchase_requests` MODIFY COLUMN `trackingToken` varchar(48) NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_trackingToken_unique` UNIQUE(`trackingToken`);--> statement-breakpoint
CREATE INDEX `transmittal_pr_created_idx` ON `bac_transmittals` (`purchaseRequestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `historical_price_item_observed_idx` ON `historical_prices` (`itemDescription`,`observedAt`);--> statement-breakpoint
CREATE INDEX `notice_pr_created_idx` ON `letters_of_notice` (`purchaseRequestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `supplier_evaluation_supplier_date_idx` ON `supplier_evaluations` (`supplierId`,`evaluatedAt`);
