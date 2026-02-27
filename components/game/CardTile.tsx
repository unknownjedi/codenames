'use client';

import { cn } from '@/lib/utils';
import { Skull } from 'lucide-react';

interface CardTileProps {
  card: {
    word: string;
    cardType: string;
    isRevealed: boolean;
    position: number;
  };
  isSpymaster: boolean;
  canGuess: boolean;
  onReveal: () => void;
}

const revealedStyles: Record<string, string> = {
  red: 'bg-red-700 border-red-600 text-white',
  blue: 'bg-blue-700 border-blue-600 text-white',
  bystander: 'bg-amber-200 border-amber-300 text-amber-900',
  assassin: 'bg-slate-900 border-slate-600 text-white',
};

const spymasterHints: Record<string, string> = {
  red: 'ring-2 ring-red-500/50 bg-red-950/30',
  blue: 'ring-2 ring-blue-500/50 bg-blue-950/30',
  bystander: 'ring-1 ring-amber-400/20 bg-amber-950/10',
  assassin: 'ring-2 ring-slate-400/60 bg-slate-900/60',
};

export function CardTile({ card, isSpymaster, canGuess, onReveal }: CardTileProps) {
  const isRevealed = card.isRevealed;

  const baseClasses =
    'relative flex items-center justify-center rounded-xl border-2 ' +
    'text-xs sm:text-sm font-bold uppercase tracking-wide select-none ' +
    'aspect-[5/3] transition-all duration-300';

  let cardClasses: string;

  if (isRevealed) {
    cardClasses = cn(
      baseClasses,
      revealedStyles[card.cardType] || revealedStyles.bystander,
      'opacity-85 shadow-inner cursor-default'
    );
  } else if (isSpymaster) {
    cardClasses = cn(
      baseClasses,
      'bg-slate-800 border-slate-700 text-white cursor-default',
      spymasterHints[card.cardType]
    );
  } else {
    cardClasses = cn(
      baseClasses,
      'bg-amber-50 border-amber-200 text-slate-800',
      canGuess &&
        'hover:scale-[1.03] hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer active:scale-[0.97] hover:border-amber-400'
    );
  }

  return (
    <button
      className={cardClasses}
      onClick={() => canGuess && !isRevealed && onReveal()}
      disabled={!canGuess || isRevealed}
    >
      <span className="text-center leading-tight px-1 break-words">
        {card.word}
      </span>
      {isSpymaster && !isRevealed && card.cardType === 'assassin' && (
        <Skull className="absolute top-1 right-1 h-3 w-3 text-slate-400" />
      )}
    </button>
  );
}
