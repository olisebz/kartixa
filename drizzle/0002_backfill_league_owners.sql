INSERT INTO `league_memberships` (`id`, `league_id`, `user_id`, `role`, `created_at`, `updated_at`)
SELECT UUID(), l.id, u.id, 'owner', NOW(), NOW()
FROM `leagues` l
JOIN (
  SELECT id
  FROM `users`
  ORDER BY `created_at` ASC
  LIMIT 1
) u
LEFT JOIN `league_memberships` lm ON lm.`league_id` = l.`id`
WHERE lm.`id` IS NULL;
