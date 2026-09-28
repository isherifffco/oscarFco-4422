import { appConfig } from '@/config';
import { formatAmount } from '@/lib/money';
import type { RecordableChargeAttempt } from './snailPay.types';

export interface ChargeMessage {
  tone: 'success' | 'error' | 'warning';
  title: string;
  description: string;
  details?: string[];
}

const NO_CHARGE = 'Tu saldo no cambió.';

/** Mensajes comprensibles para cada status_detail documentado. */
const STATUS_DETAIL_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_security_code: 'El CVV no es correcto. Revisa el código de 3 dígitos al reverso de la tarjeta.',
  cc_rejected_bad_filled_date: 'La fecha de vencimiento no coincide con la de la tarjeta.',
  cc_rejected_insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
  cc_rejected_card_disabled: 'La tarjeta está deshabilitada. Usa otra tarjeta o comunícate con tu banco.',
  cc_rejected_high_risk: 'El pago fue rechazado por prevención de fraude. Intenta con otra tarjeta.',
  cc_rejected_max_amount: 'El monto supera el máximo permitido por recarga ($10,000.00).',
  cc_rejected_unknown_card: 'No reconocemos esta tarjeta. Verifica el número.',
  invalid_request: 'Algunos datos no son válidos.',
  idempotency_key_conflict: 'La solicitud se reutilizó con datos distintos. Vuelve a intentarlo.',
  request_in_progress: 'Ya estamos procesando una solicitud idéntica. Espera unos segundos.',
  too_many_requests: 'Hiciste demasiados intentos en poco tiempo. Espera un minuto.',
  internal_error: 'SnailPay tuvo un problema interno y no procesó la recarga.',
  service_unavailable: 'SnailPay no está disponible en este momento.',
  processor_timeout: 'El procesador de pagos tardó demasiado en responder.',
};

const FIELD_LABELS: Record<string, string> = {
  card_number: 'Número de tarjeta',
  expiration_date: 'Vencimiento',
  cvv: 'CVV',
  holder_name: 'Nombre del titular',
  transaction_amount: 'Monto',
  payer: 'Pagador',
  'payer.id': 'Identificador del usuario',
  'payer.email': 'Correo del usuario',
};

export function describeChargeAttempt(result: RecordableChargeAttempt): ChargeMessage {
  switch (result.kind) {
    case 'approved': {
      const { charge } = result;
      return {
        tone: 'success',
        title: '¡Recarga aprobada!',
        description: `Se abonaron ${formatAmount(charge.transaction_amount ?? 0)} a tu saldo.`,
        details: [`Autorización: ${charge.authorization_code}`, `Referencia: ${charge.reference}`],
      };
    }
    case 'rejected': {
      const { charge } = result;
      return {
        tone: 'error',
        title: 'La recarga fue rechazada',
        description: `${STATUS_DETAIL_MESSAGES[charge.status_detail] ?? 'SnailPay no aprobó la operación.'} ${NO_CHARGE}`,
        details: charge.errors?.map((error) => `${FIELD_LABELS[error.field] ?? error.field}: ${error.message}`),
      };
    }
    case 'system_error': {
      const detail = result.charge?.status_detail;
      return {
        tone: 'warning',
        title: 'SnailPay no pudo procesar la recarga',
        description: `${
          (detail && STATUS_DETAIL_MESSAGES[detail]) ?? 'El servicio de pagos presentó una falla.'
        } No se realizó ningún cargo. Intenta de nuevo en unos minutos.`,
        details: result.charge ? [`Referencia: ${result.charge.reference}`] : undefined,
      };
    }
    case 'timeout':
      return {
        tone: 'warning',
        title: 'SnailPay no respondió a tiempo',
        description: `Esperamos ${Math.round(appConfig.snailPayTimeoutMs / 1000)} segundos sin respuesta. ${NO_CHARGE} Puedes intentarlo de nuevo.`,
      };
    case 'network_error':
      return {
        tone: 'warning',
        title: 'No pudimos conectar con SnailPay',
        description: `Revisa tu conexión a internet o que el servidor esté activo. ${NO_CHARGE}`,
      };
    case 'invalid_response':
      return {
        tone: 'error',
        title: 'Respuesta inesperada de SnailPay',
        description: `Por seguridad no aplicamos ningún cambio. ${NO_CHARGE}`,
      };
  }
}
