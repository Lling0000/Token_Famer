import { Bone, Check, Clock3, Flag, Lightbulb, ShoppingCart } from 'lucide-react';
import { GAME_CONFIG_V1 } from '@/lib/game-config-v1';
import { formatTokenAmount } from '@/lib/game-engine';
import type { FarmDecoration } from '@/lib/game-types';

interface PetCatalogProps {
  balance: bigint;
  onBuyDogFood: (itemId: string, durationHours: number, priceToken: bigint) => void;
}

export function PetCatalog({ balance, onBuyDogFood }: PetCatalogProps) {
  return (
    <div className="item-catalog-grid">
      {GAME_CONFIG_V1.dogFood.map((item) => (
        <article className="shop-item-card pet-item" key={item.id}>
          <span className="catalog-pixel-art bone-art">
            <Bone size={28} />
          </span>
          <span className="shop-item-title">
            <strong>{item.name}</strong>
            <small>萌犬用品</small>
          </span>
          <span className="shop-item-effect">
            <Clock3 size={14} /> 守护时间 +{item.durationHours / 24} 天
          </span>
          <button
            className="primary-command compact-command"
            type="button"
            disabled={balance < item.priceToken}
            onClick={() => onBuyDogFood(item.id, item.durationHours, item.priceToken)}
          >
            <ShoppingCart size={14} />
            {formatTokenAmount(item.priceToken)} Token
          </button>
        </article>
      ))}
    </div>
  );
}

interface DecorationCatalogProps {
  balance: bigint;
  owned: readonly FarmDecoration[];
  equipped: FarmDecoration;
  onDecorationAction: (decoration: FarmDecoration, priceToken: bigint) => void;
}

export function DecorationCatalog({
  balance,
  owned,
  equipped,
  onDecorationAction,
}: DecorationCatalogProps) {
  return (
    <>
      <div className="decoration-actions">
        <span>同一时间装备一套场景装扮，已购买装扮可重复切换。</span>
        <button
          className="secondary-command"
          type="button"
          disabled={equipped === 'none'}
          onClick={() => onDecorationAction('none', 0n)}
        >
          卸下当前装扮
        </button>
      </div>
      <div className="item-catalog-grid decoration-grid">
        {GAME_CONFIG_V1.decorations.map((item) => (
          <DecorationCard
            item={item}
            balance={balance}
            owned={owned}
            equipped={equipped}
            onDecorationAction={onDecorationAction}
            key={item.id}
          />
        ))}
      </div>
    </>
  );
}

function DecorationCard({
  item,
  balance,
  owned,
  equipped,
  onDecorationAction,
}: DecorationCatalogProps & { item: (typeof GAME_CONFIG_V1.decorations)[number] }) {
  const decoration = item.id as FarmDecoration;
  const isOwned = owned.includes(decoration);
  const isEquipped = equipped === decoration;
  return (
    <article className="shop-item-card decoration-item">
      <span className={`catalog-pixel-art ${item.id}`}>
        {item.id === 'lantern-line' ? <Lightbulb size={28} /> : <Flag size={28} />}
      </span>
      <span className="shop-item-title">
        <strong>{item.name}</strong>
        <small>农场场景装扮</small>
      </span>
      <span className="shop-item-effect">购买后可随时切换，立即显示在农场场景。</span>
      <button
        className={isOwned ? 'secondary-command' : 'primary-command compact-command'}
        type="button"
        disabled={isEquipped || (!isOwned && balance < item.priceToken)}
        onClick={() => onDecorationAction(decoration, item.priceToken)}
      >
        {isEquipped ? <Check size={14} /> : <ShoppingCart size={14} />}
        {isEquipped ? '已装备' : isOwned ? '装备' : `${formatTokenAmount(item.priceToken)} Token`}
      </button>
    </article>
  );
}
