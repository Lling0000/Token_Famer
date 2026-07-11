'use client';

import { CalendarCheck, Check, Gift, Sprout, Users, Wheat } from 'lucide-react';
import { GAME_CONFIG_V1, getDailyTaskReward } from '@/lib/game-config-v1';
import { formatTokenAmount } from '@/lib/game-engine';
import { PanelShell } from './panel-shell';

const TASKS = [
  {
    id: 'plant',
    title: '播种 3 块土地',
    progress: '2 / 3',
    percent: 67,
    Icon: Sprout,
  },
  {
    id: 'harvest',
    title: '完成一次收获',
    progress: '1 / 1',
    percent: 100,
    Icon: Wheat,
  },
  {
    id: 'friend',
    title: '帮助 2 位好友',
    progress: '0 / 2',
    percent: 0,
    Icon: Users,
  },
];

// eslint-disable-next-line max-lines-per-function -- Repeated task rows remain together as one data-driven presentation.
export function TasksPanel({
  claimedTaskIds,
  onClaimTask,
  onClose,
}: {
  claimedTaskIds: readonly string[];
  onClaimTask: (taskId: string, rewardToken: bigint) => void;
  onClose: () => void;
}) {
  return (
    <PanelShell
      eyebrow="DAILY ROUTINE"
      title="今日任务"
      description="每天 00:00（Asia/Shanghai）刷新，完成后领取统一余额 Token。"
      onClose={onClose}
    >
      <div className="checkin-strip">
        <CalendarCheck size={24} />
        <span>
          <strong>连续签到 4 天</strong>
          <small>明日奖励：{formatTokenAmount(GAME_CONFIG_V1.nextCheckinRewardToken)} Token</small>
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
        {TASKS.map(({ id, title, progress, percent, Icon }) => {
          const complete = percent === 100;
          const isClaimed = claimedTaskIds.includes(id);
          const reward = getDailyTaskReward(id);
          if (!reward) return null;
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
                {formatTokenAmount(reward.rewardToken)} Token
                {reward.rewardIntimacy > 0 && ` + ${reward.rewardIntimacy} 亲密度`}
              </span>
              <button
                className={
                  complete && !isClaimed ? 'primary-command compact-command' : 'secondary-command'
                }
                type="button"
                disabled={!complete || isClaimed}
                onClick={() => onClaimTask(id, reward.rewardToken)}
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
          {formatTokenAmount(GAME_CONFIG_V1.weeklyRewardToken)} Token
        </span>
      </div>
    </PanelShell>
  );
}
