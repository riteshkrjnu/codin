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
import ProjectFormModal from '../components/ProjectFormModal';

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
    setIsProjModalOpen(true);
  };

  const openEditProjModal = (p: any) => {
    setEditingProj(p);
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
      <ProjectFormModal
        isOpen={isProjModalOpen}
        onClose={() => {
          setIsProjModalOpen(false);
          setEditingProj(null);
        }}
        projectToEdit={editingProj}
        token={user?.token}
        onSuccess={(_savedProj) => {
          setIsProjModalOpen(false);
          setEditingProj(null);
          fetchDbProjects();
        }}
      />

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
