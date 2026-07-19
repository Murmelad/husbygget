CREATE TABLE `kb_docs` (
	`entry_id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`version` text,
	`updated_at` integer,
	`summary` text,
	`tags` text,
	`search_text` text,
	FOREIGN KEY (`entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE no action
);
