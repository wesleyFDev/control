CREATE TABLE `credit_cards` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`closing_day` integer NOT NULL,
	`due_day` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `payable_installments` (
	`id` text PRIMARY KEY,
	`payable_id` text NOT NULL,
	`number` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`reference_month` text NOT NULL,
	`due_date` text NOT NULL,
	`paid_at` text,
	`expense_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `fk_payable_installments_payable_id_payables_id_fk` FOREIGN KEY (`payable_id`) REFERENCES `payables`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_payable_installments_expense_id_expenses_id_fk` FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `payables` (
	`id` text PRIMARY KEY,
	`kind` text NOT NULL,
	`card_id` text,
	`description` text NOT NULL,
	`category_id` text NOT NULL,
	`scope` text NOT NULL,
	`member_id` text,
	`total_cents` integer NOT NULL,
	`installments_count` integer NOT NULL,
	`start_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `fk_payables_card_id_credit_cards_id_fk` FOREIGN KEY (`card_id`) REFERENCES `credit_cards`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_payables_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_payables_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX `payable_installments_payable_id_idx` ON `payable_installments` (`payable_id`);--> statement-breakpoint
CREATE INDEX `payable_installments_reference_month_idx` ON `payable_installments` (`reference_month`);--> statement-breakpoint
CREATE INDEX `payables_card_id_idx` ON `payables` (`card_id`);