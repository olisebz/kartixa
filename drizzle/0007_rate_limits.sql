CREATE TABLE `api_rate_limits` (
	`key` varchar(255) NOT NULL,
	`count` int NOT NULL DEFAULT 1,
	`window_start` bigint NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_rate_limits_key` PRIMARY KEY(`key`)
);
