import { jsonResponse } from '../../_shared/cfTypes.ts';
import type { CfPagesHandler } from '../../_shared/cfTypes.ts';

export const onRequestGet: CfPagesHandler = () => {
  return jsonResponse({ totalInquiries: 0 });
};
