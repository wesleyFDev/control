ALTER TABLE `pluggy_accounts` ADD `credit_limit_cents` integer;--> statement-breakpoint
ALTER TABLE `pluggy_accounts` ADD `available_credit_limit_cents` integer;--> statement-breakpoint
ALTER TABLE `pluggy_accounts` ADD `balance_close_date` text;--> statement-breakpoint
ALTER TABLE `pluggy_accounts` ADD `balance_due_date` text;--> statement-breakpoint
ALTER TABLE `pluggy_items` ADD `name` text;--> statement-breakpoint
ALTER TABLE `pluggy_items` ADD `bank_updated_at` text;