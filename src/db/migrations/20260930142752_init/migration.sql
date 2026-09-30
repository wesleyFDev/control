CREATE TABLE `categories` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY,
	`amount_cents` integer NOT NULL,
	`category_id` text NOT NULL,
	`date` text NOT NULL,
	`scope` text NOT NULL,
	`member_id` text,
	`description` text,
	`source` text NOT NULL,
	`raw_text` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `fk_expenses_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_expenses_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT,
	CONSTRAINT "expenses_amount_positive" CHECK("amount_cents" > 0),
	CONSTRAINT "expenses_scope_member" CHECK(("scope" = 'family' AND "member_id" IS NULL) OR ("scope" = 'personal' AND "member_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`is_self` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `categories_sort_order_idx` ON `categories` (`sort_order`);--> statement-breakpoint
CREATE INDEX `expenses_date_idx` ON `expenses` (`date`);--> statement-breakpoint
CREATE INDEX `expenses_category_id_idx` ON `expenses` (`category_id`);--> statement-breakpoint
CREATE INDEX `expenses_member_id_idx` ON `expenses` (`member_id`);--> statement-breakpoint
CREATE INDEX `members_is_self_idx` ON `members` (`is_self`);