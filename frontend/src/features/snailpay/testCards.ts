/** Datos de prueba de SnailPay que se muestran en la interfaz (ver docs/SNAILPAY.md). */
export const APPROVED_TEST_CARD = {
  cardNumber: '1234 1234 1234 1234',
  expirationDate: '12/26',
  cvv: '543',
} as const;

export const TEST_CARD_SCENARIOS = [
  { card: '1234 1234 1234 1234', result: 'Aprobada (vence 12/26, CVV 543)' },
  { card: '4000 0000 0000 0002', result: 'Rechazada: fondos insuficientes' },
  { card: '4000 0000 0000 0069', result: 'Rechazada: tarjeta deshabilitada' },
  { card: '4000 0000 0000 0119', result: 'Rechazada: prevención de fraude' },
  { card: '9999 9999 9999 9999', result: 'Error interno de SnailPay' },
  { card: '4444 4444 4444 4444', result: 'Sin respuesta (timeout)' },
] as const;
