CREATE TYPE "public"."crop_event_state" AS ENUM('active', 'resolved', 'expired');--> statement-breakpoint
CREATE TYPE "public"."crop_event_type" AS ENUM('dry', 'weed', 'pest', 'prank');--> statement-breakpoint
CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted', 'rejected', 'blocked', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'credited', 'refunded', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."token_pack_source" AS ENUM('harvest', 'steal', 'welcome', 'purchase', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."planting_state" AS ENUM('growing', 'mature', 'harvested', 'cleared');--> statement-breakpoint
CREATE TYPE "public"."plot_state" AS ENUM('locked', 'empty', 'growing', 'mature', 'harvested', 'clearing');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('invited', 'active', 'frozen', 'deleted');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"secret_hash" text NOT NULL,
	"allowed_models" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "crop_catalog" (
	"level" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"seed_cost_weight" integer NOT NULL,
	"base_fruit_num" integer NOT NULL,
	"growth_seconds" integer NOT NULL,
	"experience_reward" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crop_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planting_id" uuid NOT NULL,
	"type" "crop_event_type" NOT NULL,
	"state" "crop_event_state" DEFAULT 'active' NOT NULL,
	"free_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"user_low_id" uuid NOT NULL,
	"user_high_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"status" "friendship_status" DEFAULT 'pending' NOT NULL,
	"intimacy_points" integer DEFAULT 0 NOT NULL,
	"pranks_allowed" boolean DEFAULT false NOT NULL,
	"accepted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_user_low_id_user_high_id_pk" PRIMARY KEY("user_low_id","user_high_id")
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"scope" text NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"status_code" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_records_scope_user_id_key_pk" PRIMARY KEY("scope","user_id","key")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"created_by" uuid,
	"email" text,
	"used_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_scores" (
	"user_id" uuid NOT NULL,
	"board" text NOT NULL,
	"period" text NOT NULL,
	"period_key" text NOT NULL,
	"score" numeric(38, 0) DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_scores_user_id_board_period_period_key_pk" PRIMARY KEY("user_id","board","period","period_key")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"amount" numeric(38, 0) NOT NULL,
	"direction" text NOT NULL,
	"entry_type" text NOT NULL,
	"business_reference" text NOT NULL,
	"balance_after" numeric(38, 0) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"api_key_id" uuid NOT NULL,
	"model_id" text NOT NULL,
	"input_tokens" numeric(38, 0) NOT NULL,
	"output_tokens" numeric(38, 0) NOT NULL,
	"cached_input_tokens" numeric(38, 0) DEFAULT 0 NOT NULL,
	"cache_creation_tokens" numeric(38, 0) DEFAULT 0 NOT NULL,
	"charged_tokens" numeric(38, 0) NOT NULL,
	"provider" text NOT NULL,
	"status" text NOT NULL,
	"latency_milliseconds" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_order_no" text NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"sku_id" text NOT NULL,
	"model_id" text NOT NULL,
	"token_amount" numeric(38, 0) NOT NULL,
	"amount_cents" bigint NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"credited_at" timestamp with time zone,
	"refunded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"order_id" uuid,
	"signature_valid" boolean NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_reference" text NOT NULL,
	"plot_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"crop_level" integer NOT NULL,
	"model_id" text NOT NULL,
	"state" "planting_state" DEFAULT 'growing' NOT NULL,
	"seed_cost" numeric(38, 0) NOT NULL,
	"fruit_num" integer DEFAULT 0 NOT NULL,
	"left_fruit_num" integer DEFAULT 0 NOT NULL,
	"stole_num" integer DEFAULT 0 NOT NULL,
	"max_stealable_fruit" integer DEFAULT 0 NOT NULL,
	"random_commit" text NOT NULL,
	"random_seed_ciphertext" text NOT NULL,
	"rule_version_id" text NOT NULL,
	"planted_at" timestamp with time zone NOT NULL,
	"mature_at" timestamp with time zone NOT NULL,
	"harvested_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "plots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plot_index" integer NOT NULL,
	"state" "plot_state" DEFAULT 'locked' NOT NULL,
	"quality" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"amount" numeric(38, 0) NOT NULL,
	"status" text NOT NULL,
	"business_reference" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rule_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"version" integer NOT NULL,
	"hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"two_factor_verified" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steal_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planting_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"thief_id" uuid NOT NULL,
	"success" boolean NOT NULL,
	"fruit_amount" integer NOT NULL,
	"token_pack_id" uuid,
	"rule_version_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"model_id" text NOT NULL,
	"amount" numeric(38, 0) NOT NULL,
	"source" "token_pack_source" NOT NULL,
	"source_reference" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"email_verification_code_hash" text,
	"email_verification_expires_at" timestamp with time zone,
	"two_factor_secret_ciphertext" text,
	"welcome_grant_claimed_at" timestamp with time zone,
	"level" integer DEFAULT 1 NOT NULL,
	"experience" bigint DEFAULT 0 NOT NULL,
	"petals" bigint DEFAULT 0 NOT NULL,
	"friend_code" text NOT NULL,
	"holdings_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"model_id" text NOT NULL,
	"available" numeric(38, 0) DEFAULT 0 NOT NULL,
	"reserved" numeric(38, 0) DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_events" ADD CONSTRAINT "crop_events_planting_id_plantings_id_fk" FOREIGN KEY ("planting_id") REFERENCES "public"."plantings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_low_id_users_id_fk" FOREIGN KEY ("user_low_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_high_id_users_id_fk" FOREIGN KEY ("user_high_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_scores" ADD CONSTRAINT "leaderboard_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_usage_events" ADD CONSTRAINT "model_usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_usage_events" ADD CONSTRAINT "model_usage_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_rule_version_id_rule_versions_id_fk" FOREIGN KEY ("rule_version_id") REFERENCES "public"."rule_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plots" ADD CONSTRAINT "plots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_reservations" ADD CONSTRAINT "wallet_reservations_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steal_attempts" ADD CONSTRAINT "steal_attempts_planting_id_plantings_id_fk" FOREIGN KEY ("planting_id") REFERENCES "public"."plantings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steal_attempts" ADD CONSTRAINT "steal_attempts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steal_attempts" ADD CONSTRAINT "steal_attempts_thief_id_users_id_fk" FOREIGN KEY ("thief_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steal_attempts" ADD CONSTRAINT "steal_attempts_token_pack_id_token_packs_id_fk" FOREIGN KEY ("token_pack_id") REFERENCES "public"."token_packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steal_attempts" ADD CONSTRAINT "steal_attempts_rule_version_id_rule_versions_id_fk" FOREIGN KEY ("rule_version_id") REFERENCES "public"."rule_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_packs" ADD CONSTRAINT "token_packs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_prefix_uq" ON "api_keys" USING btree ("prefix");--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crop_events_planting_state_idx" ON "crop_events" USING btree ("planting_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_code_hash_uq" ON "invitations" USING btree ("code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_business_reference_uq" ON "ledger_entries" USING btree ("business_reference");--> statement-breakpoint
CREATE INDEX "ledger_wallet_created_idx" ON "ledger_entries" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "model_usage_request_uq" ON "model_usage_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "model_usage_user_created_idx" ON "model_usage_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "model_usage_key_created_idx" ON "model_usage_events" USING btree ("api_key_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_merchant_no_uq" ON "orders" USING btree ("merchant_order_no");--> statement-breakpoint
CREATE INDEX "outbox_unpublished_idx" ON "outbox_events" USING btree ("published_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_provider_event_uq" ON "payment_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plantings_business_reference_uq" ON "plantings" USING btree ("business_reference");--> statement-breakpoint
CREATE INDEX "plantings_plot_state_idx" ON "plantings" USING btree ("plot_id","state");--> statement-breakpoint
CREATE INDEX "plantings_owner_state_idx" ON "plantings" USING btree ("owner_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "plots_user_index_uq" ON "plots" USING btree ("user_id","plot_index");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_reference_uq" ON "wallet_reservations" USING btree ("business_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_versions_kind_version_uq" ON "rule_versions" USING btree ("kind","version");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "steal_attempts_planting_thief_uq" ON "steal_attempts" USING btree ("planting_id","thief_id");--> statement-breakpoint
CREATE INDEX "steal_attempts_thief_created_idx" ON "steal_attempts" USING btree ("thief_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "token_packs_source_reference_uq" ON "token_packs" USING btree ("source_reference");--> statement-breakpoint
CREATE INDEX "token_packs_user_idx" ON "token_packs" USING btree ("user_id","activated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_friend_code_uq" ON "users" USING btree ("friend_code");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_user_model_uq" ON "wallets" USING btree ("user_id","model_id");