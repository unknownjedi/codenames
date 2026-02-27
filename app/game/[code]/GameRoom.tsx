'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import { useConnection } from '@/hooks/useConnection';
import { Lobby } from '@/components/lobby/Lobby';
import { GameBoard } from '@/components/game/GameBoard';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function GameRoom({ code }: { code: string }) {
  const state = useGameState(code);
  const conn = useConnection();
  const router = useRouter();
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  const hadGame = useRef(false);

  // Track whether we ever had a game, so we can detect deletion
  useEffect(() => {
    if (state.game) {
      hadGame.current = true;
    }
  }, [state.game]);

  // Redirect when game is deleted (force end, disconnect cleanup, etc.)
  useEffect(() => {
    if (hadGame.current && !state.game && conn?.identity) {
      toast.info('Game has ended');
      router.push('/');
    }
  }, [state.game, conn?.identity, router]);

  // Auto-join if player navigated directly (e.g. via shared link) and isn't in game yet
  useEffect(() => {
    if (!conn || !state.game || state.currentPlayer || autoJoinAttempted) return;
    const savedName = localStorage.getItem('codenames_player_name');
    if (savedName && (state.game.status === 'waiting' || state.game.status === 'in_progress')) {
      setAutoJoinAttempted(true);
      conn.reducers.joinGame({ roomCode: code, playerName: savedName }).catch((err: Error) => {
        toast.error(err.message);
        router.push('/');
      });
    }
  }, [conn, state.game, state.currentPlayer, autoJoinAttempted, code, router]);

  // After subscription loads: redirect if game not found or no saved name
  useEffect(() => {
    if (!state.subscriptionApplied || !conn?.identity) return;

    // Game code doesn't exist
    if (!state.game) {
      toast.error('Game not found. Check your room code.');
      router.push('/');
      return;
    }

    // User is not in this game and has no saved name to auto-join with
    if (!state.currentPlayer && !autoJoinAttempted) {
      const savedName = localStorage.getItem('codenames_player_name');
      if (!savedName) {
        toast.error('Please enter your name first.');
        router.push('/');
      }
    }
  }, [state.subscriptionApplied, state.game, state.currentPlayer, conn?.identity, autoJoinAttempted, router]);

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
