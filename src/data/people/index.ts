/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person } from './types.ts';
import { Dr_Bornini_Lahiri } from './Dr_Bornini_Lahiri.ts';
import { Ritesh_Kumar } from './Ritesh_Kumar.ts';
import { R_Karthick_Narayanan } from './R_Karthick_Narayanan.ts';
import { Meiraba_Takhellambam } from './Meiraba_Takhellambam.ts';

export * from './types.ts';

export const people: Person[] = [
  R_Karthick_Narayanan,
  Dr_Bornini_Lahiri,
  Ritesh_Kumar,  
  Meiraba_Takhellambam
];

// Provide 'team' as an alias of 'people' for backward compatibility
export const team = people;
