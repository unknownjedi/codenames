'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTable } from 'spacetimedb/react';
import { tables } from '@/src/module_bindings';
import { useConnection, useConnectionState } from './useConnection';

export function useGameState(roomCode: string) {
  const conn = useConnection();
  const connState = useConnectionState();
  const subscribed = useRef(false);

  // Subscribe to tables for this game
  useEffect(() => {
    if (!conn || subscribed.current) return;
    subscribed.current = true;
    conn.subscriptionBuilder()
      .onApplied(() => {
        console.log('Subscription applied for game:', roomCode);
      })
      .onError((ctx) => {
        console.error('Subscription error:', ctx.event);
      })
      .subscribe([
        `SELECT * FROM game WHERE room_code = '${roomCode}'`,
        `SELECT * FROM player WHERE game_id IN (SELECT game_id FROM game WHERE room_code = '${roomCode}')`,
        `SELECT * FROM card WHERE game_id IN (SELECT game_id FROM game WHERE room_code = '${roomCode}')`,
        `SELECT * FROM game_event WHERE game_id IN (SELECT game_id FROM game WHERE room_code = '${roomCode}')`,
      ]);
  }, [conn, roomCode]);

  const [games] = useTable(tables.Game);
  const [allPlayers] = useTable(tables.Player);
  const [allCards] = useTable(tables.Card);
  const [allEvents] = useTable(tables.GameEvent);

  return useMemo(() => {
    const game = games.find((g) => g.roomCode === roomCode);
    const gameId = game?.gameId;

    const players = gameId !== undefined
      ? allPlayers.filter((p) => p.gameId === gameId)
      : [];
    const cards = gameId !== undefined
      ? allCards.filter((c) => c.gameId === gameId)
      : [];
    const events = gameId !== undefined
      ? allEvents
          .filter((e) => e.gameId === gameId)
          .sort((a, b) => Number(a.createdAt - b.createdAt))
      : [];

    const myIdentityHex = connState.identity?.toHexString();
    const currentPlayer = myIdentityHex
      ? players.find((p) => p.identity.toHexString() === myIdentityHex)
      : undefined;

    const isSpymaster = currentPlayer?.role === 'spymaster';
    const isOperative = currentPlayer?.role === 'operative';
    const isCurrentTeamTurn = currentPlayer?.team === game?.currentTeam;
    const canGiveClue = isSpymaster && isCurrentTeamTurn && game?.currentPhase === 'clue';
    const canGuess = isOperative && isCurrentTeamTurn && game?.currentPhase === 'guess';
    const canEndTurn = canGuess && (game?.guessesMade ?? 0) >= 1;

    const redPlayers = players.filter((p) => p.team === 'red');
    const bluePlayers = players.filter((p) => p.team === 'blue');
    const unassigned = players.filter((p) => p.team === 'unassigned');

    return {
      game,
      players,
      cards,
      events,
      currentPlayer,
      isSpymaster,
      isOperative,
      isCurrentTeamTurn,
      canGiveClue,
      canGuess,
      canEndTurn,
      redPlayers,
      bluePlayers,
      unassigned,
      isHost: currentPlayer?.isHost ?? false,
      conn,
    };
  }, [games, allPlayers, allCards, allEvents, connState.identity, conn, roomCode]);
}
