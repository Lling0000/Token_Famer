import { Footprints, Sprout } from 'lucide-react';

export function FarmTravelOverlay({ destination }: { destination: string }) {
  return (
    <div className="farm-travel-overlay" role="status" aria-live="polite">
      <div className="farm-travel-content">
        <span className="travel-icon">
          <Footprints size={22} />
        </span>
        <span>
          <small>正在前往</small>
          <strong>{destination}</strong>
        </span>
        <div className="travel-plots" aria-hidden="true">
          <i />
          <i />
          <i>
            <Sprout size={13} />
          </i>
        </div>
        <div className="travel-progress" aria-hidden="true">
          <i />
        </div>
      </div>
    </div>
  );
}
