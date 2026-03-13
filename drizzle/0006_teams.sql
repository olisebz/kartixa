CREATE TABLE `teams` (
	`id` varchar(36) NOT NULL,
	`league_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_teams_league_name` UNIQUE(`league_id`,`name`)
);
--> statement-breakpoint
CREATE INDEX `idx_teams_league` ON `teams` (`league_id`);
--> statement-breakpoint
CREATE INDEX `idx_teams_active` ON `teams` (`is_active`);
--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_league_id_leagues_id_fk` FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON DELETE cascade ON UPDATE no action;

ALTER TABLE `drivers` ADD COLUMN `current_team_id` varchar(36);
--> statement-breakpoint
CREATE INDEX `idx_drivers_team` ON `drivers` (`current_team_id`);
--> statement-breakpoint
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_current_team_id_teams_id_fk` FOREIGN KEY (`current_team_id`) REFERENCES `teams`(`id`) ON DELETE set null ON UPDATE no action;

ALTER TABLE `race_results` ADD COLUMN `team_id` varchar(36);
--> statement-breakpoint
CREATE INDEX `idx_results_team` ON `race_results` (`team_id`);
--> statement-breakpoint
ALTER TABLE `race_results` ADD CONSTRAINT `race_results_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE set null ON UPDATE no action;
