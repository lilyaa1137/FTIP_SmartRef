import { jsonResponse } from '../_shared/cfTypes.ts';
import type { CfPagesHandler } from '../_shared/cfTypes.ts';

export const onRequest: CfPagesHandler = () => {
  return jsonResponse({ error: 'Endpoint layanan API tidak ditemukan.' }, 404);
};
