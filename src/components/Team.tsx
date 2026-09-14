/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLatestPeople } from '../lib/peopleOverrides';
import { Linkedin, Twitter, Globe, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Team() {
  const peopleList = useLatestPeople();
  const teamList = peopleList.filter(member => member.boardMemberType !== 'external');
  return (
    <section id="people" className="py-32 px-6 lg:px-12 bg-paper grid-structure border-b border-ink">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-24">
          <div className="max-w-2xl">
            <div className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-ink/40 mb-4 flex items-center gap-2">
              <span className="w-8 h-[1px] bg-ink/20" />
              Core Faculty
            </div>
            <h2 className="text-6xl md:text-8xl font-serif font-black leading-none">
              Research <br /> <span className="italic">Strategists</span>
            </h2>
          </div>
          <p className="font-mono text-xs uppercase tracking-widest max-w-xs text-ink/60 mb-2">
            A collective of specialists across linguistics, documentation, and ethical AI development.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-ink border border-ink">
          {teamList.map((member, idx) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="relative group bg-paper p-10 flex flex-col hover:bg-brand-blue hover:text-white transition-all duration-500"
            >
              <Link to={`/people/${member.slug}`} className="absolute inset-0 z-10" />
              <div className="relative aspect-[3/4] overflow-hidden border border-ink mb-12 grayscale group-hover:grayscale-0 transition-all duration-700">
                <img 
                  src={member.image || null} 
                  alt={member.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                
                {/* ID Tag Overlay */}
                <div className="absolute top-4 right-4 bg-paper text-ink px-3 py-1 font-mono text-[10px] font-bold border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] group-hover:bg-brand-acid group-hover:text-ink z-20">
                  FAC-{idx + 104}
                </div>
              </div>
              
              <div className="flex justify-between items-start">
                 <div>
                    <h4 className="font-serif text-3xl font-black mb-2 tracking-tighter">{member.name}</h4>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100">{member.role}</p>
                 </div>
                 <div className="flex gap-2 relative z-20">
                    <a href="#" className="w-8 h-8 border border-current flex items-center justify-center hover:bg-current hover:text-paper transition-all">
                      <Linkedin className="w-4 h-4" />
                    </a>
                    <a href="#" className="w-8 h-8 border border-current flex items-center justify-center hover:bg-current hover:text-paper transition-all">
                      <Twitter className="w-4 h-4" />
                    </a>
                 </div>
              </div>

              <div className="mt-12 pt-8 border-t border-current/10 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="text-[10px] font-mono font-bold uppercase tracking-widest italic">View Profile</span>
                 <Plus className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
