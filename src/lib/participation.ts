import { dateBoundary } from './courseStatus';

export type PhaseButton = {id:string;label:string;kind:'submission'|'registration'|'payment'|'materials'|'link';href?:string;audience?:'everyone'|'unregistered'|'accepted'|'paid'};
export type ParticipationPhase = {id:string;title:string;startDate?:string;endDate?:string;buttons:PhaseButton[]};
export type ParticipantState = {admissionStatus?:string;paymentStatus?:string;paymentDeadline?:string};
export type ParticipationRecord = {type?:string;completedFee?:number;registrationState?:string;registrationCard?:{buttonText?:string;buttonLink?:string;paymentDeadline?:string;actionPhases?:ParticipationPhase[]}};

export function phaseActive(phase:ParticipationPhase,now=Date.now()) {
  const start=dateBoundary(phase.startDate),end=dateBoundary(phase.endDate,true);
  if(phase.startDate&&start===undefined||phase.endDate&&end===undefined)return false;
  return (start===undefined||now>=start)&&(end===undefined||now<=end);
}
export function validateParticipationPhases(phases:unknown):string|undefined {
  if(!Array.isArray(phases))return 'Phases must be a list.';
  const ids=new Set<string>();
  for(const phase of phases) {
    if(!phase||typeof phase.id!=='string'||!phase.id||ids.has(phase.id)||typeof phase.title!=='string'||!phase.title.trim())return 'Each phase needs a unique ID and a title.';
    ids.add(phase.id);
    if(!phase.startDate&&!phase.endDate)return 'Each phase needs at least a start date or an end date.';
    for(const value of [phase.startDate,phase.endDate])if(value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||dateBoundary(value)===undefined))return 'Use valid calendar dates for phases.';
    if(phase.startDate&&phase.endDate&&dateBoundary(phase.startDate)! > dateBoundary(phase.endDate,true)!)return 'A phase must end on or after its start date.';
    if(!Array.isArray(phase.buttons)||!phase.buttons.length)return 'Each phase needs at least one button.';
    const buttons=new Set<string>();
    for(const button of phase.buttons) {
      if(!button||typeof button.id!=='string'||!button.id||buttons.has(button.id)||typeof button.label!=='string'||!button.label.trim())return 'Each button needs a unique ID and a label.';
      buttons.add(button.id);
      if(!['submission','registration','payment','materials','link'].includes(button.kind))return 'Choose a supported button action.';
      if(button.audience&&!['everyone','unregistered','accepted','paid'].includes(button.audience))return 'Choose a supported button audience.';
      if(button.href!==undefined&&typeof button.href!=='string')return 'Button destinations must be text.';
      if(['submission','link'].includes(button.kind)&&!button.href?.trim())return 'Submission and link buttons need a destination.';
      if(button.href&&!/^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*|mailto:[^\s]+)$/i.test(button.href))return 'Use an https://, http://, site-relative, or email destination.';
    }
  }
}

/** Personal payment deadlines further restrict the published registration window. Paid access is never revoked by a closing window. */
export function registrationAvailability(record:ParticipationRecord,participant?:ParticipantState|null,now=Date.now()) {
  const phases=record.registrationCard?.actionPhases||[];
  const applicableButton=(button:PhaseButton)=>{
    const audience=button.audience||'everyone';
    if(participant)return ['registration','payment'].includes(button.kind)&&!['unregistered','paid'].includes(audience);
    return button.kind==='registration'&&!['accepted','paid'].includes(audience);
  };
  const openPhase=phases.some(phase=>phaseActive(phase,now)&&phase.buttons.some(applicableButton));
  if(phases.length&&!openPhase)return {allowed:false,reason:'Registration is not open for the current phase.'};
  for(const value of [record.registrationCard?.paymentDeadline,participant?.paymentDeadline]) {
    // Imported date-only deadline labels are evaluated through the same end-of-day IST boundary.
    const normalized=value&&!/^\d{4}-\d{2}-\d{2}$/.test(value)&&/\b\d{4}\b/.test(value)&&!/:/.test(value)&&Number.isFinite(Date.parse(value))?new Date(value).toISOString().slice(0,10):value;
    const deadline=dateBoundary(normalized,true);
    if(deadline!==undefined&&now>deadline)return {allowed:false,reason:'The registration / payment deadline has passed.'};
  }
  // Closing public registration does not prevent invited participants from paying within their assigned deadline.
  if(!participant&&record.registrationState==='closed')return {allowed:false,reason:'Registration is closed.'};
  return {allowed:true,reason:''};
}
