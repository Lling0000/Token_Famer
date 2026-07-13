'use client';

import {
  Bell,
  Footprints,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Shield,
  Sparkles,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import type { FriendSummary } from '@/lib/game-types';

export const FRIENDS: FriendSummary[] = [
  {
    name: '像素阿禾',
    initials: '禾',
    level: 12,
    status: '可偷 3',
    tone: 'mint',
    alert: true,
    intimacyLevel: 4,
  },
  {
    name: 'Claude园丁',
    initials: 'C',
    level: 9,
    status: '帮忙 2',
    tone: 'coral',
    alert: true,
    intimacyLevel: 3,
  },
  {
    name: '晚风种植社',
    initials: '晚',
    level: 15,
    status: '4小时后',
    tone: 'violet',
    alert: false,
    intimacyLevel: 5,
  },
  {
    name: 'Mini麦田',
    initials: 'M',
    level: 7,
    status: '已收获',
    tone: 'gold',
    alert: false,
    intimacyLevel: 2,
  },
  {
    name: '今天不熬夜',
    initials: '夜',
    level: 5,
    status: '成熟 1',
    tone: 'blue',
    alert: true,
    intimacyLevel: 1,
  },
  {
    name: '三号实验田',
    initials: '三',
    level: 11,
    status: '8小时后',
    tone: 'slate',
    alert: false,
    intimacyLevel: 3,
  },
];

interface FriendSidebarProps {
  visiting: FriendSummary | null;
  collapsed: boolean;
  nowMs: number;
  dogGuardUntilMs: number;
  onVisit: (friend: FriendSummary) => void;
  onAddFriend: () => void;
  onToggle: () => void;
  onFeedDog: () => void;
}

// eslint-disable-next-line max-lines-per-function -- The sidebar is one data-driven navigation list without business calculations.
export function FriendSidebar({
  visiting,
  collapsed,
  nowMs,
  dogGuardUntilMs,
  onVisit,
  onAddFriend,
  onToggle,
  onFeedDog,
}: FriendSidebarProps) {
  const [query, setQuery] = useState('');
  const visibleFriends = FRIENDS.filter((friend) =>
    friend.name.toLowerCase().includes(query.toLowerCase()),
  );

  if (collapsed) {
    return (
      <aside className="friend-sidebar collapsed" aria-label="已收起的好友农场">
        <button className="sidebar-toggle" type="button" onClick={onToggle} title="展开好友栏">
          <PanelRightOpen size={19} />
          <span>展开好友栏</span>
        </button>
        <button
          className="collapsed-sidebar-action"
          type="button"
          onClick={onAddFriend}
          title="好友"
        >
          <Users size={19} />
          <i>3</i>
        </button>
        <button
          className="collapsed-sidebar-action dog"
          type="button"
          onClick={onFeedDog}
          title="萌犬守护"
        >
          <Shield size={19} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="friend-sidebar">
      <header className="friend-heading">
        <div>
          <span className="section-kicker">NEIGHBORS</span>
          <h2>好友农场</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          title="添加好友"
          aria-label="添加好友"
          onClick={onAddFriend}
        >
          <UserRoundPlus size={18} />
        </button>
        <button
          className="icon-button"
          type="button"
          title="收起好友栏"
          aria-label="收起好友栏"
          onClick={onToggle}
        >
          <PanelRightClose size={18} />
        </button>
      </header>
      <label className="friend-search">
        <Search size={15} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索好友"
        />
      </label>
      <div className="friend-alerts">
        <Bell size={15} />
        <span>
          <strong>3 块</strong>好友土地可以行动
        </span>
        <button
          type="button"
          title="逐个查看"
          onClick={() => onVisit(FRIENDS.find((friend) => friend.alert) ?? FRIENDS[0]!)}
        >
          查看
        </button>
      </div>
      <div className="friend-list" role="list">
        {visibleFriends.map((friend) => (
          <div
            className={visiting?.name === friend.name ? 'friend-row visiting' : 'friend-row'}
            role="listitem"
            key={friend.name}
          >
            <span className={`friend-avatar ${friend.tone}`}>{friend.initials}</span>
            <span className="friend-meta">
              <strong>{friend.name}</strong>
              <small>LV.{friend.level}</small>
            </span>
            <span className={friend.alert ? 'friend-status actionable' : 'friend-status'}>
              {friend.status}
            </span>
            <button
              className="visit-button"
              type="button"
              title={`访问${friend.name}`}
              aria-label={`访问${friend.name}`}
              onClick={() => onVisit(friend)}
            >
              <Footprints size={17} />
            </button>
          </div>
        ))}
      </div>
      <footer className="friend-footer">
        <span>
          <Shield size={15} />
          萌犬守护 <b>{formatGuardTime(dogGuardUntilMs - nowMs)}</b>
        </span>
        <button
          className="icon-button compact"
          type="button"
          title="续喂狗粮"
          aria-label="续喂狗粮"
          onClick={onFeedDog}
        >
          <Plus size={16} />
        </button>
      </footer>
      <div className="intimacy-note">
        <Sparkles size={14} /> 今日帮助好友可获得亲密度
      </div>
    </aside>
  );
}

function formatGuardTime(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
}
