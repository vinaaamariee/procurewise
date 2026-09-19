CREATE TABLE `procurement_catalog_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(80) NOT NULL DEFAULT 'PhilGEPS common-use supplies and equipment',
	`productCode` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`unit` varchar(40),
	`referencePrice` decimal(14,2) NOT NULL,
	`remarks` text,
	`imageUrl` varchar(500),
	`sourceAsOfDate` varchar(40) NOT NULL DEFAULT '2026-08-17',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `procurement_catalog_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `procurement_catalog_items_productCode_unique` UNIQUE(`productCode`)
);
--> statement-breakpoint
ALTER TABLE `app_ppmp_entries` ADD `catalogItemId` int;--> statement-breakpoint
ALTER TABLE `purchase_request_items` ADD `catalogItemId` int;--> statement-breakpoint
CREATE INDEX `procurement_catalog_active_idx` ON `procurement_catalog_items` (`isActive`);--> statement-breakpoint
CREATE INDEX `pr_item_catalog_idx` ON `purchase_request_items` (`catalogItemId`);
