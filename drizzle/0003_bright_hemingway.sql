ALTER TABLE `abstracts_of_canvass` ADD `openingDate` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `abstracts_of_canvass` ADD `openingLocation` varchar(160) DEFAULT 'Basco, Batanes' NOT NULL;--> statement-breakpoint
ALTER TABLE `abstracts_of_canvass` ADD `procurementCategory` varchar(120) DEFAULT 'Supplies and materials' NOT NULL;--> statement-breakpoint
ALTER TABLE `app_ppmp_entries` ADD `papCode` varchar(80);--> statement-breakpoint
ALTER TABLE `app_ppmp_entries` ADD `projectTitle` varchar(220);--> statement-breakpoint
ALTER TABLE `app_ppmp_entries` ADD `modeOfProcurement` varchar(120) DEFAULT 'Small Value Procurement';--> statement-breakpoint
ALTER TABLE `app_ppmp_entries` ADD `fundSource` varchar(160);--> statement-breakpoint
ALTER TABLE `app_ppmp_entries` ADD `procurementSchedule` text;--> statement-breakpoint
ALTER TABLE `app_ppmp_entries` ADD `remarks` text;--> statement-breakpoint
ALTER TABLE `delivery_receipts` ADD `receivedByName` varchar(180);--> statement-breakpoint
ALTER TABLE `delivery_receipts` ADD `deliveryStatus` enum('complete','partial') DEFAULT 'complete' NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_receipts` ADD `signatureReference` text;--> statement-breakpoint
ALTER TABLE `pre_canvass_quotes` ADD `quotationReference` varchar(80);--> statement-breakpoint
ALTER TABLE `pre_canvass_quotes` ADD `supplierRepresentative` varchar(160);--> statement-breakpoint
ALTER TABLE `pre_canvass_quotes` ADD `acknowledgedAt` timestamp;--> statement-breakpoint
ALTER TABLE `pre_canvass_quotes` ADD `receivedBy` varchar(160);--> statement-breakpoint
ALTER TABLE `pre_canvasses` ADD `approvedBudget` decimal(14,2);--> statement-breakpoint
ALTER TABLE `pre_canvasses` ADD `quotationDeadline` timestamp;--> statement-breakpoint
ALTER TABLE `pre_canvasses` ADD `deliveryPeriodDays` int;--> statement-breakpoint
ALTER TABLE `pre_canvasses` ADD `priceEvaluationMode` varchar(80) DEFAULT 'lot_basis';--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `placeOfDelivery` varchar(220);--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `deliveryTerm` varchar(120) DEFAULT 'FOB Destination';--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `paymentTerm` varchar(160) DEFAULT '15 days upon complete delivery';--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `modeOfProcurement` varchar(120);--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `fundCluster` varchar(80);--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `orsBursNumber` varchar(80);--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `fundsAvailable` decimal(14,2);--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `authorizedOfficialName` varchar(180);--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `authorizedOfficialDesignation` varchar(160);--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `chiefAccountantName` varchar(180);--> statement-breakpoint
ALTER TABLE `purchase_request_items` ADD `stockPropertyNo` varchar(80);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `entityName` varchar(180) DEFAULT 'Batanes State College' NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `fundCluster` varchar(80) DEFAULT '01101101' NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `responsibilityCenterCode` varchar(80);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `requesterDesignation` varchar(160);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `tin` varchar(80);