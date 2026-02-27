'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import type { DbConnection } from '@/src/module_bindings';

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
  isHost: boolean;
  conn: DbConnection | null;
}

export function GameStatusBar({ game, currentPlayer, roomCode, isHost, conn }: GameStatusBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const teamLabel = game.currentTeam === 'red' ? 'Red' : 'Blue';
  const teamColor = game.currentTeam === 'red' ? 'text-red-400' : 'text-blue-400';
  const teamBg = game.currentTeam === 'red' ? 'bg-red-500/20' : 'bg-blue-500/20';
  const phaseLabel = game.currentPhase === 'clue' ? 'Giving Clue' : 'Guessing';

  const isMyTurn = currentPlayer?.team === game.currentTeam;

  const handleForceEnd = () => {
    conn?.reducers.forceEndGame({ roomCode });
    setConfirmOpen(false);
  };

  return (
    <>
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

          {/* Right: Player info + End Game */}
          <div className="flex items-center gap-3 text-sm">
            {currentPlayer && (
              <span className="text-slate-400 hidden sm:inline">
                {currentPlayer.name}
                <span className="text-slate-600 ml-1">
                  ({currentPlayer.role === 'spymaster' ? 'Spymaster' : 'Operative'})
                </span>
              </span>
            )}
            {isHost && (
              <Button
                onClick={() => setConfirmOpen(true)}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-950/50 h-7 px-2 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                End Game
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>End Game?</DialogTitle>
            <DialogDescription className="text-slate-400">
              This will end the game for all players and everyone will be redirected to the home page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button
              onClick={() => setConfirmOpen(false)}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleForceEnd}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white"
            >
              End Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
