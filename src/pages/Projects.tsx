/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { projects as defaultStaticProjects, centres, team } from '../data/config';
import { 
  Search, SlidersHorizontal, ArrowUpRight, RefreshCw, Calendar, 
  Landmark, Tag, Plus, Pencil, Trash2, X, BookOpen, Users, Info, Sparkles, Upload 
} from 'lucide-react';
import { renderMarkdown } from '../lib/utils';
import { MarkdownMediaHelper } from '../components/MarkdownMediaHelper';

// Reusable Markdown Toolbar Helper
function MarkdownHelperBar({ textareaId, value, onChange }: { textareaId: string, value: string, onChange: (val: string) => void }) {
  const applyFormat = (before: string, after: string, defaultTxt = "Text") => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (!el) {
      onChange(value + before + defaultTxt + after);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const originalText = el.value;
    const selected = originalText.substring(start, end);
    const replacement = before + (selected || defaultTxt) + after;
    onChange(originalText.substring(0, start) + replacement + originalText.substring(end));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + (selected || defaultTxt).length);
    }, 50);
  };

  const applyLinePrefix = (prefix: string) => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (!el) {
      onChange(value + "\n" + prefix);
      return;
    }
    const start = el.selectionStart;
    const originalText = el.value;
    onChange(originalText.substring(0, start) + "\n" + prefix + originalText.substring(start));
    setTimeout(() => { el.focus(); }, 50);
  };

  return (
    <div className="flex flex-wrap gap-1 border-x border-t border-ink bg-slate-50 p-1.5 font-mono text-[9px] uppercase tracking-wide shrink-0 select-none">
      <button type="button" onClick={() => applyFormat('**', '**', 'Bold')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink font-mono font-bold select-none cursor-pointer">Bold</button>
      <button type="button" onClick={() => applyFormat('*', '*', 'Italic')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink font-mono italic select-none cursor-pointer">Italic</button>
      <button type="button" onClick={() => applyFormat('<u>', '</u>', 'Underline')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink font-mono underline select-none cursor-pointer">Underline</button>
      <button type="button" onClick={() => applyLinePrefix('# ')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink font-mono font-black select-none cursor-pointer">H1</button>
      <button type="button" onClick={() => applyLinePrefix('## ')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink font-mono font-black select-none cursor-pointer">H2</button>
      <button type="button" onClick={() => applyLinePrefix('### ')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink font-mono font-black select-none cursor-pointer">H3</button>
      <button type="button" onClick={() => applyLinePrefix('- ')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink font-mono font-bold select-none cursor-pointer">• Bullet</button>
      <button type="button" onClick={() => applyLinePrefix('1. ')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink font-mono font-bold select-none cursor-pointer">1. List</button>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  const location = useLocation();
  const navigate = useNavigate();

  const [isUploading, setIsUploading] = useState(false);

  const uploadToCloudinary = async (dataUrl: string) => {
    setIsUploading(true);
    try {
      const res = await fetch('/api/upload-cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setProjForm(prev => ({ ...prev, image: data.url }));
      } else {
        alert("Upload failed. Make sure server Cloudinary variables are configured.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading image to Cloudinary.");
    } finally {
      setIsUploading(false);
    }
  };

  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [statusFilter, setStatusFilter] = useState<'all' | 'Ongoing' | 'Completed' | 'Upcoming'>('all');
  const [fundingFilter, setFundingFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [selectedKeyword, setSelectedKeyword] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Admin CMS panel states
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [editingProj, setEditingProj] = useState<any | null>(null);

  // Core Form attributes
  const [projForm, setProjForm] = useState({
    id: '',
    slug: '',
    title: '',
    tag: '',
    description: '',
    longDescription: '',
    methodology: '',
    aims: '', // Comma-separated
    color: 'bg-brand-acid',
    status: 'Ongoing',
    image: '',
    fundingAgency: '',
    collaboratingAgency: '',
    year: '',
    startDate: '',
    endDate: '',
    keywords: '', // Comma-separated
    associatedCentres: [] as string[],
    projectDirectors: [] as string[],
    projectStaffs: '', // Newline-separated
    outputUrl: '',
    outputLabel: '',
  });

  // Sub-items nested forms
  const [formLinks, setFormLinks] = useState<Array<{ name: string, url: string }>>([]);
  const [formPositions, setFormPositions] = useState<Array<{ title: string, description: string, deadline: string, applyLink: string }>>([]);
  const [formSubPages, setFormSubPages] = useState<any[]>([]);

  // Helpers to fetch projects
  const fetchDbProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.projects && data.projects.length > 0) {
        setDbProjects(data.projects);
      } else {
        setDbProjects(defaultStaticProjects);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setDbProjects(defaultStaticProjects);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbProjects();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    if (statusParam === 'Ongoing' || statusParam === 'Completed' || statusParam === 'Upcoming') {
      setStatusFilter(statusParam);
    }
  }, [location.search]);

  // Merge static and dynamic lists
  const activeProjectsList = useMemo(() => {
    return dbProjects.length > 0 ? dbProjects : defaultStaticProjects;
  }, [dbProjects]);

  // Gather filter options dynamically
  const availableFunders = useMemo(() => {
    const funders = new Set<string>();
    activeProjectsList.forEach(p => {
      if (p.fundingAgency) funders.add(p.fundingAgency);
    });
    return Array.from(funders);
  }, [activeProjectsList]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    activeProjectsList.forEach(p => {
      if (p.year) years.add(p.year);
    });
    return Array.from(years).sort();
  }, [activeProjectsList]);

  const availableKeywords = useMemo(() => {
    const keywordsSet = new Set<string>();
    activeProjectsList.forEach(p => {
      if (p.keywords) {
        p.keywords.forEach(kw => keywordsSet.add(kw));
      }
    });
    return Array.from(keywordsSet);
  }, [activeProjectsList]);

  // Filter computation
  const filteredProjects = useMemo(() => {
    return activeProjectsList.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }
      if (fundingFilter !== 'all' && p.fundingAgency !== fundingFilter) {
        return false;
      }
      if (yearFilter !== 'all' && p.year !== yearFilter) {
        return false;
      }
      if (selectedKeyword !== 'all' && (!p.keywords || !p.keywords.includes(selectedKeyword))) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title?.toLowerCase().includes(q) || false;
        const matchesDesc = p.description?.toLowerCase().includes(q) || false;
        const matchesLongDesc = p.longDescription?.toLowerCase().includes(q) || false;
        const matchesId = p.id?.toLowerCase().includes(q) || false;
        const matchesTag = p.tag?.toLowerCase().includes(q) || false;
        const matchesAgency = p.fundingAgency?.toLowerCase().includes(q) || false;
        const matchesKw = p.keywords?.some((kw: string) => kw.toLowerCase().includes(q)) || false;

        if (!matchesTitle && !matchesDesc && !matchesLongDesc && !matchesId && !matchesTag && !matchesAgency && !matchesKw) {
          return false;
        }
      }
      return true;
    });
  }, [activeProjectsList, statusFilter, fundingFilter, yearFilter, selectedKeyword, searchQuery]);

  const handleResetFilters = () => {
    setStatusFilter('all');
    setFundingFilter('all');
    setYearFilter('all');
    setSelectedKeyword('all');
    setSearchQuery('');
  };

  // CMS modal triggers
  const openNewProjModal = () => {
    setEditingProj(null);
    setProjForm({
      id: `PROJ-0${activeProjectsList.length + 1}`,
      slug: '',
      title: '',
      tag: 'Special Research Stream',
      description: '',
      longDescription: '',
      methodology: '',
      aims: 'Documentation, Preservation, Machine Translation',
      color: 'bg-brand-acid',
      status: 'Ongoing',
      image: '',
      fundingAgency: '',
      collaboratingAgency: '',
      year: new Date().getFullYear().toString(),
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      keywords: 'AI, NLP, Speech, Low-Resource',
      associatedCentres: [],
      projectDirectors: [],
      projectStaffs: '',
      outputUrl: '',
      outputLabel: ''
    });
    setFormLinks([]);
    setFormPositions([]);
    setFormSubPages([]);
    setIsProjModalOpen(true);
  };

  const openEditProjModal = (p: any) => {
    setEditingProj(p);
    setProjForm({
      id: p.id || '',
      slug: p.slug || '',
      title: p.title || '',
      tag: p.tag || '',
      description: p.description || '',
      longDescription: p.longDescription || '',
      methodology: p.methodology || '',
      aims: (p.aims || []).join(', '),
      color: p.color || 'bg-brand-acid',
      status: p.status || 'Ongoing',
      image: p.image || '',
      fundingAgency: p.fundingAgency || '',
      collaboratingAgency: p.collaboratingAgency || '',
      year: p.year || '',
      startDate: p.startDate || '',
      endDate: p.endDate || '',
      keywords: (p.keywords || []).join(', '),
      associatedCentres: p.associatedCentres || [],
      projectDirectors: p.projectDirectors || [],
      projectStaffs: (p.projectStaffs || []).join('\n'),
      outputUrl: p.outputUrl || '',
      outputLabel: p.outputLabel || ''
    });
    setFormLinks(p.relatedLinks || []);
    setFormPositions(p.openPositions || []);
    setFormSubPages(p.subPages || []);
    setIsProjModalOpen(true);
  };

  // Mutator triggers
  const handleProjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    try {
      const aimsArray = projForm.aims.split(',').map(s => s.trim()).filter(Boolean);
      const keywordsArray = projForm.keywords.split(',').map(s => s.trim()).filter(Boolean);
      const staffsArray = projForm.projectStaffs.split('\n').map(s => s.trim()).filter(Boolean);

      const payload = {
        ...projForm,
        aims: aimsArray,
        keywords: keywordsArray,
        projectStaffs: staffsArray,
        relatedLinks: formLinks,
        openPositions: formPositions,
        subPages: formSubPages
      };

      const isEdit = !!editingProj;
      const url = isEdit ? `/api/projects/${editingProj.slug}` : '/api/projects';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsProjModalOpen(false);
        setEditingProj(null);
        fetchDbProjects();
      } else {
        const errData = await res.json();
        alert(`Operation failed: ${errData.error || 'Syntax validation error.'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Database serialization error.");
    }
  };

  const handleProjDelete = (slug: string) => {
    if (!user?.token) return;
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Project Purge',
      message: 'Are you absolutely sure you want to permanently purge this research project?',
      confirmText: 'Purge Project',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/projects/${slug}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${user.token}`
            }
          });
          if (res.ok) {
            fetchDbProjects();
          } else {
            alert("Action restricted.");
          }
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Dynamic items lists modifiers
  const addLink = () => {
    setFormLinks([...formLinks, { name: '', url: '' }]);
  };

  const removeLink = (idx: number) => {
    setFormLinks(formLinks.filter((_, i) => i !== idx));
  };

  const updateLink = (idx: number, key: string, val: string) => {
    setFormLinks(formLinks.map((item, i) => {
      if (i === idx) {
        return { ...item, [key]: val };
      }
      return item;
    }));
  };

  const addPosition = () => {
    setFormPositions([...formPositions, { title: '', description: '', deadline: '', applyLink: '' }]);
  };

  const removePosition = (idx: number) => {
    setFormPositions(formPositions.filter((_, i) => i !== idx));
  };

  const updatePosition = (idx: number, key: string, val: string) => {
    setFormPositions(formPositions.map((item, i) => {
      if (i === idx) {
        return { ...item, [key]: val };
      }
      return item;
    }));
  };

  const addSubPage = () => {
    setFormSubPages([...formSubPages, {
      slug: '',
      title: '',
      icon: 'BookOpen',
      type: 'markdown',
      content: { teaser: '', markdown: '' }
    }]);
  };

  const removeSubPage = (idx: number) => {
    setFormSubPages(formSubPages.filter((_, i) => i !== idx));
  };

  const updateSubPageCore = (idx: number, key: string, val: string) => {
    setFormSubPages(formSubPages.map((item, i) => {
      if (i === idx) {
        const updated = { ...item, [key]: val };
        // Clean structural mismatch on type switch
        if (key === 'type') {
          updated.content = val === 'markdown' 
            ? { teaser: '', markdown: '' } 
            : [];
        }
        return updated;
      }
      return item;
    }));
  };

  const updateSubPageMarkdownContent = (idx: number, field: string, val: string) => {
    setFormSubPages(formSubPages.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          content: {
            ...(item.content || {}),
            [field]: val
          }
        };
      }
      return item;
    }));
  };

  const addSubPageListItem = (subIdx: number) => {
    setFormSubPages(formSubPages.map((item, i) => {
      if (i === subIdx) {
        const list = Array.isArray(item.content) ? [...item.content] : [];
        list.push({ name: '', role: '', affiliation: '' });
        return { ...item, content: list };
      }
      return item;
    }));
  };

  const updateSubPageListItem = (subIdx: number, itemIdx: number, field: string, val: string) => {
    setFormSubPages(formSubPages.map((item, i) => {
      if (i === subIdx && Array.isArray(item.content)) {
        const list = item.content.map((elem: any, elemIdx: number) => {
          if (elemIdx === itemIdx) {
            return { ...elem, [field]: val };
          }
          return elem;
        });
        return { ...item, content: list };
      }
      return item;
    }));
  };

  const removeSubPageListItem = (subIdx: number, itemIdx: number) => {
    setFormSubPages(formSubPages.map((item, i) => {
      if (i === subIdx && Array.isArray(item.content)) {
        const list = item.content.filter((_, elemIdx) => elemIdx !== itemIdx);
        return { ...item, content: list };
      }
      return item;
    }));
  };

  return (
    <div className="pt-32 pb-24 grid-structure min-h-screen bg-paper animate-fade-in">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 animate-fade-in">
        
        {/* Header Block & Controls */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-1 border border-ink text-[10px] font-mono font-bold uppercase tracking-[0.3em] mb-4 bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              RESEARCH REGISTRY // CODE DEMONSTRATIONAL NODES
            </div>
            <h1 className="text-6xl md:text-8xl font-serif font-black leading-none mb-8 italic">
              CoDIN <br />
              <span className="text-outline text-brand-blue uppercase not-italic">Projects</span>
            </h1>
            <p className="font-serif text-2xl text-ink/75 leading-relaxed">
              Explore our state-of-the-art diagnostic, annotational, and linguistic preservation pipelines funded by governments, cooperative councils, and corporate philanthropy.
            </p>
          </div>

          {isAdmin && (
            <button 
              onClick={openNewProjModal}
              className="px-6 py-4 border-2 border-ink bg-brand-acid text-ink font-mono text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-3 self-start md:self-end"
            >
              <Plus className="w-4 h-4" strokeWidth={3} /> Add New Research Project
            </button>
          )}
        </div>

        {/* Filters Panel */}
        <div className="p-6 md:p-8 border-2 border-ink bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)] mb-12">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider mb-6 text-ink/40">
            <SlidersHorizontal className="w-4 h-4 text-ink" />
            Strategic Search & filter console
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                Search Words
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ID, keyword, or text..."
                  className="w-full p-3 pl-10 border border-ink bg-paper/30 focus:outline-none focus:border-brand-blue font-mono text-xs uppercase"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-ink/40" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                Project Phase Status
              </label>
              <select
                className="w-full p-3 border border-ink bg-paper/30 focus:outline-none focus:border-brand-blue font-mono text-xs uppercase font-bold appearance-none cursor-pointer"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  const searchParams = new URLSearchParams(location.search);
                  searchParams.set('status', e.target.value);
                  if (e.target.value === 'all') {
                    searchParams.delete('status');
                  }
                  navigate({ search: searchParams.toString() });
                }}
              >
                <option value="all">ALL STAGES</option>
                <option value="Upcoming">UPCOMING</option>
                <option value="Ongoing">ONGOING WORK</option>
                <option value="Completed">COMPLETED EFFORTS</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                Funding Agencies
              </label>
              <select
                className="w-full p-3 border border-ink bg-paper/30 focus:outline-none focus:border-brand-blue font-mono text-xs uppercase font-bold appearance-none cursor-pointer"
                value={fundingFilter}
                onChange={(e) => setFundingFilter(e.target.value)}
              >
                <option value="all">ALL FUNDING AGENCIES</option>
                {availableFunders.map(f => (
                  <option key={f} value={f}>{f.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                Initiation Year
              </label>
              <select
                className="w-full p-3 border border-ink bg-paper/30 focus:outline-none focus:border-brand-blue font-mono text-xs uppercase font-bold appearance-none cursor-pointer"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="all">ALL YEARS</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                Core Focus Keyword
              </label>
              <select
                className="w-full p-3 border border-ink bg-paper/30 focus:outline-none focus:border-brand-blue font-mono text-xs uppercase font-bold appearance-none cursor-pointer"
                value={selectedKeyword}
                onChange={(e) => setSelectedKeyword(e.target.value)}
              >
                <option value="all">ALL KEYWORDS</option>
                {availableKeywords.map(kw => (
                  <option key={kw} value={kw}>{kw.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-ink/10">
            <button
              onClick={handleResetFilters}
              className="px-6 py-2.5 border border-ink bg-paper text-ink font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-brand-acid transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] active:shadow-none"
            >
              <RefreshCw className="w-3.5 h-3.5 text-brand-orange" />
              Reset All Diagnostic Parameters
            </button>
          </div>
        </div>

        {/* Results Counter and Grids */}
        <div className="mb-8 font-mono text-[10px] font-black uppercase tracking-widest text-ink/40">
          Showing {filteredProjects.length} matching research programs
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((p) => (
              <motion.div
                layout
                key={p.slug}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="group flex flex-col justify-between border-2 border-ink bg-white shadow-[10px_10px_0px_rgba(0,0,0,1)] hover:shadow-[14px_14px_0px_var(--color-brand-blue)] hover:border-brand-blue transition-all"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-ink">
                    <img 
                      src={p.image || "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=1200"} 
                      alt={p.title} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 font-mono text-[9px] font-black uppercase bg-white border border-ink text-ink px-2.5 py-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      {p.id}
                    </div>
                    {isAdmin && p._id && (
                      <div className="absolute top-4 right-4 flex gap-1.5 z-20">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEditProjModal(p); }}
                          className="p-1 px-2.5 bg-brand-acid text-ink border border-ink font-mono text-[9px] font-black uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-white transition-all flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleProjDelete(p.slug); }}
                          className="p-1 px-2.5 bg-brand-orange text-white border border-ink font-mono text-[9px] font-black uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-ink hover:text-white transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Purge
                        </button>
                      </div>
                    )}
                    <div className={`absolute bottom-4 right-4 font-mono text-[8.5px] font-black uppercase px-3 py-1 text-ink shadow-[3px_3px_0px_rgba(0,0,0,1)] ${p.color || "bg-brand-acid"}`}>
                      {p.tag}
                    </div>
                  </div>

                  <div className="p-8">
                    <h3 className="font-serif text-3xl font-black mb-4 uppercase hover:text-brand-blue transition-colors tracking-tight italic">
                      {p.title}
                    </h3>
                    <p className="font-serif text-sm text-ink/75 leading-relaxed mb-6">
                      {p.description}
                    </p>

                    {p.outputUrl && (
                      <div className="mb-6 flex">
                        <a
                          href={p.outputUrl.trim().startsWith('http') ? p.outputUrl.trim() : `https://${p.outputUrl.trim()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white border border-ink font-mono text-[9px] font-black uppercase tracking-wider hover:bg-brand-orange shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] active:translate-y-0 active:shadow-none hover:text-white transition-all text-white no-underline decoration-none"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          {p.outputLabel && p.outputLabel.trim() ? p.outputLabel.trim() : 'Output Page / Repo'}
                        </a>
                      </div>
                    )}

                    <div className="space-y-2 border-t border-dashed border-ink/20 pt-4 mb-4">
                      {p.fundingAgency && (
                        <div className="font-mono text-[9.5px] font-semibold text-ink/50 uppercase tracking-tight flex items-center gap-1.5 truncate">
                          <Landmark className="w-3.5 h-3.5 text-brand-orange" />
                          <span>Funder: {p.fundingAgency}</span>
                        </div>
                      )}
                      {p.year && (
                        <div className="font-mono text-[9.5px] font-semibold text-ink/50 uppercase tracking-tight flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-brand-blue flex-shrink-0" />
                          <span>Active Since: {p.year}</span>
                        </div>
                      )}
                    </div>

                    {p.keywords && p.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {p.keywords.slice(0, 4).map((kw: string) => (
                          <span key={kw} className="bg-paper border border-ink/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wide text-ink/60 rounded-sm">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 pt-0 mt-auto">
                  <Link
                    to={`/projects/${p.slug}`}
                    className="w-full h-12 bg-white text-ink border border-ink font-mono text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[4px_4px_0px_rgba(0,0,0,1)] group-hover:bg-brand-acid hover:no-underline hover:text-ink transition-all"
                  >
                    Open Project Dossier
                    <ArrowUpRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredProjects.length === 0 && (
            <div className="col-span-full border border-ink/20 bg-paper/50 py-24 text-center mt-6 shadow-inner animate-fade-in">
              <span className="font-serif text-2xl font-black text-ink/40 uppercase block mb-3">
                No Programs Found matching parameters
              </span>
              <button
                onClick={handleResetFilters}
                className="font-mono text-[10px] font-bold text-brand-blue uppercase bg-ink text-paper border border-ink px-4 py-2 mt-2 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-brand-acid hover:text-ink"
              >
                Clear Diagnostic Parameters
              </button>
            </div>
          )}
        </div>

      </div>

      {/* COMPREHENSIVE PROJECT CMS MODAL */}
      {isProjModalOpen && (
        <div className="fixed inset-0 bg-ink/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-4xl bg-white border-2 border-ink shadow-[8px_8px_0px_rgba(0,0,0,1)] my-8"
          >
            {/* Header */}
            <div className="bg-brand-acid border-b-2 border-ink p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-ink animate-spin" />
                <h3 className="font-mono text-sm font-black uppercase tracking-widest text-ink">
                  {editingProj ? 'CMS // Edit Research Pipeline' : 'CMS // Instantiate Pipeline'}
                </h3>
              </div>
              <button 
                onClick={() => setIsProjModalOpen(false)}
                className="p-1 hover:bg-brand-orange border border-transparent hover:border-ink"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleProjSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-paper [&::-webkit-scrollbar-track]:border [&::-webkit-scrollbar-track]:border-ink [&::-webkit-scrollbar-thumb]:bg-ink">
              
              {/* Section 1: Core Meta coordinates */}
              <div className="space-y-4">
                <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange border-b border-ink/10 pb-1">
                  1. Core Identity coordinates
                </h4>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-mono text-[9px] font-bold uppercase mb-1">Project Unique Slug (e.g. digital-corpus)</label>
                    <input 
                      type="text"
                      required
                      value={projForm.slug}
                      onChange={(e) => setProjForm({ ...projForm, slug: e.target.value })}
                      placeholder="e.g. kailash"
                      className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] font-bold uppercase mb-1">Index ID code</label>
                    <input 
                      type="text"
                      required
                      value={projForm.id}
                      onChange={(e) => setProjForm({ ...projForm, id: e.target.value })}
                      placeholder="e.g. PROJ-001"
                      className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label className="block font-mono text-[9px] font-bold uppercase mb-1">Project Display Title</label>
                    <input 
                      type="text"
                      required
                      value={projForm.title}
                      onChange={(e) => setProjForm({ ...projForm, title: e.target.value })}
                      placeholder="e.g. Project Kailash"
                      className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] font-bold uppercase mb-1">Tagline Pill</label>
                    <input 
                      type="text"
                      required
                      value={projForm.tag}
                      onChange={(e) => setProjForm({ ...projForm, tag: e.target.value })}
                      placeholder="e.g. Flagship AI Initiative"
                      className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block font-mono text-[9px] font-bold uppercase mb-1">Color Preset</label>
                    <select
                      value={projForm.color}
                      onChange={(e) => setProjForm({ ...projForm, color: e.target.value })}
                      className="w-full h-11 px-2 border border-ink font-mono text-xs focus:outline-none bg-white font-bold"
                    >
                      <option value="bg-brand-acid">ACID GREEN (Primary)</option>
                      <option value="bg-brand-blue text-white">ROYAL BLUE</option>
                      <option value="bg-brand-orange text-white">MANDARIN ORANGE</option>
                      <option value="bg-paper">COSMIC PAPER (Light Gray)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] font-bold uppercase mb-1">Current Status</label>
                    <select
                      value={projForm.status}
                      onChange={(e) => setProjForm({ ...projForm, status: e.target.value as any })}
                      className="w-full h-11 px-2 border border-ink font-mono text-xs focus:outline-none bg-white font-bold"
                    >
                      <option value="Ongoing">ONGOING WORK</option>
                      <option value="Upcoming">UPCOMING PIPELINE</option>
                      <option value="Completed">COMPLETED EFFORTS</option>
                      <option value="Archived">ARCHIVED REGISTRY</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] font-bold uppercase mb-1">Core Initiation Year</label>
                    <input 
                      type="text"
                      required
                      value={projForm.year}
                      onChange={(e) => setProjForm({ ...projForm, year: e.target.value })}
                      placeholder="e.g. 2024"
                      className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-mono text-[9px] font-bold uppercase mb-1">Project Output Page / Website URL (Optional)</label>
                    <input 
                      type="url"
                      value={projForm.outputUrl || ''}
                      onChange={(e) => setProjForm({ ...projForm, outputUrl: e.target.value })}
                      placeholder="e.g. https://github.com/my-org/my-project"
                      className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] font-bold uppercase mb-1">Link Button Label (Optional)</label>
                    <input 
                      type="text"
                      value={projForm.outputLabel || ''}
                      onChange={(e) => setProjForm({ ...projForm, outputLabel: e.target.value })}
                      placeholder="Default: Output Page / Repo"
                      className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[9px] font-bold uppercase mb-1">Cover Image Source</label>
                  <div className="flex gap-2">
                    <input 
                      type="url"
                      value={projForm.image}
                      onChange={(e) => setProjForm({ ...projForm, image: e.target.value })}
                      placeholder="https://images.unsplash.com/promo-banner"
                      className="flex-1 h-11 px-3 border border-ink font-mono text-xs focus:outline-none"
                    />
                    <label className="px-4 py-1.5 bg-slate-100 hover:bg-brand-acid text-ink hover:text-ink font-mono text-[10px] font-black uppercase tracking-wider border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5 cursor-pointer uppercase select-none shrink-0">
                      <Upload className="w-4 h-4" />
                      {isUploading ? "Uploading..." : "Upload Cover Image"}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            uploadToCloudinary(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 2: Overviews, methodology & Aims */}
              <div className="space-y-4">
                <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange border-b border-ink/10 pb-1">
                  2. Research Parameters, Methodology, & Strategic Aims
                </h4>
                
                <div>
                  <label className="block font-mono text-[9px] font-bold uppercase mb-1">Brief Description (Showcase Teaser)</label>
                  <textarea 
                    value={projForm.description}
                    onChange={(e) => setProjForm({ ...projForm, description: e.target.value })}
                    rows={2}
                    className="w-full p-3 border border-ink font-mono text-xs focus:outline-none"
                    placeholder="Provide a concise 2-sentence teaser summarizing the core research bounds..."
                  />
                </div>

                 <div>
                  <label className="block font-mono text-[9px] font-bold uppercase mb-1 font-black">Executive Mission Summary (Overview tab content)</label>
                  <MarkdownHelperBar 
                    textareaId="create-longdescription-textarea"
                    value={projForm.longDescription}
                    onChange={(val) => setProjForm({ ...projForm, longDescription: val })}
                  />
                  <MarkdownMediaHelper 
                    onInsert={(text) => setProjForm({ ...projForm, longDescription: projForm.longDescription + text })}
                  />
                  <textarea 
                    id="create-longdescription-textarea"
                    value={projForm.longDescription}
                    onChange={(e) => setProjForm({ ...projForm, longDescription: e.target.value })}
                    rows={4}
                    className="w-full p-3 border border-ink font-mono text-xs focus:outline-none"
                    placeholder="Explain why this project was instantiated, its political background, and community impact..."
                  />
                  {projForm.longDescription && (
                    <div className="mt-2 p-3 border border-dashed border-ink bg-slate-50 max-h-[160px] overflow-y-auto">
                      <label className="block text-[8px] font-black uppercase mb-1 text-brand-blue select-none">Live Overview Markdown Preview</label>
                      <div 
                        className="prose prose-sm max-w-none text-ink font-sans text-xs font-semibold"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(projForm.longDescription) }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-[9px] font-bold uppercase mb-1 font-black">Technical Framework & Fieldwork Methodology</label>
                  <MarkdownHelperBar 
                    textareaId="create-methodology-textarea"
                    value={projForm.methodology}
                    onChange={(val) => setProjForm({ ...projForm, methodology: val })}
                  />
                  <MarkdownMediaHelper 
                    onInsert={(text) => setProjForm({ ...projForm, methodology: projForm.methodology + text })}
                  />
                  <textarea 
                    id="create-methodology-textarea"
                    value={projForm.methodology}
                    onChange={(e) => setProjForm({ ...projForm, methodology: e.target.value })}
                    rows={4}
                    className="w-full p-3 border border-ink font-mono text-xs focus:outline-none"
                    placeholder="Explain the technical workflow, data formats (e.g. Wav/JSON), annotation standard, etc..."
                  />
                  {projForm.methodology && (
                    <div className="mt-2 p-3 border border-dashed border-ink bg-slate-50 max-h-[160px] overflow-y-auto">
                      <label className="block text-[8px] font-black uppercase mb-1 text-brand-blue select-none">Live Methodology Markdown Preview</label>
                      <div 
                        className="prose prose-sm max-w-none text-ink font-sans text-xs font-semibold"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(projForm.methodology) }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-mono text-[9px] font-bold uppercase mb-1">Strategic Priorities / Aims (Comma Separated)</label>
                    <input 
                      type="text"
                      value={projForm.aims}
                      onChange={(e) => setProjForm({ ...projForm, aims: e.target.value })}
                      placeholder="e.g. Bias Mitigation, Training Datasets, Linguistic Equity"
                      className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] font-bold uppercase mb-1">Focus Keywords (Comma Separated)</label>
                    <input 
                      type="text"
                      value={projForm.keywords}
                      onChange={(e) => setProjForm({ ...projForm, keywords: e.target.value })}
                      placeholder="e.g. AI, NLP, Low-Resource Varieties"
                      className="w-full h-11 px-3 border border-ink font-mono text-xs focus:outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Personnel and Mapped alignments */}
              <div className="space-y-4">
                <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange border-b border-ink/10 pb-1">
                  3. Implementing Alignment Networks & Staffing
                </h4>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-mono text-[9px] font-black uppercase tracking-wider mb-2">Implementing Research Centres</label>
                    <div className="p-4 border border-ink bg-paper/10 space-y-2.5 max-h-44 overflow-y-auto">
                      {centres.map(c => {
                        const hasChecked = projForm.associatedCentres.includes(c.slug);
                        return (
                          <label key={c.slug} className="flex items-center gap-2 cursor-pointer font-mono text-[10px] font-semibold uppercase select-none">
                            <input 
                              type="checkbox"
                              checked={hasChecked}
                              onChange={(e) => {
                                const list = e.target.checked 
                                  ? [...projForm.associatedCentres, c.slug]
                                  : projForm.associatedCentres.filter(x => x !== c.slug);
                                setProjForm({ ...projForm, associatedCentres: list });
                              }}
                              className="w-3.5 h-3.5 text-brand-blue border-ink bg-white uppercase focus:ring-0 cursor-pointer"
                            />
                            {c.shortName} ({c.slug})
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[9px] font-black uppercase tracking-wider mb-2">Project Directors / Slugs</label>
                    <div className="p-4 border border-ink bg-paper/10 space-y-2.5 max-h-44 overflow-y-auto">
                      {team.map(member => {
                        const hasChecked = projForm.projectDirectors.includes(member.slug);
                        return (
                          <label key={member.slug} className="flex items-center gap-2 cursor-pointer font-mono text-[10px] font-semibold uppercase select-none">
                            <input 
                              type="checkbox"
                              checked={hasChecked}
                              onChange={(e) => {
                                const list = e.target.checked 
                                  ? [...projForm.projectDirectors, member.slug]
                                  : projForm.projectDirectors.filter(x => x !== member.slug);
                                setProjForm({ ...projForm, projectDirectors: list });
                              }}
                              className="w-3.5 h-3.5 text-brand-blue border-ink bg-white uppercase focus:ring-0 cursor-pointer"
                            />
                            {member.name} ({member.slug})
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[9px] font-bold uppercase mb-1">Additional Research Personnel / Authors (One name per line)</label>
                  <textarea 
                    value={projForm.projectStaffs}
                    onChange={(e) => setProjForm({ ...projForm, projectStaffs: e.target.value })}
                    rows={3}
                    className="w-full p-3 border border-ink font-mono text-xs focus:outline-none"
                    placeholder="e.g. Anand Kumar (Lead Systems Engineer)"
                  />
                </div>
              </div>

              {/* Section 4: External References / Related Links */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-ink/10 pb-1">
                  <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange">
                    4. External Reference Materials & Assets
                  </h4>
                  <button 
                    type="button" 
                    onClick={addLink}
                    className="px-2 py-1 border border-ink bg-brand-acid text-ink font-mono text-[9px] font-bold uppercase tracking-widest hover:bg-white flex items-center gap-1"
                  >
                    + Add Reference
                  </button>
                </div>

                <div className="space-y-3">
                  {formLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-3 border border-ink p-3 bg-paper/20">
                      <input 
                        type="text" 
                        value={link.name}
                        onChange={(e) => updateLink(idx, 'name', e.target.value)}
                        placeholder="Link Label" 
                        required
                        className="w-1/3 h-9 px-2 border border-ink font-mono text-[10px] focus:outline-none"
                      />
                      <input 
                        type="url" 
                        value={link.url}
                        onChange={(e) => updateLink(idx, 'url', e.target.value)}
                        placeholder="URL Address (e.g. https://...)" 
                        required
                        className="w-2/3 h-9 px-2 border border-ink font-mono text-[10px] focus:outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => removeLink(idx)}
                        className="p-1 hover:bg-brand-orange border border-transparent hover:border-ink rounded shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-ink" />
                      </button>
                    </div>
                  ))}
                  {formLinks.length === 0 && (
                    <p className="text-[10px] font-mono text-ink/40 uppercase italic">No external references added.</p>
                  )}
                </div>
              </div>

              {/* Section 5: Careers, Vacancies & Openings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-ink/10 pb-1">
                  <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange">
                    5. Recruitment / Career Vacancy Advertising
                  </h4>
                  <button 
                    type="button" 
                    onClick={addPosition}
                    className="px-2 py-1 border border-ink bg-brand-acid text-ink font-mono text-[9px] font-bold uppercase tracking-widest hover:bg-white flex items-center gap-1"
                  >
                    + Open Vacancy
                  </button>
                </div>

                <div className="space-y-4">
                  {formPositions.map((pos, idx) => (
                    <div key={idx} className="border border-ink p-4 space-y-3 bg-brand-acid/5 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/40">Vacancy Details #{idx+1}</span>
                        <button 
                          type="button"
                          onClick={() => removePosition(idx)}
                          className="p-1 hover:bg-brand-orange border border-transparent hover:border-ink rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-ink" />
                        </button>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-mono text-[8px] font-bold uppercase mb-1">Job Role Title</label>
                          <input 
                            type="text" 
                            value={pos.title}
                            onChange={(e) => updatePosition(idx, 'title', e.target.value)}
                            placeholder="e.g. Lead Annotator" 
                            required
                            className="w-full h-9 px-2 border border-ink font-mono text-[10px] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[8px] font-bold uppercase mb-1">Submission Deadline</label>
                          <input 
                            type="text" 
                            value={pos.deadline}
                            onChange={(e) => updatePosition(idx, 'deadline', e.target.value)}
                            placeholder="e.g. June 15, 2026" 
                            required
                            className="w-full h-9 px-2 border border-ink font-mono text-[10px] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-mono text-[8px] font-bold uppercase mb-1">Short Description of Required Competence</label>
                        <textarea 
                          value={pos.description}
                          onChange={(e) => updatePosition(idx, 'description', e.target.value)}
                          placeholder="Summarize the core skillset needed..." 
                          required
                          rows={2}
                          className="w-full p-2 border border-ink font-mono text-[10px] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[8px] font-bold uppercase mb-1">Apply URL Redirect Form</label>
                        <input 
                          type="text" 
                          value={pos.applyLink}
                          onChange={(e) => updatePosition(idx, 'applyLink', e.target.value)}
                          placeholder="e.g. /academy/residential, mailto:recruitment@diversity.org.in" 
                          className="w-full h-9 px-2 border border-ink font-mono text-[10px] focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                  {formPositions.length === 0 && (
                    <p className="text-[10px] font-mono text-ink/40 uppercase italic">No active vacancies currently configured.</p>
                  )}
                </div>
              </div>

              {/* Section 6: Dynamic Dossier custom tabs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-ink/10 pb-1">
                  <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange">
                    6. Strategic sub-pages & custom dossier tabs
                  </h4>
                  <button 
                    type="button" 
                    onClick={addSubPage}
                    className="px-2 py-1 border border-ink bg-brand-acid text-ink font-mono text-[9px] font-bold uppercase tracking-widest hover:bg-white flex items-center gap-1"
                  >
                    + Instantiate custom Dossier Tab
                  </button>
                </div>

                <div className="space-y-6">
                  {formSubPages.map((tab, idx) => (
                    <div key={idx} className="border-2 border-ink p-5 space-y-4 bg-paper/10 relative shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                      <div className="flex justify-between items-center gap-4 border-b border-ink/10 pb-2">
                        <span className="font-mono text-[10px] font-black text-brand-blue uppercase">Dossier Tab config #{idx+1}</span>
                        <button 
                          type="button"
                          onClick={() => removeSubPage(idx)}
                          className="p-1 hover:bg-brand-orange border border-transparent hover:border-ink rounded"
                        >
                          <Trash2 className="w-4 h-4 text-ink" />
                        </button>
                      </div>

                      <div className="grid sm:grid-cols-4 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block font-mono text-[8px] font-bold uppercase mb-1">Tab Label / Title</label>
                          <input 
                            type="text" 
                            value={tab.title}
                            onChange={(e) => updateSubPageCore(idx, 'title', e.target.value)}
                            placeholder="e.g. Royalties Framework" 
                            required
                            className="w-full h-9 px-2 border border-ink font-mono text-[10px]"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[8px] font-bold uppercase mb-1">Unique Slug (Tab Key)</label>
                          <input 
                            type="text" 
                            value={tab.slug}
                            onChange={(e) => updateSubPageCore(idx, 'slug', e.target.value)}
                            placeholder="e.g. royalties" 
                            required
                            className="w-full h-9 px-2 border border-ink font-mono text-[10px]"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[8px] font-bold uppercase mb-1">Tab Type</label>
                          <select 
                            value={tab.type}
                            onChange={(e) => updateSubPageCore(idx, 'type', e.target.value)}
                            className="w-full h-9 px-2 border border-ink font-mono text-[10px]"
                          >
                            <option value="markdown">MARKDOWN TEXT</option>
                            <option value="list">TABULAR DATAFRAME LIST</option>
                            <option value="events">RELATED EVENTS</option>
                          </select>
                        </div>
                      </div>

                      {/* Markdown rendering details */}
                      {tab.type === 'markdown' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block font-mono text-[8px] font-bold uppercase mb-1">Teaser introductory accent</label>
                            <input 
                              type="text"
                              value={tab.content?.teaser || ''}
                              onChange={(e) => updateSubPageMarkdownContent(idx, 'teaser', e.target.value)}
                              placeholder="Teaser highlight summary sentence..."
                              className="w-full h-9 px-2 border border-ink font-mono text-[10px]"
                            />
                          </div>
                          <div>
                            <label className="block font-mono text-[8px] font-bold uppercase mb-1">Markdown Body (Main Content)</label>
                            <MarkdownHelperBar 
                              textareaId={`create-tab-markdown-${idx}`}
                              value={tab.content?.markdown || ''}
                              onChange={(val) => updateSubPageMarkdownContent(idx, 'markdown', val)}
                            />
                            <MarkdownMediaHelper 
                              onInsert={(text) => updateSubPageMarkdownContent(idx, 'markdown', (tab.content?.markdown || '') + text)}
                            />
                            <textarea 
                              id={`create-tab-markdown-${idx}`}
                              value={tab.content?.markdown || ''}
                              onChange={(e) => updateSubPageMarkdownContent(idx, 'markdown', e.target.value)}
                              rows={4}
                              placeholder="Write clean markdown or structured paragraphs..."
                              required
                              className="w-full p-2 border border-ink font-mono text-[10px] focus:outline-none"
                            />
                            {tab.content?.markdown && (
                              <div className="mt-2 p-3 border border-dashed border-ink bg-slate-50 max-h-[140px] overflow-y-auto w-full">
                                <label className="block text-[8px] font-black uppercase mb-1 text-brand-blue select-none">Live Tab Markdown Preview</label>
                                <div 
                                  className="prose prose-sm max-w-none text-ink font-sans text-xs font-semibold"
                                  dangerouslySetInnerHTML={{ __html: renderMarkdown(tab.content.markdown) }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Related Events informative container */}
                      {tab.type === 'events' && (
                        <div className="p-3 border border-ink bg-white font-mono text-[9px] text-brand-blue uppercase leading-relaxed select-none">
                          💡 Related Events: Instantiating this dynamic dossier page lists and links to all academic summits, research fieldwork, workshops, and courses associated with this project automatically. No manual entries are needed.
                        </div>
                      )}

                      {/* List rendering details */}
                      {tab.type === 'list' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[8px] font-bold uppercase text-ink/50">Tabular Dataset list</span>
                            <button 
                              type="button"
                              onClick={() => addSubPageListItem(idx)}
                              className="px-2 py-0.5 border border-ink bg-white font-mono text-[8px] font-bold uppercase"
                            >
                              + Add Row
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(Array.isArray(tab.content) ? tab.content : []).map((row: any, rIdx: number) => (
                              <div key={rIdx} className="flex gap-2 items-center bg-white p-2 border border-ink">
                                <input 
                                  type="text" 
                                  value={row.name || ''} 
                                  onChange={(e) => updateSubPageListItem(idx, rIdx, 'name', e.target.value)}
                                  placeholder="Name / Label"
                                  required
                                  className="w-1/3 h-8 px-2 border border-ink font-mono text-[9px]"
                                />
                                <input 
                                  type="text" 
                                  value={row.affiliation || ''} 
                                  onChange={(e) => updateSubPageListItem(idx, rIdx, 'affiliation', e.target.value)}
                                  placeholder="Location / Affiliation"
                                  className="w-1/3 h-8 px-2 border border-ink font-mono text-[9px]"
                                />
                                <input 
                                  type="text" 
                                  value={row.role || ''} 
                                  onChange={(e) => updateSubPageListItem(idx, rIdx, 'role', e.target.value)}
                                  placeholder="Role / Status"
                                  required
                                  className="w-1/4 h-8 px-2 border border-ink font-mono text-[9px]"
                                />
                                <button 
                                  type="button"
                                  onClick={() => removeSubPageListItem(idx, rIdx)}
                                  className="p-1 text-brand-orange hover:bg-paper"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            {(Array.isArray(tab.content) ? tab.content : []).length === 0 && (
                              <p className="text-[8px] font-mono text-ink/40 uppercase italic">No dataset rows configured.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {formSubPages.length === 0 && (
                    <p className="text-[10px] font-mono text-ink/40 uppercase italic">No strategic sub-pages adding yet.</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-ink/10 flex justify-end gap-3.5">
                <button 
                  type="button"
                  onClick={() => setIsProjModalOpen(false)}
                  className="h-12 px-6 border border-ink font-mono text-xs font-bold uppercase hover:bg-paper"
                >
                  Discard config
                </button>
                <button 
                  type="submit"
                  className="h-12 px-8 border border-ink bg-ink text-paper font-mono text-xs font-black uppercase tracking-widest hover:bg-brand-acid hover:text-ink transition-all shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px]"
                >
                  {editingProj ? 'Save Project config' : 'Instantiate Project Pipeline'}
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

    </div>
  );
}
