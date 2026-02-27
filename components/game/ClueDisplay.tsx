'use client';

import { Button } from '@/components/ui/button';
import { Hand } from 'lucide-react';

interface ClueDisplayProps {
  game: {
    clueWord: string;
    clueNumber: number;
    guessesRemaining: number;
    guessesMade: number;
    currentTeam: string;
  };
  canEndTurn: boolean;
  canGuess: boolean;
  onEndTurn: () => void;
}

export function ClueDisplay({ game, canEndTurn, canGuess, onEndTurn }: ClueDisplayProps) {
  const teamColor = game.currentTeam === 'red' ? 'text-red-400' : 'text-blue-400';
  const displayNumber = game.clueNumber === 99 ? '\u221E' : String(game.clueNumber);
  const remaining =
    game.guessesRemaining === 99 ? '\u221E' : String(game.guessesRemaining);

  return (
    <div className="text-center space-y-3">
      <div className="inline-flex items-baseline gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-6 py-3">
        <span className={`text-2xl font-bold uppercase tracking-wide ${teamColor}`}>
          {game.clueWord}
        </span>
        <span className="text-xl font-mono font-semibold text-white">
          {displayNumber}
        </span>
      </div>
      <div className="text-sm text-slate-400">
        {game.guessesMade} guess{game.guessesMade !== 1 ? 'es' : ''} made
        {' \u00B7 '}
        {remaining} remaining
      </div>
      {canGuess && canEndTurn && (
        <Button
          onClick={onEndTurn}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
        >
          <Hand className="h-4 w-4 mr-2" />
          End Turn
        </Button>
      )}
    </div>
  );
}
