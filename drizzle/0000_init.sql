CREATE TABLE `drivers` (
	`id` varchar(36) NOT NULL,
	`season_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leagues` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL DEFAULT (''),
	`tracks` json NOT NULL DEFAULT ('[]'),
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leagues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `race_results` (
	`id` varchar(36) NOT NULL,
	`race_id` varchar(36) NOT NULL,
	`driver_id` varchar(36) NOT NULL,
	`position` int NOT NULL,
	`points` int NOT NULL DEFAULT 0,
	`lap_time` varchar(20),
	`fastest_lap` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `race_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `races` (
	`id` varchar(36) NOT NULL,
	`season_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`track` varchar(255) NOT NULL,
	`date` varchar(10) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `races_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` varchar(36) NOT NULL,
	`league_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`start_date` varchar(10) NOT NULL,
	`end_date` varchar(10),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`display_name` varchar(255) NOT NULL,
	`password_hash` varchar(255),
	`role` varchar(20) NOT NULL DEFAULT 'public',
	`auth_provider` varchar(50) NOT NULL DEFAULT 'local',
	`external_id` varchar(255),
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_users_email` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_season_id_seasons_id_fk` FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leagues` ADD CONSTRAINT `leagues_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `race_results` ADD CONSTRAINT `race_results_race_id_races_id_fk` FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `race_results` ADD CONSTRAINT `race_results_driver_id_drivers_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `races` ADD CONSTRAINT `races_season_id_seasons_id_fk` FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seasons` ADD CONSTRAINT `seasons_league_id_leagues_id_fk` FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_drivers_season` ON `drivers` (`season_id`);--> statement-breakpoint
CREATE INDEX `idx_results_race` ON `race_results` (`race_id`);--> statement-breakpoint
CREATE INDEX `idx_results_driver` ON `race_results` (`driver_id`);--> statement-breakpoint
CREATE INDEX `idx_races_season` ON `races` (`season_id`);--> statement-breakpoint
CREATE INDEX `idx_seasons_league` ON `seasons` (`league_id`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);