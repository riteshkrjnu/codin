/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Menu, X, ArrowUpRight, Search, Bell, Sun, Moon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { navigation, siteConfig, onlineCourses, customCourses, residentialCourses, events, projects } from '../data/config';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import brandLogo from './brand-logo.png';

export default function Navbar() {
  const { user, setShowModal, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [notifIndex, setNotifIndex] = useState(0);

  const [dbAnnouncements, setDbAnnouncements] = useState<any[]>([]);
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [dbCourses, setDbCourses] = useState<any[]>([]);
  const [dbEvents, setDbEvents] = useState<any[]>([]);

  useEffect(() => {
    async function fetchHeaderFeeds() {
      try {
        const [annRes, notifRes, coursesRes, eventsRes] = await Promise.all([
          fetch('/api/announcements'),
          fetch('/api/w2m-notifications'),
          fetch('/api/courses'),
          fetch('/api/events')
        ]);

        const annText = await annRes.text();
        const notifText = await notifRes.text();
        const coursesText = await coursesRes.text();
        const eventsText = await eventsRes.text();

        let annData: any = {};
        let notifData: any = {};
        let coursesData: any = {};
        let eventsData: any = {};

        if (annText.trim().startsWith('{')) {
          try { annData = JSON.parse(annText); } catch (e) { console.error("Failed to parse announcements JSON", e); }
        }
        if (notifText.trim().startsWith('{')) {
          try { notifData = JSON.parse(notifText); } catch (e) { console.error("Failed to parse notifications JSON", e); }
        }
        if (coursesText.trim().startsWith('{')) {
          try { coursesData = JSON.parse(coursesText); } catch (e) { console.error("Failed to parse courses JSON", e); }
        }
        if (eventsText.trim().startsWith('{')) {
          try { eventsData = JSON.parse(eventsText); } catch (e) { console.error("Failed to parse events JSON", e); }
        }

        if (annData.announcements && Array.isArray(annData.announcements)) {
          setDbAnnouncements(annData.announcements);
        }
        if (notifData.notifications && Array.isArray(notifData.notifications)) {
          setDbNotifications(notifData.notifications);
        }
        if (coursesData.courses && Array.isArray(coursesData.courses)) {
          setDbCourses(coursesData.courses);
        }
        if (eventsData.events && Array.isArray(eventsData.events)) {
          setDbEvents(eventsData.events);
        }
      } catch (err) {
        console.error("Error loading top ticker dynamic feeds:", err);
      }
    }
    fetchHeaderFeeds();
  }, []);

  // Dynamic notification bar compiler
  const topNotifications = useMemo(() => {
    const list: { text: string; link: string; badge: string }[] = [];

    // Fallbacks to config data if database feeds are not yet loaded or are empty
    const coursesToProcess = dbCourses.length > 0 ? dbCourses : onlineCourses;
    const eventsToProcess = dbEvents.length > 0 ? dbEvents : events;

    // 1. Dynamic Courses (Upcoming / Ongoing)
    coursesToProcess.forEach(c => {
      if (c.deleted || c.status === 'Draft' || c.status === 'Trash' || c.status === 'Closed' || c.status === 'Completed' || c.status === 'Archived') return;
      const isUpcomingOrOngoing = c.status === 'Upcoming' || c.status === 'Ongoing' || c.status === 'Active' || c.status === 'Enrollment Open' || c.status === 'Enrolling Soon';
      if (isUpcomingOrOngoing) {
        const isOnline = c.type !== 'W2M Residential Course' && c.type !== 'Residential';
        list.push({
          badge: (c.status || 'Active').toUpperCase(),
          text: `W2M ONLINE: ${c.title} enrollment is now "${c.status}"`,
          link: isOnline ? `/academy/online/${c.slug}` : `/academy/residential/${c.slug}`
        });
      }
    });

    // 2. Dynamic Events (Upcoming / Ongoing)
    eventsToProcess.forEach(e => {
      if (e.deleted || e.status === 'Draft' || e.status === 'Trash' || e.status === 'Completed' || e.status === 'Archived') return;
      if (e.status === 'Upcoming' || e.status === 'Ongoing') {
        list.push({
          badge: `${e.status?.toUpperCase()} EVENT`,
          text: `BULLETIN: "${e.title}" - slated for ${e.dates}`,
          link: `/events/${e.slug}`
        });
      }
    });

    // 3. Dynamic Job / Scholarship / Recruitment announcements (W2M Notifications)
    dbNotifications.forEach(n => {
      if (n.deleted || n.status === 'Draft' || n.status === 'Trash' || n.status === 'Archived' || n.status === 'Completed') return;
      const isJobOpportunity = n.type === 'Recruitment' || n.type === 'Grant' || n.type === 'Scholarship' || (n.type || '').toLowerCase().includes('job') || (n.badge || '').toLowerCase().includes('job');
      if (isJobOpportunity) {
        list.push({
          badge: (n.badge || n.type || 'Opportunity').toUpperCase(),
          text: `JOB CALL: ${n.title}`,
          link: n.actionLink || '/academy'
        });
      }
    });

    // 4. Council Announcements marked for highlight
    dbAnnouncements.forEach(a => {
      if (a.deleted || a.status === 'Draft' || a.status === 'Trash' || a.status === 'Archived') return;
      if (a.highlighted) {
        list.push({
          badge: (a.category || 'Board').toUpperCase(),
          text: `UPDATE: ${a.title}`,
          link: a.link || '/academy'
        });
      }
    });

    // Fallback if no entries found
    if (list.length === 0) {
      list.push({
        badge: 'SUPPORT',
        text: 'COUNCIL STRATEGIC INTEGRITY DISPATCH SYSTEM ACTIVE',
        link: '/academy'
      });
    }

    return list;
  }, [dbAnnouncements, dbNotifications, dbCourses, dbEvents]);

  // Interval for notifications rotation
  useEffect(() => {
    if (topNotifications.length <= 1) return;
    const interval = setInterval(() => {
      setNotifIndex(prev => (prev + 1) % topNotifications.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [topNotifications]);

  // Simple hardcoded search index based on our content
  const searchIndex = useMemo(() => {
    const results = [];
    onlineCourses.forEach(c => results.push({ type: 'Online Course', title: c.title, link: `/academy/online/${c.slug}`, desc: c.description }));
    customCourses.forEach(c => results.push({ type: 'Custom Course', title: c.title, link: '/academy/custom', desc: c.description }));
    // global pages
    results.push({ type: 'Page', title: 'Academy', link: '/academy', desc: 'Online, Residential & Custom Training' });
    results.push({ type: 'Page', title: 'Residential Courses', link: '/academy/residential', desc: 'Offline structured language learning' });
    return results;
  }, []);

  const searchResults = useMemo(() => {
     if (!searchQuery.trim()) return [];
     const q = searchQuery.toLowerCase();
     return searchIndex.filter(item => item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)).slice(0, 5);
  }, [searchQuery, searchIndex]);

  const [dynamicProjects, setDynamicProjects] = useState<any[]>(projects);

  useEffect(() => {
    async function fetchDynamicProjects() {
      try {
        const res = await fetch('/api/projects');
        const text = await res.text();
        if (text.trim().startsWith('{')) {
          try {
            const data = JSON.parse(text);
            if (data.projects && Array.isArray(data.projects)) {
              setDynamicProjects(data.projects);
            }
          } catch (pe) {
            console.error("Failed to parse projects JSON:", pe);
          }
        } else {
          console.warn("Received non-JSON response from /api/projects:", text.slice(0, 100));
        }
      } catch (err) {
        console.error("Error loading dynamic projects in Navbar:", err);
      }
    }
    fetchDynamicProjects();
  }, []);

  const projectsCategorized = useMemo(() => {
    return {
      upcoming: dynamicProjects.filter(p => p.status === 'Upcoming' && !p.deleted),
      ongoing: dynamicProjects.filter(p => p.status === 'Ongoing' && !p.deleted),
      completed: dynamicProjects.filter(p => p.status === 'Completed' && !p.deleted),
    };
  }, [dynamicProjects]);

  const currentNotif = useMemo(() => {
    if (topNotifications.length === 0) {
      return { badge: 'INFO', text: 'COUNCIL STRATEGIC INTEGRITY DISPATCH SYSTEM ACTIVE', link: '/academy' };
    }
    if (notifIndex >= topNotifications.length || notifIndex < 0) {
      return topNotifications[0];
    }
    return topNotifications[notifIndex];
  }, [topNotifications, notifIndex]);

  return (
    <nav 
      id="main-nav"
      className="fixed top-0 left-0 right-0 z-50 border-b border-ink bg-paper/95 backdrop-blur-sm flex flex-col"
    >
      {/* Dynamic Top Banner Ticker */}
      {topNotifications.length > 0 && (
        <div className="bg-ink text-paper h-8 border-b border-ink flex items-center justify-between px-6 font-mono text-[9px] uppercase tracking-[0.25em] select-none">
          <div className="flex items-center gap-2.5 overflow-hidden truncate">
            <span className="bg-brand-acid text-ink px-1.5 py-0.5 text-[8px] font-black tracking-widest shrink-0 shadow-[1px_1px_0px_rgba(0,0,0,1)]">
              {currentNotif.badge}
            </span>
            <Link 
              to={currentNotif.link} 
              className="text-paper hover:text-brand-acid transition-colors truncate font-semibold no-underline"
            >
              {currentNotif.text}
            </Link>
          </div>
          <div className="flex items-center gap-4 shrink-0 font-bold ml-4">
            <button 
              onClick={() => setNotifIndex(prev => (prev + 1) % topNotifications.length)}
              className="text-paper/60 hover:text-brand-acid uppercase tracking-wider text-[8px] cursor-pointer font-black bg-transparent border-0 outline-none"
            >
              Cycle [NEXT] &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <div className="max-w-[1600px] mx-auto w-full px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img 
            src={brandLogo} 
            alt="CoDIN Logo" 
            className="h-14 w-auto object-contain transition-transform group-hover:scale-105" 
          />
          <span className="font-mono font-bold text-xs uppercase tracking-[0.2em] hidden sm:block">
            {siteConfig.name}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center h-full">
          {navigation.map((item) => (
            <div 
              key={item.label}
              className="relative h-full"
              onMouseEnter={() => setActiveDropdown(item.label)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              {(item.children || item.isMegaMenu) ? (
                <button className={cn(
                  "flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-widest px-6 h-full border-l border-ink transition-colors",
                  item.label === "W2M Academy"
                    ? (activeDropdown === item.label ? "bg-ink text-paper" : "bg-brand-acid text-ink font-black hover:bg-brand-acid/80 shadow-[inset_0_-2px_0_var(--color-brand-blue)]")
                    : (activeDropdown === item.label ? "bg-ink text-paper" : "hover:bg-ink/5")
                )}>
                  {item.label}
                  {item.label === "W2M Academy" && (
                    <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-ping shrink-0 ml-1.5" title="Prestige Hub active" />
                  )}
                  <ChevronDown className={cn("w-3 h-3 transition-transform", activeDropdown === item.label && "rotate-180")} />
                </button>
              ) : (
                <Link 
                  to={item.href || '#'} 
                  className="flex items-center font-mono text-[11px] font-bold uppercase tracking-widest px-6 h-full border-l border-ink hover:bg-ink/5 transition-colors"
                >
                  {item.label}
                </Link>
              )}

              {/* Dropdown Menu */}
              <AnimatePresence>
                {activeDropdown === item.label && (item.children || item.isMegaMenu) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "absolute top-full left-[-1px] bg-paper border border-ink shadow-[10px_10px_0px_rgba(0,0,0,1)] p-4",
                      item.isMegaMenu ? "w-[600px] grid grid-cols-3 gap-6 p-6" : "w-[320px] grid gap-4"
                    )}
                  >
                    {!item.isMegaMenu && item.children && item.children.map((child) => (
                      <Link
                        key={child.label}
                        to={child.href}
                        className="group flex flex-col p-3 border border-transparent hover:border-ink hover:bg-brand-acid transition-all"
                      >
                        <div className="flex items-center justify-between font-bold text-xs uppercase tracking-tighter">
                          {child.label}
                          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {child.description && (
                          <div className="text-[10px] text-ink/60 mt-1 leading-tight font-medium">
                            {child.description}
                          </div>
                        )}
                      </Link>
                    ))}
                    
                    {item.isMegaMenu && item.label === "Projects" && (
                      <>
                        <div className="flex flex-col gap-4">
                          <div className="font-mono text-[10px] uppercase font-black tracking-widest text-ink/50 border-b border-ink/20 pb-2">Upcoming</div>
                          {projectsCategorized.upcoming.length > 0 ? projectsCategorized.upcoming.map(p => (
                            <Link key={p.slug} to={`/projects/${p.slug}`} className="text-xs font-serif font-black hover:text-brand-orange hover:underline leading-tight group flex items-start gap-1">
                              {p.title}
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                            </Link>
                          )) : <div className="text-[10px] text-ink/40 italic">None Scheduled</div>}
                        </div>
                        <div className="flex flex-col gap-4">
                          <div className="font-mono text-[10px] uppercase font-black tracking-widest text-brand-blue border-b border-ink/20 pb-2">Active</div>
                          {projectsCategorized.ongoing.map(p => (
                            <Link key={p.slug} to={`/projects/${p.slug}`} className="text-xs font-serif font-black hover:text-brand-blue hover:underline leading-tight group flex items-start gap-1">
                              {p.title}
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                            </Link>
                          ))}
                        </div>
                        <div className="flex flex-col gap-4">
                          <div className="font-mono text-[10px] uppercase font-black tracking-widest text-ink/50 border-b border-ink/20 pb-2">Completed</div>
                          {projectsCategorized.completed.map(p => (
                            <Link key={p.slug} to={`/projects/${p.slug}`} className="text-xs font-serif font-black hover:text-brand-orange hover:underline leading-tight group flex items-start gap-1">
                              {p.title}
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                            </Link>
                          ))}
                        </div>
                        <div className="col-span-3 pt-4 mt-2 border-t border-dashed border-ink/40">
                          <Link to="/projects" className="block text-center font-mono text-[10px] font-black uppercase tracking-widest text-ink bg-brand-acid/30 hover:bg-brand-acid py-2 border border-ink transition-colors">
                            View All Projects Database &rarr;
                          </Link>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Search Toggle */}
          <div className="relative h-full flex items-center border-l border-ink">
             <button 
               className="h-full px-6 flex items-center justify-center hover:bg-ink/5 transition-colors"
               onClick={() => setIsSearchOpen(!isSearchOpen)}
             >
                <Search className="w-4 h-4" />
             </button>
             
             {/* Search Dropdown */}
             <AnimatePresence>
               {isSearchOpen && (
                 <motion.div
                   initial={{ opacity: 0, y: -10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="absolute top-full right-[-1px] w-[400px] bg-paper border border-ink shadow-[10px_10px_0px_rgba(0,0,0,1)] p-6"
                 >
                    <div className="relative mb-6">
                       <input 
                         type="text" 
                         autoFocus
                         placeholder="Search courses, pages..." 
                         className="w-full p-4 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue font-mono text-xs"
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                       />
                    </div>
                    
                    {searchQuery && (
                      <div className="grid gap-2">
                         {searchResults.length > 0 ? (
                            searchResults.map((res, idx) => (
                              <button 
                                key={idx}
                                onClick={() => { setIsSearchOpen(false); navigate(res.link); }}
                                className="text-left group flex flex-col p-4 border border-transparent hover:border-ink hover:bg-brand-acid transition-all"
                              >
                                 <div className="flex items-center justify-between">
                                    <div className="font-serif font-black italic text-lg">{res.title}</div>
                                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                 </div>
                                 <div className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mt-1">{res.type}</div>
                              </button>
                            ))
                         ) : (
                            <div className="text-center font-mono text-xs opacity-50 py-4">No results found for "{searchQuery}"</div>
                         )}
                      </div>
                    )}
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <div className="relative h-full flex items-center border-l border-ink">
             <button 
               onClick={toggleTheme}
               className="h-full px-6 flex items-center justify-center hover:bg-ink/5 transition-colors cursor-pointer text-ink"
               aria-label="Toggle Theme"
               title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
             >
                {theme === 'light' ? <Moon className="w-4 h-4 fill-current text-ink" /> : <Sun className="w-4 h-4 text-ink" />}
             </button>
          </div>

          {user ? (
            <div 
              className="relative h-full flex items-center border-l border-ink"
              onMouseEnter={() => setActiveDropdown('user')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
               <button className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest px-6 h-full hover:bg-ink/5 transition-colors">
                  <span className="max-w-[120px] truncate">{user.name || user.email.split('@')[0]}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", activeDropdown === 'user' ? "rotate-180" : "")} />
               </button>
               <AnimatePresence>
                 {activeDropdown === 'user' && (
                    <motion.div
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="absolute top-full right-[-1px] w-64 bg-paper border border-ink shadow-[10px_10px_0px_rgba(0,0,0,1)] flex flex-col"
                    >
                       <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50 p-4 border-b border-ink/20 truncate" title={user.email}>{user.email}</div>
                       <Link to="/profile" className="px-4 py-4 font-mono text-xs font-black hover:bg-brand-acid transition-colors text-left border-b border-ink/20">My Courses & Account</Link>
                       <Link to="/admin" className="px-4 py-4 font-mono text-xs font-black hover:bg-brand-acid transition-colors text-left border-b border-ink/20">Certifications & Courses</Link>
                       <button onClick={logout} className="px-4 py-4 font-mono text-xs font-black hover:bg-ink hover:text-paper transition-colors text-left">
                          Logout
                       </button>
                    </motion.div>
                 )}
               </AnimatePresence>
            </div>
          ) : (
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center font-mono text-[11px] font-bold uppercase tracking-widest px-8 h-full border-l border-ink bg-transparent hover:bg-ink text-ink hover:text-paper transition-colors"
            >
              Login
            </button>
          )}

          <a 
            href={`mailto:${siteConfig.contactEmail}`}
            className="flex items-center font-mono text-[11px] font-bold uppercase tracking-widest px-8 h-full border-l border-r border-ink bg-brand-blue text-white hover:bg-brand-orange transition-colors"
          >
            Connect
          </a>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="lg:hidden p-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "100vh" }}
            exit={{ height: 0 }}
            className="lg:hidden fixed inset-0 top-16 bg-paper z-40 overflow-y-auto px-6 py-12"
          >
             <div className="grid gap-12">
               {navigation.map((item) => (
                 <div key={item.label} className={cn(item.label === "W2M Academy" && "p-6 border border-ink bg-brand-acid/20 shadow-[6px_6px_0px_rgba(0,0,0,1)]")}>
                    <div className={cn(
                      "text-[10px] font-mono font-bold uppercase tracking-[0.3em] mb-4 flex items-center gap-2 justify-between",
                      item.label === "W2M Academy" ? "text-ink font-black" : "text-ink/40"
                    )}>
                      <span>{item.label}</span>
                      {item.label === "W2M Academy" && (
                        <span className="bg-brand-orange text-paper text-[8px] font-mono font-black uppercase tracking-wider px-1.5 py-0.5 border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                          Prestige Core
                        </span>
                      )}
                    </div>
                    <div className="grid gap-4">
                      {item.children && item.children.map(child => (
                        <Link 
                          key={child.label} 
                          to={child.href} 
                          className="text-4xl font-serif font-black hover:text-brand-blue"
                          onClick={() => setIsOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                      {item.isMegaMenu && item.label === "Projects" && (
                        <>
                          <Link to="/projects?status=Upcoming" className="text-4xl font-serif font-black hover:text-brand-blue" onClick={() => setIsOpen(false)}>Upcoming Projects</Link>
                          <Link to="/projects?status=Ongoing" className="text-4xl font-serif font-black hover:text-brand-blue" onClick={() => setIsOpen(false)}>Active Projects</Link>
                          <Link to="/projects?status=Completed" className="text-4xl font-serif font-black hover:text-brand-blue" onClick={() => setIsOpen(false)}>Completed Projects</Link>
                          <Link to="/projects" className="text-2xl font-mono uppercase tracking-widest font-black text-brand-orange mt-2" onClick={() => setIsOpen(false)}>All Projects &rarr;</Link>
                        </>
                      )}
                      {!item.children && !item.isMegaMenu && (
                        <Link 
                          to={item.href || '#'} 
                          className="text-4xl font-serif font-black hover:text-brand-blue"
                          onClick={() => setIsOpen(false)}
                        >
                          {item.label}
                        </Link>
                      )}
                    </div>
                 </div>
               ))}
               
               <div className="mt-8 border-t border-ink border-dashed pt-8 grid gap-4">
                 <button 
                   onClick={() => { toggleTheme(); }}
                   className="text-4xl font-serif font-black hover:text-brand-blue text-left flex items-center gap-4 cursor-pointer text-ink"
                   aria-label="Toggle Theme"
                 >
                   <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                   {theme === 'light' ? <Moon className="w-8 h-8 fill-current text-ink" /> : <Sun className="w-8 h-8 text-ink" />}
                 </button>

                 {user ? (
                   <>
                     <div className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-ink/40">
                       Logged in as {user.name || user.email.split('@')[0]}
                     </div>
                     <Link to="/profile" className="text-4xl font-serif font-black hover:text-brand-blue text-left" onClick={() => setIsOpen(false)}>
                       Dashboard
                     </Link>
                     <Link to="/admin" className="text-4xl font-serif font-black hover:text-brand-blue text-left" onClick={() => setIsOpen(false)}>
                       Instructor & Admin
                     </Link>
                     <button 
                       onClick={() => { setIsOpen(false); logout(); }}
                       className="text-4xl font-serif font-black hover:text-brand-orange text-left"
                     >
                       Logout
                     </button>
                   </>
                 ) : (
                   <button 
                     onClick={() => { setIsOpen(false); setShowModal(true); }}
                     className="text-4xl font-serif font-black hover:text-brand-blue text-left"
                   >
                     Login
                   </button>
                 )}
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
