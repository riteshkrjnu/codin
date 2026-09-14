/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getEffectiveStatus(course: any): string {
  if (!course) return 'Draft';

  // Check if it's a residential course and automatically completed
  const isResidential = 
    course.type === 'W2M Residential Course' || 
    course.type === 'Residential Course' || 
    course.type === 'Residential';

  if (isResidential) {
    if (course.endDate) {
      try {
        const end = new Date(course.endDate);
        const now = new Date();
        if (!isNaN(end.getTime()) && now > end) {
          return 'Completed';
        }
      } catch (e) {
        console.error("Error parsing end date", e);
      }
    }
    // Also support fallback status value check
    if (course.status === 'Completed') {
      return 'Completed';
    }
  }

  const rawStatus = course.status || 'Draft';
  if (rawStatus === 'Draft') return 'Draft';
  if (rawStatus === 'Enrollment Open') return 'Upcoming';
  if (rawStatus === 'Published') return 'Ongoing';
  if (rawStatus === 'Closed') return 'Archived';
  
  // Keep standard mapped statuses:
  if (rawStatus === 'Upcoming') return 'Upcoming';
  if (rawStatus === 'Ongoing') return 'Ongoing';
  if (rawStatus === 'Completed') return 'Completed';
  if (rawStatus === 'Archived') return 'Archived';

  return rawStatus;
}
