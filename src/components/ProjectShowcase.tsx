/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { ArrowUpRight, ShieldCheck, Database, Zap } from 'lucide-react';
import { projects } from '../data/config';
import { Link } from 'react-router-dom';

const iconMap: Record<string, any> = {
  kailash: Zap,
  tholkudi: Database,
  suvadugal: ShieldCheck
};

export default function ProjectShowcase() {
  return (
    <section id="projects" className="py-24 px-6 lg:px-12 bg-white grid-structure border-b border-ink">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
          <div className="max-w-2xl">
            <div className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-ink/40 mb-4 flex items-center gap-2">
              <span className="w-8 h-[1px] bg-ink/20" />
              Primary Research Fields
            </div>
            <h2 className="text-6xl md:text-8xl font-serif font-black leading-none">
              Documentation <br /> & <span className="italic">Technology</span>
            </h2>
          </div>
          <p className="font-mono text-xs uppercase tracking-widest max-w-xs text-ink/60 mb-2">
            CDI leads large-scale engineering and cultural projects funded by state governments and international research bodies.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-px bg-ink border border-ink overflow-hidden">
          {projects.map((proj, idx) => {
            const Icon = iconMap[proj.slug] || Zap;
            return (
              <motion.div 
                key={proj.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="relative bg-paper p-10 group hover:bg-ink hover:text-paper transition-all duration-500 flex flex-col min-h-[500px]"
              >
                <Link to={`/projects/${proj.slug}`} className="absolute inset-0 z-10" />
                <div className="flex justify-between items-start mb-12">
                  <div className="font-mono text-[10px] font-bold border border-current px-2 py-1">
                    {proj.id}
                  </div>
                  <div className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest ${proj.color} text-ink group-hover:scale-110 transition-transform`}>
                    {proj.tag}
                  </div>
                </div>

                <div className="mb-8">
                   <Icon className="w-12 h-12 mb-6 opacity-40 group-hover:opacity-100 transition-opacity" />
                   <h3 className="text-4xl font-serif font-black mb-4 tracking-tighter">
                     {proj.title}
                   </h3>
                   <p className="text-sm font-medium leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                     {proj.description}
                   </p>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-4">
                   {proj.aims.map(aim => (
                     <div key={aim} className="text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-current" />
                       {aim}
                     </div>
                   ))}
                </div>

                <div className="mt-12 pt-8 border-t border-current/10 flex items-center justify-between">
                   <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em]">{proj.status}</span>
                   <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
