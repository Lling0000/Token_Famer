export type ModelId =
  | 'claude-fable-5'
  | 'claude-haiku-4-5'
  | 'claude-haiku-4-5-20251001'
  | 'claude-opus-4-6'
  | 'claude-opus-4-7'
  | 'claude-opus-4-8'
  | 'claude-sonnet-4-6'
  | 'claude-sonnet-5'
  | 'deepseek-v4-flash'
  | 'deepseek-v4-pro'
  | 'gemini-3.1-pro-preview'
  | 'gemini-3.5-flash'
  | 'glm-5.2'
  | 'gpt-5.4-mini'
  | 'gpt-5.4'
  | 'gpt-5.5'
  | 'gpt-5.6-luna'
  | 'gpt-5.6-sol'
  | 'gpt-5.6-terra'
  | 'gpt-image-2';

export type FarmTool = 'inspect' | 'seed' | 'water' | 'weed' | 'bug' | 'harvest';
export type VisitorAction = 'inspect' | 'help' | 'prank' | 'steal';
export type GamePanel =
  'shop' | 'warehouse' | 'leaderboard' | 'api' | 'tasks' | 'social' | 'payment' | null;
export type PlotIssue = 'weed' | 'bug' | null;
export type PlotPhase = 'empty' | 'seed' | 'sprout' | 'growing' | 'flowering' | 'mature';

export interface ModelDefinition {
  id: ModelId;
  label: string;
  shortLabel: string;
  color: string;
  bloom: 'star' | 'round' | 'lotus' | 'crystal' | 'double';
}

export interface CropDefinition {
  id: string;
  level: number;
  name: string;
  cost: bigint;
  baseReward?: bigint;
  fruitCount: number;
  durationMs: number;
  color: string;
  accent: string;
}

export interface FarmPlot {
  id: number;
  row: number;
  column: number;
  unlocked: boolean;
  cropId: string | null;
  modelId: ModelId | null;
  plantedAtMs: number | null;
  durationMs: number | null;
  watered: boolean;
  issue: PlotIssue;
  quality: 1 | 2 | 3;
}

export interface TokenPackage {
  id: string;
  cropName: string;
  modelId: ModelId;
  amount: bigint;
  createdAt: string;
  source: 'harvest' | 'steal';
}

export interface FriendSummary {
  name: string;
  initials: string;
  level: number;
  status: string;
  tone: string;
  alert: boolean;
  intimacyLevel: number;
}

export interface FarmActionInput {
  plot: FarmPlot;
  tool: FarmTool;
  crop: CropDefinition;
  modelId: ModelId;
  nowMs: number;
  walletBalance: bigint;
}

export interface FarmActionResult {
  plot: FarmPlot;
  balanceDelta: bigint;
  packageAmount: bigint;
  message: string;
  changed: boolean;
}
