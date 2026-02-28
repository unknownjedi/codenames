'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Copy, Play, Users, Crown, Eye, Crosshair, Shuffle } from 'lucide-react';
import type { DbConnection } from '@/src/module_bindings';

interface LobbyProps {
  game: any;
  players: any[];
  currentPlayer: any;
  redPlayers: any[];
  bluePlayers: any[];
  unassigned: any[];
  isHost: boolean;
  conn: DbConnection | null;
  roomCode: string;
}

export function Lobby({
  game,
  redPlayers,
  bluePlayers,
  unassigned,
  currentPlayer,
  isHost,
  conn,
  roomCode,
}: LobbyProps) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success('Room code copied!');
  };

  const handleJoinTeam = (team: string) => {
    conn?.reducers.joinTeam({ roomCode, team });
  };

  const handleSetRole = (role: string) => {
    conn?.reducers.setRole({ roomCode, role });
  };

  const handleStart = () => {
    try {
      conn?.reducers.startGame({ roomCode });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRandomize = () => {
    try {
      conn?.reducers.randomizeTeams({ roomCode });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const totalPlayers = redPlayers.length + bluePlayers.length + unassigned.length;

  const canStart =
    isHost &&
    redPlayers.some((p) => p.role === 'spymaster') &&
    redPlayers.some((p) => p.role === 'operative') &&
    bluePlayers.some((p) => p.role === 'spymaster') &&
    bluePlayers.some((p) => p.role === 'operative');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            CODE<span className="text-red-500">NAMES</span>
          </h1>
          <p className="text-slate-400 text-sm mb-4">Share this code with your friends</p>

          {/* Room Code */}
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-6 py-3 hover:bg-slate-800 transition-colors"
          >
            <span className="text-3xl font-mono font-bold tracking-[0.3em] text-white">
              {roomCode}
            </span>
            <Copy className="h-5 w-5 text-slate-400" />
          </button>

          <p className="text-slate-500 text-xs mt-2">
            {game.firstTeam === 'red' ? 'Red' : 'Blue'} team goes first
          </p>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Red Team */}
          <TeamPanel
            team="red"
            label="Red Team"
            players={redPlayers}
            currentPlayer={currentPlayer}
            onJoinTeam={() => handleJoinTeam('red')}
            onSetRole={handleSetRole}
          />

          {/* Blue Team */}
          <TeamPanel
            team="blue"
            label="Blue Team"
            players={bluePlayers}
            currentPlayer={currentPlayer}
            onJoinTeam={() => handleJoinTeam('blue')}
            onSetRole={handleSetRole}
          />
        </div>

        {/* Unassigned */}
        {unassigned.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400">Unassigned Players</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {unassigned.map((p) => {
                const isMe = currentPlayer && p.playerId === currentPlayer.playerId;
                return (
                  <Badge key={p.playerId.toString()} variant="secondary" className={isMe ? 'bg-emerald-900/50 text-emerald-300 ring-1 ring-emerald-500/40' : 'bg-slate-700/50'}>
                    {p.name}{isMe && ' (You)'}
                    {p.isHost && <Crown className="h-3 w-3 ml-1 text-amber-400" />}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="text-center space-y-3">
          {isHost && (
            <div className="mb-2">
              <Button
                onClick={handleRandomize}
                disabled={totalPlayers < 4}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Randomize Teams
              </Button>
              {totalPlayers < 4 && (
                <p className="text-slate-500 text-xs mt-1">
                  Need at least 4 players to randomize
                </p>
              )}
            </div>
          )}
          {isHost ? (
            <Button
              onClick={handleStart}
              disabled={!canStart}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-12 h-12 text-lg disabled:opacity-50"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Game
            </Button>
          ) : (
            <p className="text-slate-400 text-sm">Waiting for host to start the game...</p>
          )}
          {isHost && !canStart && (
            <p className="text-amber-400 text-xs mt-2">
              Each team needs a Spymaster and an Operative
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function isCurrentUser(player: any, currentPlayer: any): boolean {
  return currentPlayer && player.playerId === currentPlayer.playerId;
}

function PlayerName({ player, currentPlayer }: { player: any; currentPlayer: any }) {
  const isMe = isCurrentUser(player, currentPlayer);
  return (
    <>
      <span className={`text-sm ${isMe ? 'font-bold text-emerald-400' : 'text-white'}`}>
        {player.name}
        {isMe && <span className="text-emerald-500 text-xs ml-1">(You)</span>}
      </span>
      {player.isHost && <Crown className="h-3 w-3 text-amber-400" />}
    </>
  );
}

function TeamPanel({
  team,
  label,
  players,
  currentPlayer,
  onJoinTeam,
  onSetRole,
}: {
  team: string;
  label: string;
  players: any[];
  currentPlayer: any;
  onJoinTeam: () => void;
  onSetRole: (role: string) => void;
}) {
  const isOnTeam = currentPlayer?.team === team;
  const spymaster = players.find((p) => p.role === 'spymaster');
  const operative = players.find((p) => p.role === 'operative');
  const spectators = players.filter((p) => p.role === 'spectator');
  const unroled = players.filter((p) => p.role === 'unassigned');

  const borderColor = team === 'red' ? 'border-red-500/30' : 'border-blue-500/30';
  const bgColor = team === 'red' ? 'bg-red-950/20' : 'bg-blue-950/20';
  const headerColor = team === 'red' ? 'text-red-400' : 'text-blue-400';
  const btnColor =
    team === 'red'
      ? 'bg-red-600 hover:bg-red-500'
      : 'bg-blue-600 hover:bg-blue-500';

  const myRole = currentPlayer?.role;

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-bold ${headerColor}`}>{label}</h2>
        <Badge variant="outline" className={`${headerColor} border-current`}>
          {players.length} players
        </Badge>
      </div>

      {/* Spymaster slot */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">Spymaster</span>
        </div>
        {spymaster ? (
          <div className="bg-slate-800/50 rounded-lg px-3 py-2 flex items-center gap-2">
            <PlayerName player={spymaster} currentPlayer={currentPlayer} />
          </div>
        ) : isOnTeam ? (
          <Button
            onClick={() => onSetRole('spymaster')}
            variant="outline"
            size="sm"
            className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white"
          >
            Become Spymaster
          </Button>
        ) : (
          <div className="bg-slate-800/30 rounded-lg px-3 py-2 text-slate-600 text-sm">
            Empty
          </div>
        )}
      </div>

      <Separator className="bg-slate-700/50 my-3" />

      {/* Operative slot (single, like spymaster) */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Crosshair className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">Operative</span>
        </div>
        {operative ? (
          <div className="bg-slate-800/50 rounded-lg px-3 py-2 flex items-center gap-2">
            <PlayerName player={operative} currentPlayer={currentPlayer} />
          </div>
        ) : isOnTeam ? (
          <Button
            onClick={() => onSetRole('operative')}
            variant="outline"
            size="sm"
            className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white"
          >
            Become Operative
          </Button>
        ) : (
          <div className="bg-slate-800/30 rounded-lg px-3 py-2 text-slate-600 text-sm">
            Empty
          </div>
        )}
      </div>

      <Separator className="bg-slate-700/50 my-3" />

      {/* Spectators + Unassigned */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">Spectators</span>
        </div>
        <div className="space-y-1.5">
          {spectators.map((p) => (
            <div
              key={p.playerId.toString()}
              className="bg-slate-800/50 rounded-lg px-3 py-2 flex items-center gap-2"
            >
              <PlayerName player={p} currentPlayer={currentPlayer} />
            </div>
          ))}
          {unroled.map((p) => (
            <div
              key={p.playerId.toString()}
              className="bg-slate-800/30 rounded-lg px-3 py-2 flex items-center gap-2"
            >
              <span className={`text-sm ${isCurrentUser(p, currentPlayer) ? 'font-bold text-emerald-400' : 'text-slate-400'}`}>
                {p.name}
                {isCurrentUser(p, currentPlayer) && <span className="text-emerald-500 text-xs ml-1">(You)</span>}
              </span>
              <span className="text-slate-600 text-xs">(choosing role...)</span>
              {p.isHost && <Crown className="h-3 w-3 text-amber-400" />}
            </div>
          ))}
          {isOnTeam && myRole !== 'spectator' && myRole !== 'unassigned' && (
            <Button
              onClick={() => onSetRole('spectator')}
              variant="outline"
              size="sm"
              className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white"
            >
              Become Spectator
            </Button>
          )}
        </div>
      </div>

      {/* Join button */}
      {!isOnTeam && (
        <Button onClick={onJoinTeam} className={`w-full mt-3 ${btnColor} text-white font-semibold`}>
          Join {label}
        </Button>
      )}
    </div>
  );
}
