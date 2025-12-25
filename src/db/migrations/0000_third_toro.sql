CREATE TABLE `prompt_tags` (
	`prompt_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`prompt_id`, `tag_id`),
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prompt_template_values` (
	`prompt_id` text NOT NULL,
	`keyword` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`prompt_id`, `keyword`),
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`title` text,
	`text` text NOT NULL,
	`description` text,
	`mode` text DEFAULT 'raw' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `snippet_tags` (
	`snippet_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`snippet_id`, `tag_id`),
	FOREIGN KEY (`snippet_id`) REFERENCES `snippets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `snippets` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`value` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `views` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'custom' NOT NULL,
	`config` text NOT NULL,
	`created_at` integer NOT NULL
);
