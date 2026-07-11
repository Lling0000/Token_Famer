'use client';

import { Check, Copy, Dog, Link2, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PanelShell } from './panel-shell';

// eslint-disable-next-line max-lines-per-function -- The social dialog is presentation-only and contains no policy calculation.
export function SocialPanel({ onClose }: { onClose: () => void }) {
  const [friendCode, setFriendCode] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [pranksAllowed, setPranksAllowed] = useState(true);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (friendCode.trim().length >= 4) setRequestSent(true);
  };

  return (
    <PanelShell
      eyebrow="SOCIAL HUB"
      title="好友与守护"
      description="通过好友码添加农场主；帮助会增加亲密度，恶作剧只影响时间，不转移 Token。"
      onClose={onClose}
    >
      <div className="friend-code-card">
        <span>
          <Link2 size={18} />
          <strong>我的好友码</strong>
        </span>
        <code>FARM-2026</code>
        <button
          className="icon-button"
          type="button"
          title="复制好友码"
          aria-label="复制好友码"
          onClick={() => navigator.clipboard?.writeText('FARM-2026')}
        >
          <Copy size={16} />
        </button>
      </div>
      <form className="add-friend-form" onSubmit={submit}>
        <UserPlus size={19} />
        <input
          value={friendCode}
          onChange={(event) => {
            setFriendCode(event.target.value);
            setRequestSent(false);
          }}
          placeholder="输入好友码"
          aria-label="好友码"
        />
        <button
          className="primary-command compact-command"
          type="submit"
          disabled={friendCode.trim().length < 4 || requestSent}
        >
          {requestSent ? <Check size={16} /> : <UserPlus size={16} />}
          {requestSent ? '请求已发送' : '添加好友'}
        </button>
      </form>
      <section className="social-section">
        <div>
          <span className="section-kicker">REQUESTS</span>
          <h3>好友申请</h3>
        </div>
        {accepted ? (
          <div className="request-empty">
            <Check size={18} />
            申请已处理
          </div>
        ) : (
          <div className="friend-request">
            <span className="friend-avatar blue">栈</span>
            <span>
              <strong>全栈菜园</strong>
              <small>共同好友 2 人 · LV.8</small>
            </span>
            <button className="secondary-command" type="button" onClick={() => setAccepted(true)}>
              忽略
            </button>
            <button
              className="primary-command compact-command"
              type="button"
              onClick={() => setAccepted(true)}
            >
              <Check size={15} />
              接受
            </button>
          </div>
        )}
      </section>
      <section className="social-section settings-list">
        <div>
          <span className="section-kicker">PROTECTION</span>
          <h3>农场规则</h3>
        </div>
        <label>
          <span>
            <Dog size={18} />
            <b>萌犬守护</b>
            <small>剩余 06:42:18，概率拦截偷取</small>
          </span>
          <strong className="status-on">
            <i />
            生效中
          </strong>
        </label>
        <label>
          <span>
            <Users size={18} />
            <b>好友恶作剧</b>
            <small>仅增加成长时间，不扣余额</small>
          </span>
          <input
            type="checkbox"
            checked={pranksAllowed}
            onChange={(event) => setPranksAllowed(event.target.checked)}
          />
        </label>
        <div className="security-note">
          <ShieldCheck size={17} />
          同一好友同一茬最多尝试偷取一次，结果由服务端概率规则结算。
        </div>
      </section>
    </PanelShell>
  );
}
