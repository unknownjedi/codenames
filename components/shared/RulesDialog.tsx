'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

export function RulesDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white hover:bg-slate-800 h-7 px-2 text-xs"
        >
          <BookOpen className="h-3.5 w-3.5 mr-1" />
          Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            How to Play <span className="text-red-500">Codenames</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-slate-300 mt-2">
          <section>
            <h3 className="text-white font-semibold mb-1">Overview</h3>
            <p>
              Two teams (Red and Blue) compete to find all their agents on a 5x5 grid of words.
              Each team has a <strong className="text-white">Spymaster</strong> who gives clues
              and an <strong className="text-white">Operative</strong> who guesses.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">Roles</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong className="text-white">Spymaster</strong> — Sees the colors of all cards. Gives one-word clues with a number.</li>
              <li><strong className="text-white">Operative</strong> — Guesses which cards belong to their team based on the clue.</li>
              <li><strong className="text-white">Spectator</strong> — Watches the game without participating in clues or guesses.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">Giving Clues (Spymaster)</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Must be a <strong className="text-white">single word</strong> — no spaces, phrases, or hyphens.</li>
              <li>Cannot be a word currently <strong className="text-white">visible on the board</strong> (unrevealed cards).</li>
              <li>The <strong className="text-white">number</strong> indicates how many cards relate to the clue.</li>
              <li>Team gets <strong className="text-white">number + 1</strong> guesses (the extra guess can be used for a previous clue).</li>
              <li>Choose <strong className="text-white">unlimited (&#8734;)</strong> for zero-related or open-ended clues.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">Guessing (Operative)</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Tap a card to reveal it. You must make <strong className="text-white">at least one guess</strong> before ending your turn.</li>
              <li><strong className="text-emerald-400">Correct guess</strong> — card is your team&apos;s color. Keep guessing or end turn.</li>
              <li><strong className="text-amber-400">Bystander / opponent</strong> — turn ends immediately.</li>
              <li><strong className="text-red-400">Assassin</strong> — your team <strong className="text-white">loses instantly</strong>!</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">Winning</h3>
            <p>
              The first team to reveal all their agents wins. Hitting the assassin causes an instant loss for the guessing team.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">Card Types</h3>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500" />
                <span className="text-slate-400">Red Agent (8 or 9)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-slate-400">Blue Agent (8 or 9)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-amber-700" />
                <span className="text-slate-400">Bystander (7)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-slate-700" />
                <span className="text-slate-400">Assassin (1)</span>
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-2">The team that goes first has 9 agents, the other has 8.</p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
