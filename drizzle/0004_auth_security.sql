ALTER TABLE `users` ADD COLUMN `email_verified_at` timestamp;

CREATE TABLE `auth_email_challenges` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`email` varchar(255) NOT NULL,
	`purpose` varchar(32) NOT NULL,
	`code_hash` varchar(255) NOT NULL,
	`pending_name` varchar(255),
	`pending_password_hash` varchar(255),
	`pending_device_id` varchar(128),
	`expires_at` timestamp NOT NULL,
	`consumed_at` timestamp,
	`attempt_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `auth_email_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_auth_email_challenges_email` ON `auth_email_challenges` (`email`);
--> statement-breakpoint
CREATE INDEX `idx_auth_email_challenges_user` ON `auth_email_challenges` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_auth_email_challenges_purpose` ON `auth_email_challenges` (`purpose`);
--> statement-breakpoint
ALTER TABLE `auth_email_challenges` ADD CONSTRAINT `auth_email_challenges_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;

CREATE TABLE `user_trusted_devices` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`device_id` varchar(128) NOT NULL,
	`user_agent` text,
	`last_used_at` timestamp NOT NULL DEFAULT (now()),
	`revoked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_trusted_devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_trusted_devices_user_device` ON `user_trusted_devices` (`user_id`,`device_id`);
--> statement-breakpoint
CREATE INDEX `idx_user_trusted_devices_user` ON `user_trusted_devices` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_user_trusted_devices_revoked` ON `user_trusted_devices` (`revoked_at`);
--> statement-breakpoint
ALTER TABLE `user_trusted_devices` ADD CONSTRAINT `user_trusted_devices_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;

CREATE TABLE `user_auth_sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`device_id` varchar(128) NOT NULL,
	`session_token_hash` varchar(255) NOT NULL,
	`user_agent` text,
	`ip_address` varchar(64),
	`last_seen_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_auth_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_auth_sessions_token_hash` ON `user_auth_sessions` (`session_token_hash`);
--> statement-breakpoint
CREATE INDEX `idx_user_auth_sessions_user` ON `user_auth_sessions` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_user_auth_sessions_device` ON `user_auth_sessions` (`device_id`);
--> statement-breakpoint
CREATE INDEX `idx_user_auth_sessions_revoked` ON `user_auth_sessions` (`revoked_at`);
--> statement-breakpoint
ALTER TABLE `user_auth_sessions` ADD CONSTRAINT `user_auth_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
