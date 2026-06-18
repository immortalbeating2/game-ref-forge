ALTER TABLE `references` ADD `mechanic_tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `references` ADD `mood_tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `references` ADD `visual_language_tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `references` ADD `quality_status` text DEFAULT 'captured' NOT NULL;--> statement-breakpoint
ALTER TABLE `references` ADD `reference_value_score` integer;--> statement-breakpoint
ALTER TABLE `references` ADD `transformability_score` integer;--> statement-breakpoint
ALTER TABLE `references` ADD `copyright_risk_score` integer;--> statement-breakpoint
ALTER TABLE `references` ADD `production_readiness_score` integer;--> statement-breakpoint
ALTER TABLE `references` ADD `inspiration_entries` text DEFAULT '[]' NOT NULL;