CREATE TABLE "oauth_attempts" (
  "id" uuid PRIMARY KEY NOT NULL,
  "encrypted_state" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
