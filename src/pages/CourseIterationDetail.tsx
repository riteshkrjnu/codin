import RecordContent from '../site/layout/RecordContent';
import RecordExperience from '../site/layout/RecordExperience';
import RecordGlance from '../site/layout/RecordGlance';
import { useLifecycleNow } from '../lib/lifecycleClock';
import RecordHeading from '../site/layout/RecordHeading';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, MapPin, CheckCircle2, Download, ExternalLink, Mail, Loader2, AlertCircle, Check, Clock, Lock, Shield } from 'lucide-react';
import { getEffectiveStatus } from '../lib/courseStatus';
import { useAuth } from '../context/AuthContext';
import { renderMarkdown } from '../lib/utils';

export default function CourseIterationDetail() {
  const now=useLifecycleNow();
  const { slug } = useParams();
  const [course, setCourse] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { user, setShowModal } = useAuth();
  const [myStatus, setMyStatus] = useState<any>(null);
  const [payingFee, setPayingFee] = useState(false);

  const checkStatus = async (uid: string) => {
    try {
      const resStatus = await fetch(`/api/events/${slug}/my-status`, {
        headers: { Authorization: `Bearer ${uid}` }
      });
      if (resStatus.ok) {
        const dataStatus = await resStatus.json();
        if (dataStatus.accepted) {
          setMyStatus(dataStatus);
        } else {
          setMyStatus(null);
        }
      }
    } catch (err) {
      console.error("Error checking register status:", err);
    }
  };

  const handleEnrollClick = async () => {
    if (!user) {
      setShowModal(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/lms/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.token, courseSlug: slug })
      });
      const data = await res.json();
      if (data.success) {
        alert("Registration / Enrollment request submitted successfully!");
        checkStatus(user.token);
      } else {
        alert("Error during enrollment: " + (data.error || "Request failed"));
      }
    } catch (e) {
      console.error(e);
      alert("Network exception occurred while trying to enroll.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayFee = async () => {
    if (!user?.token) return;
    try {
      setPayingFee(true);
      const res = await fetch(`/api/events/${slug}/pay-fee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        alert("Payment Simulated Successfully! Your registration is now Confirmed.");
        checkStatus(user.token);
      } else {
        alert("Payment Error: " + data.error);
      }
    } catch (err) {
      alert("Checkout platform failed: " + String(err));
    } finally {
      setPayingFee(false);
    }
  };

  const handleCompletedCoursePayment = async () => {
    if (!user) {
      setShowModal(true);
      return;
    }
    try {
      setPayingFee(true);
      const res = await fetch(`/api/events/${slug}/enroll-materials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        alert("Payment Simulated Successfully! You now have direct access to all course materials.");
        checkStatus(user.token);
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Billing system failed: " + String(err));
    } finally {
      setPayingFee(false);
    }
  };

  useEffect(() => {
    if (user?.token && slug) {
      checkStatus(user.token);
    } else {
      setMyStatus(null);
    }
  }, [user, slug]);

  useEffect(() => {
    async function fetchCourse() {
      try {
        const res = await fetch(`/api/courses/${slug}`);
        if (res.ok) {
          const text = await res.text();
          if (text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            if (data.course) {
              setCourse(data.course);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching course details:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [slug, user?.token, myStatus?.participant?.admissionStatus, myStatus?.participant?.paymentStatus]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-center flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
          <p className="font-mono text-xs uppercase tracking-widest opacity-60">Acquiring Course Docket...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <h1 className="text-4xl font-serif font-black mb-4">Course Not Found</h1>
          <Link to="/academy/residential" className="text-brand-blue font-mono font-bold uppercase tracking-widest hover:underline">
            Back to Residential Academy
          </Link>
        </div>
      </div>
    );
  }

  const curriculumList = course.curriculum || course.outline || [];
  const highlightsList = course.highlights || [];
  const materialsList = user ? course.materials || [] : [];

  const courseSections = [{slug:'overview',title:'Course overview',preview:course.description},{slug:'registration',title:'Registration & materials',type:'registration'}, ...(course.subPages || []).filter((s: any) => s.type !== 'registration').map((s: any) => ({...s, slug: s.slug === 'overview' ? 'course-overview' : s.slug}))];
const renderCourseSection = (section: any) => section.slug !== 'overview' && section.slug !== 'registration' ? <RecordContent section={section}/> : section.slug === 'overview' ? (<div className="record-detail-main">
            <div className="flex items-center gap-4 mb-8">
               <div className="font-mono text-[10px] font-black uppercase tracking-widest bg-brand-acid border border-ink px-3 py-1 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                 Iteration: {course.iteration}
               </div>
               <div className="font-mono text-[10px] font-black uppercase tracking-widest opacity-40">
                 Status: {getEffectiveStatus(course)}
               </div>
            </div>
            
            {/* Core Info Row */}
            <div className="grid sm:grid-cols-2 gap-px bg-ink border border-ink mb-24 overflow-hidden">
               <div className="bg-paper p-8 flex gap-4 items-start">
                  <Calendar className="w-6 h-6 text-brand-blue" />
                  <div>
                     <div className="font-mono text-[10px] font-black uppercase tracking-widest mb-1 text-ink/40">Timeline</div>
                     <div className="font-serif font-bold text-xl">{course.dates}</div>
                  </div>
               </div>
               <div className="bg-paper p-8 flex gap-4 items-start">
                  <MapPin className="w-6 h-6 text-brand-orange" />
                  <div>
                    <div className="font-mono text-[10px] font-black uppercase tracking-widest mb-1 text-ink/40">Campus</div>
                    <div className="font-serif font-bold text-xl">{course.location}</div>
                  </div>
               </div>
            </div>

            {/* Curriculum */}
            <div className="mb-24">
               <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-8 flex items-center gap-2">
                 <span className="w-12 h-[1px] bg-ink/20" />
                 Course Modules
               </div>
               <div className="grid gap-4">
                  {curriculumList.map((item: string, i: number) => (
                    <div key={i} className="flex items-center justify-between p-8 border border-ink hover:bg-brand-acid transition-all group">
                       <span className="font-serif font-black text-2xl italic group-hover:translate-x-2 transition-transform">0{i + 1}. {item}</span>
                       <span className="w-8 h-8 rounded-full border border-ink flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <CheckCircle2 className="w-4 h-4" />
                       </span>
                    </div>
                  ))}
               </div>
            </div>
          </div>) : (<><RecordContent section={course.subPages?.find((s:any)=>s.type==='registration')||{slug:'fees',title:'Registration',type:'registration',content:course.registrationCard}}/><div className="detail-aside space-y-12">
            <div className="sticky top-32 space-y-8">
               {myStatus?.accepted ? (
                 myStatus.participant?.admissionStatus === "Confirmed" ? null : myStatus.participant?.paymentStatus === "Confirmed" ? (
                   <div className="bg-ink text-paper p-10 border border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)] flex flex-col justify-between text-left brutalist-card animate-fade-in animate-once">
                     <div>
                       <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500 text-ink font-mono text-[9px] font-black uppercase tracking-widest border border-ink shadow-[2px_2px_0px_rgba(255,255,255,1)] mb-6 font-bold">
                         <Clock className="w-4 h-4 text-ink" strokeWidth={3} />{" "}
                         ROSTER: REGISTRATION RECEIVED
                       </div>
                       <h3 className="text-2xl font-serif font-black italic mb-4 leading-tight text-white font-bold">
                         Payment Received
                       </h3>
                       <p className="text-[10px] opacity-75 mb-6 uppercase tracking-wider font-mono font-bold leading-relaxed border-b border-white/10 pb-4">
                         NAME:{" "}
                         <span className="font-semibold text-brand-acid">
                           {myStatus.participant.name}
                         </span>{" "}
                         <br />
                         EMAIL:{" "}
                         <span className="font-semibold text-brand-acid">
                           {myStatus.participant.email}
                         </span>
                       </p>

                       <div className="p-4 border border-brand-acid bg-brand-acid/10 text-brand-acid flex items-center gap-3 mb-6 font-bold">
                         <Check
                           className="w-5 h-5 text-brand-acid shrink-0"
                           strokeWidth={3}
                         />
                         <div className="font-mono text-[10px] font-black uppercase tracking-wide">
                           Fee Payment Received!
                         </div>
                       </div>

                       <div className="p-5 border border-white/20 bg-white/5 space-y-2 rounded-none">
                         <span className="block text-[10px] font-black uppercase text-brand-orange font-mono tracking-wider">
                           Admission Review Status
                         </span>
                         <p className="text-xs text-paper/85 leading-relaxed font-sans font-medium">
                           Please check back in a few days for accessing course
                           materials. Your registration status has been
                           successfully lodged on the roster, and academic
                           delegates are verifying final admissions.
                         </p>
                       </div>
                     </div>
                   </div>
                 ) : (
                   <div className="bg-ink text-paper p-10 border border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)] flex flex-col justify-between text-left brutalist-card animate-fade-in animate-once">
                     <div>
                       <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-orange text-white font-mono text-[9px] font-black uppercase tracking-widest border border-ink shadow-[2px_2px_0px_rgba(255,255,255,1)] mb-6 font-bold">
                         <AlertCircle className="w-4 h-4" /> ROSTER: PAYMENT AWAITING
                       </div>
                       <h3 className="text-2xl font-serif font-black italic mb-4 leading-tight text-white font-bold">
                         Fee Settlement
                       </h3>
                       <p className="text-[10px] opacity-75 mb-6 uppercase tracking-wider font-mono font-bold leading-relaxed border-b border-white/10 pb-4">
                         NAME:{" "}
                         <span className="font-semibold text-brand-acid">
                           {myStatus.participant.name}
                         </span>{" "}
                         <br />
                         EMAIL:{" "}
                         <span className="font-semibold text-brand-acid">
                           {myStatus.participant.email}
                         </span>
                       </p>

                       <div className="space-y-6">
                         <div className="p-4 border border-white/20 bg-white/5 flex flex-col gap-2">
                           <div className="flex justify-between items-center text-xs font-mono font-bold">
                             <span className="opacity-60">AMOUNT DUE:</span>
                             <span className="font-bold text-white uppercase">
                               Rs. {myStatus.participant.fee}
                             </span>
                           </div>
                           {myStatus.participant.paymentDeadline && (
                             <div className="flex justify-between items-center text-[10px] font-mono text-brand-orange font-bold">
                               <span>THRESHOLD DEADLINE:</span>
                               <span className="font-black bg-brand-orange/20 px-2 py-0.5 font-bold">
                                 {myStatus.participant.paymentDeadline}
                               </span>
                             </div>
                           )}
                         </div>

                         {course.registrationCard?.paymentMsgChoice === "link" &&
                         course.registrationCard?.paymentGatewayLink ? (
                           <div className="space-y-4">
                             <p className="text-xs text-paper/85 leading-relaxed font-sans">
                               Click below to open the external payment interface.
                             </p>
                             <a
                               href={course.registrationCard.paymentGatewayLink}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="w-full h-14 bg-brand-acid text-ink font-mono font-black uppercase tracking-widest text-[10px] hover:bg-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_rgba(255,255,255,0.25)] active:shadow-none active:translate-y-0 cursor-pointer font-bold border border-ink flex items-center justify-center hover:no-underline text-center"
                             >
                               Proceed to Payment Gateway ↗
                             </a>
                             <button
                               type="button"
                               onClick={handlePayFee}
                               disabled={payingFee}
                               className="w-full h-11 border border-brand-acid/40 text-brand-acid/70 hover:border-brand-acid hover:text-brand-acid font-mono text-[9px] uppercase font-bold tracking-wider transition-colors bg-brand-acid/5 cursor-pointer font-bold animate-pulse"
                             >
                               {payingFee
                                 ? "Verifying..."
                                 : "Simulate Sandbox Payment Receipt"}
                             </button>
                           </div>
                         ) : (
                           <div className="space-y-4">
                             {course.registrationCard?.paymentMarkdown ? (
                               <div className="p-4 border border-white/20 bg-white/5 text-xs text-white/90 font-sans leading-relaxed overflow-y-auto max-h-[220px]">
                                 <span className="block text-[8px] font-mono font-black uppercase tracking-widest text-brand-acid mb-2 font-bold">
                                   Instructions
                                 </span>
                                 <div
                                   dangerouslySetInnerHTML={{
                                     __html: renderMarkdown(
                                       course.registrationCard.paymentMarkdown,
                                       true,
                                     ),
                                   }}
                                 />
                               </div>
                             ) : (
                               <p className="text-xs text-paper/84 leading-relaxed font-sans">
                                 Transfer Rs. {myStatus.participant.fee} to the academy account, then click the manual simulation button below to acknowledge settlement.
                               </p>
                             )}

                             <button
                               type="button"
                               onClick={handlePayFee}
                               disabled={payingFee}
                               className="w-full h-14 bg-brand-acid text-ink font-mono font-black uppercase tracking-widest text-xs hover:bg-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_rgba(255,255,255,0.25)] active:shadow-none active:translate-y-0 cursor-pointer font-bold border border-ink font-bold"
                             >
                               {payingFee
                                 ? "Processing payment..."
                                 : "Acknowledge Payment & Request Spot"}
                             </button>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 )) : (
                   course.deleted || course.status === "Closed" || course.status === "Archived" || getEffectiveStatus(course) === "Archived" ? (
                      <div className="bg-ink/10 text-ink/70 p-10 border border-ink/20 text-left brutalist-card">
                        <h3 className="text-xl font-serif font-black italic mb-4 font-bold uppercase tracking-tight leading-none flex items-center gap-2">
                          <Lock className="w-5 h-5 text-ink/40" /> Enrollments Closed
                        </h3>
                        <p className="text-xs font-mono tracking-wide leading-relaxed">
                          This course iteration is archived, closed, or moved to trash. Materials access and spot registrations are no longer open for new students.
                        </p>
                      </div>
                   ) : getEffectiveStatus(course) === "Completed" ? (
                      <div className="bg-ink text-paper p-10 brutalist-card text-left border border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)]">
                        <h3 className="text-2xl font-serif font-black italic mb-4 font-bold uppercase tracking-tight text-white leading-none">
                          {course.registrationCard?.title || "Get Materials Access"}
                        </h3>
                        <p className="text-xs opacity-65 mb-6 leading-relaxed font-mono uppercase tracking-wide text-white/70">
                          {course.registrationCard?.description || "Enroll to instantly access all files, reports, community datasets, and workshop recordings for this completed course."}
                        </p>

                        <div className="text-3xl font-serif font-black italic mb-6 text-white leading-none">
                          {course.completedFee && course.completedFee > 0 ? (
                            <span className="font-sans font-bold">₹{course.completedFee}</span>
                          ) : "Free"}
                        </div>

                        {course.completedFee && course.completedFee > 0 ? (
                          <button onClick={handleCompletedCoursePayment} disabled={payingFee} className="w-full h-16 bg-brand-acid text-ink flex items-center justify-center gap-3 font-mono font-black uppercase tracking-widest text-xs hover:bg-white hover:text-ink transition-all active:scale-95 shadow-[6px_6px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 cursor-pointer font-bold border border-ink font-bold">
                             <Shield className="w-4 h-4" /> {payingFee ? "Processing Gateway..." : `Pay ₹${course.completedFee} & Get Access`}
                          </button>
                        ) : (
                          <button onClick={handleCompletedCoursePayment} disabled={payingFee} className="w-full h-16 bg-brand-acid text-ink flex items-center justify-center gap-3 font-mono font-black uppercase tracking-widest text-xs hover:bg-white hover:text-ink transition-all active:scale-95 shadow-[6px_6px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 cursor-pointer font-bold border border-ink font-bold">
                             <Shield className="w-4 h-4" /> {payingFee ? "Enrolling..." : "Enroll & Get Access (Free)"}
                          </button>
                        )}

                        <div className="mt-8 pt-8 border-t border-white/10">
                           <h5 className="font-mono text-[9px] font-black uppercase tracking-widest opacity-40 mb-4 text-white">Includes</h5>
                           <div className="flex flex-col gap-4">
                              {(course.registrationCard?.highlights || highlightsList || [
                                 "Lifetime Access",
                                 "Live Lecture Recordings",
                                 "W2M Certified Badge"
                              ]).map((h: string) => (
                                 <div key={h} className="flex items-center gap-2.5 text-[9px] font-mono font-bold uppercase tracking-widest text-white/85 flex">
                                    <div className="w-1.5 h-1.5 bg-brand-acid shrink-0" />
                                    <span>{h}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                      </div>
                   ) : (
                      <div className="bg-ink text-paper p-10 brutalist-card text-left border border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)]">
                        <h3 className="text-2xl font-serif font-black italic mb-4 font-bold uppercase tracking-tight text-white leading-none">
                          {course.registrationCard?.title || "Secure Your Spot"}
                        </h3>
                        <p className="text-xs opacity-65 mb-6 leading-relaxed font-mono uppercase tracking-wide text-white/70">
                          {course.registrationCard?.description || "Exclusive cohort limited to 15 participants for deep mentorship and peer-learning."}
                        </p>

                        <div className="text-3xl font-serif font-black italic mb-6 text-white leading-none">
                          {course.fee > 0 ? (
                            <span className="font-sans font-bold">₹{course.fee}</span>
                          ) : "Free"}
                        </div>

                        {course.registrationCard?.buttonLink &&
                        course.registrationCard?.buttonLink !== "#" ? (
                          <a
                            href={course.registrationCard.buttonLink}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full h-14 bg-brand-acid text-ink font-mono font-black uppercase tracking-widest text-[10px] hover:bg-white hover:translate-y-[-2px] transition-all shadow-[6px_6px_0px_rgba(255,255,255,0.2)] flex items-center justify-center border border-ink font-bold hover:no-underline"
                          >
                            {course.registrationCard.buttonText || "Link To Portal &rarr;"}
                          </a>
                        ) : (
                          <button onClick={handleEnrollClick} className="w-full h-16 bg-brand-acid text-ink flex items-center justify-center gap-3 font-mono font-black uppercase tracking-widest text-xs hover:bg-white hover:text-ink transition-all active:scale-95 shadow-[6px_6px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 cursor-pointer font-bold">
                             <Lock className="w-4 h-4" /> {course.registrationCard?.buttonText || "Apply for Admission"}
                          </button>
                        )}

                        <div className="mt-8 pt-8 border-t border-white/10">
                           <h5 className="font-mono text-[9px] font-black uppercase tracking-widest opacity-40 mb-4 text-white">Includes</h5>
                           <div className="flex flex-col gap-4">
                              {(course.registrationCard?.highlights || highlightsList || [
                                 "Lifetime Access",
                                 "Live Lecture Recordings",
                                 "W2M Certified Badge"
                              ]).map((h: string) => (
                                 <div key={h} className="flex items-center gap-2.5 text-[9px] font-mono font-bold uppercase tracking-widest text-white/85 flex">
                                    <div className="w-1.5 h-1.5 bg-brand-acid shrink-0" />
                                    <span>{h}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                      </div>
                   )
                 )}

               {/* Materials Card */}
               {materialsList.length > 0 && (
                 <div className="border border-ink p-12 bg-white shadow-[12px_12px_0px_rgba(0,0,0,1)]">
                    <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-8">Course Materials</div>
                    <div className="grid gap-4">
                       {materialsList.map((mat: any) => (
                         <a 
                            key={mat.name}
                            href={mat.url || '#'}
                            className="flex items-center justify-between p-4 border border-ink/5 hover:bg-brand-blue hover:text-paper transition-all group"
                         >
                            <span className="font-mono text-xs font-bold uppercase">{mat.name}</span>
                            <Download className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                         </a>
                       ))}
                    </div>
                    
                    <div className="mt-12 pt-8 border-t border-ink/5 text-center">
                       <a href={`mailto:academy@diversity.org.in`} className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-ink transition-colors">
                          <Mail className="w-3 h-3" />
                          Inquire about Curricula
                       </a>
                    </div>
                 </div>
               )}
            </div>
          </div></>);
return (
    <div className="pt-32 pb-24 grid-structure min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        <Link to="/academy/residential" className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.3em] mb-12 hover:text-brand-blue transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Academy Index
        </Link>

        <RecordHeading kind="course" record={course}/><RecordExperience key={course.slug} title={course.title} sections={courseSections} renderSection={renderCourseSection} glance={<RecordGlance record={course} kind="course"/>}/>

        {/* Footer Link */}
        <div className="pt-24 border-t border-ink flex flex-col md:flex-row justify-between items-center gap-12 text-ink/40 font-mono text-[10px] font-black uppercase tracking-[0.4em]">
           <div className="flex gap-8">
              <span>W2M ACADEMY</span>
              <span className="opacity-20">/</span>
              <span>RESIDENTIAL</span>
           </div>
           <Link to="/academy/residential" className="hover:text-ink transition-colors flex items-center gap-2">
              Browse All Iterations
              <ExternalLink className="w-3 h-3" />
           </Link>
        </div>
      </div>
    </div>
  );
}
