'use client';

import { Boxes, CheckCircle2, PackageOpen, Sparkles } from 'lucide-react';
import { getModel } from '@/lib/game-data';
import { formatTokenAmount } from '@/lib/game-engine';
import type { TokenPackage } from '@/lib/game-types';
import { PanelShell } from './panel-shell';

interface WarehousePanelProps {
  packages: TokenPackage[];
  onActivate: (packageId: string) => void;
  onActivateAll: () => void;
  onClose: () => void;
}

// eslint-disable-next-line max-lines-per-function -- Repeated package rows remain in one presentation-only inventory view.
export function WarehousePanel({
  packages,
  onActivate,
  onActivateAll,
  onClose,
}: WarehousePanelProps) {
  const total = packages.reduce((sum, item) => sum + item.amount, 0n);
  return (
    <PanelShell
      eyebrow="TOKEN STORAGE"
      title="Token 仓库"
      description="收获和偷取所得先进入仓库，激活后才会进入对应模型钱包。"
      onClose={onClose}
      actions={
        <button
          className="primary-command compact-command"
          type="button"
          disabled={!packages.length}
          onClick={onActivateAll}
        >
          <Sparkles size={16} />
          全部激活
        </button>
      }
    >
      <div className="warehouse-total">
        <Boxes size={24} />
        <span>
          待激活总量<small>共 {packages.length} 个 Token 包</small>
        </span>
        <strong>{formatTokenAmount(total)}</strong>
      </div>
      {packages.length ? (
        <div className="package-list">
          {packages.map((item) => {
            const model = getModel(item.modelId);
            return (
              <div className="package-row" key={item.id}>
                <span className="package-icon" style={{ borderColor: model.color }}>
                  <PackageOpen size={20} />
                </span>
                <span className="package-meta">
                  <strong>{item.cropName}</strong>
                  <small>
                    {model.label} · {item.source === 'harvest' ? '农场收获' : '好友农场'}
                  </small>
                </span>
                <span className="package-time">{item.createdAt}</span>
                <b>{formatTokenAmount(item.amount)}</b>
                <button
                  className="secondary-command"
                  type="button"
                  onClick={() => onActivate(item.id)}
                >
                  <CheckCircle2 size={16} />
                  激活
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <PackageOpen size={42} />
          <strong>仓库里还没有 Token 包</strong>
          <p>成熟后使用收获工具，新的 Token 包会出现在这里。</p>
        </div>
      )}
    </PanelShell>
  );
}
