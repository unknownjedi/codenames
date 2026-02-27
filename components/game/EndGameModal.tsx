'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';

interface EndGameModalProps {
  winner: string;
  roomCode: string;
}

export function EndGameModal({ winner, roomCode }: EndGameModalProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const isRed = winner === 'red';
  const teamLabel = isRed ? 'Red' : 'Blue';
  const color = isRed ? 'text-red-400' : 'text-blue-400';

  // Auto-redirect after countdown
  useEffect(() => {
    if (countdown <= 0) {
      router.push('/');
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <Dialog open={true}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${isRed ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
              <Trophy className={`h-10 w-10 ${color}`} />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">
            <span className={color}>{teamLabel} Team</span> Wins!
          </DialogTitle>
          <DialogDescription className="text-center text-slate-400">
            Great game! The {teamLabel.toLowerCase()} team has won.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-4">
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:text-white"
          >
            Back to Home ({countdown}s)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
