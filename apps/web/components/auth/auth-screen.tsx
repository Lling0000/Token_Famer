'use client';

import { ArrowRight, KeyRound, Mail, ShieldCheck, Sprout } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

interface AuthScreenProps {
  onContinue: () => void;
  onDemo: () => void;
}

// eslint-disable-next-line max-lines-per-function -- The authentication form is a single visual composition with no business rules.
export function AuthScreen({ onContinue, onDemo }: AuthScreenProps) {
  const [registering, setRegistering] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onContinue();
  };

  return (
    <main className="auth-screen">
      <div className="auth-atmosphere" aria-hidden="true" />
      <header className="auth-brand">
        <span className="brand-mark">
          <Sprout size={21} strokeWidth={2.5} />
        </span>
        <span>Token Farmer</span>
        <span className="sandbox-label">SANDBOX</span>
      </header>

      <section className="auth-message" aria-labelledby="auth-title">
        <span className="eyebrow">模型 Token 农场</span>
        <h1 id="auth-title">Token Farmer</h1>
        <p>种下一次调用，等待花开。经营你的模型余额，也守住朋友来访时的成熟果实。</p>
        <div className="auth-status-row">
          <span>
            <i className="status-dot" /> Mock 上游在线
          </span>
          <span>
            <ShieldCheck size={15} /> 邀请制测试
          </span>
        </div>
      </section>

      <section className="auth-form-panel" aria-label={registering ? '创建账号' : '登录账号'}>
        <div className="auth-form-heading">
          <span className="section-kicker">{registering ? 'JOIN THE FARM' : 'WELCOME BACK'}</span>
          <h2>{registering ? '创建农场账号' : '回到你的农场'}</h2>
          <p>{registering ? '使用邀请资格开启一块新土地。' : '成熟的 Token 花正在等你收获。'}</p>
        </div>
        <form onSubmit={handleSubmit}>
          {registering && (
            <label className="field-label">
              邀请码
              <span className="field-control">
                <KeyRound size={17} />
                <input required placeholder="TF-XXXX-XXXX" autoComplete="off" />
              </span>
            </label>
          )}
          <label className="field-label">
            邮箱
            <span className="field-control">
              <Mail size={17} />
              <input type="email" required placeholder="farmer@example.com" autoComplete="email" />
            </span>
          </label>
          <label className="field-label">
            密码
            <span className="field-control">
              <KeyRound size={17} />
              <input
                type="password"
                required
                minLength={8}
                placeholder="至少 8 位"
                autoComplete={registering ? 'new-password' : 'current-password'}
              />
            </span>
          </label>
          <button className="primary-command auth-submit" type="submit">
            {registering ? '验证邮箱' : '登录农场'}
            <ArrowRight size={18} />
          </button>
        </form>
        <div className="auth-alternatives">
          <button
            className="text-command"
            type="button"
            onClick={() => setRegistering((value) => !value)}
          >
            {registering ? '已有账号，直接登录' : '持有邀请码，创建账号'}
          </button>
          <button className="demo-command" type="button" onClick={onDemo}>
            进入演示农场
          </button>
        </div>
      </section>

      <footer className="auth-footer">测试 Token 不可提现、交易或转账</footer>
    </main>
  );
}
