'use client';

import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface GameStatusBarProps {
  game: {
    currentTeam: string;
    currentPhase: string;
    status: string;
    redRemaining: number;
    blueRemaining: number;
  };
  currentPlayer: any;
  roomCode: string;
}

export function GameStatusBar({ game, currentPlayer, roomCode }: GameStatusBarProps) {
  const teamLabel = game.currentTeam === 'red' ? 'Red' : 'Blue';
  const teamColor = game.currentTeam === 'red' ? 'text-red-400' : 'text-blue-400';
  const teamBg = game.currentTeam === 'red' ? 'bg-red-500/20' : 'bg-blue-500/20';
  const phaseLabel = game.currentPhase === 'clue' ? 'Giving Clue' : 'Guessing';

  const isMyTurn = currentPlayer?.team === game.currentTeam;

  return (
    <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Left: Game title + room code */}
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-white hidden sm:block">
            CODE<span className="text-red-500">NAMES</span>
          </h1>
          <button
            onClick={() => {
              navigator.clipboard.writeText(roomCode);
              toast.success('Room code copied!');
            }}
            className="flex items-center gap-1.5 bg-slate-800 rounded px-2 py-1 hover:bg-slate-700 transition-colors"
          >
            <span className="text-xs font-mono text-slate-400">{roomCode}</span>
            <Copy className="h-3 w-3 text-slate-500" />
          </button>
        </div>

        {/* Center: Turn info */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${game.currentTeam === 'red' ? 'bg-red-500' : 'bg-blue-500'} ${game.status === 'in_progress' ? 'animate-pulse' : ''}`} />
          <span className={`font-semibold ${teamColor}`}>{teamLabel}</span>
          <Badge variant="outline" className={`${teamBg} ${teamColor} border-transparent text-xs`}>
            {phaseLabel}
          </Badge>
          {isMyTurn && game.status === 'in_progress' && (
            <Badge className="bg-emerald-600/80 text-white text-xs">Your Turn</Badge>
          )}
        </div>

        {/* Right: Player info */}
        <div className="flex items-center gap-2 text-sm">
          {currentPlayer && (
            <span className="text-slate-400">
              {currentPlayer.name}
              <span className="text-slate-600 ml-1">
                ({currentPlayer.role === 'spymaster' ? 'Spymaster' : 'Operative'})
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
