'use client';

import { CheckCircle2 } from 'lucide-react';

export function GameToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="game-toast" role="status">
      <CheckCircle2 size={17} />
      {message}
    </div>
  );
}
