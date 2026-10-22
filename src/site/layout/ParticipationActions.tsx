import { Link } from 'react-router-dom';
import type { ParticipationAction } from '../eventParticipation';

export default function ParticipationActions({actions,registrationHref,materialsHref,onEnroll,onRegister,enrolling=false}: {
  actions:ParticipationAction[];registrationHref:string;materialsHref:string;onEnroll?:()=>void;onRegister?:()=>void;enrolling?:boolean;
}) {
  return <>{actions.map((action,index)=>{
    const key=action.id||`${action.kind}-${index}`;
    if(action.kind==='notice')return <p key={key} className="participation-notice" role="status">{action.label}</p>;
    if(action.kind==='closed')return <button key={key} type="button" className="action action-secondary" disabled>{action.label}</button>;
    if(action.kind==='external')return <a key={key} className="action" href={action.href} target="_blank" rel="noopener noreferrer">{action.label}</a>;
    if(action.kind==='materials')return <Link key={key} className="action" to={materialsHref}>{action.label} ↗</Link>;
    if(action.kind==='enroll'||onRegister)return <button key={key} type="button" className="action" onClick={action.kind==='enroll'?onEnroll:onRegister} disabled={enrolling}>{enrolling?'Processing…':action.label}</button>;
    return <Link key={key} className="action" to={registrationHref}>{action.label} ↗</Link>;
  })}</>;
}
