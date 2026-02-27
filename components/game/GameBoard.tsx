'use client';

import { CardTile } from './CardTile';
import { ClueInput } from './ClueInput';
import { ClueDisplay } from './ClueDisplay';
import { GameStatusBar } from './GameStatusBar';
import { TeamScoreboard } from './TeamScoreboard';
import { GameLog } from './GameLog';
import { EndGameModal } from './EndGameModal';
import type { DbConnection } from '@/src/module_bindings';

interface GameBoardProps {
  game: any;
  players: any[];
  cards: any[];
  events: any[];
  currentPlayer: any;
  isSpymaster: boolean;
  isOperative: boolean;
  isCurrentTeamTurn: boolean;
  canGiveClue: boolean;
  canGuess: boolean;
  canEndTurn: boolean;
  redPlayers: any[];
  bluePlayers: any[];
  isHost: boolean;
  conn: DbConnection | null;
  roomCode: string;
}

export function GameBoard({
  game,
  cards,
  events,
  currentPlayer,
  isSpymaster,
  canGiveClue,
  canGuess,
  canEndTurn,
  redPlayers,
  bluePlayers,
  isHost,
  conn,
  roomCode,
}: GameBoardProps) {
  const sortedCards = [...cards].sort((a, b) => a.position - b.position);

  const handleReveal = (position: number) => {
    conn?.reducers.revealCard({ roomCode, position });
  };

  const handleEndTurn = () => {
    conn?.reducers.endTurn({ roomCode });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Status Bar */}
      <GameStatusBar game={game} currentPlayer={currentPlayer} roomCode={roomCode} isHost={isHost} conn={conn} />

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        {/* Left: Red Team Scoreboard */}
        <div className="hidden lg:block w-48 shrink-0">
          <TeamScoreboard
            team="red"
            remaining={game.redRemaining}
            total={game.firstTeam === 'red' ? 9 : 8}
            players={redPlayers}
            isActive={game.currentTeam === 'red'}
          />
        </div>

        {/* Center: Card Grid + Controls */}
        <div className="flex-1 flex flex-col items-center">
          {/* Mobile team scores */}
          <div className="flex lg:hidden gap-4 mb-4 w-full max-w-2xl">
            <div
              className={`flex-1 rounded-lg px-3 py-2 text-center ${
                game.currentTeam === 'red' ? 'bg-red-900/40 ring-2 ring-red-500/50' : 'bg-red-950/20'
              }`}
            >
              <span className="text-red-400 font-bold text-lg">{game.redRemaining}</span>
              <span className="text-red-400/60 text-sm ml-1">remaining</span>
            </div>
            <div
              className={`flex-1 rounded-lg px-3 py-2 text-center ${
                game.currentTeam === 'blue' ? 'bg-blue-900/40 ring-2 ring-blue-500/50' : 'bg-blue-950/20'
              }`}
            >
              <span className="text-blue-400 font-bold text-lg">{game.blueRemaining}</span>
              <span className="text-blue-400/60 text-sm ml-1">remaining</span>
            </div>
          </div>

          {/* 5x5 Grid */}
          <div className="grid grid-cols-5 gap-2 md:gap-3 w-full max-w-3xl">
            {sortedCards.map((card) => (
              <CardTile
                key={card.cardId.toString()}
                card={card}
                isSpymaster={isSpymaster}
                canGuess={canGuess}
                onReveal={() => handleReveal(card.position)}
              />
            ))}
          </div>

          {/* Clue Input / Display */}
          <div className="mt-6 w-full max-w-xl">
            {canGiveClue && <ClueInput roomCode={roomCode} conn={conn} />}
            {game.currentPhase === 'guess' && (
              <ClueDisplay
                game={game}
                canEndTurn={canEndTurn}
                canGuess={canGuess}
                onEndTurn={handleEndTurn}
              />
            )}
            {isSpymaster && game.currentPhase === 'guess' && (
              <p className="text-center text-slate-500 text-sm mt-2">
                Your team is guessing...
              </p>
            )}
          </div>

          {/* Game Log */}
          <div className="mt-6 w-full max-w-xl">
            <GameLog events={events} />
          </div>
        </div>

        {/* Right: Blue Team Scoreboard */}
        <div className="hidden lg:block w-48 shrink-0">
          <TeamScoreboard
            team="blue"
            remaining={game.blueRemaining}
            total={game.firstTeam === 'blue' ? 9 : 8}
            players={bluePlayers}
            isActive={game.currentTeam === 'blue'}
          />
        </div>
      </div>

      {/* End Game Modal */}
      {game.status === 'finished' && (
        <EndGameModal winner={game.winner} roomCode={roomCode} />
      )}
    </div>
  );
}
