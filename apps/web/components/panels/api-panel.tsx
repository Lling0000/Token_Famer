'use client';

import { Check, Clipboard, KeyRound, Plus, ShieldCheck, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import { PanelShell } from './panel-shell';

const API_ENDPOINT = 'https://api.tokenfarmer.online/v1';

// eslint-disable-next-line max-lines-per-function -- This panel keeps the one-time key reveal alongside its tightly coupled controls.
export function ApiPanel({ onClose }: { onClose: () => void }) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasKey, setHasKey] = useState(true);

  const createKey = () => {
    setNewKey('sk-tf-demo_K4oPx8mQ2vN7wR5s');
    setHasKey(true);
    setCopied(false);
  };
  const copyKey = async () => {
    if (!newKey) return;
    await navigator.clipboard?.writeText(newKey);
    setCopied(true);
  };

  return (
    <PanelShell
      wide
      eyebrow="MODEL GATEWAY"
      title="API 接入"
      description="统一密钥调用已授权模型，Token 按最终用量结算；密钥只在创建时展示一次。"
      onClose={onClose}
      actions={
        <button className="primary-command compact-command" type="button" onClick={createKey}>
          <Plus size={16} />
          创建密钥
        </button>
      }
    >
      {newKey && (
        <div className="key-reveal">
          <ShieldCheck size={21} />
          <span>
            <strong>立即保存这枚密钥</strong>
            <small>关闭后将无法再次查看完整内容。</small>
          </span>
          <code>{newKey}</code>
          <button
            className="icon-button"
            type="button"
            title="复制密钥"
            aria-label="复制密钥"
            onClick={copyKey}
          >
            {copied ? <Check size={18} /> : <Clipboard size={18} />}
          </button>
        </div>
      )}
      <div className="api-overview">
        <div className="endpoint-block">
          <span>Base URL</span>
          <code>{API_ENDPOINT}</code>
          <button
            className="icon-button"
            type="button"
            title="复制地址"
            aria-label="复制地址"
            onClick={() => navigator.clipboard?.writeText(API_ENDPOINT)}
          >
            <Clipboard size={17} />
          </button>
        </div>
        <div className="usage-block">
          <span>
            <Zap size={16} />
            本月用量
          </span>
          <strong>286.4K</strong>
          <div className="usage-track">
            <i style={{ width: '34%' }} />
          </div>
          <small>按最终 usage 结算</small>
        </div>
      </div>
      <section className="api-section">
        <div className="api-section-heading">
          <div>
            <span className="section-kicker">API KEYS</span>
            <h3>访问密钥</h3>
          </div>
          <span>1 / 5</span>
        </div>
        {hasKey ? (
          <div className="key-row">
            <span className="key-icon">
              <KeyRound size={19} />
            </span>
            <span>
              <strong>桌面开发</strong>
              <code>sk-tf-demo_••••••••••••wR5s</code>
            </span>
            <small>今天 14:26 使用</small>
            <span className="key-status">
              <i />
              有效
            </span>
            <button
              className="icon-button danger"
              type="button"
              onClick={() => setHasKey(false)}
              title="撤销密钥"
              aria-label="撤销密钥"
            >
              <Trash2 size={17} />
            </button>
          </div>
        ) : (
          <div className="empty-key">没有有效密钥。创建后即可调用沙箱模型。</div>
        )}
      </section>
    </PanelShell>
  );
}
