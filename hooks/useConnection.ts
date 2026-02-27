'use client';

import { useSpacetimeDB } from 'spacetimedb/react';
import type { DbConnection } from '@/src/module_bindings';

export function useConnection(): DbConnection | null {
  const state = useSpacetimeDB();
  return (state.getConnection() as DbConnection) ?? null;
}

export function useConnectionState() {
  return useSpacetimeDB();
}
