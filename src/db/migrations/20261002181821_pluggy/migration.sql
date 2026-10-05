CREATE TABLE `pluggy_accounts` (
	`id` text PRIMARY KEY,
	`item_id` text NOT NULL,
	`name` text NOT NULL,
	`marketing_name` text,
	`type` text NOT NULL,
	`subtype` text,
	`number` text,
	`balance_cents` integer NOT NULL,
	`currency_code` text NOT NULL,
	`raw_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `fk_pluggy_accounts_item_id_pluggy_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `pluggy_items`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `pluggy_items` (
	`id` text PRIMARY KEY,
	`last_synced_at` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `pluggy_transactions` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`date` text NOT NULL,
	`posted_at` text NOT NULL,
	`description` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency_code` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`operation_type` text,
	`category` text,
	`installment_number` integer,
	`total_installments` integer,
	`is_expense_candidate` integer NOT NULL,
	`ignore_reason` text,
	`expense_id` text,
	`raw_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `fk_pluggy_transactions_account_id_pluggy_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `pluggy_accounts`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_pluggy_transactions_expense_id_expenses_id_fk` FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `pluggy_accounts_item_id_idx` ON `pluggy_accounts` (`item_id`);--> statement-breakpoint
CREATE INDEX `pluggy_transactions_account_id_idx` ON `pluggy_transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `pluggy_transactions_date_idx` ON `pluggy_transactions` (`date`);--> statement-breakpoint
CREATE INDEX `pluggy_transactions_expense_id_idx` ON `pluggy_transactions` (`expense_id`);