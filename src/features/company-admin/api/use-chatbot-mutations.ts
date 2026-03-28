import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showError } from '@/components/ui/utils';
import { chatbotApi } from '@/lib/api/chatbot';
import { chatbotKeys } from '@/features/company-admin/api/use-chatbot-queries';

// ── Conversations ───────────────────────────────────────────────────

/** Start a new chatbot conversation */
export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      chatbotApi.startConversation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotKeys.conversations() });
    },
    onError: showError,
  });
}

/** Close a chatbot conversation */
export function useCloseConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatbotApi.closeConversation(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: chatbotKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: chatbotKeys.conversation(id) });
    },
    onError: showError,
  });
}

/** Escalate a chatbot conversation to a human agent */
export function useEscalateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      chatbotApi.escalateConversation(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: chatbotKeys.conversations() });
      queryClient.invalidateQueries({
        queryKey: chatbotKeys.conversation(variables.id),
      });
    },
    onError: showError,
  });
}

// ── Messages ─────────────────────────────────────────────────────────

/** Send a message in a conversation */
export function useSendChatbotMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data: Record<string, unknown>;
    }) => chatbotApi.sendMessage(conversationId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatbotKeys.messages(variables.conversationId),
      });
    },
    onError: showError,
  });
}
