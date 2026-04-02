import { useMemo } from 'react';

import { useCompanySettings } from '@/features/company-admin/api/use-company-admin-queries';
import {
  createCompanyFormatter,
  DEFAULT_FORMAT_SETTINGS,
  type CompanyFormatter,
  type CompanyFormatSettings,
} from '@/lib/format/company-formatter';

export function useCompanyFormatter(): CompanyFormatter {
  const { data } = useCompanySettings();
  const raw = (data as any)?.data;

  const settings: CompanyFormatSettings = useMemo(
    () => ({
      dateFormat: raw?.dateFormat ?? DEFAULT_FORMAT_SETTINGS.dateFormat,
      timeFormat: raw?.timeFormat ?? DEFAULT_FORMAT_SETTINGS.timeFormat,
      timezone: raw?.timezone ?? DEFAULT_FORMAT_SETTINGS.timezone,
    }),
    [raw?.dateFormat, raw?.timeFormat, raw?.timezone]
  );

  return useMemo(() => createCompanyFormatter(settings), [settings]);
}
