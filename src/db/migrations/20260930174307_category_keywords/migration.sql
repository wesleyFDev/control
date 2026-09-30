CREATE TABLE `category_keywords` (
	`id` text PRIMARY KEY,
	`category_id` text NOT NULL,
	`keyword` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `fk_category_keywords_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX `category_keywords_category_id_idx` ON `category_keywords` (`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `category_keywords_active_keyword_idx` ON `category_keywords` (`keyword`) WHERE "category_keywords"."deleted_at" IS NULL;