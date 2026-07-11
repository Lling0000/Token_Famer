'use client';

interface FarmAmbienceProps {
  onDogBark: () => void;
}

export function FarmAmbience({ onDogBark }: FarmAmbienceProps) {
  return (
    <div className="farm-ambience">
      <span className="stream-glint stream-glint-top" aria-hidden="true" />
      <span className="stream-glint stream-glint-side" aria-hidden="true" />
      <span className="stream-glint stream-glint-bottom" aria-hidden="true" />
      <button
        className="farm-dog-route"
        type="button"
        aria-label="让巡逻萌犬叫一声"
        title="萌犬巡逻中"
        onClick={onDogBark}
      >
        <span className="farm-dog-sprite" />
      </button>
    </div>
  );
}
