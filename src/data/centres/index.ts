/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Centre } from './types';
import { diversityAiNlp } from './diversity-ai-nlp';
import { digitalPreservation } from './digital-preservation';
import { linguisticCulturalDiversity } from './linguistic-cultural-diversity';

export * from './types';

export const centres: Centre[] = [
  diversityAiNlp,
  digitalPreservation,
  linguisticCulturalDiversity
];
