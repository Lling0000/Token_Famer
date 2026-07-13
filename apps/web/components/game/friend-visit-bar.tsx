'use client';

import { ArrowLeft, Eye, Gift, HandHeart, ShieldAlert } from 'lucide-react';
import type { FriendSummary, VisitorAction } from '@/lib/game-types';

interface FriendVisitBarProps {
  friend: FriendSummary;
  action: VisitorAction;
  attempts: number;
  onAction: (action: VisitorAction) => void;
  onReturn: () => void;
}

const ACTIONS = [
  { id: 'inspect', label: '查看', Icon: Eye },
  { id: 'help', label: '帮忙', Icon: HandHeart },
  { id: 'prank', label: '恶作剧', Icon: ShieldAlert },
  { id: 'steal', label: '试着偷取', Icon: Gift },
] as const;

export function FriendVisitBar({
  friend,
  action,
  attempts,
  onAction,
  onReturn,
}: FriendVisitBarProps) {
  return (
    <div className="friend-visit-bar" aria-label="好友农场操作">
      <button className="return-farm" type="button" onClick={onReturn}>
        <ArrowLeft size={17} />
        返回我的农场
      </button>
      <span className={`friend-avatar ${friend.tone}`}>{friend.initials}</span>
      <span className="visit-meta">
        <strong>{friend.name}</strong>
        <small>
          亲密度 LV.{friend.intimacyLevel} · 今日尝试 {attempts}/20
        </small>
      </span>
      <span className="visit-divider" />
      {ACTIONS.map(({ id, label, Icon }) => (
        <button
          className={action === id ? 'visit-action active' : 'visit-action'}
          type="button"
          key={id}
          onClick={() => onAction(id)}
        >
          <Icon size={17} />
          {label}
        </button>
      ))}
    </div>
  );
}
