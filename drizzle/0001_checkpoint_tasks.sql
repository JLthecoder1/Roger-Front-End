CREATE TABLE checkpoint_tasks (
  id TEXT PRIMARY KEY NOT NULL,
  checkpoint_id TEXT NOT NULL,
  parent_id TEXT REFERENCES checkpoint_tasks(id),
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX checkpoint_tasks_checkpoint_idx ON checkpoint_tasks(checkpoint_id);
