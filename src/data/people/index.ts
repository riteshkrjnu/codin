/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person } from './types';
import { Dr_Bornini_Lahiri } from './Dr_Bornini_Lahiri';
import { Ritesh_Kumar } from './Ritesh_Kumar';
import { R_Karthick_Narayanan } from './R_Karthick_Narayanan';
import { Meiraba_Takhellambam } from './Meiraba_Takhellambam';

export * from './types';

export const people: Person[] = [
  R_Karthick_Narayanan,
  Dr_Bornini_Lahiri,
  Ritesh_Kumar,  
  Meiraba_Takhellambam
];

// Provide 'team' as an alias of 'people' for backward compatibility
export const team = people;
