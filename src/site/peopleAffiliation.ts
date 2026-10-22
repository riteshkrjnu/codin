import type { RecordData } from './data';

export const affiliations = { all:'All affiliations', staff:'CoDIN staff', external:'External collaborators', governance:'Board & research advisers', other:'Other profiles' };
export function peopleAffiliation(person: RecordData): keyof typeof affiliations {
  return person.boardMemberType==='staff'?'staff':person.boardMemberType==='external'?'external':['board','rab'].includes(person.boardMemberType)?'governance':'other';
}
