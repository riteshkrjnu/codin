/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { siteConfig } from '../data/config';
import { ArrowRight, Globe, Volume2, ShieldAlert, ChevronRight, ChevronLeft } from 'lucide-react';

export default function Hero() {
  const [currentIdx, setCurrentIdx] = useState(0);

  const [dbAnnouncements, setDbAnnouncements] = useState<any[]>([]);
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [dbCourses, setDbCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShowcase() {
      try {
        const response = await fetch('/api/activity-feed');
        if (!response.ok) throw new Error('Activity feed unavailable');
        const { items } = await response.json();
        setDbAnnouncements(items.filter((x: any) => ['Upcoming','Ongoing'].includes(x.status) || (!x.isDynamic && x.status !== 'Completed')));
        setDbEvents([]); setDbCourses([]);
      } catch (err) {
        console.error("Error loading Hero showcase feeds:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchShowcase();
  }, []);

  // Combine highlighted announcements, active courses and ongoing/upcoming events dynamically
  const showcaseItems = useMemo(() => {
    const list: any[] = [];

    // 1. Live Announcements configured to be in bulletin
    dbAnnouncements.forEach(a => {
      if (a.deleted || a.status === 'Draft' || a.status === 'Trash') return;
      if (a.showInBulletin !== false) {
        list.push({
          id: a._id || a.id,
          title: a.title,
          date: a.date,
          type: `${(a.category || 'Announcement').toUpperCase()}`,
          description: a.description,
          link: a.link || undefined,
          isAnnouncement: true
        });
      }
    });

    // 2. Academic Courses showing upcoming or ongoing
    dbCourses.forEach(c => {
      if (c.deleted || c.status === 'Draft' || c.status === 'Trash') return;
      if (c.status === 'Upcoming' || c.status === 'Ongoing' || c.status === 'Active' || c.status === 'Enrollment Open') {
        const isOnline = c.type !== 'W2M Residential Course' && c.type !== 'Residential';
        list.push({
          id: c.slug,
          title: `Academy: ${c.title} (${c.code || ''})`,
          date: c.dates || 'Ongoing',
          type: `${(c.status || 'Ongoing').toUpperCase()} COURSE`,
          description: c.description,
          link: isOnline ? `/academy/online/${c.slug}` : `/academy/residential/${c.slug}`,
          isAnnouncement: false
        });
      }
    });

    // 3. Dynamic Events showing upcoming or ongoing
    dbEvents.forEach(e => {
      if (e.deleted || e.status === 'Draft' || e.status === 'Trash') return;
      if (e.status === 'Upcoming' || e.status === 'Ongoing') {
        list.push({
          id: e.slug,
          title: `Event: ${e.title}`,
          date: e.dates,
          type: `${(e.status || 'Upcoming').toUpperCase()} EVENT`,
          description: e.description,
          link: `/events/${e.slug}`,
          isAnnouncement: false
        });
      }
    });

    return list;
  }, [dbAnnouncements, dbEvents, dbCourses]);

  // Auto scroll items every 8 seconds
  useEffect(() => {
    if (showcaseItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % showcaseItems.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [showcaseItems.length]);

  const activeItem = showcaseItems[currentIdx];

  return (
    <section id="hero" className="relative min-h-screen pt-20 flex flex-col grid-structure overflow-hidden border-b border-ink">
      {/* Top Showcase Announcement & Events Banner */}
      {showcaseItems.length > 0 && (
        <div className="border-b border-ink bg-brand-acid/15 w-full">
          <div className="max-w-[1600px] mx-auto grid md:grid-cols-12 items-center">
            {/* Pulsing Alert Hub Tag */}
            <div className="md:col-span-3 bg-brand-orange border-r border-ink h-full py-4 px-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-paper opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-paper"></span>
                </span>
                <span className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-paper">
                  BROADCAST BULLETIN
                </span>
              </div>
              <div className="flex gap-1.5 text-paper">
                <button 
                  onClick={() => setCurrentIdx(prev => (prev - 1 + showcaseItems.length) % showcaseItems.length)}
                  className="p-1 hover:bg-white/10 border border-transparent hover:border-paper/40 transition-all rounded"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => setCurrentIdx(prev => (prev + 1) % showcaseItems.length)}
                  className="p-1 hover:bg-white/10 border border-transparent hover:border-paper/40 transition-all rounded"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Showcase Active Sliding Item */}
            <div className="md:col-span-9 py-4 px-6 flex flex-wrap items-center justify-between gap-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col md:flex-row md:items-center gap-3 md:gap-6"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 border border-ink bg-white uppercase font-mono text-[8px] font-black tracking-widest text-ink">
                      {activeItem.type}
                    </span>
                    <span className="font-mono text-[9px] text-ink/40 font-bold">
                      {activeItem.date}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-serif font-black text-sm text-ink leading-snug line-clamp-1">
                      {activeItem.title}
                    </h4>
                    <p className="text-[10px] text-ink/70 line-clamp-1 leading-normal font-medium mt-0.5">
                      {activeItem.description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
              
              {activeItem.link && (
                <Link
                  to={activeItem.link}
                  className="shrink-0 h-9 px-4 border border-ink bg-white text-ink hover:bg-brand-acid font-mono text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                >
                  EXPLORE HUB &rarr;
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 border-ink">
        <div className="max-w-[1600px] mx-auto w-full grid lg:grid-cols-12 gap-12 pt-12">
          {/* Main Title Area */}
          <div className="lg:col-span-12">
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "circOut" }}
              className="flex items-center gap-4 mb-4"
            >
               <div className="px-3 py-1 bg-brand-acid border border-ink text-ink text-[10px] font-mono font-bold uppercase tracking-[0.2em] shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                 Est. 2025 / Research Hub / Thinktank 
               </div>
               <div className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink/40">
                 <Globe className="w-3 h-3" />
                 Global / Agra / Chennai / Kolkata
               </div>
            </motion.div>

            <motion.h1 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="text-huge font-serif font-black italic perspective-text"
            >
              Empowering <br />
              <span className="text-outline">Communities</span>
            </motion.h1>

            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.8 }}
               className="mt-12 max-w-xl"
            >
               <p className="font-serif text-3xl font-light italic leading-tight text-ink/80 mb-12">
                 {siteConfig.tagline}
               </p>
               <div className="flex flex-wrap gap-4">
                  <Link to="/academy" className="h-16 px-10 bg-ink text-paper flex items-center gap-3 font-mono font-bold uppercase tracking-widest text-sm hover:bg-brand-blue hover:translate-x-2 transition-all group">
                    Sign Up for W2M Courses
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </Link>
                  <Link to="/projects" className="h-16 px-10 border border-ink flex items-center font-mono font-bold uppercase tracking-widest text-sm hover:bg-brand-acid transition-all">
                    View Projects
                  </Link>
               </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Marquee Section */}
      <div className="h-16 border-t border-ink bg-paper flex items-center overflow-hidden">
        <div className="marquee-container w-full h-full flex items-center">
          <div className="marquee-content flex items-center gap-12 whitespace-nowrap bg-brand-acid py-2">
            {[
              "Linguistic Diversity", 
              "Project Kailash", 
              "Tholkudi", 
              "Suvadugal", 
              "W2M Certification", 
              "Field Methods", 
              "AI Inclusion", 
              "Bias Mitigation"
            ].map((text, i) => (
              <span key={i} className="flex items-center gap-8 font-mono text-xs font-black uppercase tracking-[0.3em] text-ink">
                <span>{text}</span>
                <span className="w-2 h-2 bg-ink rotate-45" />
              </span>
            ))}
            {/* Repeat for continuous effect */}
            {[
              "Linguistic Diversity", 
              "Project Kailash", 
              "Tholkudi", 
              "Suvadugal", 
              "W2M Certification", 
              "Field Methods", 
              "AI Inclusion", 
              "Bias Mitigation"
            ].map((text, i) => (
              <span key={`repeat-${i}`} className="flex items-center gap-8 font-mono text-xs font-black uppercase tracking-[0.3em] text-ink">
                <span>{text}</span>
                <span className="w-2 h-2 bg-ink rotate-45" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
