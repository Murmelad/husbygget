-- Seed the singleton scenario + settings row. Idempotent (INSERT OR IGNORE), so
-- re-applying this migration is a no-op. Timestamp is a literal epoch-ms
-- (2026-07-16T00:00:00Z) since migrations run as plain SQL with no JS defaults.
INSERT OR IGNORE INTO `scenarios` (`id`, `name`, `created_at`) VALUES (1, 'Plan', 1784160000000);
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`id`, `total_budget`, `active_scenario_id`, `updated_at`) VALUES (1, 0, 1, 1784160000000);
