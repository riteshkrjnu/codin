import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dateBoundary} from '../src/lib/courseStatus';
import {phaseActive,registrationAvailability,validateParticipationPhases,type ParticipationPhase} from '../src/lib/participation';
import {eventParticipationActions} from '../src/site/eventParticipation';
const phases:ParticipationPhase[]=[
  {id:'abstracts',title:'Abstract submission',startDate:'2026-10-01',endDate:'2026-10-20',buttons:[{id:'abstract',label:'Submit Abstract',kind:'submission',href:'https://example.org/abstract',audience:'unregistered'}]},
  {id:'registration',title:'Registration',startDate:'2026-10-21',endDate:'2026-10-30',buttons:[{id:'register',label:'Registration',kind:'registration'},{id:'guidelines',label:'Read guidelines',kind:'link',href:'/guidelines'}]},
];
const record={registrationState:'open',registrationCard:{actionPhases:phases}};
const now=dateBoundary('2026-10-21')!;
const accepted={accepted:true,participant:{admissionStatus:'Confirmed',paymentStatus:'Pending'}};
const actions=(input:any={})=>eventParticipationActions({record,status:'Upcoming',materialsAccess:false,now,...input});

test('phase switch occurs at midnight IST; end dates include the entire deadline day',()=>{
  assert.equal(phaseActive(phases[0],now-1),true);
  assert.equal(phaseActive(phases[0],now),false);
  assert.equal(phaseActive(phases[1],now-1),false);
  assert.equal(phaseActive(phases[1],now),true);
  assert.deepEqual(actions({now:now-1}).map(a=>a.label),['Submit Abstract']);
  assert.deepEqual(actions().map(a=>a.label),['Registration','Read guidelines']);
  assert.equal(phaseActive({...phases[0],endDate:'2026-02-30'},now),false);
});
test('accepted participant must satisfy both phase and personal deadline; payment removes registration',()=>{
  assert.deepEqual(actions({registration:accepted}).map(a=>a.label),['Registration','Read guidelines']);
  assert.equal(actions({registration:{...accepted,participant:{...accepted.participant,paymentDeadline:'2026-10-20'}}}).some(a=>a.kind==='registration'),false);
  assert.equal(actions({registration:accepted,now:dateBoundary('2026-10-31')}).some(a=>a.kind==='registration'),false);
  assert.equal(actions({registration:accepted,now:dateBoundary('2026-10-10')}).some(a=>a.kind==='registration'),false);
  const paid={accepted:true,participant:{admissionStatus:'Confirmed',paymentStatus:'Confirmed'}};
  assert.deepEqual(actions({registration:paid,materialsAccess:true}).map(a=>a.label),['Access Materials','Read guidelines']);
  assert.deepEqual(actions({registration:paid,materialsAccess:true,now:dateBoundary('2026-11-01')}).map(a=>a.label),['Access Materials']);
  assert.deepEqual(actions({registration:paid}).map(a=>a.label),['Read guidelines','Registration confirmed']);
});
test('paid alone cannot grant materials; phase and audience cannot bypass authoritative LMS access',()=>{
  const materialPhase:ParticipationPhase={id:'m',title:'Materials',startDate:'2026-10-01',buttons:[{id:'m',kind:'materials',label:'Read materials'}]};
  assert.equal(actions({record:{registrationCard:{actionPhases:[materialPhase]}}}).some(a=>a.kind==='materials'),false);
  assert.equal(actions({record:{registrationCard:{actionPhases:[materialPhase]}},materialsAccess:true})[0].label,'Read materials');
  assert.equal(actions({registration:{accepted:true,participant:{paymentStatus:'Confirmed',admissionStatus:'Pending'}}}).some(a=>a.kind==='materials'||a.kind==='registration'),false);
});
test('overlapping phases and multiple buttons retain order; accepted-only payment is never public',()=>{
  const payment:ParticipationPhase={id:'payment',title:'Accepted payments',startDate:'2026-10-21',endDate:'2026-10-29',buttons:[{id:'pay',label:'Pay fee',kind:'payment',href:'https://example.org/pay',audience:'accepted'}]};
  const overlapping={registrationCard:{actionPhases:[...phases,payment]}};
  assert.equal(actions({record:overlapping}).some(a=>a.label==='Pay fee'),false);
  assert.deepEqual(actions({record:overlapping,registration:accepted}).map(a=>a.label),['Registration','Read guidelines','Pay fee']);
  assert.equal(registrationAvailability({registrationCard:{actionPhases:[payment]}},undefined,now).allowed,false);
  assert.equal(registrationAvailability({registrationCard:{actionPhases:[payment]}},accepted.participant,now).allowed,true);
});
test('legacy deadlines and explicit public closure apply without removing approved access',()=>{
  assert.equal(registrationAvailability({}, {...accepted.participant,paymentDeadline:'October 20, 2026'},now).allowed,false);
  assert.equal(registrationAvailability({}, {...accepted.participant,paymentDeadline:'2026-10-21'},now).allowed,true);
  assert.equal(registrationAvailability({registrationState:'closed'},undefined,now).allowed,false);
  assert.equal(registrationAvailability({registrationState:'closed'},accepted.participant,now).allowed,true);
  assert.equal(actions({record:{registrationState:'closed'},materialsAccess:true})[0].kind,'materials');
});
test('phase validation rejects invalid dates, missing destinations, duplicate IDs and unsafe links',()=>{
  assert.equal(validateParticipationPhases(phases),undefined);
  assert.equal(validateParticipationPhases([]),undefined);
  for(const invalid of [null,[{...phases[0],endDate:'2026-02-30'}],[{...phases[0],endDate:'2026-09-01'}],[phases[0],phases[0]],[{...phases[0],buttons:[]}],[{...phases[0],buttons:[{id:'a',label:'Unsafe',kind:'link',href:'javascript:alert(1)'}]}],[{...phases[0],startDate:'',endDate:''}]])assert.ok(validateParticipationPhases(invalid));
});
