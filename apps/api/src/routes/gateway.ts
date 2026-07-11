import { randomUUID } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { MODEL_IDS, modelIdSchema } from '@token-farmer/contracts';
import type { Database } from '@token-farmer/db-runtime';

import { completeUpstream } from '../adapters/teamorouter';
import type { AppConfig } from '../config';
import {
  authorizeApiKey,
  releaseUsage,
  reserveUsage,
  settleUsage,
} from '../repositories/gateway-actions';

const requestSchema = z
  .object({
    model: modelIdSchema,
    stream: z.boolean().optional().default(false),
    max_tokens: z.number().int().positive().max(8_192).optional(),
    max_output_tokens: z.number().int().positive().max(8_192).optional(),
  })
  .passthrough();

interface GatewayContext {
  app: FastifyInstance;
  db: Database;
  config: AppConfig;
}

const authenticate = (request: FastifyRequest, context: GatewayContext) =>
  authorizeApiKey(context.db, context.config.API_KEY_PEPPER, request.headers.authorization);

const completeAndSettle = async (
  request: FastifyRequest,
  context: GatewayContext,
  body: z.infer<typeof requestSchema>,
) => {
  const startedAt = new Date();
  const apiKey = await authenticate(request, context);
  const reservation = await reserveUsage(context.db, {
    requestId: String(request.id),
    apiKey,
    modelId: body.model,
    maximumInputTokens: BigInt(Buffer.byteLength(JSON.stringify(body), 'utf8')),
    maximumOutputTokens: BigInt(body.max_tokens ?? body.max_output_tokens ?? 512),
    now: new Date(),
  });
  try {
    const completion = await completeUpstream(context.config, body.model, body);
    const charged = await settleUsage(context.db, {
      reservation,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      latencyMilliseconds: Math.max(0, new Date().getTime() - startedAt.getTime()),
      provider: completion.provider,
      now: new Date(),
    });
    return { ...completion, charged };
  } catch (error) {
    await releaseUsage(context.db, reservation, new Date());
    throw error;
  }
};

const sendEvent = (reply: FastifyReply, payload: unknown): void => {
  reply.hijack();
  reply.raw.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });
  reply.raw.end(`data: ${JSON.stringify(payload)}\n\ndata: [DONE]\n\n`);
};

const registerModelsRoute = (context: GatewayContext): void => {
  context.app.get('/v1/models', async (request) => {
    await authenticate(request, context);
    return {
      object: 'list',
      data: MODEL_IDS.map((id) => ({ id, object: 'model', owned_by: 'token-farmer' })),
    };
  });
};

const registerChatRoute = (context: GatewayContext): void => {
  context.app.post('/v1/chat/completions', async (request, reply) => {
    const body = requestSchema.parse(request.body);
    const result = await completeAndSettle(request, context, body);
    const payload = {
      id: `chatcmpl_${randomUUID()}`,
      object: 'chat.completion',
      model: body.model,
      choices: [
        { index: 0, message: { role: 'assistant', content: result.text }, finish_reason: 'stop' },
      ],
      usage: openAiUsage(result.inputTokens, result.outputTokens),
      token_farmer: tokenFarmerUsage(result.charged, result.provider),
    };
    if (body.stream) return sendEvent(reply, payload);
    return payload;
  });
};

const registerResponsesRoute = (context: GatewayContext): void => {
  context.app.post('/v1/responses', async (request, reply) => {
    const body = requestSchema.parse(request.body);
    const result = await completeAndSettle(request, context, body);
    const payload = {
      id: `resp_${randomUUID()}`,
      object: 'response',
      status: 'completed',
      model: body.model,
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: result.text }],
        },
      ],
      usage: responseUsage(result.inputTokens, result.outputTokens),
      token_farmer: tokenFarmerUsage(result.charged, result.provider),
    };
    if (body.stream) return sendEvent(reply, payload);
    return payload;
  });
};

const registerMessagesRoute = (context: GatewayContext): void => {
  context.app.post('/v1/messages', async (request, reply) => {
    const body = requestSchema.parse(request.body);
    const result = await completeAndSettle(request, context, body);
    const payload = {
      id: `msg_${randomUUID()}`,
      type: 'message',
      role: 'assistant',
      model: body.model,
      content: [{ type: 'text', text: result.text }],
      stop_reason: 'end_turn',
      usage: {
        input_tokens: Number(result.inputTokens),
        output_tokens: Number(result.outputTokens),
      },
      token_farmer: tokenFarmerUsage(result.charged, result.provider),
    };
    if (body.stream) return sendEvent(reply, payload);
    return payload;
  });
};

const openAiUsage = (input: bigint, output: bigint) => ({
  prompt_tokens: Number(input),
  completion_tokens: Number(output),
  total_tokens: Number(input + output),
});

const responseUsage = (input: bigint, output: bigint) => ({
  input_tokens: Number(input),
  output_tokens: Number(output),
  total_tokens: Number(input + output),
});

const tokenFarmerUsage = (charged: bigint, provider: string) => ({
  charged_tokens: charged.toString(),
  upstream: provider,
});

export const registerGatewayRoutes = async (
  app: FastifyInstance,
  db: Database,
  config: AppConfig,
): Promise<void> => {
  const context = { app, db, config };
  registerModelsRoute(context);
  registerChatRoute(context);
  registerResponsesRoute(context);
  registerMessagesRoute(context);
};
