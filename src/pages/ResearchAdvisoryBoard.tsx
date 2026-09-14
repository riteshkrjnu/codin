/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Mail, ArrowUpRight, Search, Sparkles, Plus } from 'lucide-react';
import { Person } from '../data/people/types';
import { useAuth } from '../context/AuthContext';

export default function ResearchAdvisoryBoard() {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPeople = async () => {
    try {
      const res = await fetch('/api/people');
      if (res.ok) {
        const data = await res.json();
        setPeople(data.people || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const rabMembers = people.filter(p => p.boardMemberType === 'rab');

  const filteredMembers = rabMembers.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    return q === "" || 
      p.name.toLowerCase().includes(q) ||
      p.fullName.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      p.bio.toLowerCase().includes(q);
  });

  const isPrivileged = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div className="min-h-screen bg-paper pt-32 pb-24 px-6 lg:px-12 grid-structure">
      <div className="max-w-[1600px] mx-auto w-full">
        {/* Page Header */}
        <div className="border-b border-ink/20 pb-12 mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-brand-blue mb-4">
              Scientific Roadmap
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-black tracking-tight leading-none mb-6">
              Research Advisory <span className="text-outline">Board</span>
            </h1>
            <p className="font-serif text-xl md:text-2xl text-ink/80 italic font-light max-w-4xl leading-relaxed">
              Global scholars, researchers, and technical architects steering our scientific trajectory and computational linguistics programs.
            </p>
          </div>
          {isPrivileged && (
            <Link
              to="/people"
              className="h-14 px-6 border border-ink bg-brand-acid text-ink font-mono text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-ink hover:text-brand-acid transition-all cursor-pointer shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] shrink-0"
            >
              <Plus className="w-4 h-4" /> Add or Edit Profiles
            </Link>
          )}
        </div>

        {/* Search Strip */}
        <div className="mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search research advisors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-6 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue font-mono text-xs uppercase tracking-wider placeholder:text-ink/30"
            />
          </div>
        </div>

        {/* Advisors Directory */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-ink border-t-brand-blue rounded-full animate-spin"></div>
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredMembers.map((person, idx) => (
                <motion.div
                  key={person.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex flex-col group h-full justify-between"
                >
                  <div className="relative h-64 bg-ink/5 border-b border-ink overflow-hidden shrink-0">
                    <img
                      src={person.image || "https://images.unsplash.com/photo-1413708658866-87cfa3ee17ec?auto=format&fit=crop&q=80&w=600"}
                      alt={person.fullName || person.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 object-top"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 right-4 bg-brand-acid text-ink border border-ink font-mono text-[8px] font-black tracking-widest uppercase px-2 py-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      RAB SCIENTIST
                    </div>
                  </div>

                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="font-mono text-[9px] font-bold text-brand-blue uppercase tracking-wider mb-2 leading-none">
                        {person.role}
                      </div>
                      <h3 className="serif font-black text-2xl mb-4 group-hover:text-brand-blue tracking-tight transition-colors">
                        {person.fullName || person.name}
                      </h3>
                      <p className="font-serif text-sm italic text-ink/70 leading-relaxed line-clamp-4 mb-6">
                        {person.bio}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-ink shrink-0">
                    <Link
                      to={`/people/${person.slug}`}
                      className="w-full py-4.5 bg-paper/50 hover:bg-brand-acid font-mono text-[10px] font-black tracking-widest text-ink block text-center uppercase transition-all flex items-center justify-center gap-2 group-hover:bg-brand-acid"
                    >
                      Inspect Profile &amp; Dossier <ArrowUpRight className="w-3.5 h-3.5 mt-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 border border-ink border-dashed">
            <Sparkles className="w-12 h-12 text-ink/20 mx-auto mb-4" />
            <h3 className="font-serif text-2xl font-black mb-2">No Scientific Advisors Registered</h3>
            <p className="font-mono text-xs text-ink/55 max-w-lg mx-auto leading-relaxed">
              There are currently no Research Advisory Board members assigned. Admins can update any member profile to assign them here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
