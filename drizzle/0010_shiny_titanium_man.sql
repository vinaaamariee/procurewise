CREATE TABLE `procurement_catalog_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`catalogItemId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `procurement_catalog_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `procurement_catalog_favorite_user_item_unique` UNIQUE(`userId`,`catalogItemId`)
);
--> statement-breakpoint
CREATE INDEX `procurement_catalog_favorite_user_idx` ON `procurement_catalog_favorites` (`userId`);--> statement-breakpoint
CREATE INDEX `procurement_catalog_favorite_item_idx` ON `procurement_catalog_favorites` (`catalogItemId`);
