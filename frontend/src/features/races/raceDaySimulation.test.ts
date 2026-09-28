import { describe, expect, it } from 'vitest';
import { simulateRaceDay, toLocalDateKey } from './raceDaySimulation';
import { RACES_PER_DAY, SNAILS } from './snails';

const DATES = ['2026-09-28', '2026-01-01', '2027-06-15', '2030-12-31'];

describe('simulateRaceDay', () => {
  it('usa exactamente 6 caracoles y 6 carreras', () => {
    expect(SNAILS).toHaveLength(6);
    expect(RACES_PER_DAY).toBe(6);
    expect(simulateRaceDay('2026-09-28', 'user-1').races).toHaveLength(6);
  });

  it.each(DATES)('es congruente con las reglas (%s)', (date) => {
    const day = simulateRaceDay(date, 'user-1');

    // Cada carrera tiene a los 6 caracoles una sola vez y el ganador es el más rápido.
    for (const race of day.races) {
      const ids = race.finishOrder.map((entry) => entry.snailId);
      expect(new Set(ids).size).toBe(SNAILS.length);
      expect(race.winnerId).toBe(ids[0]);
      const times = race.finishOrder.map((entry) => entry.timeSeconds);
      expect(times).toEqual([...times].sort((a, b) => a - b));
    }

    // La suma de victorias es igual al número de carreras.
    const totalWins = day.winsBySnail.reduce((sum, snail) => sum + snail.wins, 0);
    expect(totalWins).toBe(RACES_PER_DAY);

    // Una apuesta se gana si y solo si el caracol elegido ganó esa carrera.
    for (const bet of day.bets) {
      const race = day.races.find((candidate) => candidate.number === bet.raceNumber);
      expect(bet.won).toBe(race?.winnerId === bet.snailId);
    }

    // Como máximo una apuesta ganada por carrera, y el resumen coincide con el detalle.
    expect(day.betSummary.won).toBeLessThanOrEqual(RACES_PER_DAY);
    expect(day.betSummary.won + day.betSummary.lost).toBe(day.bets.length);
    expect(day.bets.length).toBeGreaterThanOrEqual(RACES_PER_DAY);
    expect(day.bets.length).toBeLessThanOrEqual(RACES_PER_DAY * 2);
  });

  it('es determinista: el mismo día produce los mismos datos al recargar', () => {
    expect(simulateRaceDay('2026-09-28', 'user-1')).toEqual(simulateRaceDay('2026-09-28', 'user-1'));
  });

  it('las carreras son las mismas para todos los usuarios; las apuestas son personales', () => {
    const first = simulateRaceDay('2026-09-28', 'user-1');
    const second = simulateRaceDay('2026-09-28', 'user-2');

    expect(second.races).toEqual(first.races);
  });

  it('formatea la fecha local como AAAA-MM-DD', () => {
    expect(toLocalDateKey(new Date(2026, 8, 5))).toBe('2026-09-05');
  });
});
