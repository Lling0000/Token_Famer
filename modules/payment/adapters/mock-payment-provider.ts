import type {
  CheckoutRequest,
  CheckoutResult,
  PaymentProvider,
  VerifiedPaymentEvent,
} from '../ports/payment-provider';

export class MockPaymentProvider implements PaymentProvider {
  public async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    return {
      providerOrderId: `mock_${request.merchantOrderNo}`,
      redirectUrl: `/api/payments/mock/${request.merchantOrderNo}/complete`,
    };
  }

  public async verifyCallback(
    _headers: Readonly<Record<string, string>>,
    body: string,
  ): Promise<VerifiedPaymentEvent> {
    const payload = JSON.parse(body) as {
      eventId: string;
      merchantOrderNo: string;
      amountCents: string;
      status: 'paid' | 'refunded';
    };
    return {
      providerEventId: payload.eventId,
      merchantOrderNo: payload.merchantOrderNo,
      amountCents: BigInt(payload.amountCents),
      status: payload.status,
    };
  }
}
