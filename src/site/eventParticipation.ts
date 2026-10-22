import { phaseActive, registrationAvailability, type ParticipationRecord, type ParticipantState } from '../lib/participation';
export type ParticipationAction={kind:'materials'|'external'|'registration'|'enroll'|'closed'|'notice';label:string;href?:string;id?:string};
type Input={record:ParticipationRecord;status:string;registration?:{accepted?:boolean;participant?:ParticipantState}|null;materialsAccess:boolean;now?:number;online?:boolean;materialsLabel?:string};

/** Shared event/course decision table. Controllers retain enrollment, payment, and LMS handlers. */
export function eventParticipationActions({record,status,registration,materialsAccess,now=Date.now(),online=false,materialsLabel='Access Materials'}:Input):ParticipationAction[] {
  const accepted=!!registration?.accepted,participant=accepted?registration?.participant||{}:undefined;
  const paid=participant?.paymentStatus==='Confirmed';
  const phases=record.registrationCard?.actionPhases||[];
  const availability=registrationAvailability(status==='Completed'&&!online&&!phases.length?{...record,registrationState:undefined}:record,participant,now);
  if(phases.length) {
    const actions:ParticipationAction[]=[];
    for(const phase of phases.filter(p=>phaseActive(p,now)))for(const button of phase.buttons) {
      const audience=button.audience||'everyone';
      if(audience==='unregistered'&&accepted||audience==='accepted'&&!accepted||audience==='paid'&&!paid)continue;
      if(button.kind==='materials') {if(materialsAccess)actions.push({kind:'materials',label:button.label,id:`${phase.id}:${button.id}`});continue;}
      if(button.kind==='registration'||button.kind==='payment') {
        if(materialsAccess||paid||!availability.allowed||button.kind==='payment'&&!accepted)continue;
        actions.push({kind:button.href?'external':'registration',label:button.label,href:button.href,id:`${phase.id}:${button.id}`});continue;
      }
      // Submission eligibility is configurable; the editor defaults it to unregistered visitors.
      actions.push({kind:'external',label:button.label,href:button.href,id:`${phase.id}:${button.id}`});
    }
    if(materialsAccess&&!actions.some(a=>a.kind==='materials'))actions.unshift({kind:'materials',label:materialsLabel});
    if(!materialsAccess&&accepted&&paid)actions.push({kind:'notice',label:participant?.admissionStatus==='Confirmed'?'Registration confirmed':'Admission under review'});
    if(!actions.length)actions.push({kind:'notice',label:accepted?availability.reason||'No actions are currently open.':'No actions are currently open.'});
    return actions;
  }
  if(materialsAccess)return [{kind:'materials',label:materialsLabel}];
  if(accepted) {
    if(paid)return [{kind:'notice',label:participant?.admissionStatus==='Confirmed'?'Registration confirmed':'Admission under review'}];
    return availability.allowed?[{kind:'registration',label:'Complete payment'}]:[{kind:'notice',label:availability.reason}];
  }
  const card=record.registrationCard;
  // Existing unscheduled submission links remain intact until explicit phases are configured.
  if(card?.buttonLink&&card.buttonLink!=='#')return [{kind:'external',label:card.buttonText||'Link To Portal →',href:card.buttonLink}];
  if(!availability.allowed)return [{kind:'notice',label:availability.reason}];
  if(status==='Completed'&&!online)return [{kind:'enroll',label:record.completedFee&&record.completedFee>0?`Pay ₹${record.completedFee} & Get Access`:'Enroll & Get Access (Free)'}];
  if(status==='Upcoming'||status==='Ongoing'||online&&status!=='Archived')return [{kind:'registration',label:card?.buttonText||(online?'Enroll Now':['W2M Residential Course','Residential'].includes(record.type||'')?'Apply for Admission':'Go to submission portal')}];
  return [{kind:'closed',label:'Admissions closed'}];
}
/** Compatibility for consumers requiring a single primary action. */
export function eventParticipationAction(input:Input):ParticipationAction {return eventParticipationActions(input)[0];}
