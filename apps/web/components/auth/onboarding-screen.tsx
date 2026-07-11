'use client';

import { ArrowRight, Gift, ShieldCheck, Sparkles, Sprout } from 'lucide-react';
import { useState } from 'react';
import { FEATURED_MODELS } from '@/lib/game-data';
import type { ModelId } from '@/lib/game-types';

interface OnboardingScreenProps {
  onComplete: (nickname: string, modelId: ModelId) => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [nickname, setNickname] = useState('新农场主');
  const [modelId, setModelId] = useState<ModelId>('gpt-5.4-mini');

  return (
    <main className="onboarding-screen">
      <header className="onboarding-brand">
        <Sprout size={20} /> Token Farmer
      </header>
      <section className="onboarding-copy">
        <span className="eyebrow">WELCOME GRANT</span>
        <h1>你的第一袋 Token 种子</h1>
        <p>首次验证登录获得 80K 统一 Token Credit，可用于所有已授权模型调用和农场种植。</p>
      </section>
      <WelcomeGrant />
      <FarmSetup
        nickname={nickname}
        modelId={modelId}
        onNicknameChange={setNickname}
        onModelChange={setModelId}
        onSubmit={() => onComplete(nickname.trim(), modelId)}
      />
    </main>
  );
}

function WelcomeGrant() {
  return (
    <section className="welcome-grant" aria-label="首次登录奖励">
      <div className="grant-stamp">
        <Gift size={32} />
        <span>首次赠送</span>
      </div>
      <div className="grant-models">
        {FEATURED_MODELS.map((model) => (
          <div className="grant-item" key={model.id}>
            <i style={{ backgroundColor: model.color }} />
            <span>{model.shortLabel}</span>
            <strong>花型基因</strong>
          </div>
        ))}
      </div>
      <div className="grant-note">
        <ShieldCheck size={15} />
        80K 共享余额 · 20 个模型 · 仅可领取一次
      </div>
    </section>
  );
}

interface FarmSetupProps {
  nickname: string;
  modelId: ModelId;
  onNicknameChange: (value: string) => void;
  onModelChange: (value: ModelId) => void;
  onSubmit: () => void;
}

function FarmSetup(props: FarmSetupProps) {
  return (
    <section className="onboarding-setup">
      <label className="field-label">
        农场昵称
        <span className="field-control">
          <Sparkles size={17} />
          <input
            value={props.nickname}
            maxLength={16}
            onChange={(event) => props.onNicknameChange(event.target.value)}
          />
        </span>
      </label>
      <fieldset className="model-choice">
        <legend>选择首株花的模型基因</legend>
        {FEATURED_MODELS.map((model) => (
          <button
            className={
              model.id === props.modelId ? 'model-choice-button active' : 'model-choice-button'
            }
            type="button"
            key={model.id}
            onClick={() => props.onModelChange(model.id)}
          >
            <i style={{ backgroundColor: model.color }} />
            <span>{model.shortLabel}</span>
          </button>
        ))}
      </fieldset>
      <button
        className="primary-command onboarding-submit"
        type="button"
        disabled={!props.nickname.trim()}
        onClick={props.onSubmit}
      >
        领取并进入农场 <ArrowRight size={18} />
      </button>
    </section>
  );
}
