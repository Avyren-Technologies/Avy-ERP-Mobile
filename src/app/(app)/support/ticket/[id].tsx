import { useAuthStore } from '@/features/auth/use-auth-store';
import { TicketChatScreen } from '@/features/support/ticket-chat-screen';
import { SupportTicketDetailScreen } from '@/features/super-admin/support/support-ticket-detail-screen';

/**
 * Route wrapper that renders the correct ticket screen based on user role:
 * - Super admin → admin detail screen with status controls & approval actions
 * - Company admin / employee → chat-style screen matching web UX
 */
export default function TicketDetailRoute() {
    const userRole = useAuthStore.use.userRole();

    if (userRole === 'super-admin') {
        return <SupportTicketDetailScreen />;
    }

    return <TicketChatScreen />;
}
