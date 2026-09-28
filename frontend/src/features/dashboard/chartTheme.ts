/**
 * Colores de gráficas. El par ganadas/perdidas (azul/naranja) se validó para
 * daltonismo (ΔE CVD 24.7) y contraste >= 3:1 sobre fondo blanco.
 * La serie única de victorias usa un verde de la misma paleta validada.
 */
export const chartColors = {
  betsWon: '#2a78d6',
  betsLost: '#eb6834',
  snailWins: '#008300',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  mutedText: '#6b6a65',
  surface: '#ffffff',
  cursor: 'rgba(11, 11, 11, 0.04)',
} as const;
