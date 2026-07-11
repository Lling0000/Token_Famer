import type { AppConfig } from '../config';

export interface UpstreamCompletion {
  text: string;
  inputTokens: bigint;
  outputTokens: bigint;
  provider: 'mock' | 'teamorouter';
}

const estimateTokens = (value: unknown): bigint =>
  BigInt(Math.max(1, Math.ceil(JSON.stringify(value).length / 4)));

const messagesFromBody = (body: Record<string, unknown>): unknown[] => {
  if (Array.isArray(body.messages)) return body.messages;
  if (typeof body.input === 'string') return [{ role: 'user', content: body.input }];
  if (Array.isArray(body.input)) return body.input;
  return [{ role: 'user', content: 'Hello from Token Farmer' }];
};

export const completeUpstream = async (
  config: AppConfig,
  modelId: string,
  body: Record<string, unknown>,
  // eslint-disable-next-line complexity -- Normalizes optional usage and content fields from an external provider response.
): Promise<UpstreamCompletion> => {
  if (config.UPSTREAM_MODE !== 'teamorouter') {
    const text = `Token Farmer Mock upstream is active for ${modelId}.`;
    return {
      text,
      inputTokens: estimateTokens(body),
      outputTokens: estimateTokens(text),
      provider: 'mock',
    };
  }
  const response = await fetch(`${config.TEAMOROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.TEAMOROUTER_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: messagesFromBody(body),
      stream: false,
      max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 512,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Model provider failed with status ${response.status}`);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = payload.choices?.[0]?.message?.content ?? '';
  return {
    text,
    inputTokens: BigInt(payload.usage?.prompt_tokens ?? Number(estimateTokens(body))),
    outputTokens: BigInt(payload.usage?.completion_tokens ?? Number(estimateTokens(text))),
    provider: 'teamorouter',
  };
};
