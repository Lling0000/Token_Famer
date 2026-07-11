'use client';

import { MonitorUp, Sprout } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AuthScreen } from './auth/auth-screen';
import { OnboardingScreen } from './auth/onboarding-screen';
import { FarmCanvas } from './farm/farm-canvas';
import { FarmHud } from './game/farm-hud';
import { FriendSidebar } from './game/friend-sidebar';
import { FriendVisitBar } from './game/friend-visit-bar';
import { GameToast } from './game/toast';
import { PanelHost } from './game/panel-host';
import { ToolDock } from './game/tool-dock';
import { TopBar } from './game/top-bar';
import { CROPS, WELCOME_BALANCE, getCrop } from '@/lib/game-data';
import { applyFarmAction, createFarmPlots, getPlotPhase } from '@/lib/game-engine';
import type {
  FarmPlot,
  FarmTool,
  FriendSummary,
  GamePanel,
  ModelId,
  TokenPackage,
  VisitorAction,
} from '@/lib/game-types';

type Screen = 'auth' | 'onboarding' | 'game';

const DEMO_BALANCE = 44_050_000n;

// eslint-disable-next-line max-lines-per-function -- The app shell coordinates local demo adapters; server-backed state will replace this composition boundary.
export function TokenFarmerApp() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [nickname, setNickname] = useState('新农场主');
  const [level, setLevel] = useState(1);
  const [modelId, setModelId] = useState<ModelId>('gpt-5.4-mini');
  const [balance, setBalance] = useState(WELCOME_BALANCE);
  const [plots, setPlots] = useState<FarmPlot[]>(() => createFarmPlots(currentUtcMs()));
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(1);
  const [selectedCrop, setSelectedCrop] = useState(CROPS[0]);
  const [activeTool, setActiveTool] = useState<FarmTool>('inspect');
  const [panel, setPanel] = useState<GamePanel>(null);
  const [visitingFriend, setVisitingFriend] = useState<FriendSummary | null>(null);
  const [friendPlots, setFriendPlots] = useState<FarmPlot[]>([]);
  const [visitorAction, setVisitorAction] = useState<VisitorAction>('inspect');
  const [friendAttempts, setFriendAttempts] = useState<Set<string>>(() => new Set());
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(currentUtcMs);

  useEffect(() => {
    if (screen !== 'game') return;
    const interval = window.setInterval(() => setNowMs(currentUtcMs()), 1_000);
    return () => window.clearInterval(interval);
  }, [screen]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2_600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const visiblePlots = visitingFriend ? friendPlots : plots;
  const selectedPlot = useMemo(
    () => visiblePlots.find((plot) => plot.id === selectedPlotId) ?? null,
    [visiblePlots, selectedPlotId],
  );

  const enterDemo = () => {
    const currentTime = currentUtcMs();
    setNickname('演示农场主');
    setLevel(15);
    setBalance(DEMO_BALANCE);
    setPlots(createFarmPlots(currentTime, true));
    setPackages([
      {
        id: 'demo-1',
        cropName: '油菜花',
        modelId: 'gpt-5.4-mini',
        amount: 2_880_000n,
        createdAt: '今天 13:42',
        source: 'harvest',
      },
      {
        id: 'demo-2',
        cropName: '生菜',
        modelId: 'claude-sonnet-4-6',
        amount: 1_005_000n,
        createdAt: '今天 12:18',
        source: 'steal',
      },
    ]);
    setScreen('game');
    setToast('演示农场已载入');
  };

  const completeOnboarding = (nextNickname: string, nextModelId: ModelId) => {
    setNickname(nextNickname);
    setModelId(nextModelId);
    setBalance(WELCOME_BALANCE);
    setPlots(createFarmPlots(currentUtcMs()));
    setScreen('game');
    setToast('统一 Token Credit 余额获得 80K 首次赠送');
  };

  const handlePlotClick = (plotId: number) => {
    setSelectedPlotId(plotId);
    if (visitingFriend) {
      handleFriendPlotClick(plotId, visitingFriend);
      return;
    }
    const original = plots.find((plot) => plot.id === plotId);
    if (!original || activeTool === 'inspect') return;
    const actionCrop = getCrop(original.cropId) ?? selectedCrop;
    const actionModel = original.modelId ?? modelId;
    const result = applyFarmAction({
      plot: original,
      tool: activeTool,
      crop: actionCrop,
      modelId: actionModel,
      nowMs: currentUtcMs(),
      walletBalance: balance,
    });
    setToast(result.message);
    if (!result.changed) return;
    setPlots((items) => items.map((plot) => (plot.id === plotId ? result.plot : plot)));
    if (result.balanceDelta !== 0n) {
      setBalance((current) => current + result.balanceDelta);
    }
    if (result.packageAmount > 0n) {
      const tokenPackage: TokenPackage = {
        id: `${plotId}-${currentUtcMs()}`,
        cropName: actionCrop.name,
        modelId: actionModel,
        amount: result.packageAmount,
        createdAt: '刚刚',
        source: 'harvest',
      };
      setPackages((items) => [tokenPackage, ...items]);
    }
  };

  const handleFriendPlotClick = (plotId: number, friend: FriendSummary) => {
    const original = friendPlots.find((plot) => plot.id === plotId);
    if (!original) return;
    if (visitorAction === 'inspect')
      return setToast(original.cropId ? '已查看好友作物' : '好友的空地');
    if (visitorAction === 'help') {
      if (!original.issue && original.watered) return setToast('这块地不需要帮助');
      setFriendPlots((items) =>
        items.map((plot) => (plot.id === plotId ? { ...plot, issue: null, watered: true } : plot)),
      );
      setToast(`帮助 ${friend.name} 完成维护，亲密度 +2`);
      return;
    }
    if (visitorAction === 'prank') {
      if (!original.cropId) return setToast('空地不能恶作剧');
      setFriendPlots((items) =>
        items.map((plot) =>
          plot.id === plotId
            ? { ...plot, issue: 'weed', durationMs: (plot.durationMs ?? 0) + 60_000 }
            : plot,
        ),
      );
      setToast('恶作剧成功：只延长成长时间，不扣除好友 Token');
      return;
    }
    attemptFriendSteal(original, friend);
  };

  const attemptFriendSteal = (plot: FarmPlot, friend: FriendSummary) => {
    const key = `${friend.name}:${plot.id}`;
    if (friendAttempts.has(key)) return setToast('同一好友同一茬只能尝试一次');
    const crop = getCrop(plot.cropId);
    if (!crop || getPlotPhase(plot, currentUtcMs()) !== 'mature')
      return setToast('这块作物目前不可偷取');
    setFriendAttempts((items) => new Set(items).add(key));
    const guardRoll = sampleBasisPoints();
    const successRoll = sampleBasisPoints();
    if (guardRoll < 1_500) return setToast('偷取失败：被萌犬发现了');
    const successChance = Math.min(6_500, 3_500 + friend.intimacyLevel * 600);
    if (successRoll >= successChance) return setToast('这次没有偷到，下一茬再试试');
    const amount = stealAmount(crop.cost, sampleBasisPoints());
    setPackages((items) => [
      {
        id: `steal-${friend.name}-${plot.id}`,
        cropName: crop.name,
        modelId: plot.modelId ?? modelId,
        amount,
        createdAt: '刚刚',
        source: 'steal',
      },
      ...items,
    ]);
    setToast(`成功偷到 ${formatStealAmount(amount)} Token 包，已进入仓库`);
  };

  const visitFriend = (friend: FriendSummary) => {
    setVisitingFriend(friend);
    setFriendPlots(createFarmPlots(currentUtcMs(), true));
    setVisitorAction('inspect');
    setSelectedPlotId(1);
    setPanel(null);
    setToast(`已到达 ${friend.name} 的农场`);
  };

  const batchHarvest = () => {
    const currentTime = currentUtcMs();
    const harvested: TokenPackage[] = [];
    const nextPlots = plots.map((plot) => {
      if (getPlotPhase(plot, currentTime) !== 'mature') return plot;
      const crop = getCrop(plot.cropId);
      if (!crop) return plot;
      const packageModel = plot.modelId ?? modelId;
      const result = applyFarmAction({
        plot,
        tool: 'harvest',
        crop,
        modelId: packageModel,
        nowMs: currentTime,
        walletBalance: balance,
      });
      if (result.packageAmount > 0n)
        harvested.push({
          id: `${plot.id}-${currentTime}`,
          cropName: crop.name,
          modelId: packageModel,
          amount: result.packageAmount,
          createdAt: '刚刚',
          source: 'harvest',
        });
      return result.plot;
    });
    if (!harvested.length) return setToast('当前没有可收获的作物');
    setPlots(nextPlots);
    setPackages((items) => [...harvested, ...items]);
    setToast(`已收获 ${harvested.length} 块土地，Token 包已入仓`);
  };

  const activatePackage = (packageId: string) => {
    const tokenPackage = packages.find((item) => item.id === packageId);
    if (!tokenPackage) return;
    setBalance((current) => current + tokenPackage.amount);
    setPackages((items) => items.filter((item) => item.id !== packageId));
    setToast(`${tokenPackage.cropName} Token 包已激活`);
  };

  const activateAll = () => {
    if (!packages.length) return;
    setBalance((current) => current + packages.reduce((total, item) => total + item.amount, 0n));
    setPackages([]);
    setToast('所有 Token 包已激活');
  };

  const completePurchase = (amount: bigint) => {
    setBalance((current) => current + amount);
    setToast('支付宝沙箱回调已验证，Token 已入账');
  };

  return (
    <>
      <DesktopRequired />
      <div className="desktop-app">
        {screen === 'auth' && (
          <AuthScreen onContinue={() => setScreen('onboarding')} onDemo={enterDemo} />
        )}
        {screen === 'onboarding' && <OnboardingScreen onComplete={completeOnboarding} />}
        {screen === 'game' && (
          <div className="game-shell">
            <TopBar
              modelId={modelId}
              balance={balance}
              nickname={nickname}
              level={level}
              onModelChange={setModelId}
              onOpenPanel={setPanel}
              onOpenSocial={() => setPanel('social')}
            />
            <main className="game-main">
              <section className="farm-stage">
                <div className="farm-backdrop" aria-hidden="true" />
                <FarmCanvas
                  plots={visiblePlots}
                  selectedPlotId={selectedPlotId}
                  onPlotClick={handlePlotClick}
                  onPlotHover={() => undefined}
                />
                <FarmHud
                  plots={visiblePlots}
                  selectedCrop={selectedCrop}
                  selectedPlot={selectedPlot}
                  nowMs={nowMs}
                  farmName={
                    visitingFriend ? `${visitingFriend.name}的 Token 农场` : '晨露 Token 农场'
                  }
                  friendFarm={Boolean(visitingFriend)}
                />
                {visitingFriend ? (
                  <FriendVisitBar
                    friend={visitingFriend}
                    action={visitorAction}
                    attempts={
                      [...friendAttempts].filter((key) => key.startsWith(`${visitingFriend.name}:`))
                        .length
                    }
                    onAction={setVisitorAction}
                    onReturn={() => {
                      setVisitingFriend(null);
                      setSelectedPlotId(1);
                      setToast('已返回自己的农场');
                    }}
                  />
                ) : (
                  <ToolDock
                    activeTool={activeTool}
                    onToolChange={setActiveTool}
                    onBatchHarvest={batchHarvest}
                  />
                )}
                <GameToast message={toast} />
              </section>
              <FriendSidebar
                visiting={visitingFriend}
                onVisit={visitFriend}
                onAddFriend={() => setPanel('social')}
                onFeedDog={() => setToast('已续喂萌犬 1 天，守护概率规则保持不变')}
              />
            </main>
            <PanelHost
              panel={panel}
              selectedCrop={selectedCrop}
              level={level}
              balance={balance}
              packages={packages}
              modelId={modelId}
              onClose={() => setPanel(null)}
              onSelectCrop={(crop) => {
                setSelectedCrop(crop);
                setActiveTool('seed');
                setPanel(null);
                setToast(`已装备 ${crop.name} 花种`);
              }}
              onBuyTokens={() => setPanel('payment')}
              onActivate={activatePackage}
              onActivateAll={activateAll}
              onPurchase={completePurchase}
            />
          </div>
        )}
      </div>
    </>
  );
}

function DesktopRequired() {
  return (
    <main className="desktop-required">
      <span className="brand-mark">
        <Sprout size={21} />
      </span>
      <MonitorUp size={42} />
      <h1>请使用电脑浏览器</h1>
      <p>Token Farmer 当前支持宽度 1180px 以上的桌面屏幕。</p>
    </main>
  );
}

function currentUtcMs(): number {
  return new Date().getTime();
}

function sampleBasisPoints(): number {
  return (crypto.getRandomValues(new Uint16Array(1))[0] ?? 0) % 10_000;
}

function stealAmount(seedCost: bigint, roll: number): bigint {
  if (roll < 5_500) return maxBigInt(1n, (seedCost * 5n) / 1_000n);
  if (roll < 8_500) return maxBigInt(1n, seedCost / 100n);
  if (roll < 9_700) return maxBigInt(1n, (seedCost * 2n) / 100n);
  return maxBigInt(1n, (seedCost * 5n) / 100n);
}

function maxBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}

function formatStealAmount(amount: bigint): string {
  return amount >= 1_000n ? `${amount / 1_000n}K` : amount.toString();
}
