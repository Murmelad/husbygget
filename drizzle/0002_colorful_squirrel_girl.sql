CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_id` integer,
	`body` text DEFAULT '' NOT NULL,
	`user_email` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `journal_entries_section_id_idx` ON `journal_entries` (`section_id`);--> statement-breakpoint
CREATE INDEX `journal_entries_created_at_idx` ON `journal_entries` (`created_at`);--> statement-breakpoint
CREATE TABLE `journal_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`r2_key` text NOT NULL,
	`name` text NOT NULL,
	`content_type` text DEFAULT 'application/octet-stream' NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_files_r2_key_idx` ON `journal_files` (`r2_key`);--> statement-breakpoint
CREATE INDEX `journal_files_entry_id_idx` ON `journal_files` (`entry_id`);