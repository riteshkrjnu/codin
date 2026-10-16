/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { team, centres, events, projects } from '../data/config';
import { cn, renderMarkdown } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { MarkdownMediaHelper } from './MarkdownMediaHelper';
import { 
  ArrowLeft, ArrowUpRight, Zap, Database, ShieldCheck, CheckCircle2, 
  Calendar, MapPin, BookOpen, Clock, Users, Code, HelpCircle, 
  Briefcase, Mail, Landmark, Megaphone, Info, Pencil, Plus, Trash2, 
  Save, X, Upload, Video, Image as ImageIcon
} from 'lucide-react';
import { BrutalistLoader } from './Loader';
import ProjectFormModal from './ProjectFormModal';

const iconMap: Record<string, any> = {
  kailash: Zap,
  tholkudi: Database,
  suvadugal: ShieldCheck,
  Zap,
  Database,
  ShieldCheck,
  BookOpen,
  Clock,
  Users,
  Code,
  Info
};

function getIcon(name: string) {
  return iconMap[name] || Info;
}

function getYoutubeEmbedUrl(url: string) {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : '';
}

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
    <div className="flex flex-wrap gap-1 border-x border-t border-ink bg-slate-50 p-1.5 font-mono text-[9px] uppercase tracking-wide">
      <button type="button" onClick={() => applyFormat('**', '**', 'Bold')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink text-[9px] font-mono font-bold select-none cursor-pointer">Bold</button>
      <button type="button" onClick={() => applyFormat('*', '*', 'Italic')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink text-[9px] font-mono italic select-none cursor-pointer">Italic</button>
      <button type="button" onClick={() => applyFormat('<u>', '</u>', 'Underline')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink text-[9px] font-mono underline select-none cursor-pointer">Underline</button>
      <button type="button" onClick={() => applyLinePrefix('# ')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink text-[9px] font-mono font-black select-none cursor-pointer">H1</button>
      <button type="button" onClick={() => applyLinePrefix('## ')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink text-[9px] font-mono font-black select-none cursor-pointer">H2</button>
      <button type="button" onClick={() => applyLinePrefix('### ')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink text-[9px] font-mono font-black select-none cursor-pointer">H3</button>
      <button type="button" onClick={() => applyLinePrefix('- ')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink text-[9px] font-mono font-bold select-none cursor-pointer">• Bullet</button>
      <button type="button" onClick={() => applyLinePrefix('1. ')} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink text-[9px] font-mono font-bold select-none cursor-pointer">1. List</button>
    </div>
  );
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTabSlug, setActiveTabSlug] = useState<string>('overview');

  // Dynamic events list fetched from API for robust connections
  const [dynamicEvents, setDynamicEvents] = useState<any[]>(events);

  // Dynamic centres and people fetched from the database
  const [dynamicCentres, setDynamicCentres] = useState<any[]>(centres);
  const [dynamicPeople, setDynamicPeople] = useState<any[]>(team);

  // Form states for creating a New Person (matching +New Person on People page)
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonFullName, setNewPersonFullName] = useState("");
  const [newPersonRole, setNewPersonRole] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonBio, setNewPersonBio] = useState("");
  const [newPersonBoardType, setNewPersonBoardType] = useState<"staff" | "board" | "rab">("staff");
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);
  const [createPersonError, setCreatePersonError] = useState("");

  const loadCentres = async () => {
    try {
      const res = await fetch('/api/centres');
      if (res.ok) {
        const data = await res.json();
        if (data.centres && Array.isArray(data.centres)) {
          setDynamicCentres(data.centres);
        }
      }
    } catch (err) {
      console.error("Error loading centres:", err);
    }
  };

  const loadPeople = async () => {
    try {
      const res = await fetch('/api/people');
      if (res.ok) {
        const data = await res.json();
        if (data.people && Array.isArray(data.people)) {
          setDynamicPeople(data.people);
        }
      }
    } catch (err) {
      console.error("Error loading people:", err);
    }
  };

  // Cover & Media Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  // Edit Modal Admin Panel States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    id: '',
    title: '',
    tag: '',
    description: '',
    longDescription: '',
    methodology: '',
    aims: '',
    impact: '',
    year: '',
    fundingAgency: '',
    collaboratingAgency: '',
    status: 'Ongoing',
    image: '',
    outputUrl: '',
    outputLabel: '',
  });

  // Section 6 dynamic dossier custom subPages manager state
  const [modalSubPages, setModalSubPages] = useState<any[]>([]);
  const [modalAssociatedCentres, setModalAssociatedCentres] = useState<string[]>([]);
  const [modalProjectDirectors, setModalProjectDirectors] = useState<string[]>([]);
  const [modalProjectStaffs, setModalProjectStaffs] = useState<string[]>([]);
  const [modalOpenPositions, setModalOpenPositions] = useState<any[]>([]);

  // Add inputs helpers
  const [newStaffSelection, setNewStaffSelection] = useState("");
  const [newStaffCustomName, setNewStaffCustomName] = useState("");
  const [newStaffCustomRole, setNewStaffCustomRole] = useState("");
  const [newPositionTitle, setNewPositionTitle] = useState("");
  const [newPositionDescription, setNewPositionDescription] = useState("");
  const [newPositionDeadline, setNewPositionDeadline] = useState("");
  const [newPositionApplyLink, setNewPositionApplyLink] = useState("");

  // Job Application States (Requirement 5 & 6)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyingPosition, setApplyingPosition] = useState<any>(null);
  const [applyForm, setApplyForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    statement: '',
    experience: '',
    resumeUrl: ''
  });
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState("");

  // Multimedia arrays states
  const [modalOverviewImages, setModalOverviewImages] = useState<string[]>([]);
  const [modalOverviewYoutubeLinks, setModalOverviewYoutubeLinks] = useState<string[]>([]);
  const [modalMethodologyImages, setModalMethodologyImages] = useState<string[]>([]);
  const [modalMethodologyYoutubeLinks, setModalMethodologyYoutubeLinks] = useState<string[]>([]);

  // Add inputs helpers
  const [newOverviewYoutube, setNewOverviewYoutube] = useState("");
  const [newMethodologyYoutube, setNewMethodologyYoutube] = useState("");

  const uploadToCloudinary = async (params: { dataUrl?: string; imageUrl?: string }): Promise<string> => {
    setIsUploading(true);
    setUploadProgress("Optimizing image and securing cloud link...");
    try {
      const res = await fetch('/api/upload-cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`Upload server error: ${res.statusText}`);
      const data = await res.json();
      if (data.success) return data.url;
      throw new Error(data.error || "Upload failed");
    } catch (err: any) {
      console.error("Cloudinary upload failed:", err);
      alert("Image upload failed. Please ensure Cloudinary environment variables are configured correctly.");
      return params.imageUrl || params.dataUrl || "";
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  async function loadProject() {
    try {
      const res = await fetch(`/api/projects/${slug}`);
      const data = await res.json();
      if (data.project) {
        setProject(data.project);
      } else {
        const fallback = projects.find(p => p.slug === slug);
        if (fallback) setProject(fallback);
      }
    } catch (err) {
      console.error("Error loading project DB details:", err);
      const fallback = projects.find(p => p.slug === slug);
      if (fallback) setProject(fallback);
    } finally {
      setLoading(false);
    }
  }

  // Fetch project details & Dynamic Events list
  useEffect(() => {
    loadProject();
    loadCentres();
    loadPeople();

    async function loadEvents() {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          setDynamicEvents(data.events);
        }
      } catch (err) {
        console.error("Error listing dynamic events:", err);
      }
    }
    loadEvents();
  }, [slug]);

  const handleCreateAndAddStaff = async () => {
    if (!newPersonFullName.trim()) {
      setCreatePersonError("Full Name is required");
      return;
    }
    if (!newPersonName.trim()) {
      setCreatePersonError("Display/Short Name is required");
      return;
    }
    if (!newPersonRole.trim()) {
      setCreatePersonError("Designation / Role is required");
      return;
    }
    if (!newPersonEmail.trim()) {
      setCreatePersonError("Email Address is required");
      return;
    }

    const generatedSlug = newPersonName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const dataModel = {
      slug: generatedSlug,
      name: newPersonName.trim(),
      fullName: newPersonFullName.trim(),
      role: newPersonRole.trim(),
      email: newPersonEmail.trim().toLowerCase(),
      bio: newPersonBio.trim(),
      image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600",
      boardMemberType: newPersonBoardType,
      bannerImages: [],
      education: [],
      experience: [],
      publications: [],
      socials: {}
    };

    setIsCreatingPerson(true);
    setCreatePersonError("");
    try {
      const response = await fetch('/api/people', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || ""}`
        },
        body: JSON.stringify(dataModel)
      });
      if (response.ok) {
        // Person successfully created in database!
        // Now add the slug to modalProjectStaffs
        if (!modalProjectStaffs.includes(generatedSlug)) {
          setModalProjectStaffs([...modalProjectStaffs, generatedSlug]);
        }
        
        // Reset form
        setNewPersonName("");
        setNewPersonFullName("");
        setNewPersonRole("");
        setNewPersonEmail("");
        setNewPersonBio("");
        setNewPersonBoardType("staff");
        setCreatePersonError("");

        // Trigger loading updated people list so they appear correctly
        await loadPeople();
        window.dispatchEvent(new Event("people_data_updated"));
      } else {
        const err = await response.json();
        setCreatePersonError(err.error || "Failed to create person.");
      }
    } catch (e: any) {
      console.error(e);
      setCreatePersonError(e.message || "Network error. Failed to create person.");
    } finally {
      setIsCreatingPerson(false);
    }
  };

  const handleSaveProject = async (updatedProj: any) => {
    if (!user?.token) return;
    try {
      const res = await fetch(`/api/projects/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(updatedProj)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          setProject(data.project);
        }
      } else {
        console.error("Failed to save project server-side:", res.statusText);
      }
    } catch (err) {
      console.error("Error saving updated project:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <BrutalistLoader />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <h1 className="text-4xl font-serif font-black mb-4">Project Not Found</h1>
          <Link to="/" className="text-brand-blue font-mono font-bold uppercase tracking-widest hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const Icon = getIcon(project.slug) || Zap;

  // Get associated events dynamically
  const associatedEvents = dynamicEvents.filter(e => e.associatedProjects?.includes(project.slug) && !e.deleted && e.status !== 'Trash');

  // Compile tabs list dynamically following CDI specifications and custom requirements
  const tabsList = [
    {
      slug: 'overview',
      title: 'Strategic Overview',
      icon: 'Info',
      type: 'custom'
    },
    {
      slug: 'methodology',
      title: 'Methodology',
      icon: 'BookOpen',
      type: 'custom'
    },
    {
      slug: 'aims',
      title: 'Project Aims',
      icon: 'Zap',
      type: 'custom'
    },
    {
      slug: 'staff',
      title: 'Project Staffs & Roles',
      icon: 'Users',
      type: 'custom'
    },
    {
      slug: 'events',
      title: 'Related Events', // Renamed from Related Sprints
      icon: 'Calendar',
      type: 'events'
    },
    ...(project.subPages || []).map((sb: any) => ({
      ...sb,
      title: sb.title || 'Subpage',
      slug: sb.slug || 'subpage',
      type: sb.type || 'markdown'
    }))
  ];

  const activeTab = tabsList.find(t => t.slug === activeTabSlug) || tabsList[0];

  const openEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.fullName || !applyForm.email) {
      setApplySuccessMessage("Please complete all required fields (Name & Email)");
      return;
    }
    
    setIsApplying(true);
    setApplySuccessMessage("");
    try {
      const response = await fetch('/api/job-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectSlug: slug,
          projectTitle: project.title,
          jobTitle: applyingPosition?.title || "Staff Scholar",
          ...applyForm
        })
      });
      if (response.ok) {
        setApplySuccessMessage("Application submitted successfully through CoDIN Secure Portal. The research directors have been notified!");
        setApplyForm({
          fullName: '',
          email: '',
          phone: '',
          statement: '',
          experience: '',
          resumeUrl: ''
        });
        setTimeout(() => {
          setIsApplyModalOpen(false);
          setApplySuccessMessage("");
        }, 3000);
      } else {
        const err = await response.text();
        setApplySuccessMessage(`Failed to submit: ${err || 'Server side error'}`);
      }
    } catch (err: any) {
      console.error(err);
      setApplySuccessMessage(`Network error during submit: ${err.message || err}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Subpages manager helpers inside Edit Form
  const addSubPage = () => {
    const newTab = {
      title: 'New Tab',
      slug: `new-tab-${Date.now()}`,
      type: 'markdown',
      content: { teaser: '', markdown: '' }
    };
    setModalSubPages([...modalSubPages, newTab]);
  };

  const removeSubPage = (index: number) => {
    setModalSubPages(modalSubPages.filter((_, i) => i !== index));
  };

  const handleMoveSubPage = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= modalSubPages.length) return;
    const copy = [...modalSubPages];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setModalSubPages(copy);
  };

  const updateSubPageCore = (index: number, key: string, value: string) => {
    const copy = [...modalSubPages];
    copy[index] = { ...copy[index], [key]: value };
    setModalSubPages(copy);
  };

  const updateSubPageMarkdownContent = (index: number, key: string, value: string) => {
    const copy = [...modalSubPages];
    const prevContent = copy[index].content || {};
    copy[index] = {
      ...copy[index],
      content: { ...prevContent, [key]: value }
    };
    setModalSubPages(copy);
  };

  const addSubPageListItem = (tabIdx: number) => {
    const copy = [...modalSubPages];
    const currentList = Array.isArray(copy[tabIdx].content) ? copy[tabIdx].content : [];
    copy[tabIdx] = {
      ...copy[tabIdx],
      content: [...currentList, { name: '', affiliation: '', role: '', url: '', photoUrl: '' }]
    };
    setModalSubPages(copy);
  };

  const updateSubPageListItem = (tabIdx: number, rowIdx: number, key: string, val: string) => {
    const copy = [...modalSubPages];
    const currentList = Array.isArray(copy[tabIdx].content) ? [...copy[tabIdx].content] : [];
    currentList[rowIdx] = { ...currentList[rowIdx], [key]: val };
    copy[tabIdx] = { ...copy[tabIdx], content: currentList };
    setModalSubPages(copy);
  };

  const removeSubPageListItem = (tabIdx: number, rowIdx: number) => {
    const copy = [...modalSubPages];
    const currentList = Array.isArray(copy[tabIdx].content) ? copy[tabIdx].content : [];
    copy[tabIdx] = {
      ...copy[tabIdx],
      content: currentList.filter((_, r) => r !== rowIdx)
    };
    setModalSubPages(copy);
  };

  return (
    <div className="min-h-screen bg-paper pt-32 pb-24 px-6 lg:px-12 grid-structure">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Back Link & Admin Settings Bar */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-12 border-b border-ink/15 pb-6">
          <Link to="/" className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.3em] hover:text-brand-blue transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Research Index
          </Link>
          {isAdmin && (
            <button
              onClick={openEditModal}
              className="px-5 py-2.5 bg-brand-acid text-ink border border-ink font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-white hover:translate-y-[-2px] transition-all shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center gap-2 cursor-pointer font-black"
            >
              <Pencil className="w-3.5 h-3.5" />
              CMS // Edit Project Details
            </button>
          )}
        </div>

        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-24 items-end mb-20 animate-fade-in animate-duration-500">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="font-mono text-[10px] font-bold border border-ink px-3 py-1 bg-white select-none">
                {project.id}
              </div>
              <div className={`px-4 py-1 text-[10px] font-mono font-black uppercase tracking-widest ${project.color || 'bg-brand-acid'} text-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] select-none`}>
                {project.tag}
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-black leading-tight italic mb-8">
              {project.title}
            </h1>

            <p className="font-serif text-2xl font-light italic leading-relaxed text-ink/80 max-w-xl">
              {project.description}
            </p>

            {project.outputUrl && (
              <div className="mt-8 flex">
                <a
                  href={project.outputUrl.trim().startsWith('http') ? project.outputUrl.trim() : `https://${project.outputUrl.trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-brand-blue text-white border border-ink font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-brand-orange hover:translate-y-[-2px] transition-all shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none flex items-center gap-2 cursor-pointer font-black select-none text-white no-underline hover:text-white"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  {project.outputLabel && project.outputLabel.trim() ? project.outputLabel.trim() : 'Project Output Page / Repository'}
                </a>
              </div>
            )}
          </div>
          
          <div className="relative aspect-[4/3] lg:aspect-square border border-ink shadow-[20px_20px_0px_rgba(59,81,238,1)] overflow-hidden">
            <img 
              src={project.image || "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=1200"} 
              alt={project.title} 
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
              referrerPolicy="no-referrer"
            />
            {isAdmin && (
              <label className="absolute bottom-4 left-4 bg-ink hover:bg-brand-blue text-white hover:text-white px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] cursor-pointer z-30 transition-all flex items-center gap-1.5 uppercase select-none">
                <Upload className="w-3.5 h-3.5 animate-pulse" />
                {isUploading ? "Uploading..." : "Replace Cover Photo 📷"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      const dataUrl = reader.result as string;
                      const cloudUrl = await uploadToCloudinary({ dataUrl });
                      if (cloudUrl) {
                        const updated = { ...project, image: cloudUrl };
                        setProject(updated);
                        await handleSaveProject(updated);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            )}
            <div className="absolute top-4 right-4 bg-paper p-6 border border-ink shadow-[8px_8px_0px_rgba(0,0,0,1)] select-none">
               <Icon className="w-12 h-12 text-ink opacity-20" />
            </div>
          </div>
        </div>

        {/* Dynamic Dossier Tabs Grid */}
        <div className="border-t border-ink pt-16">
          <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-8 flex items-center gap-2 select-none">
            <span className="w-12 h-[1px] bg-ink/20" />
            Project Dossier Workspace
          </div>

          <div className="grid lg:grid-cols-12 gap-16 items-start">
            {/* Tab Controls Sidebar (lg:col-span-3) */}
            <div className="lg:col-span-3 min-w-0 lg:sticky lg:top-24 space-y-6">
              <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 scrollbar-none">
                {tabsList.map((tab) => {
                  const TabIcon = getIcon(tab.icon || "Info");
                  const isActive = activeTab.slug === tab.slug;
                  return (
                    <button
                      key={tab.slug}
                      onClick={() => setActiveTabSlug(tab.slug)}
                      className={cn(
                        "flex items-center gap-3.5 px-5 py-4 border text-left font-mono text-[10px] uppercase tracking-wider font-black transition-all shrink-0 lg:shrink select-none cursor-pointer",
                        isActive 
                          ? "bg-ink text-paper border-ink shadow-[4px_4px_0px_var(--color-brand-acid)]"
                          : "bg-white hover:bg-brand-acid/15 border-ink/40 text-ink shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:border-ink hover:translate-x-0.5"
                      )}
                    >
                      <TabIcon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tab.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Status Indicator Sidebar Box */}
              <div className="p-6 bg-brand-orange text-paper border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] select-none">
                <div className="font-mono text-[9px] font-black uppercase tracking-widest text-paper/70 mb-1">
                  Project Phase Status
                </div>
                <div className="font-serif font-black text-2xl italic">
                  {project.status || "Active Research"}
                </div>
                {project.year && (
                  <div className="mt-3 border-t border-paper/10 pt-3">
                    <div className="font-mono text-[9px] font-black uppercase tracking-widest text-paper/70 mb-1">
                      Project Year / Timeline
                    </div>
                    <div className="font-mono text-[10px] font-bold">
                      {project.year}
                    </div>
                  </div>
                )}
                {project.id && (
                  <div className="mt-2 border-t border-paper/10 pt-2 font-mono text-[9px] font-bold text-paper/80">
                    CODE: {project.id}
                  </div>
                )}
              </div>

              {/* Funding Agencies Card */}
              {((project.fundingAgencies && project.fundingAgencies.length > 0) || project.fundingAgency) && (
                <div className="space-y-3 select-none">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-3.5 h-3.5 text-brand-orange" />
                    <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-brand-orange font-bold">
                      Funding Agencies
                    </span>
                  </div>
                  <div className="grid gap-3 animate-fade-in">
                    {project.fundingAgencies && project.fundingAgencies.length > 0 ? (
                      project.fundingAgencies.map((agency: any, idx: number) => {
                        const CardComp = agency.website ? "a" : "div";
                        return (
                          <CardComp
                            key={idx}
                            {...(agency.website ? { href: agency.website, target: "_blank", rel: "noopener noreferrer" } : {})}
                            className={`w-full max-w-full min-w-0 overflow-hidden p-3.5 border border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all flex gap-3 items-center group text-ink ${
                              agency.website ? "hover:bg-brand-acid hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:no-underline" : ""
                            }`}
                          >
                            {agency.logo ? (
                              <img
                                src={agency.logo}
                                alt={agency.name}
                                className="w-11 h-11 object-contain border border-ink p-1 bg-white shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-11 h-11 flex items-center justify-center border border-ink bg-zinc-100 font-mono text-xs text-ink/40 font-bold shrink-0">
                                FA
                              </div>
                            )}
                            <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                              <h4 
                                className="font-serif text-sm font-black leading-snug break-words [overflow-wrap:anywhere] text-ink"
                                title={agency.name}
                              >
                                {agency.name}
                              </h4>
                              <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/50 leading-tight truncate">
                                {agency.role || "Funding Agency"}
                              </p>
                              {agency.website && (
                                <p className="font-mono text-[8.5px] text-brand-blue font-bold group-hover:underline flex items-center gap-1 mt-0.5 truncate">
                                  Visit Website <ArrowUpRight className="w-3 h-3 shrink-0" />
                                </p>
                              )}
                            </div>
                          </CardComp>
                        );
                      })
                    ) : (
                      <div className="w-full max-w-full min-w-0 overflow-hidden p-3.5 border border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] flex gap-3 items-center">
                        <div className="w-11 h-11 flex items-center justify-center border border-ink bg-zinc-100 font-mono text-xs text-ink/40 font-bold shrink-0">
                          FA
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                          <h4 
                            className="font-serif text-sm font-black leading-snug break-words [overflow-wrap:anywhere] text-ink"
                            title={project.fundingAgency}
                          >
                            {project.fundingAgency}
                          </h4>
                          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/50 leading-tight truncate">Primary Funding Agency</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Supporting Agencies Card */}
              {((project.supportingAgencies && project.supportingAgencies.length > 0) || (!project.fundingAgencies?.length && project.collaboratingAgency && !project.collaborators?.length)) && (
                <div className="space-y-3 select-none">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-3.5 h-3.5 text-brand-blue" />
                    <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-brand-blue font-bold">
                      Supporting Agencies
                    </span>
                  </div>
                  <div className="grid gap-3 animate-fade-in">
                    {project.supportingAgencies && project.supportingAgencies.length > 0 ? (
                      project.supportingAgencies.map((agency: any, idx: number) => {
                        const CardComp = agency.website ? "a" : "div";
                        return (
                          <CardComp
                            key={idx}
                            {...(agency.website ? { href: agency.website, target: "_blank", rel: "noopener noreferrer" } : {})}
                            className={`w-full max-w-full min-w-0 overflow-hidden p-3.5 border border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all flex gap-3 items-center group text-ink ${
                              agency.website ? "hover:bg-brand-acid hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:no-underline" : ""
                            }`}
                          >
                            {agency.logo ? (
                              <img
                                src={agency.logo}
                                alt={agency.name}
                                className="w-11 h-11 object-contain border border-ink p-1 bg-white shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-11 h-11 flex items-center justify-center border border-ink bg-zinc-100 font-mono text-xs text-ink/40 font-bold shrink-0">
                                SA
                              </div>
                            )}
                            <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                              <h4 
                                className="font-serif text-sm font-black leading-snug break-words [overflow-wrap:anywhere] text-ink"
                                title={agency.name}
                              >
                                {agency.name}
                              </h4>
                              <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/50 leading-tight truncate">
                                {agency.role || "Supporting Agency"}
                              </p>
                              {agency.website && (
                                <p className="font-mono text-[8.5px] text-brand-blue font-bold group-hover:underline flex items-center gap-1 mt-0.5 truncate">
                                  Visit Website <ArrowUpRight className="w-3 h-3 shrink-0" />
                                </p>
                              )}
                            </div>
                          </CardComp>
                        );
                      })
                    ) : (
                      <div className="w-full max-w-full min-w-0 overflow-hidden p-3.5 border border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] flex gap-3 items-center">
                        <div className="w-11 h-11 flex items-center justify-center border border-ink bg-zinc-100 font-mono text-xs text-ink/40 font-bold shrink-0">
                          SA
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                          <h4 
                            className="font-serif text-sm font-black leading-snug break-words [overflow-wrap:anywhere] text-ink"
                            title={project.collaboratingAgency}
                          >
                            {project.collaboratingAgency}
                          </h4>
                          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/50 leading-tight truncate">Supporting Agency</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Collaborators Card under Funding Agencies */}
              {((project.collaborators && project.collaborators.length > 0) || (project.collaboratingAgency && !project.supportingAgencies?.length)) && (
                <div className="space-y-3 select-none">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-ink" />
                    <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-ink font-bold">
                      Collaborating Partners
                    </span>
                  </div>
                  <div className="grid gap-3 animate-fade-in">
                    {project.collaborators && project.collaborators.length > 0 ? (
                      project.collaborators.map((collab: any, idx: number) => {
                        const CardComp = collab.website ? "a" : "div";
                        return (
                          <CardComp
                            key={idx}
                            {...(collab.website ? { href: collab.website, target: "_blank", rel: "noopener noreferrer" } : {})}
                            className={`w-full max-w-full min-w-0 overflow-hidden p-3.5 border border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all flex gap-3 items-center group text-ink ${
                              collab.website ? "hover:bg-brand-acid hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:no-underline" : ""
                            }`}
                          >
                            {collab.logo ? (
                              <img
                                src={collab.logo}
                                alt={collab.name}
                                className="w-11 h-11 object-cover border border-ink p-1 bg-white shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-11 h-11 flex items-center justify-center border border-ink bg-zinc-100 font-mono text-xs text-ink/40 font-bold shrink-0">
                                CO
                              </div>
                            )}
                            <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                              <h4 
                                className="font-serif text-sm font-black leading-snug break-words [overflow-wrap:anywhere] text-ink"
                                title={collab.name}
                              >
                                {collab.name}
                              </h4>
                              <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/50 leading-tight truncate">
                                {collab.role || "Collaborating Partner"}
                              </p>
                              {collab.website && (
                                <p className="font-mono text-[8.5px] text-brand-blue font-bold group-hover:underline flex items-center gap-1 mt-0.5 truncate">
                                  Visit Website <ArrowUpRight className="w-3 h-3 shrink-0" />
                                </p>
                              )}
                            </div>
                          </CardComp>
                        );
                      })
                    ) : project.collaboratingAgency ? (
                      <div className="w-full max-w-full min-w-0 overflow-hidden p-3.5 border border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] flex gap-3 items-center">
                        <div className="w-11 h-11 flex items-center justify-center border border-ink bg-zinc-100 font-mono text-xs text-ink/40 font-bold shrink-0">
                          CO
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                          <h4 
                            className="font-serif text-sm font-black leading-snug break-words [overflow-wrap:anywhere] text-ink"
                            title={project.collaboratingAgency}
                          >
                            {project.collaboratingAgency}
                          </h4>
                          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/50 leading-tight truncate">Collaborating Agency</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Implementing Centres */}
              {project.associatedCentres && project.associatedCentres.length > 0 && (
                <div className="p-6 bg-white border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4 select-none">
                  <div className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/40">
                    Implementing Centres
                  </div>
                  <div className="grid gap-3">
                    {project.associatedCentres.map((centreSlug: string) => {
                      const c = dynamicCentres.find(item => item.slug === centreSlug);
                      return (
                        <Link
                          key={centreSlug}
                          to={`/centres/${centreSlug}`}
                          className="p-3 border border-ink bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-brand-acid text-ink hover:-translate-y-0.5 transition-all text-xs font-serif font-bold italic block text-left"
                        >
                          {c ? c.name : centreSlug} &rarr;
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Project Directors */}
              {project.projectDirectors && project.projectDirectors.length > 0 && (
                <div className="p-6 bg-white border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4 select-none">
                  <div className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/40">
                    Project Directors
                  </div>
                  <div className="grid gap-3">
                    {project.projectDirectors.map((directorSlug: string) => {
                      const dir = dynamicPeople.find(member => member.slug === directorSlug);
                      return (
                        <Link
                          key={directorSlug}
                          to={`/people/${directorSlug}`}
                          className="p-3 border border-ink bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-brand-acid text-ink hover:-translate-y-0.5 transition-all block text-left"
                        >
                          <div className="font-serif text-sm font-black mb-1">
                            {dir ? dir.fullName || dir.name : directorSlug}
                          </div>
                          <div className="font-mono text-[8px] uppercase tracking-wide text-ink/50 font-bold">
                            View Profile &rarr;
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Related/Additional Links */}
              {project.relatedLinks && project.relatedLinks.length > 0 && (
                <div className="p-6 bg-white border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4 select-none">
                  <div className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/40">
                    Related Links
                  </div>
                  <div className="grid gap-2">
                    {project.relatedLinks.map((link: any, idx: number) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 border border-ink bg-white text-ink font-mono text-[9px] font-black uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-brand-blue hover:text-white hover:translate-y-[-1px] transition-all flex items-center justify-between"
                      >
                        <span className="truncate">{link.name}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tab Display Panel (lg:col-span-9) */}
            <div className="lg:col-span-9 min-w-0 p-8 md:p-12 border-2 border-ink bg-white shadow-[12px_12px_0px_rgba(0,0,0,1)] min-h-[480px]">
              {/* Tab Header block */}
              <div className="flex items-center gap-3.5 mb-10 pb-6 border-b border-ink/10 select-none">
                <div className="p-3 bg-brand-acid text-ink border border-ink shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                  {(() => {
                    const ActiveIcon = getIcon(activeTab.icon || 'Info');
                    return <ActiveIcon className="w-5 h-5 text-ink" />;
                  })()}
                </div>
                <div>
                  <h2 className="font-serif text-3xl font-black text-ink uppercase leading-none">
                    {activeTab.title}
                  </h2>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 font-bold mt-1">
                    PROJECT DATA MODULE // SECTION {activeTab.slug.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Tab content renderer following CDI specification layouts */}
              <div className="animate-fade-in animate-duration-200">
                
                {/* Specific Tab OVERVIEW */}
                {activeTab.slug === 'overview' && (
                  <div className="space-y-12">
                    <div>
                    {/*
                      // <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-6 flex items-center gap-2 select-none">
                      //   <span className="w-12 h-[1px] bg-ink/20" />
                      //   Executive Mission Summary
                      // </div>
                      */}
                      <div 
                        className="text-xl md:text-2xl font-light leading-relaxed font-serif text-ink/90 whitespace-pre-wrap markdown-content"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(project.longDescription || project.description || '') }}
                      />
                    </div>

                    {/* Dynamic Multimedia contents */}
                    {((project.overviewImages && project.overviewImages.length > 0) || 
                      (project.overviewYoutubeLinks && project.overviewYoutubeLinks.length > 0)) && (
                      <div className="space-y-8 border-t border-ink/10 pt-10">
                      {/*
                        // <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 flex items-center gap-2 select-none">
                        //   <span className="w-12 h-[1px] bg-ink/20" />
                        //   Overview Multimedia Showcase
                        // </div>
                        */}
                        {project.overviewImages && project.overviewImages.length > 0 && (
                          <div className="grid sm:grid-cols-2 gap-6">
                            {project.overviewImages.map((img: string, i: number) => (
                              <div key={i} className="border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-paper overflow-hidden">
                                <img src={img} alt={`Overview content media ${i + 1}`} className="w-full aspect-[16/10] object-cover grayscale hover:grayscale-0 transition-all duration-300" />
                              </div>
                            ))}
                          </div>
                        )}

                        {project.overviewYoutubeLinks && project.overviewYoutubeLinks.length > 0 && (
                          <div className="grid sm:grid-cols-2 gap-6">
                            {project.overviewYoutubeLinks.map((link: string, i: number) => {
                              const embedUrl = getYoutubeEmbedUrl(link);
                              if (!embedUrl) return null;
                              return (
                                <div key={i} className="relative aspect-video border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-black overflow-hidden">
                                  <iframe
                                    src={embedUrl}
                                    title={`Overview Video ${i + 1}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    className="w-full h-full"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {(project.impact || []).length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-6 flex items-center gap-2 select-none">
                          <span className="w-12 h-[1px] bg-ink/20" />
                          Outcome Matrix & Success Goals
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          {project.impact.map((text: string, i: number) => (
                            <div 
                              key={i}
                              className="p-6 border border-ink bg-paper/20 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-brand-acid/10 transition-all flex items-start gap-4"
                            >
                              <CheckCircle2 className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                              <p className="font-mono text-[11px] font-bold uppercase tracking-tight leading-normal text-ink">
                                {text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Specific Tab METHODOLOGY */}
                {activeTab.slug === 'methodology' && (
                  <div className="space-y-12">
                    <div>
                    {/*
                      // <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-4 flex items-center gap-2 select-none">
                      //   <span className="w-12 h-[1px] bg-ink/20" />
                      //   Technological & Field Architecture
                      // </div>
                      */}
                      <div 
                        className="text-xl md:text-2xl font-light leading-relaxed font-serif text-ink/90 whitespace-pre-wrap markdown-content"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(project.methodology || "No methodology parameters configured or updated yet in the database pipe.") }}
                      />
                    </div>

                    {/* Dynamic Methodology Multimedia contents */}
                    {((project.methodologyImages && project.methodologyImages.length > 0) || 
                      (project.methodologyYoutubeLinks && project.methodologyYoutubeLinks.length > 0)) && (
                      <div className="space-y-8 border-t border-ink/10 pt-10">
                        <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 flex items-center gap-2 select-none">
                          <span className="w-12 h-[1px] bg-ink/20" />
                          Methodology Multimedia Showcase
                        </div>
                        
                        {project.methodologyImages && project.methodologyImages.length > 0 && (
                          <div className="grid sm:grid-cols-2 gap-6">
                            {project.methodologyImages.map((img: string, i: number) => (
                              <div key={i} className="border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-paper overflow-hidden">
                                <img src={img} alt={`Methodology content media ${i + 1}`} className="w-full aspect-[16/10] object-cover grayscale hover:grayscale-0 transition-all duration-300" />
                              </div>
                            ))}
                          </div>
                        )}

                        {project.methodologyYoutubeLinks && project.methodologyYoutubeLinks.length > 0 && (
                          <div className="grid sm:grid-cols-2 gap-6">
                            {project.methodologyYoutubeLinks.map((link: string, i: number) => {
                              const embedUrl = getYoutubeEmbedUrl(link);
                              if (!embedUrl) return null;
                              return (
                                <div key={i} className="relative aspect-video border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-black overflow-hidden">
                                  <iframe
                                    src={embedUrl}
                                    title={`Methodology Video ${i + 1}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    className="w-full h-full"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Specific Tab PROJECT AIMS */}
                {activeTab.slug === 'aims' && (
                  <div className="space-y-6">
                  {/*
                    // <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-4 flex items-center gap-2 select-none">
                    //   <span className="w-12 h-[1px] bg-ink/20" />
                    //   Sovereignty Milestones & Strategic Targets
                    // </div>
                    */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {(project.aims || []).length > 0 ? (
                        project.aims.map((aim: string, idx: number) => (
                          <div 
                            key={idx}
                            className="p-5 border border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-brand-acid transition-all flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-widest"
                          >
                            <ArrowUpRight className="w-4 h-4 text-brand-orange shrink-0" />
                            {aim}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs font-mono text-ink/40 uppercase">No strategic aims specified.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Specific Tab STAFFS & CAREERS */}
                {activeTab.slug === 'staff' && (
                  <div className="space-y-16">
                    
                    {/* Project Directors / Leadership */}
                    <div>
                      <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-8 flex items-center gap-2 select-none">
                        <span className="w-12 h-[1px] bg-ink/20" />
                        Project Leadership &amp; Directors
                      </div>
                      
                      {dynamicPeople.filter(m => (project.projectDirectors || []).includes(m.slug)).length > 0 ? (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                          {dynamicPeople.filter(m => (project.projectDirectors || []).includes(m.slug)).map((person) => (
                            <Link 
                              key={person.slug}
                              to={`/people/${person.slug}`}
                              className="border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex flex-col group h-full justify-between"
                            >
                              {/* Header photograph area */}
                              <div className="relative h-64 bg-ink/5 border-b border-ink overflow-hidden shrink-0">
                                <img
                                  src={person.image || "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600"}
                                  alt={person.fullName}
                                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 object-top"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute top-4 right-4 bg-brand-acid text-ink border border-ink font-mono text-[8px] font-black tracking-widest uppercase px-2 py-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] select-none">
                                  COUNCIL LEADERSHIP
                                </div>
                              </div>

                              {/* Meta info area */}
                              <div className="p-6 flex-grow flex flex-col justify-between text-left">
                                <div className="space-y-4">
                                  {/* Designation */}
                                  <div className="font-mono text-[9px] font-bold text-brand-orange uppercase tracking-wider leading-none">
                                    {person.role || "Project Director"}
                                  </div>
                                  {/* Name */}
                                  <h3 className="serif font-black text-2xl group-hover:text-brand-blue tracking-tight transition-colors">
                                    {person.fullName || person.name}
                                  </h3>
                                  {/* Brief Snippet from bio */}
                                  {person.bio && (
                                    <p className="font-serif text-sm italic text-ink/70 leading-relaxed line-clamp-3">
                                      {person.bio}
                                    </p>
                                  )}
                                </div>
                                <div className="font-mono text-[10px] font-black uppercase text-brand-blue hover:text-brand-orange tracking-widest mt-6 border-t border-ink/10 pt-4 flex items-center justify-between">
                                  <span>Review Dossier &rarr;</span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center border border-dashed border-ink/30 font-mono text-[10px] text-ink/40 uppercase bg-paper/20 select-none">
                          No Directors assigned to this research node.
                        </div>
                      )}
                    </div>

                    {/* Project Staff & Computational Specialists */}
                    <div>
                      <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-8 flex items-center gap-2 select-none">
                        <span className="w-12 h-[1px] bg-ink/20" />
                        Computational Researchers &amp; Field Staff
                      </div>

                      {(project.projectStaffs || []).length > 0 ? (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                          {(project.projectStaffs || []).map((staffSlug: string) => {
                            const matched = dynamicPeople.find(m => m.slug === staffSlug);
                            const person = matched || (staffSlug.includes('(') ? {
                              slug: staffSlug,
                              name: staffSlug.split('(')[0].trim(),
                              fullName: staffSlug.split('(')[0].trim(),
                              role: staffSlug.split('(')[1].replace(')', '').trim(),
                              image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400",
                              bio: "External Fieldwork Contributor specialized in tribal documentation workflows.",
                              isExternal: true
                            } : {
                              slug: staffSlug,
                              name: staffSlug,
                              fullName: staffSlug,
                              role: "Project Researcher",
                              image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400",
                              bio: "Research Affiliate associated with direct fieldwork streams.",
                              isExternal: true
                            });

                            return (
                              <div 
                                key={person.slug}
                                className="border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex flex-col group h-full justify-between"
                              >
                                {/* Header photograph area */}
                                <div className="relative h-64 bg-ink/5 border-b border-ink overflow-hidden shrink-0">
                                  <img
                                    src={person.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400"}
                                    alt={person.fullName}
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 object-top"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute top-4 right-4 bg-brand-acid text-ink border border-ink font-mono text-[8px] font-black tracking-widest uppercase px-2 py-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] select-none">
                                    {(person as any).isExternal ? "EXTERNAL ASSOCIATE" : "COORDINATOR STAFF"}
                                  </div>
                                </div>

                                {/* Meta info area */}
                                <div className="p-6 flex-grow flex flex-col justify-between text-left">
                                  <div className="space-y-4">
                                    {/* Designation */}
                                    <div className="font-mono text-[9px] font-bold text-brand-orange uppercase tracking-wider leading-none">
                                      {person.role}
                                    </div>
                                    {/* Name */}
                                    <h3 className="serif font-black text-2xl group-hover:text-brand-blue tracking-tight transition-colors">
                                      {person.fullName || person.name}
                                    </h3>
                                    {/* Brief Snippet from bio */}
                                    {person.bio && (
                                      <p className="font-serif text-sm italic text-ink/70 leading-relaxed line-clamp-3">
                                        {person.bio}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {!(person as any).isExternal && (
                                    <Link 
                                      to={`/people/${person.slug}`}
                                      className="font-mono text-[10px] font-black uppercase text-brand-blue hover:text-brand-orange tracking-widest mt-6 border-t border-ink/10 pt-4 flex items-center justify-between"
                                    >
                                      <span>Review Dossier &rarr;</span>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 text-center border border-dashed border-ink/30 font-mono text-[10px] text-ink/40 uppercase bg-paper/20 select-none">
                          No personnel assigned to this computational block.
                        </div>
                      )}
                    </div>

                    {/* Careers and Recruitment Advertising */}
                    <div>
                      <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-6 flex items-center gap-2 select-none">
                        <span className="w-12 h-[1px] bg-ink/20" />
                        ADVERTISED ROLES // CAREER CHANNELS
                      </div>
                      
                      <div className="grid gap-6">
                        {(project.openPositions || []).length > 0 ? (
                          project.openPositions.map((opp: any, idx: number) => (
                            <div 
                              key={idx}
                              className="p-6 border-2 border-brand-orange bg-brand-acid/10 shadow-[6px_6px_0px_rgba(0,0,0,1)] relative overflow-hidden"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                                <h4 className="font-serif text-xl font-black">{opp.title}</h4>
                                <span className="font-mono text-[9px] font-black uppercase tracking-widest text-brand-orange border border-brand-orange/40 px-2.5 py-0.5 bg-white shrink-0 self-start sm:self-center">
                                  Submit by: {opp.deadline || 'Closed'}
                                </span>
                              </div>
                              <p className="font-mono text-[11px] text-ink/70 leading-relaxed mb-6 uppercase tracking-tighter">
                                {opp.description}
                              </p>
                              <div className="flex justify-end gap-3 flex-wrap">
                                {opp.applyLink && (
                                  <a 
                                    href={opp.applyLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 border border-ink bg-white text-ink font-mono text-[9px] font-black uppercase tracking-widest hover:bg-brand-acid transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] select-none cursor-pointer"
                                  >
                                    View Job Specification Decal ↗
                                  </a>
                                )}
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setApplyingPosition(opp);
                                    setIsApplyModalOpen(true);
                                  }}
                                  className="px-4 py-2 bg-ink text-paper font-mono text-[9px] font-black uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] select-none cursor-pointer"
                                >
                                  Apply Internally via CoDIN &rarr;
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 border border-dashed border-ink/40 text-center bg-paper/20 select-none">
                            <p className="font-mono text-xs text-ink/40 uppercase tracking-widest">
                              No career vacancies are currently advertised within this project stream.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* Specific Tab RELATED EVENTS */}
                {(activeTab.slug === 'events' || activeTab.type === 'events') && (
                  <div className="space-y-6">
                  {/*
                    // <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-4 flex items-center gap-2 select-none">
                    //   <span className="w-12 h-[1px] bg-ink/20" />
                    //   Academic Summits & Local Archiving Pipelines
                    // </div>
                    */}
                    {associatedEvents.length > 0 ? (
                      <div className="grid gap-6">
                        {associatedEvents.map((e) => (
                          <Link
                            key={e.slug}
                            to={`/events/${e.slug}`}
                            className="p-6 border border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-brand-blue hover:text-white hover:-translate-y-1 transition-all text-ink flex flex-col md:flex-row md:items-center justify-between"
                          >
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono font-bold uppercase tracking-wider text-ink/50 leading-none">
                                <span className="border border-current px-1.5 py-0.5 bg-paper text-ink leading-none">
                                  {e.type}
                                </span>
                                <span>{e.dates}</span>
                              </div>
                              <h4 className="font-serif text-xl font-black">{e.title}</h4>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-brand-blue shrink-0 mt-3 md:mt-0" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center border border-dashed border-ink/40 bg-paper/30 font-mono text-xs text-ink/50 uppercase select-none">
                        Events Coming Soon
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-Pages Renderer (Types Markdown and List) */}
                {activeTab.type === 'markdown' && activeTab.slug !== 'events' && (
                  <div className="space-y-6">
                    {(activeTab as any).content?.teaser && (
                      <p className="font-serif text-2xl italic leading-relaxed text-ink/80 border-l-4 border-brand-orange pl-6 mb-8 uppercase tracking-tight">
                        {(activeTab as any).content.teaser}
                      </p>
                    )}
                    <div 
                      className="prose max-w-none text-ink text-sm leading-relaxed whitespace-pre-wrap font-sans tracking-tight bg-paper/50 p-6 border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] markdown-content text-left"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown((activeTab as any).content?.markdown || '') }}
                    />
                  </div>
                )}

                {activeTab.type === 'list' && activeTab.slug !== 'events' && (
                  <div className="border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] divide-y divide-ink">
                    {(activeTab as any).content?.map((pt: any, idx: number) => (
                      <div key={idx} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-paper">
                        <div className="flex items-center gap-4">
                          {pt.photoUrl && (
                            <img 
                              src={pt.photoUrl} 
                              alt={pt.name} 
                              className="w-12 h-12 object-cover border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-paper shrink-0" 
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="space-y-1">
                            {pt.url ? (
                              <a 
                                href={pt.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="font-serif text-xl font-black text-brand-blue uppercase hover:text-brand-orange hover:underline inline-flex items-center gap-1"
                              >
                                {pt.name} <span className="text-xs">🔗</span>
                              </a>
                            ) : (
                              <h4 className="font-serif text-xl font-black text-ink">{pt.name}</h4>
                            )}
                            {pt.affiliation && (
                              <p className="font-mono text-[9px] text-ink/50 uppercase font-black tracking-widest">
                                {pt.affiliation}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-brand-orange text-white font-mono text-[9px] font-black uppercase tracking-widest border border-ink font-bold shrink-0">
                          {pt.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}


              </div>
            </div>
          </div>
        </div>

        {/* CTA section */}
        <div className="mt-32 pt-24 border-t border-ink flex flex-col items-center text-center select-none">
            <h2 className="text-4xl md:text-5xl font-serif font-black italic mb-8">Collaborate with CoDIN on {project.title}</h2>
            <a 
               href="mailto:contact@diversity.org.in" 
               className="h-16 px-10 bg-brand-blue text-paper flex items-center gap-4 font-mono font-black uppercase tracking-[0.2em] hover:bg-brand-orange hover:translate-y-[-4px] transition-all shadow-[10px_10px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0 text-white"
            >
              Contact Us &rarr;
            </a>
        </div>
      </div>

      {/* Unified Project CMS Modal */}
      <ProjectFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        projectToEdit={project}
        token={user?.token}
        onSuccess={(updatedProject) => {
          setProject(updatedProject);
          setIsEditModalOpen(false);
          loadProject();
        }}
      />

      {/* Integrated job application modal portal */}
      <AnimatePresence>
        {isApplyModalOpen && (
          <div className="fixed inset-0 bg-ink/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-paper border-2 border-ink shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-xl flex flex-col max-h-[90vh]"
            >
              <div className="bg-brand-orange border-b-2 border-ink p-4 flex justify-between items-center select-none shrink-0">
                <span className="font-mono text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  CoDIN SECURE PORTAL // RECRUITMENT PIPELINE
                </span>
                <button 
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="font-mono text-xl font-bold hover:text-white cursor-pointer px-2 text-white"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleApplySubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-left">
                <div>
                  <span className="text-[10px] font-mono font-black uppercase text-brand-blue tracking-widest select-none">ACTIVELY APPLYING FOR ROLE:</span>
                  <h3 className="font-serif text-2xl font-black text-ink">{applyingPosition?.title || "Indigenous Research Associate"}</h3>
                  <p className="text-[9px] font-mono uppercase text-ink/50 mt-1 select-none">Project: "{project.title}"</p>
                </div>

                {applySuccessMessage && (
                  <div className="p-4 border-2 border-ink bg-brand-acid text-ink font-mono text-xs font-black leading-relaxed flex flex-col gap-1.5 animate-fade-in shadow-[2px_2px_0px_rgba(0,0,0,1)] select-none">
                    <span>⚡ CODIN SYSTEM MESSAGE</span>
                    <p className="font-semibold normal-case font-sans">{applySuccessMessage}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8.5px] font-mono font-bold uppercase text-ink/70 mb-1">Full Applicant Name *</label>
                      <input 
                        type="text"
                        value={applyForm.fullName}
                        onChange={(e) => setApplyForm({ ...applyForm, fullName: e.target.value })}
                        required
                        placeholder="e.g. Dr. Ramesh Kumar"
                        className="w-full h-10 px-3 border border-ink font-mono text-xs focus:outline-none bg-white text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-[8.5px] font-mono font-bold uppercase text-ink/70 mb-1">Email Address (Secure updates) *</label>
                      <input 
                        type="email"
                        value={applyForm.email}
                        onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                        required
                        placeholder="e.g. candidate@domain.com"
                        className="w-full h-10 px-3 border border-ink font-mono text-xs focus:outline-none bg-white text-ink"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8.5px] font-mono font-bold uppercase text-ink/70 mb-1">Contact Telephone / WhatsApp</label>
                      <input 
                        type="tel"
                        value={applyForm.phone}
                        onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                        placeholder="e.g. +91 9876543210"
                        className="w-full h-10 px-3 border border-ink font-mono text-xs focus:outline-none bg-white text-ink"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8.5px] font-mono font-bold uppercase text-ink/70 mb-1">CV / Resume &amp; Portfolio PDF Link</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={applyForm.resumeUrl}
                          onChange={(e) => setApplyForm({ ...applyForm, resumeUrl: e.target.value })}
                          placeholder="Link to secure file (Drive or Dropbox)"
                          className="flex-grow h-10 px-3 border border-ink font-mono text-xs focus:outline-none bg-white text-ink"
                        />
                        <label className="h-10 px-3 border border-ink bg-white font-mono text-[9px] font-black uppercase text-center flex items-center justify-center cursor-pointer select-none whitespace-nowrap hover:bg-brand-acid shrink-0 shadow-[1px_1px_0px_rgba(0,0,0,1)] text-ink">
                          <span>Upload PDF 📁</span>
                          <input 
                            type="file" 
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const dataUrl = reader.result as string;
                                const cloudUrl = await uploadToCloudinary({ dataUrl });
                                if (cloudUrl) {
                                  setApplyForm({ ...applyForm, resumeUrl: cloudUrl });
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8.5px] font-mono font-bold uppercase text-ink/70 mb-1">Professional Experience &amp; Affiliations Summary</label>
                    <textarea 
                      value={applyForm.experience || ''}
                      onChange={(e) => setApplyForm({ ...applyForm, experience: e.target.value })}
                      placeholder="Briefly state your academic history, language/technical skills, and previous field studies..."
                      rows={3}
                      className="w-full p-2.5 border border-ink font-mono text-xs focus:outline-none bg-white text-ink"
                    />
                  </div>

                  <div>
                    <label className="block text-[8.5px] font-mono font-bold uppercase text-ink/70 mb-1">Indigenous Sovereignty Statement &amp; Motivation</label>
                    <textarea 
                      value={applyForm.statement}
                      onChange={(e) => setApplyForm({ ...applyForm, statement: e.target.value })}
                      placeholder="How will your scholarship protect and preserve the cultural/linguistic heritage of this tribal stream? State your candidate statement..."
                      rows={4}
                      className="w-full p-2.5 border border-ink font-mono text-xs focus:outline-none bg-white text-ink"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-ink/10 flex justify-end gap-3 sticky bottom-0 bg-paper py-2">
                  <button 
                    type="button"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="h-10 px-4 border border-ink bg-white font-mono text-[10px] font-bold uppercase hover:bg-brand-orange cursor-pointer text-ink"
                  >
                    Close
                  </button>
                  <button 
                    type="submit"
                    disabled={isApplying}
                    className="h-10 px-6 border border-ink bg-ink text-paper font-mono text-[10px] font-black uppercase tracking-widest hover:bg-brand-acid hover:text-ink transition-all shadow-[3px_3px_0px_rgba(0,0,0,1)] disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isApplying ? "Dispatching Dossier..." : "Submit Candidature Application ⚡"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
