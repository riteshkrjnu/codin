/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { impactStats } from '../data/config';

export default function Impact() {
  return (
    <section id="impact" className="py-24 px-6 lg:px-12 bg-paper border-b border-ink">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid lg:grid-cols-4 gap-px bg-ink border border-ink overflow-hidden">
          {impactStats.map((stat, idx) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="bg-paper p-12 group hover:bg-brand-acid transition-colors"
            >
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-ink/40 mb-12 group-hover:text-ink transition-colors">
                METRIC_0{idx + 1}
              </div>
              
              <div className="text-huge font-serif font-black mb-4 group-hover:scale-105 transition-transform origin-left">
                {stat.value}
              </div>
              
              <div className="font-mono text-xs font-black uppercase tracking-[0.2em] border-t border-ink/10 pt-4">
                {stat.label}
              </div>
              
              <div className="mt-8 flex gap-1">
                 {[1, 2, 3, 4, 5].map(i => (
                   <div key={i} className="w-1.5 h-1.5 bg-ink/10 group-hover:bg-ink transition-colors" />
                 ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
