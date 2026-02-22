ALTER TABLE `users` ADD `email_verified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `is_active` boolean DEFAULT true NOT NULL;