CREATE TABLE checkpoints (id TEXT PRIMARY KEY, name TEXT NOT NULL, task TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL);
--> statement-breakpoint
CREATE TABLE checks (id TEXT PRIMARY KEY, officer TEXT NOT NULL, created_at TEXT NOT NULL);
