import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventParticipationAction } from '../src/site/eventParticipation';

const record={type:'Conference',registrationCard:{buttonText:'Submit Paper',buttonLink:'https://example.org/submit'}};
const resolve=(overrides:Partial<Parameters<typeof eventParticipationAction>[0]>={})=>eventParticipationAction({record,status:'Upcoming',materialsAccess:false,...overrides});

test('configured submission label and destination retain precedence over generic registration and completed enrollment',()=>{
  for(const status of ['Upcoming','Ongoing','Completed','Archived'])assert.deepEqual(resolve({status}),{kind:'external',label:'Submit Paper',href:'https://example.org/submit'});
  assert.deepEqual(resolve({record:{...record,registrationCard:{buttonText:'Apply now',buttonLink:'#'}}}),{kind:'registration',label:'Apply now'});
});
test('existing registration stages replace submission only when registration is recorded; LMS requires real access',()=>{
  assert.equal(resolve({registration:{accepted:false}}).kind,'external');
  assert.deepEqual(resolve({registration:{accepted:true,participant:{admissionStatus:'Confirmed',paymentStatus:'Pending'}}}),{kind:'registration',label:'Complete payment'});
  assert.deepEqual(resolve({registration:{accepted:true,participant:{admissionStatus:'Pending',paymentStatus:'Confirmed'}}}),{kind:'notice',label:'Admission under review'});
  assert.equal(resolve({registration:{accepted:true,participant:{admissionStatus:'Confirmed',paymentStatus:'Confirmed'}}}).kind,'notice');
  assert.deepEqual(resolve({materialsAccess:true}),{kind:'materials',label:'Access Materials'});
});
test('completed enrollment, fees, closed admissions and default labels retain their original flow',()=>{
  assert.deepEqual(resolve({record:{},status:'Completed'}),{kind:'enroll',label:'Enroll & Get Access (Free)'});
  assert.deepEqual(resolve({record:{completedFee:500},status:'Completed'}),{kind:'enroll',label:'Pay ₹500 & Get Access'});
  assert.deepEqual(resolve({record:{},status:'Archived'}),{kind:'closed',label:'Admissions closed'});
  assert.equal(resolve({record:{type:'Residential'}}).label,'Apply for Admission');
  assert.equal(resolve({record:{}}).label,'Go to submission portal');
});
