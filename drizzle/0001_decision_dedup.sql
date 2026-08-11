CREATE UNIQUE INDEX "decisions_goal_input_hash_idx"
  ON "decisions" ("goal_id", "input_hash");
