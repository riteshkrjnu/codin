/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from './types';
import { kailash } from './kailash';
import { tholkudi } from './tholkudi';
import { suvadugal } from './suvadugal';

export * from './types';

export const rawProjects: Project[] = [
  kailash,
  tholkudi,
  suvadugal
];

export const projects = rawProjects.map(p => {
  const now = new Date();
  let computedStatus = p.status;

  if (p.startDate) {
    const start = new Date(p.startDate);
    if (start > now) {
      computedStatus = 'Upcoming';
    } else {
      if (p.endDate) {
        const end = new Date(p.endDate);
        if (end < now) {
          computedStatus = 'Completed';
        } else {
          computedStatus = 'Ongoing';
        }
      } else {
        computedStatus = 'Ongoing';
      }
    }
  }

  return {
    ...p,
    status: computedStatus
  };
});
