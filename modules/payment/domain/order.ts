export type OrderStatus = 'pending' | 'paid' | 'credited' | 'refunded' | 'expired' | 'failed';
export type PaymentEvent = 'confirm-payment' | 'credit-wallet' | 'refund' | 'expire' | 'fail';

const transitions: Readonly<Record<OrderStatus, Partial<Record<PaymentEvent, OrderStatus>>>> = {
  pending: { 'confirm-payment': 'paid', expire: 'expired', fail: 'failed' },
  paid: { 'credit-wallet': 'credited', refund: 'refunded' },
  credited: { refund: 'refunded' },
  refunded: {},
  expired: {},
  failed: {},
};

export const transitionOrder = (status: OrderStatus, event: PaymentEvent): OrderStatus => {
  const nextStatus = transitions[status][event];
  if (!nextStatus) throw new Error(`Invalid order transition: ${status} -> ${event}`);
  return nextStatus;
};
