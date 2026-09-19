CREATE TABLE `supplier_tag_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`supplierTagId` int NOT NULL,
	`assignedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_tag_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_tag_assignment_unique` UNIQUE(`supplierId`,`supplierTagId`)
);
--> statement-breakpoint
CREATE TABLE `supplier_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` varchar(320),
	`isActive` int NOT NULL DEFAULT 1,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE INDEX `supplier_tag_assignment_supplier_idx` ON `supplier_tag_assignments` (`supplierId`);--> statement-breakpoint
CREATE INDEX `supplier_tag_assignment_tag_idx` ON `supplier_tag_assignments` (`supplierTagId`);--> statement-breakpoint
CREATE INDEX `supplier_tag_active_idx` ON `supplier_tags` (`isActive`);