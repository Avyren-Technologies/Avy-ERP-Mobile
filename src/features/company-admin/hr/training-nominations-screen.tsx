// TrainingNominationsScreen is integrated into TrainingScreen (Nominations tab).
// This wrapper renders the training screen pre-set to the nominations tab,
// matching the web pattern where TrainingNominationScreen re-exports TrainingCatalogueScreen.

import { TrainingScreen } from '@/features/company-admin/hr/training-screen';

export function TrainingNominationsScreen() {
    return <TrainingScreen initialTab="nominations" />;
}
