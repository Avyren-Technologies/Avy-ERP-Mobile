// CandidatesScreen is integrated into RequisitionsScreen (Candidates tab).
// This wrapper renders the recruitment screen pre-set to the candidates section,
// matching the web pattern where CandidateScreen re-exports RequisitionScreen.

import { RequisitionsScreen } from '@/features/company-admin/hr/requisitions-screen';

export function CandidatesScreen() {
    return <RequisitionsScreen initialSection="candidates" />;
}
