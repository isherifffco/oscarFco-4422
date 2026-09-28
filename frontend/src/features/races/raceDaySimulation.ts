import { createSeededRandom, randomInt, shuffle, type RandomFn } from '@/lib/seededRandom';
import {
  AVERAGE_SPEED_CM_PER_S,
  RACE_SCHEDULE,
  RACES_PER_DAY,
  SNAILS,
  TRACK_LENGTH_CM,
  type Snail,
} from './snails';

export interface RaceResult {
  number: number;
  startTime: string;
  /** Posiciones finales: índice 0 = ganador. Cada caracol aparece una sola vez. */
  finishOrder: { snailId: string; timeSeconds: number }[];
  winnerId: string;
}

export interface Bet {
  raceNumber: number;
  snailId: string;
  won: boolean;
}

export interface SnailWins {
  snailId: string;
  name: string;
  wins: number;
}

export interface RaceDay {
  date: string;
  races: RaceResult[];
  winsBySnail: SnailWins[];
  bets: Bet[];
  betSummary: { won: number; lost: number; total: number };
}

/**
 * Tiempo de un caracol: distancia / (velocidad media * habilidad * variación del día).
 * La variación (±20 %) permite que cualquier caracol pueda ganar.
 */
function simulateRace(raceIndex: number, random: RandomFn, snails: readonly Snail[]): RaceResult {
  const finishOrder = snails
    .map((snail) => {
      const dayForm = 0.8 + random() * 0.4;
      return { snailId: snail.id, rawTime: TRACK_LENGTH_CM / (AVERAGE_SPEED_CM_PER_S * snail.speed * dayForm) };
    })
    .sort((a, b) => a.rawTime - b.rawTime)
    .map(({ snailId, rawTime }) => ({ snailId, timeSeconds: Math.round(rawTime * 10) / 10 }));

  const winner = finishOrder[0];
  if (!winner) throw new Error('Una carrera necesita al menos un caracol.');

  return {
    number: raceIndex + 1,
    startTime: RACE_SCHEDULE[raceIndex] ?? '',
    finishOrder,
    winnerId: winner.snailId,
  };
}

/**
 * Apuestas simuladas del usuario: en cada carrera apuesta a 1 o 2 caracoles distintos.
 * Así, por construcción, solo puede ganar como máximo una apuesta por carrera.
 */
function simulateBets(races: RaceResult[], random: RandomFn, snails: readonly Snail[]): Bet[] {
  return races.flatMap((race) => {
    const picks = shuffle(snails, random).slice(0, randomInt(random, 1, 2));
    return picks.map((snail) => ({
      raceNumber: race.number,
      snailId: snail.id,
      won: snail.id === race.winnerId,
    }));
  });
}

/**
 * Simula una jornada completa. Las carreras dependen solo de la fecha (son las mismas
 * para todos los usuarios); las apuestas dependen de la fecha y del usuario.
 */
export function simulateRaceDay(date: string, userId: string, snails: readonly Snail[] = SNAILS): RaceDay {
  const raceRandom = createSeededRandom(`races:${date}`);
  const races = Array.from({ length: RACES_PER_DAY }, (_, index) => simulateRace(index, raceRandom, snails));

  const winsBySnail = snails.map((snail) => ({
    snailId: snail.id,
    name: snail.name,
    wins: races.filter((race) => race.winnerId === snail.id).length,
  }));

  const bets = simulateBets(races, createSeededRandom(`bets:${date}:${userId}`), snails);
  const won = bets.filter((bet) => bet.won).length;

  return {
    date,
    races,
    winsBySnail,
    bets,
    betSummary: { won, lost: bets.length - won, total: bets.length },
  };
}

/** Fecha local en formato AAAA-MM-DD (la jornada simulada es la del día actual). */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSnailName(snailId: string, snails: readonly Snail[] = SNAILS): string {
  return snails.find((snail) => snail.id === snailId)?.name ?? snailId;
}
