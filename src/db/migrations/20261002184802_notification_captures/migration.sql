CREATE TABLE `notification_captures` (
	`id` text PRIMARY KEY,
	`package_name` text NOT NULL,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`posted_at` text NOT NULL,
	`date` text NOT NULL,
	`amount_cents` integer,
	`merchant` text,
	`category_id` text,
	`is_expense_candidate` integer NOT NULL,
	`ignore_reason` text,
	`expense_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `fk_notification_captures_expense_id_expenses_id_fk` FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `notification_captures_date_idx` ON `notification_captures` (`date`);--> statement-breakpoint
CREATE INDEX `notification_captures_package_idx` ON `notification_captures` (`package_name`);