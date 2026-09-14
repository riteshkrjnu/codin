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
         c.instructors?.some((i: any) => i.user === user.token) || 
         c.tas?.some((t: any) => t.user === user.token)
       ))
     )
  );

  const allowedCertifications = certifications.filter(c => 
     c.status !== 'Draft' || 
     (user && (
       c.createdBy === user.token ||
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

  return (
    <div className="pt-32 pb-24 grid-structure min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        <div className="max-w-4xl mb-20">
          <div className="inline-block px-4 py-1 border border-ink text-[10px] font-mono font-bold uppercase tracking-[0.3em] mb-4 bg-paper shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            Digital Learning: Micro-Certs
          </div>
          <h1 className="text-6xl md:text-huge font-serif font-black leading-[0.8] mb-8 italic">
            Course <br />
            <span className="text-outline">Explorer</span>
          </h1>
          <p className="font-serif text-3xl font-light italic leading-tight text-ink/60 mb-12">
            Technical specializations in data management, collection, annotation, and language technology development. Each course is a building block for our professional certifications.
          </p>

          {/* Certification Programs Overview */}
          <div className="grid sm:grid-cols-3 gap-6 mb-16">
             {allowedCertifications.map(cert => (
               <Link to={`/academy/certifications/${cert._id}`} key={cert._id} className="p-6 border border-ink bg-white hover:bg-brand-acid transition-colors cursor-pointer group">
                  <h4 className="font-mono text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Star className="w-3 h-3 text-brand-blue" />
                    {cert.level || 'Certification'}
                  </h4>
                  <div className="font-serif font-black italic text-lg mb-2">{cert.title}</div>
                  <p className="text-[10px] uppercase tracking-tight text-ink/40 group-hover:text-ink">{cert.description}</p>
               </Link>
             ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-12 border-b border-ink/10 pb-8">        
           <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-widest mr-4">
              <Filter className="w-3 h-3" />
              Filter By:
           </div>           
           <button 
              onClick={() => setActiveFilter('all')}
              className={`px-6 py-2 font-mono text-[10px] font-bold uppercase tracking-widest border transition-all ${activeFilter === 'all' ? 'bg-ink text-paper border-ink translate-y-[-2px]' : 'border-ink/20 hover:border-ink'}`}
           >
              All Courses
           </button>
           {allowedCertifications.map(cert => (
             <button 
                key={cert._id}
                onClick={() => setActiveFilter(cert._id)}
                className={`px-6 py-2 font-mono text-[10px] font-bold uppercase tracking-widest border transition-all ${activeFilter === cert._id ? 'bg-ink text-paper border-ink translate-y-[-2px]' : 'border-ink/20 hover:border-ink'}`}
             >
                {cert.title.split(' ')[0]}
             </button>
           ))}
        </div>

        {/* Search & Status Filters */}
        <div className="bg-white border border-ink p-6 mb-12 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 border border-ink font-mono text-xs focus:ring-0 focus:outline-none focus:bg-paper"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
            <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-widest mr-2 text-[#000000]/40">
              Status:
            </div>
            {['all', 'Upcoming', 'Ongoing', 'Completed', 'Archived', 'Draft'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 border border-ink font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                  statusFilter === status
                    ? 'bg-ink text-paper shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    : 'bg-paper hover:bg-brand-acid text-ink'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="py-24"><BrutalistLoader /></div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
             <AnimatePresence mode="popLayout">
             {filteredCourses.length > 0 ? (
               filteredCourses.map((course, idx) => {
             const isEnrolled = enrolledCourseSlugs.includes(course.slug);
             return (
               <motion.div
                 layout
                 key={course.slug}
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 transition={{ delay: idx * 0.05 }}
                 className={`relative p-10 border transition-shadow flex flex-col justify-between group bg-paper ${isEnrolled ? 'border-brand-blue/50 shadow-[12px_12px_0px_rgba(37,99,235,0.2)]' : 'border-ink hover:shadow-[12px_12px_0px_rgba(0,0,0,1)]'}`}
               >
                  <Link to={`/academy/online/${course.slug}`} className="absolute inset-0 z-10" />
                  <div>
                     <div className="flex justify-between items-start mb-8 relative z-20">
                        <div className="flex flex-col gap-2">
                           <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-ink text-paper w-fit">
                              <Timer className="w-3 h-3" />
                              {course.duration}
                           </div>
                           {isEnrolled && (
                             <div className="flex items-center gap-1 font-mono text-[9px] font-black uppercase tracking-widest text-brand-blue bg-brand-blue/10 px-2 py-1 w-fit">
                               <CheckCircle2 className="w-3 h-3" /> Enrolled
                             </div>
                           )}
                        </div>
                        <div className={`px-3 py-1 border font-mono text-[9px] font-black uppercase tracking-widest ${getEffectiveStatus(course) === 'Draft' ? 'bg-ink/10 text-ink/60 border-ink/20' : 'bg-brand-acid border-ink'}`}>
                           {getEffectiveStatus(course)}
                        </div>
                     </div>
  
                     <h3 className="text-3xl font-serif font-black mb-2 italic leading-none group-hover:text-brand-blue transition-colors">
                        {course.courseCode ? `[${course.courseCode}] ` : ''}{course.title}
                      </h3>
                     <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40 mb-6 flex items-center justify-between">
                        <span>{course.type}</span>
                        <span className="text-brand-orange">{course.credits} CREDITS</span>
                     </div>
  
                     <p className="text-sm font-medium leading-relaxed opacity-60 mb-8 border-b border-ink/5 pb-8">
                        {course.description}
                     </p>
  
                     <div className="mb-12">
                        <div className="font-mono text-[9px] font-black uppercase tracking-widest mb-4 opacity-30">Course Outline / Modules ({course.modules})</div>
                        <div className="grid gap-2">
                          {course.outline.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-tighter text-ink/50">
                               <div className="w-1 h-1 bg-ink/20" />
                               {item}
                            </div>
                          ))}
                        </div>
                     </div>
                  </div>
                  
                  <div className="relative z-20">
                     <button className={`h-14 w-full border flex items-center justify-center gap-3 font-mono text-xs font-black uppercase tracking-widest transition-all pointer-events-none ${isEnrolled ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-ink hover:bg-ink hover:text-paper'}`}>
                        {isEnrolled ? (
                          <>
                            <BookOpen className="w-3 h-3" />
                            Resume Course
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-3 h-3" />
                            View Modules & Enroll
                          </>
                        )}
                     </button>
                  </div>
               </motion.div>
              );
             })
             ) : (
               <div className="col-span-full p-16 text-center border border-ink bg-brand-acid/5 font-mono text-ink/60 font-bold uppercase text-xs shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                 No online courses matches your filter criteria.
               </div>
             )}
             </AnimatePresence>
          </div>
         )}

        <div className="mt-20 p-12 bg-ink text-paper text-center brutalist-card">
           <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-40 mb-8">Inquire about our institutional license and training partnerships.</p>
           <a href="mailto:academy@diversity.org.in" className="inline-flex items-center gap-3 font-mono font-black uppercase tracking-[0.4em] text-brand-acid hover:text-white transition-all hover:translate-x-2">
              Talk to us <ArrowRight className="w-5 h-5" />
           </a>
        </div>
      </div>
    </div>
  );
}
