ALTER TABLE `race_results` ADD COLUMN `dnf` boolean NOT NULL DEFAULT false;

CREATE TABLE `race_result_penalties` (
	`id` varchar(36) NOT NULL,
	`race_result_id` varchar(36) NOT NULL,
	`penalty_type` varchar(20) NOT NULL,
	`penalty_value` int NOT NULL,
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `race_result_penalties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_race_result_penalties_result` ON `race_result_penalties` (`race_result_id`);
--> statement-breakpoint
CREATE INDEX `idx_race_result_penalties_type` ON `race_result_penalties` (`penalty_type`);
--> statement-breakpoint
ALTER TABLE `race_result_penalties` ADD CONSTRAINT `race_result_penalties_race_result_id_race_results_id_fk` FOREIGN KEY (`race_result_id`) REFERENCES `race_results`(`id`) ON DELETE cascade ON UPDATE no action;
