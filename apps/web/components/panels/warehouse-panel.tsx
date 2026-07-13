'use client';

import { Boxes, CheckCircle2, PackageOpen, Sparkles } from 'lucide-react';
import { getModel } from '@/lib/game-data';
import { formatTokenAmount } from '@/lib/game-engine';
import type { TokenPackage } from '@/lib/game-types';
import { ModelMark } from '../model/model-mark';
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
      wide
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
        <div className="package-grid">
          {packages.map((item) => {
            const model = getModel(item.modelId);
            return (
              <article className="package-card" key={item.id}>
                <header>
                  <ModelMark brand={model.brand} color={model.color} />
                  <span className={`package-source ${item.source}`}>
                    {item.source === 'harvest' ? '农场收获' : '好友偷取'}
                  </span>
                </header>
                <span className="package-card-meta">
                  <strong>{item.cropName}</strong>
                  <small>{model.label}</small>
                </span>
                <b>{formatTokenAmount(item.amount)} Token</b>
                <footer>
                  <time>{item.createdAt}</time>
                  <button
                    className="secondary-command"
                    type="button"
                    onClick={() => onActivate(item.id)}
                  >
                    <CheckCircle2 size={15} />
                    激活
                  </button>
                </footer>
              </article>
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
