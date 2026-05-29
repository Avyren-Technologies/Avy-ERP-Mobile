import type { ScreenHelp } from './types';

export const scanAssetHelp: ScreenHelp = {
  page: {
    title: 'Scan Asset',
    description:
      'Scan a QR code or NFC tag on a physical asset to instantly view its details, raise a work request, or log a meter reading. This is the fastest way for technicians to interact with assets in the field.',
    steps: [
      'Point your camera at the asset QR code or tap the NFC tag',
      'The app will automatically identify the asset and show its details',
      'From the scan result, you can: View full asset detail, Raise a Work Request, or Log a meter reading',
    ],
    tips: [
      'QR codes are generated when assets are registered — print and attach them to physical equipment',
      'Scanning works offline — asset data is cached locally for field use',
      'If a QR code is damaged, you can manually search by asset number instead',
    ],
  },
};
