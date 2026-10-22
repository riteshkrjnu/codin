import { Catalogue } from '../site/PublicPages';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, ArrowRight, Timer, Lock, Filter, BookOpen, Star, Briefcase, CheckCircle2, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getEffectiveStatus } from '../lib/courseStatus';
import { useAuth } from '../context/AuthContext';
import { BrutalistLoader } from '../components/Loader';

export default function OnlineCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [enrolledCourseSlugs, setEnrolledCourseSlugs] = useState<string[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
        const [courseRes, certRes] = await Promise.all([
          fetch(user?.token ? '/api/lms/admin/courses' : '/api/lms/courses', { headers }),
          fetch(user?.token ? '/api/lms/admin/certifications' : '/api/lms/certifications', { headers })
        ]);
        if (courseRes.ok) {
          const courseText = await courseRes.text();
          if (courseText.trim().startsWith('{')) {
            const courseData = JSON.parse(courseText);
            if (courseData.courses) setCourses(courseData.courses);
          }
        }
        if (certRes.ok) {
          const certText = await certRes.text();
          if (certText.trim().startsWith('{')) {
            const certData = JSON.parse(certText);
            if (certData.certifications) setCertifications(certData.certifications);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setEnrolledCourseSlugs([]);
      return;
    }

    const fetchEnrollments = async () => {
      try {
         const res = await fetch(`/api/lms/enrollments/${user.token}`);
         if (res.ok) {
           const resText = await res.text();
           if (resText.trim().startsWith('{')) {
             const data = JSON.parse(resText);
             if (data.enrolledCourses) {
               setEnrolledCourseSlugs(data.enrolledCourses);
             }
           }
         }
      } catch (err) {
         console.error(err);
      }
    };
    
    fetchEnrollments();
  }, [user]);

    // Determine which courses this user is allowed to see.
  // Admins/Superadmins see all.
  // Instructors/TAs see their drafts + all published.
  // Students see only published.
  const allowedCourses = courses.filter(c => 
     !c.deleted && 
     c.type !== 'W2M Residential Course' && 
     c.type !== 'Residential Course' && 
     c.type !== 'Residential' && (
       c.status !== 'Draft' || 
       (user && (
         user.role === 'admin' ||
         user.role === 'superadmin' ||
         c.instructors?.some((i: any) => i.user === user.id) || 
         c.tas?.some((t: any) => t.user === user.id)
       ))
     )
  );

  const allowedCertifications = certifications.filter(c => 
     c.status !== 'Draft' || 
     (user && (
       c.createdBy === user.id ||
       user.role === 'admin' ||
       user.role === 'superadmin'
     ))
  );

  const filteredCourses = allowedCourses.filter(c => {
    // 1. Certification / Category Filter
    const matchesCert = activeFilter === 'all' || 
      c.linkedCerts?.some((lc: any) => lc.certId === activeFilter) || 
      c.certIds?.includes(activeFilter) || 
      c.certId === activeFilter;

    // 2. Status Filter
    const matchesStatus = statusFilter === 'all' || 
      getEffectiveStatus(c) === statusFilter;

    // 3. Search Engine
    const matchesSearch = searchTerm === '' ||
      (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.courseCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.outline?.some((item: string) => item.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCert && matchesStatus && matchesSearch;
  });

  return <Catalogue kind="online" controls={{
    records: allowedCourses.filter(c=>activeFilter==='all'||c.linkedCerts?.some((lc:any)=>lc.certId===activeFilter)||c.certIds?.includes(activeFilter)||c.certId===activeFilter),
    includeUnpublished: !!user && ['admin','superadmin','instructor'].includes(user.role),
    searchText: course => [course.courseCode,...(course.outline||[])].join(' '),
    toolbar: user && ['admin','superadmin','instructor'].includes(user.role) ? <div className="section-actions">{['admin','superadmin'].includes(user.role)&&<Link className="action" to="/admin?tab=courses&new=1">Add Course</Link>}<Link to="/admin?tab=courses">Manage programmes & certifications →</Link></div> : undefined,
    filters: <div className="advanced-filter-grid"><label>Certification<select aria-label="Certification" value={activeFilter} onChange={e=>setActiveFilter(e.target.value)}><option value="all">All certifications</option>{allowedCertifications.map(cert=><option key={cert._id} value={cert._id}>{cert.title}</option>)}</select></label>{allowedCertifications.map(cert=><Link key={cert._id} to={`/academy/certifications/${cert._id}`}>{cert.title} →</Link>)}</div>,
    actions: course => <><Link to={`/academy/online/${course.slug}`}>{enrolledCourseSlugs.includes(course.slug)?'Resume Course':'View Modules & Enroll'}</Link>{user && (['admin','superadmin'].includes(user.role)||course.createdBy===user.id||course.instructors?.some((i:any)=>String(i.user)===user.id)||course.tas?.some((t:any)=>String(t.user)===user.id))&&<Link to={`/academy/online/${course.slug}?edit=1`}>Edit / Manage</Link>}</>,
  }}/>;
}
