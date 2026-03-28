import { useQuery } from '@tanstack/react-query';

import {
  chatbotApi,
  type ConversationListParams,
  type MessageListParams,
} from '@/lib/api/chatbot';

// --- Query keys ---

export const chatbotKeys = {
  all: ['chatbot'] as const,

  // Conversations
  conversations: (params?: ConversationListParams) =>
    [...chatbotKeys.all, 'conversations', params] as const,
  conversation: (id: string) =>
    [...chatbotKeys.all, 'conversation', id] as const,

  // Messages
  messages: (conversationId: string, params?: MessageListParams) =>
    [...chatbotKeys.all, 'messages', conversationId, params] as const,
};

// --- Conversation Queries ---

/** List chatbot conversations */
export function useChatbotConversations(params?: ConversationListParams) {
  return useQuery({
    queryKey: chatbotKeys.conversations(params),
    queryFn: () => chatbotApi.listConversations(params),
  });
}

/** Single chatbot conversation by ID */
export function useChatbotConversation(id: string) {
  return useQuery({
    queryKey: chatbotKeys.conversation(id),
    queryFn: () => chatbotApi.getConversation(id),
    enabled: !!id,
  });
}

// --- Message Queries ---

/** Get messages for a conversation */
export function useChatbotMessages(conversationId: string, params?: MessageListParams) {
  return useQuery({
    queryKey: chatbotKeys.messages(conversationId, params),
    queryFn: () => chatbotApi.getMessages(conversationId, params),
    enabled: !!conversationId,
  });
}
