'use client';

import { Crown, Medal, Trophy, Users } from 'lucide-react';
import { useState } from 'react';
import { PanelShell } from './panel-shell';

const RANKINGS = [
  { name: '星海温室', value: '18.82M', delta: '+2', tone: 'mint' },
  { name: '像素阿禾', value: '16.47M', delta: '-1', tone: 'coral' },
  { name: '红枣研究所', value: '14.20M', delta: '+1', tone: 'gold' },
  { name: 'Claude园丁', value: '11.98M', delta: '—', tone: 'violet' },
  { name: '晚风种植社', value: '10.74M', delta: '+3', tone: 'blue' },
  { name: '土豆调用器', value: '9.36M', delta: '-2', tone: 'slate' },
  { name: 'Mini麦田', value: '8.91M', delta: '+4', tone: 'mint' },
];

type RankType = 'harvest' | 'usage' | 'holding';

// eslint-disable-next-line max-lines-per-function -- The podium and tabular ranking are one responsive presentation unit.
export function LeaderboardPanel({ onClose }: { onClose: () => void }) {
  const [rankType, setRankType] = useState<RankType>('harvest');
  const [scope, setScope] = useState<'global' | 'friends'>('global');
  return (
    <PanelShell
      wide
      eyebrow="TOKEN SCORE"
      title="农场排行榜"
      description="模型 Token 按价格版本折算为统一分数，装饰奖励不会增加余额。"
      onClose={onClose}
    >
      <div className="ranking-controls">
        <div className="segmented-control">
          <button
            className={rankType === 'harvest' ? 'active' : ''}
            onClick={() => setRankType('harvest')}
            type="button"
          >
            净收获
          </button>
          <button
            className={rankType === 'usage' ? 'active' : ''}
            onClick={() => setRankType('usage')}
            type="button"
          >
            API 消耗
          </button>
          <button
            className={rankType === 'holding' ? 'active' : ''}
            onClick={() => setRankType('holding')}
            type="button"
          >
            当前持有
          </button>
        </div>
        <div className="segmented-control compact-segment">
          <button
            className={scope === 'global' ? 'active' : ''}
            onClick={() => setScope('global')}
            type="button"
          >
            <Trophy size={14} />
            全服
          </button>
          <button
            className={scope === 'friends' ? 'active' : ''}
            onClick={() => setScope('friends')}
            type="button"
          >
            <Users size={14} />
            好友
          </button>
        </div>
        <select className="period-select" defaultValue="week" aria-label="榜单周期">
          <option value="day">今日</option>
          <option value="week">本周</option>
          <option value="all">总榜</option>
        </select>
      </div>
      <div className="ranking-podium">
        {[RANKINGS[1], RANKINGS[0], RANKINGS[2]].map((entry, index) => (
          <div
            className={`podium-entry place-${index === 1 ? 1 : index === 0 ? 2 : 3}`}
            key={entry.name}
          >
            {index === 1 ? <Crown size={23} /> : <Medal size={19} />}
            <span className={`friend-avatar large ${entry.tone}`}>{entry.name.slice(0, 1)}</span>
            <strong>{entry.name}</strong>
            <b>{entry.value}</b>
            <small>Token Score</small>
          </div>
        ))}
      </div>
      <div className="ranking-table">
        {RANKINGS.slice(3).map((entry, index) => (
          <div className="ranking-row" key={entry.name}>
            <span className="rank-number">{index + 4}</span>
            <span className={`friend-avatar ${entry.tone}`}>{entry.name.slice(0, 1)}</span>
            <strong>{entry.name}</strong>
            <small>{entry.delta}</small>
            <b>{entry.value}</b>
          </div>
        ))}
        <div className="ranking-row current">
          <span className="rank-number">28</span>
          <span className="friend-avatar gold">新</span>
          <strong>新农场主（我）</strong>
          <small>+5</small>
          <b>2.24M</b>
        </div>
      </div>
    </PanelShell>
  );
}
