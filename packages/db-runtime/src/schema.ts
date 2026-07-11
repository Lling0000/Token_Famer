import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const utcTimestamp = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const tokenAmount = (name: string) => numeric(name, { precision: 38, scale: 0, mode: 'bigint' });

export const userStatus = pgEnum('user_status', ['invited', 'active', 'frozen', 'deleted']);
export const plotState = pgEnum('plot_state', [
  'locked',
  'empty',
  'growing',
  'mature',
  'harvested',
  'clearing',
]);
export const plantingState = pgEnum('planting_state', [
  'growing',
  'mature',
  'harvested',
  'cleared',
]);
export const eventType = pgEnum('crop_event_type', ['dry', 'weed', 'pest', 'prank']);
export const eventState = pgEnum('crop_event_state', ['active', 'resolved', 'expired']);
export const packSource = pgEnum('token_pack_source', [
  'harvest',
  'steal',
  'welcome',
  'purchase',
  'adjustment',
]);
export const orderStatus = pgEnum('order_status', [
  'pending',
  'paid',
  'credited',
  'refunded',
  'expired',
  'failed',
]);
export const friendshipStatus = pgEnum('friendship_status', [
  'pending',
  'accepted',
  'rejected',
  'blocked',
  'deleted',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    status: userStatus('status').notNull().default('invited'),
    emailVerifiedAt: utcTimestamp('email_verified_at'),
    emailVerificationCodeHash: text('email_verification_code_hash'),
    emailVerificationExpiresAt: utcTimestamp('email_verification_expires_at'),
    twoFactorSecretCiphertext: text('two_factor_secret_ciphertext'),
    welcomeGrantClaimedAt: utcTimestamp('welcome_grant_claimed_at'),
    level: integer('level').notNull().default(1),
    experience: bigint('experience', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    petals: bigint('petals', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    friendCode: text('friend_code').notNull(),
    holdingsPublic: boolean('holdings_public').notNull().default(false),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
    updatedAt: utcTimestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_uq').on(table.email),
    uniqueIndex('users_friend_code_uq').on(table.friendCode),
  ],
);

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codeHash: text('code_hash').notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    email: text('email'),
    usedBy: uuid('used_by').references(() => users.id),
    expiresAt: utcTimestamp('expires_at').notNull(),
    usedAt: utcTimestamp('used_at'),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('invitations_code_hash_uq').on(table.codeHash)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    twoFactorVerified: boolean('two_factor_verified').notNull().default(false),
    expiresAt: utcTimestamp('expires_at').notNull(),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_uq').on(table.tokenHash),
    index('sessions_user_idx').on(table.userId),
  ],
);

export const wallets = pgTable(
  'wallets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    modelId: text('model_id').notNull(),
    available: tokenAmount('available')
      .notNull()
      .default(sql`0`),
    reserved: tokenAmount('reserved')
      .notNull()
      .default(sql`0`),
    version: integer('version').notNull().default(0),
    updatedAt: utcTimestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('wallets_user_model_uq').on(table.userId, table.modelId)],
);

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    amount: tokenAmount('amount').notNull(),
    direction: text('direction').notNull(),
    entryType: text('entry_type').notNull(),
    businessReference: text('business_reference').notNull(),
    balanceAfter: tokenAmount('balance_after').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('ledger_business_reference_uq').on(table.businessReference),
    index('ledger_wallet_created_idx').on(table.walletId, table.createdAt),
  ],
);

export const reservations = pgTable(
  'wallet_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    amount: tokenAmount('amount').notNull(),
    status: text('status').notNull(),
    businessReference: text('business_reference').notNull(),
    expiresAt: utcTimestamp('expires_at').notNull(),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
    settledAt: utcTimestamp('settled_at'),
  },
  (table) => [uniqueIndex('reservations_reference_uq').on(table.businessReference)],
);

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    prefix: text('prefix').notNull(),
    secretHash: text('secret_hash').notNull(),
    allowedModels: jsonb('allowed_models').$type<string[]>().notNull(),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
    lastUsedAt: utcTimestamp('last_used_at'),
    revokedAt: utcTimestamp('revoked_at'),
  },
  (table) => [
    uniqueIndex('api_keys_prefix_uq').on(table.prefix),
    index('api_keys_user_idx').on(table.userId),
  ],
);

export const modelUsageEvents = pgTable(
  'model_usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: text('request_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    apiKeyId: uuid('api_key_id')
      .notNull()
      .references(() => apiKeys.id),
    modelId: text('model_id').notNull(),
    inputTokens: tokenAmount('input_tokens').notNull(),
    outputTokens: tokenAmount('output_tokens').notNull(),
    cachedInputTokens: tokenAmount('cached_input_tokens')
      .notNull()
      .default(sql`0`),
    cacheCreationTokens: tokenAmount('cache_creation_tokens')
      .notNull()
      .default(sql`0`),
    chargedTokens: tokenAmount('charged_tokens').notNull(),
    provider: text('provider').notNull(),
    status: text('status').notNull(),
    latencyMilliseconds: integer('latency_milliseconds').notNull(),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('model_usage_request_uq').on(table.requestId),
    index('model_usage_user_created_idx').on(table.userId, table.createdAt),
    index('model_usage_key_created_idx').on(table.apiKeyId, table.createdAt),
  ],
);

export const ruleVersions = pgTable(
  'rule_versions',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    version: integer('version').notNull(),
    hash: text('hash').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    active: boolean('active').notNull().default(false),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('rule_versions_kind_version_uq').on(table.kind, table.version)],
);

export const cropCatalog = pgTable('crop_catalog', {
  level: integer('level').primaryKey(),
  name: text('name').notNull(),
  seedCostWeight: integer('seed_cost_weight').notNull(),
  baseRewardTokens: tokenAmount('base_reward_tokens')
    .notNull()
    .default(sql`0`),
  baseFruitNum: integer('base_fruit_num').notNull(),
  growthSeconds: integer('growth_seconds').notNull(),
  experienceReward: integer('experience_reward').notNull(),
  enabled: boolean('enabled').notNull().default(true),
});

export const plots = pgTable(
  'plots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    plotIndex: integer('plot_index').notNull(),
    state: plotState('state').notNull().default('locked'),
    quality: integer('quality').notNull().default(0),
    updatedAt: utcTimestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('plots_user_index_uq').on(table.userId, table.plotIndex)],
);

export const plantings = pgTable(
  'plantings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessReference: text('business_reference').notNull(),
    plotId: uuid('plot_id')
      .notNull()
      .references(() => plots.id),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    cropLevel: integer('crop_level').notNull(),
    modelId: text('model_id').notNull(),
    state: plantingState('state').notNull().default('growing'),
    seedCost: tokenAmount('seed_cost').notNull(),
    fruitNum: integer('fruit_num').notNull().default(0),
    leftFruitNum: integer('left_fruit_num').notNull().default(0),
    stoleNum: integer('stole_num').notNull().default(0),
    maxStealableFruit: integer('max_stealable_fruit').notNull().default(0),
    randomCommit: text('random_commit').notNull(),
    randomSeedCiphertext: text('random_seed_ciphertext').notNull(),
    ruleVersionId: text('rule_version_id')
      .notNull()
      .references(() => ruleVersions.id),
    plantedAt: utcTimestamp('planted_at').notNull(),
    matureAt: utcTimestamp('mature_at').notNull(),
    harvestedAt: utcTimestamp('harvested_at'),
  },
  (table) => [
    uniqueIndex('plantings_business_reference_uq').on(table.businessReference),
    index('plantings_plot_state_idx').on(table.plotId, table.state),
    index('plantings_owner_state_idx').on(table.ownerId, table.state),
  ],
);

export const cropEvents = pgTable(
  'crop_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    plantingId: uuid('planting_id')
      .notNull()
      .references(() => plantings.id, { onDelete: 'cascade' }),
    type: eventType('type').notNull(),
    state: eventState('state').notNull().default('active'),
    freeAttempts: integer('free_attempts').notNull().default(0),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
    resolvedAt: utcTimestamp('resolved_at'),
  },
  (table) => [index('crop_events_planting_state_idx').on(table.plantingId, table.state)],
);

export const tokenPacks = pgTable(
  'token_packs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    modelId: text('model_id').notNull(),
    amount: tokenAmount('amount').notNull(),
    source: packSource('source').notNull(),
    sourceReference: text('source_reference').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
    activatedAt: utcTimestamp('activated_at'),
  },
  (table) => [
    uniqueIndex('token_packs_source_reference_uq').on(table.sourceReference),
    index('token_packs_user_idx').on(table.userId, table.activatedAt),
  ],
);

export const friendships = pgTable(
  'friendships',
  {
    userLowId: uuid('user_low_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userHighId: uuid('user_high_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestedBy: uuid('requested_by')
      .notNull()
      .references(() => users.id),
    status: friendshipStatus('status').notNull().default('pending'),
    intimacyPoints: integer('intimacy_points').notNull().default(0),
    pranksAllowed: boolean('pranks_allowed').notNull().default(false),
    acceptedAt: utcTimestamp('accepted_at'),
    updatedAt: utcTimestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userLowId, table.userHighId] })],
);

export const stealAttempts = pgTable(
  'steal_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    plantingId: uuid('planting_id')
      .notNull()
      .references(() => plantings.id),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    thiefId: uuid('thief_id')
      .notNull()
      .references(() => users.id),
    success: boolean('success').notNull(),
    outcome: text('outcome').notNull(),
    fruitAmount: integer('fruit_amount').notNull(),
    tokenPackId: uuid('token_pack_id').references(() => tokenPacks.id),
    ruleVersionId: text('rule_version_id')
      .notNull()
      .references(() => ruleVersions.id),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('steal_attempts_planting_thief_uq').on(table.plantingId, table.thiefId),
    index('steal_attempts_thief_created_idx').on(table.thiefId, table.createdAt),
  ],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    merchantOrderNo: text('merchant_order_no').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    provider: text('provider').notNull(),
    skuId: text('sku_id').notNull(),
    modelId: text('model_id').notNull(),
    tokenAmount: tokenAmount('token_amount').notNull(),
    amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
    status: orderStatus('status').notNull().default('pending'),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
    paidAt: utcTimestamp('paid_at'),
    creditedAt: utcTimestamp('credited_at'),
    refundedAt: utcTimestamp('refunded_at'),
  },
  (table) => [uniqueIndex('orders_merchant_no_uq').on(table.merchantOrderNo)],
);

export const paymentEvents = pgTable(
  'payment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    orderId: uuid('order_id').references(() => orders.id),
    signatureValid: boolean('signature_valid').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    receivedAt: utcTimestamp('received_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('payment_events_provider_event_uq').on(table.provider, table.providerEventId),
  ],
);

export const leaderboardScores = pgTable(
  'leaderboard_scores',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    board: text('board').notNull(),
    period: text('period').notNull(),
    periodKey: text('period_key').notNull(),
    score: tokenAmount('score')
      .notNull()
      .default(sql`0`),
    updatedAt: utcTimestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.board, table.period, table.periodKey] })],
);

export const idempotencyRecords = pgTable(
  'idempotency_records',
  {
    scope: text('scope').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    key: text('key').notNull(),
    requestHash: text('request_hash').notNull(),
    statusCode: integer('status_code'),
    responseBody: jsonb('response_body').$type<Record<string, unknown>>(),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
    expiresAt: utcTimestamp('expires_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.scope, table.userId, table.key] })],
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    topic: text('topic').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    createdAt: utcTimestamp('created_at').notNull().defaultNow(),
    publishedAt: utcTimestamp('published_at'),
  },
  (table) => [index('outbox_unpublished_idx').on(table.publishedAt, table.createdAt)],
);
