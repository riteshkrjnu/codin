import { useId, useState } from 'react';
import { dateBoundary } from '../lib/courseStatus';
import { type ParticipationPhase, type PhaseButton, validateParticipationPhases } from '../lib/participation';
import { eventParticipationActions } from '../site/eventParticipation';
const uid=()=>crypto.randomUUID();
const kinds={submission:'Submission link',registration:'Registration / enrollment',payment:'Payment (accepted participants)',materials:'Materials (approved access only)',link:'Other link'};
export default function ParticipationPhaseEditor({value,onChange}:{value:ParticipationPhase[];onChange:(phases:ParticipationPhase[])=>void}) {
  const id=useId(),[previewDate,setPreviewDate]=useState(''),[previewUser,setPreviewUser]=useState('visitor');
  const update=(index:number,patch:Partial<ParticipationPhase>)=>onChange(value.map((p,i)=>i===index?{...p,...patch}:p));
  const updateButton=(phase:number,index:number,patch:Partial<PhaseButton>)=>update(phase,{buttons:value[phase].buttons.map((b,i)=>i===index?{...b,...patch}:b)});
  const error=validateParticipationPhases(value);
  const now=previewDate?dateBoundary(previewDate)!:Date.now();
  const preview=eventParticipationActions({record:{registrationCard:{actionPhases:value}},status:'Ongoing',now,materialsAccess:previewUser==='paid',registration:previewUser==='visitor'?null:{accepted:true,participant:{admissionStatus:'Confirmed',paymentStatus:previewUser==='paid'?'Confirmed':'Pending'}}});
  return <section className="participation-phase-editor" aria-label="Phase buttons">
    <h3>Deadlines, phases & buttons</h3>
    <p>Set a start and/or end date for each phase and add its buttons. End dates include the whole day in India Standard Time (IST). Overlapping phases can show multiple buttons. Approved materials access stays available after a phase ends.</p>
    <p>Registration and payment buttons are hidden after payment. Payment buttons require an accepted participant. Personal payment deadlines also apply. With no phases, existing buttons continue to work.</p>
    {value.map((phase,index)=><fieldset key={phase.id} className="participation-phase"><legend>Phase {index+1}</legend>
      <div className="phase-fields">
        <label htmlFor={`${id}-${phase.id}-title`}>Phase / deadline title<input id={`${id}-${phase.id}-title`} value={phase.title} onChange={e=>update(index,{title:e.target.value})} placeholder="e.g. Abstract submission"/></label>
        <label htmlFor={`${id}-${phase.id}-start`}>Starts (IST)<input id={`${id}-${phase.id}-start`} type="date" value={phase.startDate||''} onChange={e=>update(index,{startDate:e.target.value})}/></label>
        <label htmlFor={`${id}-${phase.id}-end`}>Ends / deadline (IST)<input id={`${id}-${phase.id}-end`} type="date" value={phase.endDate||''} onChange={e=>update(index,{endDate:e.target.value})}/></label>
      </div>
      {phase.buttons.map((button,bi)=><fieldset key={button.id} className="phase-button"><legend>Button {bi+1}</legend><div className="phase-fields">
        <label htmlFor={`${id}-${button.id}-label`}>Button label<input id={`${id}-${button.id}-label`} value={button.label} onChange={e=>updateButton(index,bi,{label:e.target.value})} placeholder="e.g. Submit Abstract"/></label>
        <label htmlFor={`${id}-${button.id}-kind`}>Action<select aria-label="Action" id={`${id}-${button.id}-kind`} value={button.kind} onChange={e=>updateButton(index,bi,{kind:e.target.value as PhaseButton['kind']})}>{Object.entries(kinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label htmlFor={`${id}-${button.id}-audience`}>Show to<select aria-label="Show to" id={`${id}-${button.id}-audience`} value={button.audience||'everyone'} onChange={e=>updateButton(index,bi,{audience:e.target.value as PhaseButton['audience']})}><option value="everyone">Everyone eligible</option><option value="unregistered">Not in accepted list</option><option value="accepted">In accepted list</option><option value="paid">Payment confirmed</option></select></label>
        {button.kind!=='materials'&&<label htmlFor={`${id}-${button.id}-href`}>Destination {['submission','link'].includes(button.kind)?'(required)':'(optional; blank uses existing flow)'}<input id={`${id}-${button.id}-href`} value={button.href||''} onChange={e=>updateButton(index,bi,{href:e.target.value})} placeholder="https://…"/></label>}
      </div><button type="button" onClick={()=>update(index,{buttons:phase.buttons.filter((_,i)=>i!==bi)})}>Remove button {bi+1}</button></fieldset>)}
      <div className="phase-editor-actions"><button type="button" onClick={()=>update(index,{buttons:[...phase.buttons,{id:uid(),label:'',kind:'submission',audience:'unregistered'}]})}>Add button</button><button type="button" onClick={()=>onChange(value.filter((_,i)=>i!==index))}>Remove phase {index+1}</button></div>
    </fieldset>)}
    <button type="button" onClick={()=>onChange([...value,{id:uid(),title:'',startDate:'',endDate:'',buttons:[{id:uid(),label:'',kind:'submission',audience:'unregistered'}]}])}>Add phase</button>
    {error&&<p className="phase-error" role="status">{error}</p>}
    {value.length>0&&!error&&<div className="phase-preview"><h4>Preview scheduled buttons</h4><div className="phase-fields"><label htmlFor={`${id}-preview-date`}>Preview date (start of day, IST)<input id={`${id}-preview-date`} type="date" value={previewDate} onChange={e=>setPreviewDate(e.target.value)}/></label><label htmlFor={`${id}-preview-person`}>Preview participant<select aria-label="Preview participant" id={`${id}-preview-person`} value={previewUser} onChange={e=>setPreviewUser(e.target.value)}><option value="visitor">Visitor</option><option value="accepted">Accepted, payment pending</option><option value="paid">Accepted and paid</option></select></label></div><p>Preview only; existing public-registration closure and personal deadlines may further restrict actions.</p><ul>{preview.map((action,i)=><li key={i}>{action.label}{action.href?` → ${action.href}`:''}</li>)}</ul></div>}
  </section>;
}
