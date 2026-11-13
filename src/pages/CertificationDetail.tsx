import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrutalistLoader } from '../components/Loader';

export default function CertificationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [cert, setCert] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolledSlugs, setEnrolledSlugs] = useState<string[]>([]);
  
  // Track selected optional courses for cert enrollment
  const [selectedOptionals, setSelectedOptionals] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
        const [certRes, coursesRes] = await Promise.all([
           fetch(`/api/lms/certifications/${id}`),
           fetch(user?.token ? '/api/lms/admin/courses' : '/api/lms/courses', { headers })
        ]);
        if (certRes.ok) {
          const certText = await certRes.text();
          if (certText.trim().startsWith('{')) {
            const certData = JSON.parse(certText);
            if (certData.certification) setCert(certData.certification);
          }
        }
        if (coursesRes.ok) {
          const coursesText = await coursesRes.text();
          if (coursesText.trim().startsWith('{')) {
            const coursesData = JSON.parse(coursesText);
            if (coursesData.courses) setCourses(coursesData.courses);
          }
        }

        if (user?.token) {
           const enrRes = await fetch(`/api/lms/enrollments/${user.token}`);
           if (enrRes.ok) {
             const enrText = await enrRes.text();
             if (enrText.trim().startsWith('{')) {
               const enrData = JSON.parse(enrText);
               if (enrData.enrolledCourses) {
                  setEnrolledSlugs(enrData.enrolledCourses);
               }
             }
           }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><BrutalistLoader /></div>;
  }

  if (!cert) {
    return <div className="h-screen flex items-center justify-center font-mono uppercase tracking-widest text-ink/50">Certification not found.</div>;
  }

  if (cert.status === 'Draft' && (!user || user.id !== cert.createdBy)) {
    return <div className="h-screen flex items-center justify-center font-mono uppercase tracking-widest text-ink/50">Certification is currently unavailable.</div>;
  }

  // Derive linked courses info
  const compLinks = cert.courses?.filter((c: any) => !c.isOptional) || [];
  const optLinks = cert.courses?.filter((c: any) => c.isOptional) || [];

  const compulsoryCourses = compLinks.map((link: any) => courses.find(c => c._id === link.courseId)).filter(Boolean);
  const optionalCourses = optLinks.map((link: any) => courses.find(c => c._id === link.courseId)).filter(Boolean);

  const reqCourses = cert.requiredCoursesCount || compulsoryCourses.length;
  const reqCredits = cert.requiredCredits || 0;
  
  // If user only needs certain amount of courses:
  const totalSelectedCount = compulsoryCourses.length + selectedOptionals.length;
  
  const totalSelectedCredits = compulsoryCourses.reduce((sum: number, c: any) => sum + (c.credits || 0), 0) + 
      selectedOptionals.reduce((sum: number, id: string) => {
         const c = optionalCourses.find((oc: any) => oc._id === id);
         return sum + (c?.credits || 0);
      }, 0);

  const isRequirementMet = totalSelectedCount >= reqCourses && totalSelectedCredits >= reqCredits;

  const calculateTotalFee = () => {
     let fee = cert.fee || 0;
     let hasPriorEnrollments = false;

     compulsoryCourses.forEach((c: any) => { 
       if (enrolledSlugs.includes(c.slug)) {
         hasPriorEnrollments = true;
       } else {
         fee += (c.fee || 0);
       }
     });

     selectedOptionals.forEach(optId => {
        const c = optionalCourses.find((oc: any) => oc._id === optId);
        if (c) {
          if (enrolledSlugs.includes(c.slug)) {
            hasPriorEnrollments = true;
          } else {
            fee += (c.fee || 0);
          }
        }
     });

     let discountAmt = 0;
     let isDiscountApplied = false;

     // Apply bulk discount only if requirements are met AND there are NO prior enrollments in the selected track
     if (isRequirementMet && !hasPriorEnrollments && cert.bulkDiscountType && cert.bulkDiscountType !== 'none') {
        isDiscountApplied = true;
        if (cert.bulkDiscountType === 'percentage') {
           discountAmt = fee * ((cert.bulkDiscountValue || 0) / 100);
        } else if (cert.bulkDiscountType === 'fixed') {
           discountAmt = cert.bulkDiscountValue || 0;
        }
     }

     if (discountAmt > fee) discountAmt = fee;
     const finalFee = fee - discountAmt;

     return { originalFee: fee, finalFee, discountAmt, isDiscountApplied, hasPriorEnrollments };
  };

  const currentFeeData = calculateTotalFee();

  const handleEnrollCert = async () => {
    if (!user) {
       alert("Please log in to enroll.");
       return;
    }
    if (!isRequirementMet) {
       alert(`You must select more optional courses to meet the requirements (${reqCourses} courses, ${reqCredits} credits).`);
       return;
    }
    
    // In a real app we'd trigger a payment intent here.
    // For now we just enroll in all selected courses.
    try {
      const courseIdsToEnroll = [
         ...compulsoryCourses.map((c: any) => c.slug), 
         ...selectedOptionals.map(id => optionalCourses.find((c: any) => c._id === id)?.slug).filter(Boolean)
      ];
      
      for (const slug of courseIdsToEnroll) {
         if (slug) {
            await fetch('/api/lms/enroll', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
              body: JSON.stringify({ slug })
            });
         }
      }
      alert('Successfully enrolled in the certification track!');
    } catch (e) {
      console.error(e);
      alert('Enrollment failed');
    }
  };

  return (
    <div className="pt-32 pb-24 grid-structure min-h-screen">
      <div className="max-w-4xl mx-auto px-6 border-x border-ink/20 min-h-[80vh] bg-white">
        <Link to="/academy/online" className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] mb-12 hover:bg-brand-acid p-2 border border-transparent hover:border-ink transition-all">
           <ArrowLeft className="w-3 h-3" /> Back to Explorer
        </Link>
        <div className="mb-12">
           <div className="inline-block px-3 py-1 bg-ink text-paper font-mono text-[10px] font-black uppercase tracking-widest mb-4">
              {cert.level || 'Certification'}
           </div>
           <h1 className="text-4xl md:text-5xl font-serif font-black mb-6 leading-tight italic">{cert.title}</h1>
           <p className="font-mono text-sm leading-relaxed opacity-70 mb-8 border-b border-ink/10 pb-8">{cert.description}</p>
           
           <div className="flex gap-8 font-mono text-xs uppercase tracking-widest font-bold flex-wrap">
              <div>
                 <span className="opacity-40 block mb-1">Cert Fee</span>
                 ₹{cert.fee || 0}
              </div>
              {cert.startDate && (
                <div>
                   <span className="opacity-40 block mb-1">Starts</span>
                   {new Date(cert.startDate).toLocaleDateString()}
                </div>
              )}
              {cert.endDate && (
                <div>
                   <span className="opacity-40 block mb-1">Ends</span>
                   {new Date(cert.endDate).toLocaleDateString()}
                </div>
              )}
              {cert.requiredCredits > 0 && (
                <div>
                   <span className="opacity-40 block mb-1">Req. Credits</span>
                   {cert.requiredCredits}
                </div>
              )}
              {cert.requiredCoursesCount > 0 && (
                <div>
                   <span className="opacity-40 block mb-1">Req. Courses</span>
                   {cert.requiredCoursesCount}
                </div>
              )}
           </div>
        </div>

        <div className="grid gap-12">
           {/* Compulsory Courses */}
           {compulsoryCourses.length > 0 && (
             <section>
                <h3 className="font-mono text-sm font-black uppercase tracking-widest mb-6 px-4 py-2 bg-brand-acid border border-ink inline-block">
                  Compulsory Courses
                </h3>
                <div className="grid gap-4">
                   {compulsoryCourses.map((c: any) => (
                     <div key={c._id} className="p-6 border border-ink bg-paper flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                           <div className="text-lg font-serif font-black italic mb-2">{c.title}</div>
                           <div className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40">
                             {c.credits} Credits | Fee: ₹{c.fee || 0}
                           </div>
                        </div>
                        <Link to={`/academy/online/${c.slug}`} className="h-8 px-4 border border-ink flex items-center justify-center font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-ink hover:text-paper transition-colors shrink-0">
                           View Course
                        </Link>
                     </div>
                   ))}
                </div>
             </section>
           )}

           {/* Optional Courses */}
           {optionalCourses.length > 0 && (
             <section>
                <h3 className="font-mono text-sm font-black uppercase tracking-widest mb-6 px-4 py-2 border border-ink inline-block">
                  Elective Courses
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-widest font-bold opacity-50 mb-4">
                  Select additional courses to meet the requirements.
                </p>
                <div className="grid gap-4">
                   {optionalCourses.map((c: any) => {
                     const isSelected = selectedOptionals.includes(c._id);
                     return (
                       <label key={c._id} className={`cursor-pointer p-6 border transition-colors flex flex-col md:flex-row justify-between md:items-center gap-4 ${isSelected ? 'border-brand-blue bg-blue-50/50' : 'border-ink bg-paper hover:bg-brand-acid/30'}`}>
                          <div className="flex gap-4 items-start">
                             <input type="checkbox" className="mt-2 accent-brand-blue w-4 h-4 cursor-pointer" 
                               checked={isSelected}
                               onChange={e => {
                                 if (e.target.checked) setSelectedOptionals([...selectedOptionals, c._id]);
                                 else setSelectedOptionals(selectedOptionals.filter(id => id !== c._id));
                               }}
                             />
                             <div>
                               <div className="text-lg font-serif font-black italic mb-2">{c.title}</div>
                               <div className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40">
                                 {c.credits} Credits | Fee: ₹{c.fee || 0}
                               </div>
                             </div>
                          </div>
                          <Link to={`/academy/online/${c.slug}`} className="h-8 px-4 border border-ink flex items-center justify-center font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-ink hover:text-paper transition-colors shrink-0" onClick={e => e.stopPropagation()}>
                             View Course
                          </Link>
                       </label>
                     );
                   })}
                </div>
             </section>
           )}
        </div>

        {/* Action Panel */}
        <div className="mt-16 p-8 border border-ink bg-ink text-paper relative overflow-hidden">
           {isRequirementMet ? (
             <CheckCircle2 className="absolute -right-8 -bottom-8 w-64 h-64 opacity-5 text-brand-acid pointer-events-none" />
           ) : (
             <ShieldAlert className="absolute -right-8 -bottom-8 w-64 h-64 opacity-5 text-brand-orange pointer-events-none" />
           )}
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                 <div className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Total Program Fee</div>
                 <div className="text-4xl font-serif font-black italic text-brand-acid">
                    {currentFeeData.isDiscountApplied ? (
                       <>
                         <span className="line-through text-2xl text-ink/40 mr-4">₹{currentFeeData.originalFee}</span>
                         <span>₹{currentFeeData.finalFee}</span>
                       </>
                    ) : (
                       <span>₹{currentFeeData.finalFee}</span>
                    )}
                 </div>
                 {currentFeeData.isDiscountApplied && (
                    <div className="mt-2 font-mono text-[10px] uppercase font-bold tracking-widest text-brand-orange bg-brand-orange/10 px-2 py-1 inline-block border border-brand-orange">
                       Bulk Discount Applied (-₹{currentFeeData.discountAmt})
                    </div>
                 )}
                 {currentFeeData.hasPriorEnrollments && !currentFeeData.isDiscountApplied && isRequirementMet && (
                    <div className="mt-2 font-mono text-[10px] uppercase font-bold tracking-widest text-ink/50 bg-ink/5 px-2 py-1 inline-block border border-ink/20">
                       Prior enrollments exist. Bulk discount omitted.
                    </div>
                 )}
                 {(reqCourses > 0 || reqCredits > 0) && (
                   <div className={`mt-2 font-mono text-[10px] uppercase font-bold tracking-widest ${isRequirementMet ? 'text-brand-acid' : 'text-brand-orange'}`}>
                     <div>Courses: {totalSelectedCount} of {reqCourses} required</div>
                     {reqCredits > 0 && <div>Credits: {totalSelectedCredits} / {reqCredits} required</div>}
                   </div>
                 )}
              </div>
              <button 
                onClick={cert.status === 'Closed' ? undefined : handleEnrollCert}
                disabled={!isRequirementMet || cert.status === 'Closed'}
                className={`h-14 px-8 font-mono text-xs font-black uppercase tracking-widest transition-all ${isRequirementMet && cert.status !== 'Closed' ? 'bg-brand-blue text-white hover:bg-brand-acid hover:text-ink' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
              >
                {cert.status === 'Closed' ? 'Enrollment Closed' : 'Enroll in Program'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
