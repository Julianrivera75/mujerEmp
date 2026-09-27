import type { Role } from '@prisma/client';

export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGES_PER_MINUTE = 30;

/** Cada pareja tiene una sola conversación: el id menor va siempre como A. */
export function pairIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

interface ChatParty {
  isMinor: boolean;
  role: Role;
  extraRoles: readonly Role[];
}

const canSupervise = (party: ChatParty) =>
  party.role === 'MENTOR' || party.role === 'ADMIN' || party.extraRoles.some((r) => r === 'MENTOR' || r === 'ADMIN');

/**
 * Regla de protección: una persona menor de edad solo puede conversar con mentores o con la administración.
 * Entre dos personas sin menores no hay restricción.
 */
export function canChat(a: ChatParty, b: ChatParty): boolean {
  if (!a.isMinor && !b.isMinor) return true;
  return (a.isMinor ? canSupervise(b) : true) && (b.isMinor ? canSupervise(a) : true);
}
