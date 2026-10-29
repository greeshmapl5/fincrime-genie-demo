import { z } from 'zod';

const id = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);

export const askRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ask'), question: z.string().trim().min(1).max(10000), conversation_id: id.optional() }),
  z.object({ action: z.literal('poll'), conversation_id: id, response_id: id }),
]);

// Raw result of the Genie space MCP tools (query_space_* / poll_response_*).
export const spaceToolResultSchema = z.object({
  conversationId: id,
  messageId: id,
  status: z.string(),
  content: z.object({
    queryAttachments: z.array(z.object({
      query: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      statement_response: z.unknown().optional(),
    }).passthrough()).nullable().optional(),
    textAttachments: z.array(z.string()).nullable().optional(),
    suggestedQuestions: z.array(z.string()).nullable().optional(),
  }).passthrough().nullable().optional(),
}).passthrough();

export const genieResponseSchema = z.object({
  conversation_id: id,
  response_id: id,
  status: z.enum(['in_progress', 'completed', 'failed', 'cancelled']),
  final_answer: z.string().nullable().optional(),
  query_items: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  suggested_questions: z.array(z.string()).nullable().optional(),
}).passthrough();

export type GenieResponse = z.infer<typeof genieResponseSchema>;

export const identitySchema = z.object({ user: z.string().min(1), email: z.string().nullable() });
export const apiErrorSchema = z.object({ error: z.string() });
