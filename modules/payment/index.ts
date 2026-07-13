export { MockPaymentProvider } from './adapters/mock-payment-provider';
export { transitionOrder } from './domain/order';
export type { OrderStatus, PaymentEvent } from './domain/order';
export type {
  CheckoutRequest,
  CheckoutResult,
  PaymentProvider,
  VerifiedPaymentEvent,
} from './ports/payment-provider';
