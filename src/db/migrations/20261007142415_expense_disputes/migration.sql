CREATE TABLE `expense_disputes` (
	`id` text PRIMARY KEY,
	`expense_id` text NOT NULL,
	`family_id` text NOT NULL,
	`opened_by_user_id` text,
	`reason` text NOT NULL,
	`status` text NOT NULL,
	`resolution_note` text,
	`resolved_by_user_id` text,
	`resolved_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `expenses` ADD `created_by_user_id` text;--> statement-breakpoint
CREATE INDEX `expense_disputes_expense_id_idx` ON `expense_disputes` (`expense_id`);