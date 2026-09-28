export interface Snail {
  id: string;
  name: string;
  /** Habilidad base (1 = promedio). Influye en la probabilidad de ganar, sin garantizarla. */
  speed: number;
}

export const SNAILS: readonly Snail[] = [
  { id: 'rayo', name: 'Rayo Baboso', speed: 1.12 },
  { id: 'turbina', name: 'Turbina', speed: 1.08 },
  { id: 'concha', name: 'Doña Concha', speed: 1.02 },
  { id: 'espiral', name: 'Espiral', speed: 0.99 },
  { id: 'lechuguino', name: 'Lechuguino', speed: 0.95 },
  { id: 'caparazon', name: 'Don Caparazón', speed: 0.92 },
];

export const RACES_PER_DAY = 6;

/** Hora de salida de cada carrera del día (24 h). */
export const RACE_SCHEDULE = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'] as const;

/** Longitud de la pista en centímetros y velocidad media de un caracol (cm/s). */
export const TRACK_LENGTH_CM = 50;
export const AVERAGE_SPEED_CM_PER_S = 0.1;
