'use client';

import { Sprout } from 'lucide-react';
import dynamic from 'next/dynamic';
import type {
  CropDefinition,
  FarmDecoration,
  GamePanel,
  ModelId,
  TokenPackage,
} from '@/lib/game-types';

const ApiPanel = dynamic(() => import('../panels/api-panel').then((module) => module.ApiPanel), {
  loading: PanelLoading,
});
const LeaderboardPanel = dynamic(
  () => import('../panels/leaderboard-panel').then((module) => module.LeaderboardPanel),
  { loading: PanelLoading },
);
const PaymentPanel = dynamic(
  () => import('../panels/payment-panel').then((module) => module.PaymentPanel),
  { loading: PanelLoading },
);
const ShopPanel = dynamic(() => import('../panels/shop-panel').then((module) => module.ShopPanel), {
  loading: PanelLoading,
});
const SocialPanel = dynamic(
  () => import('../panels/social-panel').then((module) => module.SocialPanel),
  { loading: PanelLoading },
);
const TasksPanel = dynamic(
  () => import('../panels/tasks-panel').then((module) => module.TasksPanel),
  { loading: PanelLoading },
);
const WarehousePanel = dynamic(
  () => import('../panels/warehouse-panel').then((module) => module.WarehousePanel),
  { loading: PanelLoading },
);

interface PanelHostProps {
  panel: GamePanel;
  selectedCrop: CropDefinition;
  level: number;
  balance: bigint;
  packages: TokenPackage[];
  modelId: ModelId;
  nickname: string;
  claimedTaskIds: readonly string[];
  ownedDecorations: readonly FarmDecoration[];
  equippedDecoration: FarmDecoration;
  onClose: () => void;
  onSelectCrop: (crop: CropDefinition) => void;
  onBuyTokens: () => void;
  onActivate: (packageId: string) => void;
  onActivateAll: () => void;
  onPurchase: (amount: bigint) => void;
  onNicknameChange: (nickname: string) => void;
  onClaimTask: (taskId: string, rewardToken: bigint) => void;
  onBuyDogFood: (itemId: string, durationHours: number, priceToken: bigint) => void;
  onDecorationAction: (decoration: FarmDecoration, priceToken: bigint) => void;
}

export function PanelHost(props: PanelHostProps) {
  if (props.panel === 'shop') {
    return (
      <ShopPanel
        selectedCrop={props.selectedCrop}
        level={props.level}
        balance={props.balance}
        ownedDecorations={props.ownedDecorations}
        equippedDecoration={props.equippedDecoration}
        onSelectCrop={props.onSelectCrop}
        onBuyDogFood={props.onBuyDogFood}
        onDecorationAction={props.onDecorationAction}
        onBuyTokens={props.onBuyTokens}
        onClose={props.onClose}
      />
    );
  }
  if (props.panel === 'warehouse') {
    return (
      <WarehousePanel
        packages={props.packages}
        onActivate={props.onActivate}
        onActivateAll={props.onActivateAll}
        onClose={props.onClose}
      />
    );
  }
  if (props.panel === 'leaderboard') return <LeaderboardPanel onClose={props.onClose} />;
  if (props.panel === 'api') return <ApiPanel onClose={props.onClose} />;
  if (props.panel === 'tasks') return <TaskPanelView {...props} />;
  if (props.panel === 'social') {
    return (
      <SocialPanel
        nickname={props.nickname}
        onNicknameChange={props.onNicknameChange}
        onClose={props.onClose}
      />
    );
  }
  if (props.panel === 'payment') {
    return (
      <PaymentPanel modelId={props.modelId} onPurchase={props.onPurchase} onClose={props.onClose} />
    );
  }
  return null;
}

function TaskPanelView(props: PanelHostProps) {
  return (
    <TasksPanel
      claimedTaskIds={props.claimedTaskIds}
      onClaimTask={props.onClaimTask}
      onClose={props.onClose}
    />
  );
}

function PanelLoading() {
  return (
    <div className="panel-layer" role="status" aria-live="polite">
      <div className="panel-loading">
        <Sprout size={22} />
        <span>正在打开农场功能</span>
        <i />
      </div>
    </div>
  );
}
