import { client } from '@/lib/api/client';

// --- Types ---

export interface ConversationListParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface MessageListParams {
  page?: number;
  limit?: number;
}

// --- API Service ---

/**
 * Chatbot API service — conversations start/list, messages send/get,
 * escalation and closing.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with the API payload directly at runtime.
 */
export const chatbotApi = {
  // ── Conversations ──────────────────────────────────────────────
  startConversation: (data: Record<string, unknown>) =>
    client.post('/hr/chatbot/conversations', data),

  listConversations: (params?: ConversationListParams) =>
    client.get('/hr/chatbot/conversations', { params }),

  getConversation: (id: string) =>
    client.get(`/hr/chatbot/conversations/${id}`),

  closeConversation: (id: string) =>
    client.post(`/hr/chatbot/conversations/${id}/close`),

  escalateConversation: (id: string, data?: Record<string, unknown>) =>
    client.post(`/hr/chatbot/conversations/${id}/escalate`, data),

  // ── Messages ───────────────────────────────────────────────────
  sendMessage: (conversationId: string, data: Record<string, unknown>) =>
    client.post(`/hr/chatbot/conversations/${conversationId}/messages`, data),

  getMessages: (conversationId: string, params?: MessageListParams) =>
    client.get(`/hr/chatbot/conversations/${conversationId}/messages`, { params }),
};
