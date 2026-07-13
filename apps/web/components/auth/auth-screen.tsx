'use client';

import { ArrowRight, Copy, KeyRound, Mail, ShieldCheck, Sprout, UserRound } from 'lucide-react';
import type { AuthenticatedAccount, AuthDraft, AuthMode } from '@/lib/use-auth-flow';
import { useAuthFlow } from '@/lib/use-auth-flow';

interface AuthScreenProps {
  onAuthenticated: (account: AuthenticatedAccount) => void;
  onDemo: () => void;
}

type AuthFlow = ReturnType<typeof useAuthFlow>;

const AUTH_COPY: Record<
  AuthMode,
  { kicker: string; heading: string; description: string; submit: string }
> = {
  login: {
    kicker: 'WELCOME BACK',
    heading: '回到你的农场',
    description: '邀请制账号使用邮箱、密码与动态码保护。',
    submit: '登录农场',
  },
  register: {
    kicker: 'JOIN THE FARM',
    heading: '创建农场账号',
    description: '邀请制账号使用邮箱、密码与动态码保护。',
    submit: '创建并验证',
  },
  verify: {
    kicker: 'JOIN THE FARM',
    heading: '验证并绑定 2FA',
    description: '先保存身份验证器密钥，再验证邮箱。',
    submit: '完成邮箱验证',
  },
};

export function AuthScreen({ onAuthenticated, onDemo }: AuthScreenProps) {
  const flow = useAuthFlow(onAuthenticated);
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
        <p>种下一次调用，等待花开。使用统一 Token Credit 经营农场与模型调用。</p>
        <div className="auth-status-row">
          <span>
            <i className="status-dot" /> Mock 上游在线
          </span>
          <span>
            <ShieldCheck size={15} /> 邀请制测试
          </span>
        </div>
      </section>
      <AuthPanel flow={flow} onDemo={onDemo} />
      <footer className="auth-footer">测试 Token 不可提现、交易或转账</footer>
    </main>
  );
}

function AuthPanel({ flow, onDemo }: { flow: AuthFlow; onDemo: () => void }) {
  const copy = AUTH_COPY[flow.mode];
  return (
    <section className="auth-form-panel" aria-label={copy.heading}>
      <div className="auth-form-heading">
        <span className="section-kicker">{copy.kicker}</span>
        <h2>{copy.heading}</h2>
        <p>{copy.description}</p>
      </div>
      <form onSubmit={flow.submit} aria-busy={flow.busy}>
        <AuthFields flow={flow} />
        {flow.error && (
          <p className="auth-feedback error" role="alert">
            {flow.error}
          </p>
        )}
        {flow.notice && <p className="auth-feedback success">{flow.notice}</p>}
        <button className="primary-command auth-submit" type="submit" disabled={flow.busy}>
          {flow.busy ? '处理中…' : copy.submit}
          <ArrowRight size={18} />
        </button>
      </form>
      <AuthAlternatives flow={flow} onDemo={onDemo} />
    </section>
  );
}

function AuthFields({ flow }: { flow: AuthFlow }) {
  if (flow.mode === 'login') return <LoginFields draft={flow.draft} update={flow.updateDraft} />;
  if (flow.mode === 'register')
    return <RegisterFields draft={flow.draft} update={flow.updateDraft} />;
  return <VerificationFields flow={flow} />;
}

function LoginFields({ draft, update }: AuthFieldsProps) {
  return (
    <>
      <AuthInput
        label="邮箱"
        icon="mail"
        type="email"
        value={draft.email}
        autoComplete="email"
        onChange={(value) => update('email', value)}
      />
      <LoginCredentials draft={draft} update={update} />
    </>
  );
}

function LoginCredentials({ draft, update }: AuthFieldsProps) {
  return (
    <>
      <AuthInput
        label="密码"
        icon="key"
        type="password"
        value={draft.password}
        minLength={12}
        autoComplete="current-password"
        onChange={(value) => update('password', value)}
      />
      <AuthInput
        label="两步验证码"
        icon="shield"
        value={draft.totp}
        pattern="[0-9]{6}"
        maxLength={6}
        inputMode="numeric"
        autoComplete="one-time-code"
        onChange={(value) => update('totp', digits(value))}
      />
    </>
  );
}

function RegisterFields({ draft, update }: AuthFieldsProps) {
  return (
    <>
      <div className="sandbox-invite-note">
        预览邀请码：<code>TOKEN-FARMER-ALPHA</code>
      </div>
      <AuthInput
        label="邀请码"
        icon="key"
        value={draft.inviteCode}
        autoComplete="off"
        onChange={(value) => update('inviteCode', value)}
      />
      <AuthInput
        label="农场主昵称"
        icon="user"
        value={draft.displayName}
        minLength={2}
        maxLength={40}
        autoComplete="nickname"
        onChange={(value) => update('displayName', value)}
      />
      <AuthInput
        label="邮箱"
        icon="mail"
        type="email"
        value={draft.email}
        autoComplete="email"
        onChange={(value) => update('email', value)}
      />
      <RegistrationPasswords draft={draft} update={update} />
    </>
  );
}

function RegistrationPasswords({ draft, update }: AuthFieldsProps) {
  return (
    <>
      <AuthInput
        label="密码"
        icon="key"
        type="password"
        value={draft.password}
        minLength={12}
        autoComplete="new-password"
        onChange={(value) => update('password', value)}
      />
      <AuthInput
        label="确认密码"
        icon="key"
        type="password"
        value={draft.confirmPassword}
        minLength={12}
        autoComplete="new-password"
        onChange={(value) => update('confirmPassword', value)}
      />
    </>
  );
}

function VerificationFields({ flow }: { flow: AuthFlow }) {
  const uri = flow.registration?.totpUri ?? '';
  return (
    <>
      <div className="totp-setup">
        <span>
          <ShieldCheck size={18} />
          <b>身份验证器密钥</b>
        </span>
        <code>{totpSecret(uri)}</code>
        <button
          type="button"
          className="icon-button"
          title="复制密钥"
          aria-label="复制身份验证器密钥"
          onClick={() => navigator.clipboard?.writeText(totpSecret(uri))}
        >
          <Copy size={16} />
        </button>
      </div>
      {flow.registration?.sandboxVerificationCode && (
        <div className="sandbox-code">
          沙箱邮箱验证码 <b>{flow.registration.sandboxVerificationCode}</b>
        </div>
      )}
      <AuthInput
        label="邮箱验证码"
        icon="mail"
        value={flow.draft.verificationCode}
        pattern="[0-9]{6}"
        maxLength={6}
        inputMode="numeric"
        autoComplete="one-time-code"
        onChange={(value) => flow.updateDraft('verificationCode', digits(value))}
      />
    </>
  );
}

interface AuthFieldsProps {
  draft: AuthDraft;
  update: (field: keyof AuthDraft, value: string) => void;
}

interface AuthInputProps {
  label: string;
  icon: 'mail' | 'key' | 'shield' | 'user';
  value: string;
  onChange: (value: string) => void;
  type?: 'email' | 'password';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  inputMode?: 'numeric';
  autoComplete: string;
}

function AuthInput({ label, icon, value, onChange, ...inputProps }: AuthInputProps) {
  const Icon =
    icon === 'mail'
      ? Mail
      : icon === 'user'
        ? UserRound
        : icon === 'shield'
          ? ShieldCheck
          : KeyRound;
  return (
    <label className="field-label">
      {label}
      <span className="field-control">
        <Icon size={17} />
        <input
          {...inputProps}
          required
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function AuthAlternatives({ flow, onDemo }: { flow: AuthFlow; onDemo: () => void }) {
  if (flow.mode === 'verify')
    return (
      <button className="text-command" type="button" onClick={() => flow.changeMode('register')}>
        返回修改注册信息
      </button>
    );
  return (
    <div className="auth-alternatives">
      <button
        className="text-command"
        type="button"
        onClick={() => flow.changeMode(flow.mode === 'login' ? 'register' : 'login')}
      >
        {flow.mode === 'register' ? '已有账号，直接登录' : '持有邀请码，创建账号'}
      </button>
      <button className="demo-command" type="button" onClick={onDemo}>
        进入演示农场
      </button>
    </div>
  );
}

const digits = (value: string): string => value.replace(/\D/g, '').slice(0, 6);
const totpSecret = (uri: string): string =>
  new URL(uri || 'otpauth://totp/Token').searchParams.get('secret') ?? '';
