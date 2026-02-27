'use client';

import { useEffect, useState } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { useConnection } from '@/hooks/useConnection';
import { Lobby } from '@/components/lobby/Lobby';
import { GameBoard } from '@/components/game/GameBoard';
import { Loader2 } from 'lucide-react';

export function GameRoom({ code }: { code: string }) {
  const state = useGameState(code);
  const conn = useConnection();
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);

  // Auto-join if player navigated directly (e.g. via shared link) and isn't in game yet
  useEffect(() => {
    if (!conn || !state.game || state.currentPlayer || autoJoinAttempted) return;
    const savedName = localStorage.getItem('codenames_player_name');
    if (savedName && state.game.status === 'waiting') {
      setAutoJoinAttempted(true);
      try {
        conn.reducers.joinGame({ roomCode: code, playerName: savedName });
      } catch {
        // Will be handled by error callbacks
      }
    }
  }, [conn, state.game, state.currentPlayer, autoJoinAttempted, code]);

  if (!conn?.identity) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Connecting to server...</span>
        </div>
      </div>
    );
  }

  if (!state.game) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading game {code}...</span>
        </div>
      </div>
    );
  }

  if (state.game.status === 'waiting') {
    return <Lobby {...state} roomCode={code} />;
  }

  return <GameBoard {...state} roomCode={code} />;
}
