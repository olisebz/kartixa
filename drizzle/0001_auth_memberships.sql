CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `league_memberships` (
	`id` varchar(36) NOT NULL,
	`league_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` varchar(20) NOT NULL DEFAULT 'member',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `league_memberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `league_invite_codes` (
	`id` varchar(36) NOT NULL,
	`league_id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`role_to_grant` varchar(20) NOT NULL DEFAULT 'member',
	`max_uses` int,
	`used_count` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`expires_at` timestamp,
	`created_by_user_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `league_invite_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `league_memberships` ADD CONSTRAINT `league_memberships_league_id_leagues_id_fk` FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `league_memberships` ADD CONSTRAINT `league_memberships_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `league_invite_codes` ADD CONSTRAINT `league_invite_codes_league_id_leagues_id_fk` FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `league_invite_codes` ADD CONSTRAINT `league_invite_codes_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_users_email` ON `users` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_membership_league_user` ON `league_memberships` (`league_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_membership_user` ON `league_memberships` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_membership_role` ON `league_memberships` (`role`);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_invite_code` ON `league_invite_codes` (`code`);
--> statement-breakpoint
CREATE INDEX `idx_invite_league` ON `league_invite_codes` (`league_id`);
--> statement-breakpoint
CREATE INDEX `idx_invite_active` ON `league_invite_codes` (`is_active`);
