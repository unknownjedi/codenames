'use client';

import { cn } from '@/lib/utils';
import { Eye, Crosshair } from 'lucide-react';

interface TeamScoreboardProps {
  team: string;
  remaining: number;
  total: number;
  players: any[];
  isActive: boolean;
}

export function TeamScoreboard({ team, remaining, total, players, isActive }: TeamScoreboardProps) {
  const isRed = team === 'red';
  const color = isRed ? 'text-red-400' : 'text-blue-400';
  const bgColor = isRed ? 'bg-red-950/20' : 'bg-blue-950/20';
  const borderColor = isRed ? 'border-red-500/30' : 'border-blue-500/30';
  const activeBorder = isRed ? 'border-red-500/60' : 'border-blue-500/60';
  const label = isRed ? 'Red' : 'Blue';

  const spymaster = players.find((p) => p.role === 'spymaster');
  const operatives = players.filter((p) => p.role === 'operative');

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        bgColor,
        isActive ? activeBorder : borderColor,
        isActive && 'ring-1',
        isActive && (isRed ? 'ring-red-500/30' : 'ring-blue-500/30')
      )}
    >
      <div className="text-center mb-4">
        <div className={`text-4xl font-bold ${color}`}>{remaining}</div>
        <div className="text-xs text-slate-500 mt-1">
          of {total} remaining
        </div>
        <div className={`text-sm font-semibold ${color} mt-1`}>
          {label} Team
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-4">
        <div
          className={cn('h-1.5 rounded-full transition-all duration-500', isRed ? 'bg-red-500' : 'bg-blue-500')}
          style={{ width: `${((total - remaining) / total) * 100}%` }}
        />
      </div>

      {/* Players */}
      <div className="space-y-2">
        {spymaster && (
          <div className="flex items-center gap-2 text-xs">
            <Eye className="h-3 w-3 text-slate-500" />
            <span className="text-slate-300 truncate">{spymaster.name}</span>
          </div>
        )}
        {operatives.map((p) => (
          <div key={p.playerId.toString()} className="flex items-center gap-2 text-xs">
            <Crosshair className="h-3 w-3 text-slate-500" />
            <span className="text-slate-300 truncate">{p.name}</span>
            {!p.isConnected && <span className="text-slate-600">(offline)</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
