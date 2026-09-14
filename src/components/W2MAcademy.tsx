/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { CheckCircle2, GraduationCap, MapPin, Users, Lightbulb, Database, ArrowRight } from 'lucide-react';
import { residentialCourses } from '../data/config';

export default function W2MAcademy() {
  const featuredCourse = residentialCourses[0];

  return (
    <section id="w2m" className="py-32 px-6 lg:px-12 bg-ink text-paper overflow-hidden relative">
      <div className="absolute top-0 right-0 font-serif text-[30vw] font-black opacity-5 pointer-events-none -translate-y-20 select-none">
        W2M
      </div>

      <div className="max-w-[1600px] mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-24 items-start">
          <div>
            <div className="inline-block px-4 py-1 border border-brand-acid text-brand-acid text-[10px] font-mono font-bold uppercase tracking-[0.3em] mb-8">
              Educational Mandate
            </div>
            <h2 className="text-5xl md:text-7xl font-serif font-black leading-[0.9] mb-12">
              The <span className="text-brand-acid italic">Quality</span> <br /> 
              is in the <br />
              Classroom.
            </h2>
            
            <div className="space-y-12">
              <div className="max-w-md">
                <h3 className="text-xl font-bold mb-4 lab-underline inline-block">The Data Sovereignty and Quality Crisis</h3>
                <p className="text-paper/60 font-medium leading-relaxed">
                  Ad-hoc data collection and model development without deep community involvement and initiative leads to high-bias, low-utility AI, owned by big organisations with little or no control or access to communities themselves. 
                  Our W2M Certification acts as a rigorous training pipeline for community members, field researchers, data architects and AI Enginners building technologies for underserved, indigenous languages.
                </p>
                <Link to="/academy" className="mt-8 inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.3em] text-brand-acid hover:text-white transition-colors">
                  Learn About W2M <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { icon: Users, title: "Sovereignty", desc: "Community-first data and model ownership protocols." },
                  { icon: GraduationCap, title: "Linguistics", desc: "Phonology and Morphology of tribal languages." },
                  { icon: Lightbulb, title: "Annotation", desc: "Systematic annotation for machine learning." },                  
                  { icon: Database, title: "Digitization", desc: "Creating archival-grade datasets for cultural and linguistic preservation." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-6 border border-white/10 hover:bg-white/5 transition-colors">
                    <item.icon className="w-8 h-8 text-brand-acid shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-widest mb-1">{item.title}</h4>
                      <p className="text-[10px] text-white/40 leading-relaxed uppercase">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Unique Residential Course Card */}
          <motion.div 
            initial={{ rotate: 2, scale: 0.95, opacity: 0 }}
            whileInView={{ rotate: 0, scale: 1, opacity: 1 }}
            className="bg-paper text-ink p-12 brutalist-card lg:mt-24 sticky top-32"
          >
            <div className="flex justify-between items-start mb-12">
               <div className="w-16 h-16 bg-brand-orange text-paper flex items-center justify-center font-black text-2xl rotate-3 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
                 !
               </div>
               <div className="text-right">
                 <div className="font-mono text-[10px] font-black uppercase tracking-[0.2em] mb-1">Featured Course</div>
                 <div className="font-serif italic font-bold">{featuredCourse.code}, {featuredCourse.iteration}</div>
               </div>
            </div>

            <h3 className="text-4xl font-serif font-black mb-4 leading-none">
              {featuredCourse.title}
            </h3>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-blue mb-8">
              {featuredCourse.tagline}
            </p>

            <p className="font-medium text-ink/70 leading-relaxed mb-10">
              {featuredCourse.description}
            </p>

            <div className="space-y-4 mb-12 border-t border-ink/10 pt-8">
               {featuredCourse.highlights.map(f => (
                 <div key={f} className="flex items-center gap-3 text-xs font-bold uppercase tracking-tighter">
                   <CheckCircle2 className="w-4 h-4 text-brand-blue shrink-0" />
                   {f}
                 </div>
               ))}
            </div>

            <div className="grid gap-4">
              <Link 
                to={`/academy/residential/${featuredCourse.slug}`}
                className="h-16 bg-ink text-paper flex items-center justify-center font-mono font-black uppercase tracking-[0.2em] text-xs hover:bg-brand-orange transition-all active:scale-95 shadow-[8px_8px_0px_rgba(59,81,238,1)] text-center"
              >
                Enroll Now / {featuredCourse.iteration}
              </Link>
              <div className="flex items-center justify-center gap-2 font-mono text-[10px] font-bold uppercase text-ink/40">
                <MapPin className="w-3 h-3" />
                {featuredCourse.location}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Future/Micro-certs reveal */}
        <div className="mt-32 pt-24 border-t border-white/10">
           <div className="flex flex-col md:flex-row gap-12 items-center justify-between">
              <div>
                <h4 className="text-3xl font-serif font-bold italic mb-2">Coming Soon: Hybrid Academy</h4>
                <p className="text-white/40 font-mono text-xs uppercase tracking-widest">Live online classes + Micro-Certifications for specific language technologies.</p>
              </div>
              <div className="flex gap-4">
                 <span className="px-6 py-2 border border-brand-acid text-brand-acid text-[10px] font-mono font-bold uppercase tracking-widest">Online Learning</span>
                 <span className="px-6 py-2 border border-brand-blue text-brand-blue text-[10px] font-mono font-bold uppercase tracking-widest">Global Access</span>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
}
