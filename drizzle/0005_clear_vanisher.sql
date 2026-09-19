CREATE TABLE `procurement_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('purchase_request','pre_canvass','pre_canvass_quote','abstract_of_canvass','purchase_order','delivery_receipt','pmr_log') NOT NULL,
	`entityId` int NOT NULL,
	`documentType` varchar(80) NOT NULL,
	`originalFileName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(512) NOT NULL,
	`fileSize` int NOT NULL,
	`uploadedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `procurement_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `procurement_documents_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `procurement_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityName` varchar(180) NOT NULL DEFAULT 'Batanes State College',
	`authorizedOfficialName` varchar(180),
	`authorizedOfficialDesignation` varchar(160),
	`chiefAccountantName` varchar(180),
	`updatedById` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `procurement_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_corrections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('purchase_request','pre_canvass','abstract_of_canvass') NOT NULL,
	`entityId` int NOT NULL,
	`requestedById` int NOT NULL,
	`assignedToId` int NOT NULL,
	`reason` text NOT NULL,
	`status` enum('open','resubmitted','resolved') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `workflow_corrections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientUserId` int NOT NULL,
	`kind` enum('action_required','status_change','correction','document') NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `document_entity_created_idx` ON `procurement_documents` (`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `document_uploader_created_idx` ON `procurement_documents` (`uploadedById`,`createdAt`);--> statement-breakpoint
CREATE INDEX `correction_entity_created_idx` ON `workflow_corrections` (`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `correction_assignee_status_idx` ON `workflow_corrections` (`assignedToId`,`status`);--> statement-breakpoint
CREATE INDEX `notification_recipient_read_created_idx` ON `workflow_notifications` (`recipientUserId`,`readAt`,`createdAt`);