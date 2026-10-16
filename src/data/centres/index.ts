/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Centre } from './types.ts';
import { diversityAiNlp } from './diversity-ai-nlp.ts';
import { digitalPreservation } from './digital-preservation.ts';
import { linguisticCulturalDiversity } from './linguistic-cultural-diversity.ts';

export * from './types.ts';

export const centres: Centre[] = [
  diversityAiNlp,
  digitalPreservation,
  linguisticCulturalDiversity
];
