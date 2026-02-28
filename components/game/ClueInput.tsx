'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import type { DbConnection } from '@/src/module_bindings';

interface ClueInputProps {
  roomCode: string;
  conn: DbConnection | null;
}

export function ClueInput({ roomCode, conn }: ClueInputProps) {
  const [word, setWord] = useState('');
  const [number, setNumber] = useState(1);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !conn || submitting) return;

    const clueNumber = isUnlimited ? 99 : number;
    setSubmitting(true);
    conn.reducers
      .giveClue({ roomCode, clueWord: word.trim(), clueNumber })
      .then(() => {
        setWord('');
        setNumber(1);
        setIsUnlimited(false);
      })
      .catch((err: Error) => {
        toast.error(err.message || 'Failed to give clue');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-center text-sm text-slate-400 mb-1">
        Give your team a clue
      </p>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Clue word"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="flex-1 h-11 bg-slate-800/60 border-slate-700 text-white text-center uppercase font-semibold placeholder:text-slate-500 placeholder:normal-case placeholder:font-normal"
          autoFocus
        />
        {!isUnlimited && (
          <Input
            type="number"
            min={0}
            max={9}
            value={number}
            onChange={(e) => setNumber(parseInt(e.target.value) || 0)}
            className="w-16 h-11 bg-slate-800/60 border-slate-700 text-white text-center font-semibold"
          />
        )}
        <button
          type="button"
          onClick={() => setIsUnlimited(!isUnlimited)}
          className={`h-11 px-3 rounded-md border text-xs font-medium transition-colors ${
            isUnlimited
              ? 'bg-amber-600 border-amber-500 text-white'
              : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          {isUnlimited ? '\u221E' : '\u221E'}
        </button>
        <Button
          type="submit"
          disabled={!word.trim() || submitting}
          className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {isUnlimited && (
        <p className="text-xs text-amber-400 text-center">Unlimited guesses mode</p>
      )}
      <p className="text-xs text-slate-500 text-center">
        Clue must be a single word, not on the board. Number = how many cards relate to it.
      </p>
    </form>
  );
}
