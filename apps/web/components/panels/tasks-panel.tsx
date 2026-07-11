'use client';

import { CalendarCheck, Check, Gift, Sprout, Users, Wheat } from 'lucide-react';
import { useState } from 'react';
import { PanelShell } from './panel-shell';

const TASKS = [
  {
    id: 'plant',
    title: '播种 3 块土地',
    progress: '2 / 3',
    percent: 67,
    reward: '80 花瓣',
    Icon: Sprout,
  },
  {
    id: 'harvest',
    title: '完成一次收获',
    progress: '1 / 1',
    percent: 100,
    reward: '120 花瓣',
    Icon: Wheat,
  },
  {
    id: 'friend',
    title: '帮助 2 位好友',
    progress: '0 / 2',
    percent: 0,
    reward: '20 亲密度',
    Icon: Users,
  },
];

// eslint-disable-next-line max-lines-per-function -- Repeated task rows remain together as one data-driven presentation.
export function TasksPanel({ onClose }: { onClose: () => void }) {
  const [claimed, setClaimed] = useState<string[]>([]);
  return (
    <PanelShell
      eyebrow="DAILY ROUTINE"
      title="今日任务"
      description="每天 00:00（Asia/Shanghai）刷新，不奖励可交易 Token。"
      onClose={onClose}
    >
      <div className="checkin-strip">
        <CalendarCheck size={24} />
        <span>
          <strong>连续签到 4 天</strong>
          <small>明日奖励：像素头像框碎片 ×1</small>
        </span>
        <div className="checkin-days">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <i className={day <= 4 ? 'done' : ''} key={day}>
              {day <= 4 ? <Check size={12} /> : day}
            </i>
          ))}
        </div>
        <button className="secondary-command" type="button" disabled>
          <Check size={16} />
          已签到
        </button>
      </div>
      <div className="task-list">
        {TASKS.map(({ id, title, progress, percent, reward, Icon }) => {
          const complete = percent === 100;
          const isClaimed = claimed.includes(id);
          return (
            <div className="task-row" key={id}>
              <span className="task-icon">
                <Icon size={20} />
              </span>
              <span className="task-meta">
                <strong>{title}</strong>
                <span className="task-track">
                  <i style={{ width: `${percent}%` }} />
                </span>
                <small>{progress}</small>
              </span>
              <span className="task-reward">
                <Gift size={15} />
                {reward}
              </span>
              <button
                className={
                  complete && !isClaimed ? 'primary-command compact-command' : 'secondary-command'
                }
                type="button"
                disabled={!complete || isClaimed}
                onClick={() => setClaimed((items) => [...items, id])}
              >
                {isClaimed ? '已领取' : complete ? '领取' : '进行中'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="weekly-progress">
        <div>
          <span className="section-kicker">WEEKLY</span>
          <h3>本周活跃</h3>
        </div>
        <div className="weekly-track">
          <i style={{ width: '62%' }} />
        </div>
        <strong>310 / 500</strong>
        <span className="weekly-chest">
          <Gift size={20} />
          头像框
        </span>
      </div>
    </PanelShell>
  );
}
