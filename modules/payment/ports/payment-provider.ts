export interface CheckoutRequest {
  merchantOrderNo: string;
  amountCents: bigint;
  subject: string;
  notifyUrl: string;
  returnUrl: string;
}

export interface CheckoutResult {
  providerOrderId: string;
  redirectUrl: string;
}

export interface VerifiedPaymentEvent {
  providerEventId: string;
  merchantOrderNo: string;
  amountCents: bigint;
  status: 'paid' | 'refunded';
}

export interface PaymentProvider {
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  verifyCallback(
    headers: Readonly<Record<string, string>>,
    body: string,
  ): Promise<VerifiedPaymentEvent>;
}
