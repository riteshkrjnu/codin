/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { customCourses } from '../data/config';
import { Briefcase, BookOpen, Globe, Star, ArrowRight, Building2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CustomCourses() {
  return (
    <div className="pt-32 pb-24 grid-structure min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mb-24">
          <motion.div 
            initial={{ rotate: -2 }}
            animate={{ rotate: 0 }}
            className="inline-block p-4 border border-ink bg-brand-blue text-paper font-serif italic text-4xl font-black mb-6"
          >
            CoDIN Bespoke Training
          </motion.div>
          <h1 className="text-6xl md:text-8xl font-serif font-black leading-none mb-8 italic">
            Custom Courses & <br /> <span className="text-outline">Curated Programs</span>
          </h1>
          <p className="font-serif text-3xl font-light italic leading-snug opacity-80 mb-8">
            We craft specialised training ecosystems for tech labs, policy units, and research institutions looking to build high-utility language data pipelines.
          </p>
          <div className="flex gap-4">
            <a href="mailto:academy@diversity.org.in" className="h-16 px-10 bg-ink text-paper flex items-center gap-3 font-mono font-bold uppercase tracking-widest text-sm hover:bg-brand-acid hover:text-ink hover:translate-y-[-2px] transition-all group">
              Partner With Us
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        {/* Offerings Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-ink border border-ink overflow-hidden mb-32">
          {[
            { icon: Briefcase, t: "Custom Workshops", d: "3 day-2 week intensive community-driven data collection sprints and workshops for engineering teams." },
            { icon: BookOpen, t: "Curated Courses", d: "Multi-week data collection and model development course for indigenous communities and policy units." },
            { icon: Globe, t: "Multi-course Programs", d: "Long-term training programs across multiple cohorts and multiple courses for large organisations" },
            { icon: Star, t: "Executive Briefings", d: "High-level strategy on Community involvement, AI Ethics & Diversity for leadership." }
          ].map((item, i) => (
            <motion.div 
              key={item.t} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="p-12 bg-paper group hover:bg-brand-acid transition-colors cursor-default"
            >
               <item.icon className="w-8 h-8 mb-8 text-brand-blue group-hover:scale-110 transition-transform" />
               <h5 className="font-mono font-black text-sm uppercase tracking-widest mb-4 pr-4">{item.t}</h5>
               <p className="text-[11px] font-bold uppercase tracking-tight opacity-50 group-hover:opacity-100">{item.d}</p>
            </motion.div>
          ))}
        </div>

        {/* Previous Engagements */}
        {/*
        <div>
           <div className="flex items-center gap-4 mb-16">
              <span className="w-12 h-px bg-ink" />
              <h3 className="font-mono text-xs font-black uppercase tracking-[0.3em]">Previous Engagements</h3>
           </div>
           
           <div className="grid md:grid-cols-2 gap-8">
              {customCourses.map((course, idx) => (
                 <motion.div
                   key={course.slug}
                   initial={{ opacity: 0 }}
                   whileInView={{ opacity: 1 }}
                   transition={{ delay: idx * 0.1 }}
                   viewport={{ once: true }}
                   className="border border-ink bg-paper p-10 hover:shadow-[12px_12px_0px_rgba(0,0,0,1)] transition-shadow"
                 >
                    <div className="flex items-start justify-between border-b border-ink/10 pb-8 mb-8">
                       <div>
                          <div className="flex items-center flex-wrap gap-3 mb-4">
                             <div className="font-mono text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-ink text-paper flex items-center gap-2">
                                <Building2 className="w-3 h-3" />
                                {course.client}
                             </div>
                             <div className="font-mono text-[9px] font-black uppercase tracking-widest px-3 py-1 border border-ink flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {course.year}
                             </div>
                          </div>
                          <h4 className="text-3xl font-serif font-black italic">{course.title}</h4>
                       </div>
                    </div>
                    
                    <p className="text-sm font-medium leading-relaxed opacity-70 mb-8 max-w-lg">
                       {course.description}
                    </p>
                    
                    <div>
                       <div className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/30 mb-4">Key Outcomes</div>
                       <div className="grid gap-3">
                          {course.highlights.map(h => (
                             <div key={h} className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-tighter text-ink/60">
                                <div className="w-1.5 h-1.5 bg-brand-orange" />
                                {h}
                             </div>
                          ))}
                       </div>
                    </div>
                 </motion.div>
              ))}
           </div>
        </div>
        */}
      </div>
    </div>
  );
}
