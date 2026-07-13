CREATE TABLE `syntheses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`target_asset` text,
	`shared_principles` text,
	`key_differences` text,
	`original_direction` text,
	`avoid_copying_notes` text,
	`design_constraints` text,
	`experiment_plan` text,
	`next_actions` text,
	`additional_notes` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_syntheses_status` ON `syntheses` (`status`);--> statement-breakpoint
CREATE INDEX `idx_syntheses_updated_at` ON `syntheses` (`updated_at`);--> statement-breakpoint
CREATE TABLE `synthesis_references` (
	`id` text PRIMARY KEY NOT NULL,
	`synthesis_id` text NOT NULL,
	`reference_id` text,
	`position` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`snapshot_updated_at` text NOT NULL,
	FOREIGN KEY (`synthesis_id`) REFERENCES `syntheses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reference_id`) REFERENCES `references`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_synthesis_references_synthesis_id` ON `synthesis_references` (`synthesis_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_synthesis_references_position` ON `synthesis_references` (`synthesis_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_synthesis_references_reference` ON `synthesis_references` (`synthesis_id`,`reference_id`);