'use client';

import { useRef, useEffect } from 'react';

interface GameLogProps {
  events: any[];
}

const eventColors: Record<string, string> = {
  red: 'text-red-400',
  blue: 'text-blue-400',
};

export function GameLog({ events }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  if (events.length === 0) return null;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800">
        <span className="text-xs text-slate-400 uppercase tracking-wide">Game Log</span>
      </div>
      <div ref={scrollRef} className="max-h-40 overflow-y-auto p-3 space-y-1.5">
        {events.map((event) => (
          <div key={event.eventId.toString()} className="text-xs leading-relaxed">
            <span className={eventColors[event.team] || 'text-slate-400'}>
              {event.playerName && <span className="font-medium">{event.playerName}: </span>}
              {event.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
