CREATE TABLE `test_record_archives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ppmpEntryId` int NOT NULL,
	`archivedById` int NOT NULL,
	`archiveReason` text NOT NULL,
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	`cleanedAt` timestamp,
	CONSTRAINT `test_record_archives_id` PRIMARY KEY(`id`),
	CONSTRAINT `test_record_archives_ppmpEntryId_unique` UNIQUE(`ppmpEntryId`)
);
--> statement-breakpoint
CREATE INDEX `test_record_archive_status_idx` ON `test_record_archives` (`cleanedAt`,`archivedAt`);