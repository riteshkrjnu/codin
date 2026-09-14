/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { siteConfig, navigation } from '../data/config';
import { Mail, ArrowRight, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-paper border-t border-ink pt-32 pb-12 px-6 lg:px-12 overflow-hidden">
      <div className="max-w-[1600px] mx-auto overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-24 mb-32">
          {/* Main Brand Callout */}
          <div>
            <div className="font-serif text-[12vw] font-black leading-[0.8] tracking-tighter mb-16 italic perspective-text">
              Promote <br /> 
              <span className="text-outline">Diversity</span>
            </div>
            
            <p className="font-mono text-sm font-bold uppercase tracking-widest max-w-md text-ink/60 mb-12">
              The Council for Diversity and Innovation is a hybrid research-and-policy organization embedding equity across cultural and linguistic systems.
            </p>

            <form className="relative max-w-sm group" onSubmit={(e) => e.preventDefault()}>
               <div className="flex flex-col gap-4">
                  <div className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-ink/40">Newsletter Subscription</div>
                  <div className="relative group">
                    <input 
                      type="email" 
                      placeholder="research@diversity.org.in" 
                      className="w-full bg-transparent border border-ink py-6 px-8 outline-none focus:bg-brand-acid transition-all font-mono text-sm font-bold placeholder:text-ink/20"
                    />
                    <button 
                      type="submit"
                      className="absolute right-0 top-0 bottom-0 aspect-square bg-ink text-paper flex items-center justify-center hover:bg-brand-blue group-hover:scale-110 transition-all origin-right"
                    >
                      <ArrowRight className="w-8 h-8" />
                    </button>
                  </div>
               </div>
            </form>
          </div>

          {/* Sitemaps */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12 text-ink">
             <div className="space-y-8">
                <div className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-ink/40">Division</div>
                <div className="flex flex-col gap-4">
                  {navigation.map(item => (
                    <Link key={item.label} to={item.href || '#'} className="font-serif text-2xl font-black italic hover:text-brand-blue transition-colors">
                      {item.label}
                    </Link>
                  ))}
                </div>
             </div>

             <div className="space-y-8">
                <div className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-ink/40">Contact</div>
                <div className="flex flex-col gap-6">
                  <a href={`mailto:${siteConfig.contactEmail}`} className="flex flex-col gap-1 group">
                    <span className="font-mono text-[10px] uppercase font-bold text-ink/40">Mailbox</span>
                    <span className="text-sm font-bold break-all group-hover:text-brand-orange">{siteConfig.contactEmail}</span>
                  </a>
                  <div className="flex items-center gap-4">
                    <a href="#" className="w-12 h-12 border border-ink flex items-center justify-center hover:bg-brand-acid transition-colors">
                      <Mail className="w-5 h-5" />
                    </a>
                    <a href="#" className="w-12 h-12 border border-ink flex items-center justify-center hover:bg-brand-acid transition-colors">
                      <Globe className="w-5 h-5" />
                    </a>
                  </div>
                </div>
             </div>

             <div className="space-y-8">
                <div className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-ink/40">Location</div>
                <div className="text-sm font-bold leading-relaxed italic">
                  New Delhi, India<br />
                  State Operations Hub<br />
                  Hybrid Demonstration Lab
                </div>
             </div>
          </div>
        </div>

        <div className="pt-24 border-t border-ink flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-ink text-paper flex items-center justify-center font-serif italic text-2xl font-black">C</div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
                © {new Date().getFullYear()} {siteConfig.name}
              </div>
           </div>
           <div className="flex gap-12 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-ink/40">
              <a href="#" className="hover:text-ink transition-colors">Privacy Protocols</a>
              <a href="#" className="hover:text-ink transition-colors">Ethical Framework</a>
              <a href="#" className="hover:text-ink transition-colors">Research Terms</a>
           </div>
        </div>
      </div>
    </footer>
  );
}
