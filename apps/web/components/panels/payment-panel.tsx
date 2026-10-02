'use client';

import { CheckCircle2, CreditCard, LockKeyhole, PackageCheck, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { formatTokenAmount } from '@/lib/game-engine';
import { PanelShell } from './panel-shell';

const SKUS = [
  { id: 'starter', name: '育苗包', amount: 100_000n, cents: 600, note: '适合补充短周期花种' },
  { id: 'grower', name: '成长包', amount: 500_000n, cents: 2_500, note: '本周沙箱推荐' },
  { id: 'estate', name: '庄园包', amount: 2_000_000n, cents: 8_800, note: '长周期种植储备' },
] as const;

interface PaymentPanelProps {
  onPurchase: (amount: bigint) => void;
  onClose: () => void;
}

// eslint-disable-next-line max-lines-per-function -- Checkout choices and confirmation form one sandbox interaction surface.
export function PaymentPanel({ onPurchase, onClose }: PaymentPanelProps) {
  const [selectedId, setSelectedId] = useState<(typeof SKUS)[number]['id']>('grower');
  const [paid, setPaid] = useState(false);
  const selected = SKUS.find((sku) => sku.id === selectedId) ?? SKUS[1];

  const completeSandboxPayment = () => {
    if (paid) return;
    setPaid(true);
    onPurchase(selected.amount);
  };

  return (
    <PanelShell
      wide
      eyebrow="PAYMENT SANDBOX"
      title="购买模型 Token"
      description="沙箱体验：选择 Token 包并模拟入账，统一余额可用于播种与模型调用。"
      onClose={onClose}
    >
      <div className="payment-layout">
        <div className="sku-list">
          {SKUS.map((sku) => (
            <button
              className={selectedId === sku.id ? 'sku-card selected' : 'sku-card'}
              type="button"
              key={sku.id}
              onClick={() => {
                setSelectedId(sku.id);
                setPaid(false);
              }}
            >
              <span className="sku-icon">
                <ShoppingBag size={21} />
              </span>
              <span>
                <strong>{sku.name}</strong>
                <small>{sku.note}</small>
              </span>
              <b>{formatTokenAmount(sku.amount)}</b>
              <em>{formatCents(sku.cents)}</em>
            </button>
          ))}
        </div>
        <section className="sandbox-checkout">
          <div className="sandbox-badge">
            <LockKeyhole size={15} />
            沙箱体验
          </div>
          <PackageCheck size={96} strokeWidth={1.5} />
          <span>
            充值到 <strong>统一 Token Credit 余额</strong>
          </span>
          <b>{formatCents(selected.cents)}</b>
          <button
            className="primary-command payment-command"
            type="button"
            onClick={completeSandboxPayment}
            disabled={paid}
          >
            {paid ? <CheckCircle2 size={17} /> : <CreditCard size={17} />}
            {paid ? '沙箱入账完成' : '模拟支付并入账'}
          </button>
          <small>此页面用于演示，不发起真实扣款</small>
        </section>
      </div>
    </PanelShell>
  );
}

function formatCents(cents: number): string {
  return `¥${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
