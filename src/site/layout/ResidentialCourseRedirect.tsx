import { Navigate, useLocation, useParams } from 'react-router-dom';

/** Existing bookmarks keep their section and access parameters while sharing one record controller. */
export default function ResidentialCourseRedirect() {
  const {slug}=useParams(),location=useLocation(),params=new URLSearchParams(location.search);
  params.set('isCourse','true');if(!params.has('from'))params.set('from','academy');
  return <Navigate replace to={`/events/${encodeURIComponent(slug||'')}?${params}`}/>;
}
