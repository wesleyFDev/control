CREATE TABLE `sync_state` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `expenses` ADD `pushed_at` text;--> statement-breakpoint
ALTER TABLE `members` ADD `user_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `members_user_id_idx` ON `members` (`user_id`) WHERE "members"."user_id" IS NOT NULL;