/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { academyInfo } from '../data/config';
import { ArrowRight, GraduationCap, Users, ShieldCheck, Database, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const focusAreas = [
  { 
    title: "Field Linguistics", 
    desc: "Documentation of low-resource and tribal languages.",
    icon: Users,
    color: "bg-brand-blue"
  },
  { 
    title: "AI Annotation", 
    desc: "Creating gold-standard sets for speech technologies.",
    icon: Zap,
    color: "bg-brand-acid"
  },
  { 
    title: "Ethical Data", 
    desc: "Community-driven ownership and policy frameworks.",
    icon: ShieldCheck,
    color: "bg-brand-orange"
  }
];

export default function AcademyOverview() {
  return (
    <div className="pt-32 pb-24 grid-structure">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        {/* Hero Section */}
        <div className="mb-32">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="inline-block px-4 py-1 border border-ink text-[10px] font-mono font-bold uppercase tracking-[0.3em] mb-8 bg-brand-acid shadow-[4px_4px_0px_rgba(0,0,0,1)]"
          >
            Educational Initiative 01
          </motion.div>
          
          <h1 className="text-huge font-serif font-black italic perspective-text leading-[0.8] mb-12">
            Words, <br />
            <span className="text-outline">Worlds</span> <br />
            & Models.
          </h1>

          <div className="grid lg:grid-cols-2 gap-24 items-start">
             <p className="font-serif text-3xl font-light italic leading-tight text-ink/80">
               {academyInfo.tagline}
             </p>
             <div className="space-y-6">
                <p className="font-mono text-sm uppercase tracking-widest text-ink/60">
                   {academyInfo.description}
                </p>
                <div className="flex gap-4">
                   <Link to="/academy/residential" className="h-16 px-8 bg-ink text-paper flex items-center gap-3 font-mono font-bold uppercase tracking-widest text-xs hover:bg-brand-blue transition-all group">
                      Explore Residential Courses
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                   </Link>
                </div>
             </div>
          </div>
        </div>

        {/* Philosophy Block */}
        <section className="py-24 border-t border-b border-ink/10 mb-32 grid lg:grid-cols-3 gap-12">
           <div className="lg:col-span-1">
              <h2 className="text-4xl font-serif font-black italic tracking-tighter">The Quality is in the <span className="text-brand-blue">Classroom</span>.</h2>
           </div>
           <div className="lg:col-span-2 space-y-8">
              <p className="text-xl font-medium leading-relaxed opacity-70">
                {academyInfo.philosophy}
              </p>
              <div className="grid md:grid-cols-2 gap-8">
                 {focusAreas.map((area, i) => (
                   <div key={area.title} className="p-8 border border-ink hover:bg-paper transition-all group">
                      <area.icon className={`w-12 h-12 mb-6 ${area.color} p-2 border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)]`} />
                      <h3 className="font-mono text-xs font-black uppercase tracking-widest mb-2">{area.title}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-tighter text-ink/40 group-hover:text-ink">{area.desc}</p>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-8">
           <Link to="/academy/residential" className="group relative overflow-hidden bg-paper border border-ink p-12 hover:bg-ink hover:text-paper transition-all duration-500">
              <div className="relative z-10">
                 <GraduationCap className="w-16 h-16 mb-8 opacity-20 group-hover:opacity-100 transition-opacity" />
                 <h3 className="text-4xl font-serif font-black mb-4 italic">Residential Courses</h3>
                 <p className="text-sm font-medium opacity-60 mb-12">Fully immersive, in-field training for speech technology development to ensure easy access to underserved communities and real field experience for researchers.</p>
                 <div className="font-mono text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                    View Iterations <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                 </div>
              </div>
              <div className="absolute top-0 right-0 p-12 text-6xl font-serif opacity-5 group-hover:opacity-10 font-black italic scale-150">OFFLINE</div>
           </Link>

           <Link to="/academy/online" className="group relative overflow-hidden bg-brand-acid border border-ink p-12 hover:bg-ink hover:text-paper transition-all duration-500">
              <div className="relative z-10">
                 <Database className="w-16 h-16 mb-8 opacity-20 group-hover:opacity-100 transition-opacity" />
                 <h3 className="text-4xl font-serif font-black mb-4 italic">Online Micro-certs</h3>
                 <p className="text-sm font-medium opacity-60 mb-12">Flexible, online specializations in data management, collection, annotation, and language technology development.</p>
                 <div className="font-mono text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                    Explore More <ArrowRight className="w-4 h-4" />
                 </div>
              </div>
              <div className="absolute top-0 right-0 p-12 text-6xl font-serif opacity-5 group-hover:opacity-10 font-black italic scale-150">HYBRID</div>
           </Link>
        </div>
      </div>
    </div>
  );
}
