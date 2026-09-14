/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Megaphone, Bell, ArrowUpRight, Calendar, Filter, Plus, 
  Trash2, Pencil, X, Check, Loader2 
} from 'lucide-react';

const getStatusPriority = (status?: string): number => {
  const s = (status || '').trim().toLowerCase();
  if (s === 'ongoing' || s === 'active' || s === 'live') return 1;
  if (s === 'upcoming' || s === 'enrollment open' || s === 'enrolling soon' || s === 'coming soon' || s === 'open') return 2;
  if (s === 'completed' || s === 'concluded') return 3;
  if (s === 'archived' || s === 'closed') return 4;
  if (s === 'draft') return 5;
  return 6;
};

export default function HomeBulletins() {
  const { user } = useAuth();
  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeNotifFilter, setActiveNotifFilter] = useState<string>('all');
  const [annStatusFilter, setAnnStatusFilter] = useState<string>('all');
  const [notifStatusFilter, setNotifStatusFilter] = useState<string>('all');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [dbAnnouncements, setDbAnnouncements] = useState<any[]>([]);
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal control states
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  const [editingAnn, setEditingAnn] = useState<any | null>(null);
  const [editingNotif, setEditingNotif] = useState<any | null>(null);

  // Form Fields for Announcement
  const [annForm, setAnnForm] = useState({
    title: '',
    category: 'General',
    date: '',
    description: '',
    link: '',
    status: 'Ongoing',
    highlighted: false,
    showInBulletin: true
  });

  // Form Fields for Notification
  const [notifForm, setNotifForm] = useState({
    title: '',
    type: 'General',
    date: '',
    description: '',
    actionText: '',
    actionLink: '',
    badge: '',
    status: 'Ongoing',
    showInBulletin: true
  });

  const fetchData = async () => {
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

      if (annData.announcements) setDbAnnouncements(annData.announcements);
      if (notifData.notifications) setDbNotifications(notifData.notifications);
      if (coursesData.courses) setCourses(coursesData.courses);
      if (eventsData.events) setEvents(eventsData.events);
    } catch (err) {
      console.error("Error loading CoDIN Intelligence feeds:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute dynamic lists
  const { announcementsList, w2mNotificationsList } = useMemo(() => {
    // Filter out deleted/draft/trashed announcements and notifications
    const listAnns = dbAnnouncements.filter(a => !a.deleted && a.status !== 'Draft' && a.status !== 'Trash');
    const listNotifs = dbNotifications.filter(n => !n.deleted && n.status !== 'Draft' && n.status !== 'Trash');

    // 1. Resolve online courses dynamic notifications & announcements
    courses.forEach((oc) => {
      if (oc.deleted || oc.status === 'Draft' || oc.status === 'Trash' || oc.status === 'Closed') return;
      if (oc.type !== 'W2M Residential Course' && oc.type !== 'Residential') {
        listAnns.push({
          id: `ann-course-${oc.slug}`,
          _id: `ann-course-${oc.slug}`,
          category: 'Milestone',
          title: `Enrollment Update: ${oc.title} is now "${oc.status}"`,
          date: 'Active',
          description: `${oc.description || ''} Course credits: ${oc.credits || 0}, duration: ${oc.duration || 'Flexible'}.`,
          link: `/academy/online/${oc.slug}`,
          status: oc.status,
          highlighted: oc.status === 'Active' || oc.status === 'Enrollment Open' || oc.status === 'Enrolling Soon',
          isDynamic: true
        });

        listNotifs.push({
          id: `not-course-${oc.slug}`,
          _id: `not-course-${oc.slug}`,
          type: 'Certification',
          title: `W2M Academy: ${oc.title} registration is ${oc.status}`,
          date: 'Enrolling',
          description: `Micro-certification path. Credits: ${oc.credits}. Duration: ${oc.duration}. ${oc.description || ''}`,
          actionText: 'Review Syllabus',
          actionLink: `/academy/online/${oc.slug}`,
          badge: oc.status === 'Coming Soon' ? 'Coming' : 'Open',
          status: oc.status,
          isDynamic: true
        });
      }
    });

    // 2. Resolve events dynamic notifications & announcements
    events.forEach((ev) => {
      if (ev.deleted || ev.status === 'Draft' || ev.status === 'Trash' || ev.status === 'Archived') return;
      listAnns.push({
        id: `ann-event-${ev.slug}`,
        _id: `ann-event-${ev.slug}`,
        category: 'Upcoming Event',
        title: `${ev.title}`,
        date: ev.dates,
        description: `${ev.description || ''} Venue scheduled: ${ev.location}. Status: ${ev.status}. Submit registration before the specified gates.`,
        link: `/events/${ev.slug}`,
        status: ev.status,
        highlighted: ev.status === 'Upcoming' || ev.status === 'Ongoing',
        isDynamic: true
      });
    });

    // 3. Resolve residential courses (on-site) dynamic notifications
    courses.forEach((rc) => {
      if (rc.deleted || rc.status === 'Draft' || rc.status === 'Trash' || rc.status === 'Closed' || rc.status === 'Completed' || rc.status === 'Archived') return;
      if (rc.type === 'W2M Residential Course' || rc.type === 'Residential') {
        listNotifs.push({
          id: `not-res-${rc.slug}`,
          _id: `not-res-${rc.slug}`,
          type: 'Field Call',
          title: `Seats Active: ${rc.title} - ${rc.location}`,
          date: rc.dates,
          description: `Apply for specialized immersive field methods cohort at ${rc.location}. ${rc.tagline || ''}`,
          actionText: 'Apply for Seats',
          actionLink: `/academy/residential/${rc.slug}`,
          badge: 'On-Site Only',
          status: rc.status,
          isDynamic: true
        });
      }
    });

    // 4. Automatically map Recruitment notifications to Council Announcements column too!
    listNotifs.forEach((notif) => {
      if (notif.type === 'Recruitment') {
        listAnns.push({
          id: `ann-mirror-${notif._id || notif.id}`,
          _id: `ann-mirror-${notif._id || notif.id}`,
          category: 'Policy',
          title: `Recruitment Update: ${notif.title}`,
          date: notif.date,
          description: notif.description,
          link: notif.actionLink || undefined,
          status: notif.status || 'Ongoing',
          highlighted: true,
          isMirror: true
        });
      }
    });

    return { announcementsList: listAnns, w2mNotificationsList: listNotifs };
  }, [dbAnnouncements, dbNotifications, courses, events]);

  // Apply filters and sort by status hierarchy: Ongoing -> Upcoming -> Completed -> Archived
  const filteredAnnouncements = useMemo(() => {
    const list = announcementsList.filter(a => {
      const matchesCategory = activeCategory === 'all' || a.category === activeCategory;
      const matchesStatus = annStatusFilter === 'all' || (a.status || '').toLowerCase() === annStatusFilter.toLowerCase();
      return matchesCategory && matchesStatus;
    });

    return [...list].sort((a, b) => {
      const pA = getStatusPriority(a.status);
      const pB = getStatusPriority(b.status);
      return pA - pB;
    });
  }, [announcementsList, activeCategory, annStatusFilter]);

  const filteredNotifications = useMemo(() => {
    const list = w2mNotificationsList.filter(n => {
      let matchesType = true;
      if (activeNotifFilter !== 'all') {
        if (activeNotifFilter === 'courses') {
          matchesType = n.type === 'Certification' || n.type === 'Field Call' || n.id?.startsWith('not-') || n._id?.startsWith('not-');
        } else if (activeNotifFilter === 'grants') {
          matchesType = n.type === 'Grant' || n.type === 'Recruitment';
        } else {
          matchesType = n.type === activeNotifFilter;
        }
      }

      let matchesStatus = true;
      if (notifStatusFilter !== 'all') {
        matchesStatus = (n.status || '').toLowerCase() === notifStatusFilter.toLowerCase();
      }

      return matchesType && matchesStatus;
    });

    return [...list].sort((a, b) => {
      const pA = getStatusPriority(a.status);
      const pB = getStatusPriority(b.status);
      return pA - pB;
    });
  }, [w2mNotificationsList, activeNotifFilter, notifStatusFilter]);

  // Modal actions
  const openNewAnnModal = () => {
    setEditingAnn(null);
    setAnnForm({
      title: '',
      category: 'General',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      description: '',
      link: '',
      status: 'Ongoing',
      highlighted: false,
      showInBulletin: true
    });
    setIsAnnModalOpen(true);
  };

  const openEditAnnModal = (ann: any) => {
    setEditingAnn(ann);
    setAnnForm({
      title: ann.title || '',
      category: ann.category || 'General',
      date: ann.date || '',
      description: ann.description || '',
      link: ann.link || '',
      status: ann.status || 'Ongoing',
      highlighted: !!ann.highlighted,
      showInBulletin: ann.showInBulletin !== false
    });
    setIsAnnModalOpen(true);
  };

  const openNewNotifModal = () => {
    setEditingNotif(null);
    setNotifForm({
      title: '',
      type: 'General',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      description: '',
      actionText: '',
      actionLink: '',
      badge: '',
      status: 'Ongoing',
      showInBulletin: true
    });
    setIsNotifModalOpen(true);
  };

  const openEditNotifModal = (notif: any) => {
    setEditingNotif(notif);
    setNotifForm({
      title: notif.title || '',
      type: notif.type || 'General',
      date: notif.date || '',
      description: notif.description || '',
      actionText: notif.actionText || '',
      actionLink: notif.actionLink || '',
      badge: notif.badge || '',
      status: notif.status || 'Ongoing',
      showInBulletin: notif.showInBulletin !== false
    });
    setIsNotifModalOpen(true);
  };

  // Submit operations
  const handleAnnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    try {
      const isEdit = !!editingAnn;
      const url = isEdit ? `/api/announcements/${editingAnn._id}` : '/api/announcements';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(annForm)
      });

      if (res.ok) {
        setIsAnnModalOpen(false);
        setEditingAnn(null);
        fetchData();
      } else {
        alert("Action failed. Please check login session.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnnDelete = (id: string) => {
    if (!user?.token) return;
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Announcement Deletion',
      message: 'Are you sure you want to permanently remove this announcement?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/announcements/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${user.token}`
            }
          });
          if (res.ok) {
            fetchData();
          }
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleNotifSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    try {
      const isEdit = !!editingNotif;
      const url = isEdit ? `/api/w2m-notifications/${editingNotif._id}` : '/api/w2m-notifications';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(notifForm)
      });

      if (res.ok) {
        setIsNotifModalOpen(false);
        setEditingNotif(null);
        fetchData();
      } else {
        alert("Action failed. Please check registration details.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotifDelete = (id: string) => {
    if (!user?.token) return;
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Notification Deletion',
      message: 'Are you sure you want to permanently delete this notification?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/w2m-notifications/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${user.token}`
            }
          });
          if (res.ok) {
            fetchData();
          }
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <section id="bulletins" className="py-24 px-6 lg:px-12 bg-white border-b border-ink grid-structure">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header Block */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <div className="inline-block px-4 py-1 border border-ink text-[10px] font-mono font-bold uppercase tracking-[0.3em] mb-4 bg-brand-acid shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              LIVE BROADCASTS // DISPATCHES
            </div>
            <h2 className="text-4xl md:text-6xl font-serif font-black mb-6 leading-tight">
              The CoDIN <span className="text-outline">Intelligence Feeds</span>
            </h2>
            <p className="font-serif text-xl text-ink/75 max-w-3xl leading-relaxed">
              Real-time updates spanning active field computational work, certification grants, and policy implementations.
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap gap-4 self-start md:self-end">
              <button 
                onClick={openNewAnnModal}
                className="px-4 py-2.5 border border-ink bg-brand-acid text-ink font-mono text-[10px] font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Add Announcement
              </button>
              <button 
                onClick={openNewNotifModal}
                className="px-4 py-2.5 border border-ink bg-brand-blue text-white font-mono text-[10px] font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Add Notification
              </button>
            </div>
          )}
        </div>

        {/* Double-Column Layout */}
        <div className="grid lg:grid-cols-2 gap-16">
          
          {/* Section 1: CoDIN Announcements (Column Left) */}
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-ink pb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-blue text-white border border-ink shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-black uppercase tracking-tight">
                    Council Announcements
                  </h3>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink/50 font-bold mt-0.5">
                    Strategic Dispatches & Status Sprints
                  </p>
                </div>
              </div>
              
              {/* Category selector */}
              <div className="flex flex-wrap gap-2">
                {['all', 'Upcoming Event', 'Milestone', 'Policy', 'General', 'Archived'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 py-1 border border-ink font-mono text-[8px] font-black uppercase tracking-wider transition-all ${
                      activeCategory === cat
                        ? 'bg-ink text-paper'
                        : 'bg-paper hover:bg-brand-acid/30 text-ink'
                    }`}
                  >
                    {cat.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Sub-Filters for Announcements */}
            <div className="flex flex-wrap gap-1.5 bg-slate-50 border border-ink/15 p-2.5">
              <span className="font-mono text-[8px] font-black uppercase text-ink/40 flex items-center mr-1">Status:</span>
              {['all', 'Upcoming', 'Ongoing', 'Completed', 'Archived', 'Draft'].map(status => (
                <button
                  key={status}
                  onClick={() => setAnnStatusFilter(status)}
                  className={`px-2 py-0.5 border border-ink text-[8px] font-mono font-bold uppercase tracking-wider transition-all ${
                    annStatusFilter === status
                      ? 'bg-ink text-paper'
                      : 'bg-white hover:bg-brand-acid text-ink'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="grid gap-6 max-h-[600px] overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-paper [&::-webkit-scrollbar-track]:border [&::-webkit-scrollbar-track]:border-ink [&::-webkit-scrollbar-thumb]:bg-ink">
              {loading ? (
                <div className="p-12 text-center font-mono text-ink/40 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading updates...
                </div>
              ) : filteredAnnouncements.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {filteredAnnouncements.map((ann) => (
                    <motion.div
                      key={ann.id || ann._id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className={`p-6 border border-ink shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between ${
                        ann.highlighted 
                          ? 'bg-brand-acid/15 border-brand-orange shadow-[6px_6px_0px_var(--color-brand-orange)]' 
                          : 'bg-white hover:bg-paper'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[9px] font-black uppercase text-brand-orange bg-brand-orange/10 px-2 py-0.5 border border-brand-orange/20">
                              {ann.category} {ann.isMirror && '(Recruitment)'}
                            </span>
                            {ann.status && (
                              <span className={`font-mono text-[8px] font-black uppercase px-1.5 py-0.5 border ${
                                (ann.status || '').toLowerCase() === 'ongoing' ? 'bg-brand-acid text-ink border-ink font-bold animate-pulse' :
                                (ann.status || '').toLowerCase() === 'upcoming' ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/30' :
                                (ann.status || '').toLowerCase() === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                (ann.status || '').toLowerCase() === 'draft' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                'bg-zinc-100 text-zinc-600 border-zinc-300'
                              }`}>
                                {ann.status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[9px] font-bold text-ink/40">
                              {ann.date}
                            </span>
                            {isAdmin && !ann.isDynamic && !ann.isMirror && (
                              <div className="flex gap-1.5 relative z-20">
                                <button 
                                  onClick={() => openEditAnnModal(ann)}
                                  className="p-1 hover:bg-brand-acid border border-transparent hover:border-ink rounded"
                                  title="Edit Announcement"
                                >
                                  <Pencil className="w-3 h-3 text-ink" />
                                </button>
                                <button 
                                  onClick={() => handleAnnDelete(ann._id)}
                                  className="p-1 hover:bg-brand-orange hover:text-white border border-transparent hover:border-ink rounded"
                                  title="Delete Announcement"
                                >
                                  <Trash2 className="w-3 h-3 text-ink hover:text-inherit" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <h4 className="font-serif text-xl font-black leading-tight mb-3">
                          {ann.title}
                        </h4>
                        
                        <p className="text-xs text-ink/70 leading-relaxed font-semibold mb-6">
                          {ann.description}
                        </p>
                      </div>

                      {ann.link && (
                        <div className="flex justify-end">
                          <Link
                            to={ann.link}
                            className="font-mono text-[9px] font-black uppercase tracking-widest text-brand-blue hover:underline flex items-center gap-1 group"
                          >
                            Explore Details 
                            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="p-12 text-center border border-ink bg-paper/30 font-mono text-ink/50 text-xs">
                  No announcements match current filters.
                </div>
              )}
            </div>
          </div>

          {/* Section 2: W2M Academy Notifications (Column Right) */}
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-ink pb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-orange text-white border border-ink shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-black uppercase tracking-tight">
                    W2M Academy Notifications
                  </h3>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink/50 font-bold mt-0.5">
                    Recruitment Gateways & Verified Credentials
                  </p>
                </div>
              </div>
              
              {/* Notification Filters */}
              <div className="flex flex-wrap gap-1.5 self-start sm:self-center">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'courses', label: 'Courses' },
                  { id: 'grants', label: 'Funding/Jobs' },
                  { id: 'General', label: 'Info' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setActiveNotifFilter(f.id)}
                    className={`px-2.5 py-1 border border-ink font-mono text-[8px] font-black uppercase tracking-wider transition-all ${
                      activeNotifFilter === f.id
                        ? 'bg-ink text-paper'
                        : 'bg-paper hover:bg-brand-acid/30 text-ink'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Sub-Filters for Academy Notifications */}
            <div className="flex flex-wrap gap-1.5 bg-slate-50 border border-ink/15 p-2.5">
              <span className="font-mono text-[8px] font-black uppercase text-ink/40 flex items-center mr-1">Status:</span>
              {['all', 'Upcoming', 'Ongoing', 'Completed', 'Archived', 'Draft'].map(status => (
                <button
                  key={status}
                  onClick={() => setNotifStatusFilter(status)}
                  className={`px-2 py-0.5 border border-ink text-[8px] font-mono font-bold uppercase tracking-wider transition-all ${
                    notifStatusFilter === status
                      ? 'bg-ink text-paper'
                      : 'bg-white hover:bg-brand-acid text-ink'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="grid gap-6 max-h-[600px] overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-paper [&::-webkit-scrollbar-track]:border [&::-webkit-scrollbar-track]:border-ink [&::-webkit-scrollbar-thumb]:bg-ink">
              {loading ? (
                <div className="p-12 text-center font-mono text-ink/40 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading pipes...
                </div>
              ) : filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id || notif._id}
                    className="p-6 border border-ink bg-paper/50 hover:bg-brand-acid/10 shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between group relative"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] font-black uppercase text-brand-blue bg-brand-blue/15 px-2 py-0.5 border border-brand-blue/20">
                            {notif.type}
                          </span>
                          {notif.badge && (
                            <span className="bg-brand-orange text-white text-[8px] font-mono font-black uppercase px-1.5 py-0.5 border border-ink animate-pulse shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                              {notif.badge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[9px] font-bold text-ink/40">
                            {notif.date}
                          </span>
                          {isAdmin && !notif.isDynamic && (
                            <div className="flex gap-1.5 relative z-20">
                              <button 
                                onClick={() => openEditNotifModal(notif)}
                                className="p-1 hover:bg-brand-acid border border-transparent hover:border-ink rounded"
                                title="Edit Notification"
                              >
                                <Pencil className="w-3 h-3 text-ink" />
                              </button>
                              <button 
                                onClick={() => handleNotifDelete(notif._id)}
                                className="p-1 hover:bg-brand-orange hover:text-white border border-transparent hover:border-ink rounded"
                                title="Delete Notification"
                              >
                                <Trash2 className="w-3 h-3 text-ink hover:text-inherit" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <h4 className="font-serif text-xl font-black leading-tight mb-3">
                        {notif.title}
                      </h4>

                      <p className="text-xs text-ink/70 leading-relaxed font-semibold mb-6">
                        {notif.description}
                      </p>
                    </div>

                    {notif.actionText && notif.actionLink && (
                      <div className="flex justify-end relative z-10">
                        <Link
                          to={notif.actionLink}
                          className="px-4 py-2 border border-ink bg-white text-ink font-mono text-[9px] font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] group-hover:bg-brand-acid group-hover:-translate-y-0.5 group-hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1.5"
                        >
                          {notif.actionText}
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-12 text-center border border-ink bg-paper/30 font-mono text-ink/50 text-xs">
                  No verified notifications match current filter options.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Admin Announcement Modal */}
      {isAnnModalOpen && (
        <div className="fixed inset-0 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-white border-2 border-ink shadow-[8px_8px_0px_rgba(0,0,0,1)] overflow-hidden"
          >
            <div className="bg-brand-acid p-4 border-b-2 border-ink flex items-center justify-between">
              <h3 className="font-mono text-xs font-black uppercase tracking-widest text-ink">
                {editingAnn ? 'CMS // Edit Announcement' : 'CMS // Create Announcement'}
              </h3>
              <button 
                onClick={() => setIsAnnModalOpen(false)}
                className="p-1 hover:bg-brand-orange border border-transparent hover:border-ink"
              >
                <X className="w-4 h-4 text-ink" />
              </button>
            </div>

            <form onSubmit={handleAnnSubmit} className="p-6 space-y-4">
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase mb-1">Title (Required)</label>
                <input 
                  type="text" 
                  value={annForm.title}
                  onChange={(e) => setAnnForm({...annForm, title: e.target.value})}
                  required
                  className="w-full h-11 px-3 border border-ink font-mono text-xs focus:bg-paper focus:outline-none"
                  placeholder="e.g. Sovereign Licensing Standards Ratified"
                />
              </div>

               <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase mb-1">Category</label>
                  <select 
                    value={annForm.category}
                    onChange={(e) => setAnnForm({...annForm, category: e.target.value})}
                    className="w-full h-11 px-2 border border-ink font-mono text-xs focus:outline-none bg-white"
                  >
                    <option value="Upcoming Event">Upcoming Event</option>
                    <option value="General">General</option>
                    <option value="Milestone">Milestone</option>
                    <option value="Policy">Policy</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase mb-1">Display Date</label>
                  <input 
                    type="text" 
                    value={annForm.date}
                    onChange={(e) => setAnnForm({...annForm, date: e.target.value})}
                    required
                    className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none"
                    placeholder="e.g. May 20, 2026"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase mb-1">Status</label>
                  <select 
                    value={annForm.status}
                    onChange={(e) => setAnnForm({...annForm, status: e.target.value})}
                    className="w-full h-11 px-2 border border-ink font-mono text-xs focus:outline-none bg-white font-bold text-brand-blue"
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase mb-1">Description (Required)</label>
                <textarea 
                  value={annForm.description}
                  onChange={(e) => setAnnForm({...annForm, description: e.target.value})}
                  required
                  rows={4}
                  className="w-full p-3 border border-ink font-mono text-xs focus:outline-none"
                  placeholder="Summarize the core announcement dispatch details..."
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase mb-1">External Link / Route Slug</label>
                <input 
                  type="text" 
                  value={annForm.link}
                  onChange={(e) => setAnnForm({...annForm, link: e.target.value})}
                  className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none"
                  placeholder="e.g. /projects/tholkudi"
                />
              </div>

              <div className="flex items-center gap-6 pt-2 border-t border-ink/10">
                <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] font-bold uppercase select-none">
                  <input 
                    type="checkbox"
                    checked={annForm.highlighted}
                    onChange={(e) => setAnnForm({...annForm, highlighted: e.target.checked})}
                    className="w-4 h-4 border border-ink text-ink bg-white uppercase tracking-widest focus:ring-0 cursor-pointer"
                  />
                  Highlight Element
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] font-bold uppercase select-none">
                  <input 
                    type="checkbox"
                    checked={annForm.showInBulletin}
                    onChange={(e) => setAnnForm({...annForm, showInBulletin: e.target.checked})}
                    className="w-4 h-4 border border-ink text-ink bg-white uppercase tracking-widest focus:ring-0 cursor-pointer"
                  />
                  Show in Broadcast Bulletin
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAnnModalOpen(false)}
                  className="h-11 px-5 border border-ink font-mono text-xs font-bold uppercase tracking-wider hover:bg-paper"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="h-11 px-6 border border-ink bg-ink text-paper font-mono text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-brand-acid hover:text-ink hover:translate-y-[-1px] transition-all"
                >
                  {editingAnn ? 'Save Changes' : 'Create Dispatch'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Admin Notification Modal */}
      {isNotifModalOpen && (
        <div className="fixed inset-0 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-white border-2 border-ink shadow-[8px_8px_0px_rgba(0,0,0,1)] overflow-hidden"
          >
            <div className="bg-brand-orange p-4 border-b-2 border-ink flex items-center justify-between text-white">
              <h3 className="font-mono text-xs font-black uppercase tracking-widest">
                {editingNotif ? 'CMS // Edit Notification' : 'CMS // Create Notification'}
              </h3>
              <button 
                onClick={() => setIsNotifModalOpen(false)}
                className="p-1 hover:bg-brand-acid border border-transparent hover:border-ink rounded text-white hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleNotifSubmit} className="p-6 space-y-4">
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase mb-1">Title (Required)</label>
                <input 
                  type="text" 
                  value={notifForm.title}
                  onChange={(e) => setNotifForm({...notifForm, title: e.target.value})}
                  required
                  className="w-full h-11 px-3 border border-ink font-mono text-xs focus:bg-paper focus:outline-none"
                  placeholder="e.g. Applications open for W2M Autumn Fellowship"
                />
              </div>

               <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase mb-1">Type/Stream</label>
                  <select 
                    value={notifForm.type}
                    onChange={(e) => setNotifForm({...notifForm, type: e.target.value})}
                    className="w-full h-11 px-2 border border-ink font-mono text-xs focus:outline-none bg-white"
                  >
                    <option value="General">General</option>
                    <option value="Recruitment">Recruitment (Hiring/Fellowship)</option>
                    <option value="Grant">Grant (Funding/Archival)</option>
                    <option value="Certification">Certification Path</option>
                    <option value="Field Call">Field Call (On-Site/Field Methods)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase mb-1">Display Date</label>
                  <input 
                    type="text" 
                    value={notifForm.date}
                    onChange={(e) => setNotifForm({...notifForm, date: e.target.value})}
                    required
                    className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none"
                    placeholder="e.g. May 15, 2026"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase mb-1">Status</label>
                  <select 
                    value={notifForm.status}
                    onChange={(e) => setNotifForm({...notifForm, status: e.target.value})}
                    className="w-full h-11 px-2 border border-ink font-mono text-xs focus:outline-none bg-white font-bold text-brand-blue"
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase mb-1">Description (Required)</label>
                <textarea 
                  value={notifForm.description}
                  onChange={(e) => setNotifForm({...notifForm, description: e.target.value})}
                  required
                  rows={4}
                  className="w-full p-3 border border-ink font-mono text-xs focus:outline-none"
                  placeholder="Provide explicit outlines regarding recruitment roles or application paths..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase mb-1">Button Text</label>
                  <input 
                    type="text" 
                    value={notifForm.actionText}
                    onChange={(e) => setNotifForm({...notifForm, actionText: e.target.value})}
                    className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none"
                    placeholder="e.g. Apply Now"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase mb-1">Button Redirect Link</label>
                  <input 
                    type="text" 
                    value={notifForm.actionLink}
                    onChange={(e) => setNotifForm({...notifForm, actionLink: e.target.value})}
                    className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none"
                    placeholder="e.g. /academy/residential"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase mb-1">Badge Indicator (optional)</label>
                  <input 
                    type="text" 
                    value={notifForm.badge}
                    onChange={(e) => setNotifForm({...notifForm, badge: e.target.value})}
                    className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none"
                    placeholder="e.g. Urgent, 15 Left"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] font-bold uppercase select-none">
                    <input 
                      type="checkbox"
                      checked={notifForm.showInBulletin}
                      onChange={(e) => setNotifForm({...notifForm, showInBulletin: e.target.checked})}
                      className="w-4 h-4 border border-ink text-ink bg-white uppercase tracking-widest focus:ring-0 cursor-pointer"
                    />
                    Show in Bulletin
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsNotifModalOpen(false)}
                  className="h-11 px-5 border border-ink font-mono text-xs font-bold uppercase tracking-wider hover:bg-paper"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="h-11 px-6 border border-ink bg-ink text-paper font-mono text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-brand-acid hover:text-ink hover:translate-y-[-1px] transition-all"
                >
                  {editingNotif ? 'Save Changes' : 'Create Notification'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* CUSTOM NON-BLOCKING CONFIRMATION DIALOG */}
      {confirmModal.isOpen && (
        <div id="custom-confirm-modal" className="fixed inset-0 z-[100] overflow-y-auto bg-ink/75 backdrop-blur-sm flex items-center justify-center p-6 bg-paper/90 animate-fade-in">
          <div className="bg-white border-2 border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)] max-w-md w-full p-8 relative">
            <h3 className="font-serif text-2xl font-black italic tracking-tight mb-2">
              {confirmModal.title}
            </h3>
            <p className="font-sans text-sm text-ink/75 mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-ink bg-paper hover:bg-ink/5 tracking-wider uppercase font-bold transition-all cursor-pointer"
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                }}
                className={`px-4 py-2 border border-ink text-white font-bold tracking-wider uppercase shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer ${
                  confirmModal.isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-blue hover:bg-ink'
                }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
