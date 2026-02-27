'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTable } from 'spacetimedb/react';
import { tables } from '@/src/module_bindings';
import { useConnection, useConnectionState } from '@/hooks/useConnection';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PLAYER_NAME_KEY = 'codenames_player_name';

export default function Home() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const router = useRouter();
  const conn = useConnection();
  const connState = useConnectionState();

  const [games] = useTable(tables.Game);
  const [players] = useTable(tables.Player);

  // Restore saved name
  useEffect(() => {
    const saved = localStorage.getItem(PLAYER_NAME_KEY);
    if (saved) setName(saved);
  }, []);

  // Subscribe to game and player tables so we can detect our new game
  useEffect(() => {
    if (!conn) return;
    conn.subscriptionBuilder()
      .onApplied(() => {})
      .subscribe([
        'SELECT * FROM game',
        'SELECT * FROM player',
      ]);
  }, [conn]);

  // Watch for redirect after creating or joining
  useEffect(() => {
    if (!connState.identity || (!creating && !joining)) return;

    const myIdentityHex = connState.identity.toHexString();
    const myPlayer = players.find(
      (p) => p.identity.toHexString() === myIdentityHex
    );
    if (myPlayer) {
      const game = games.find((g) => g.gameId === myPlayer.gameId);
      if (game && game.status !== 'finished') {
        setCreating(false);
        setJoining(false);
        router.push(`/game/${game.roomCode}`);
      }
    }
  }, [players, games, connState.identity, creating, joining, router]);

  const handleCreate = () => {
    if (!name.trim() || !conn) return;
    localStorage.setItem(PLAYER_NAME_KEY, name.trim());
    setCreating(true);
    conn.reducers.createGame({ playerName: name.trim() }).catch((err: Error) => {
      toast.error(err.message);
      setCreating(false);
    });
  };

  const handleJoin = () => {
    if (!name.trim() || !roomCode.trim() || !conn) return;
    localStorage.setItem(PLAYER_NAME_KEY, name.trim());
    setJoining(true);
    conn.reducers.joinGame({ roomCode: roomCode.trim().toUpperCase(), playerName: name.trim() }).catch((err: Error) => {
      toast.error(err.message);
      setJoining(false);
    });
  };

  const isConnected = connState.isActive;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold tracking-tight text-white mb-3">
          CODE<span className="text-red-500">NAMES</span>
        </h1>
        <p className="text-slate-400 text-lg">
          The classic word game — play online with friends
        </p>
        {!isConnected && (
          <p className="text-amber-400 text-sm mt-2 animate-pulse">
            Connecting to server...
          </p>
        )}
      </div>

      {/* Name input */}
      <div className="w-full max-w-md mb-8">
        <Input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="h-12 text-center text-lg bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Create Game */}
        <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Create Game</CardTitle>
            <CardDescription>Start a new game and invite friends</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCreate}
              disabled={creating || !name.trim() || !isConnected}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {creating ? 'Creating...' : 'Create New Game'}
            </Button>
          </CardContent>
        </Card>

        {/* Join Game */}
        <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Join Game</CardTitle>
            <CardDescription>Enter a room code to join</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Room code (e.g. ABC23)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={5}
              className="h-11 text-center text-lg font-mono tracking-widest bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 uppercase"
            />
            <Button
              onClick={handleJoin}
              disabled={joining || !name.trim() || !roomCode.trim() || !isConnected}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              {joining ? 'Joining...' : 'Join Game'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-slate-600 text-xs mt-8">
        No account required — just enter your name and play
      </p>
    </main>
  );
}
