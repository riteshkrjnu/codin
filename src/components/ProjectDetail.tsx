import ConnectedWriting from '../features/writing/ConnectedWriting';
import { ProjectChapter } from '../site/layout/DossierContent';
import RecordImage from '../site/layout/RecordImage';
import RecordExperience from '../site/layout/RecordExperience';
import RecordGlance from '../site/layout/RecordGlance';
import { getEffectiveStatus, getProjectStatus } from '../lib/courseStatus';
import { useLifecycleNow } from '../lib/lifecycleClock';
import RecordHeading from '../site/layout/RecordHeading';
import ActivityUpdates from './ActivityUpdates';
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
  const now=useLifecycleNow();
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
  const associatedEvents = dynamicEvents.map(e=>({...e,status:getEffectiveStatus(e,now)})).filter(e => e.associatedProjects?.includes(project.slug) && !e.deleted && e.status !== 'Trash');

  // Compile tabs list dynamically following CDI specifications and custom requirements
  const tabsList = [
    {
      slug: 'overview',
      title: 'Purpose & overview',
      preview: project.description,
      icon: 'Info',
      type: 'custom'
    },
    {
      slug: 'methodology',
      title: 'Methodology',
      preview: project.methodology,
      icon: 'BookOpen',
      type: 'custom'
    },
    {
      slug: 'aims',
      title: 'Project Aims',
      preview: project.aims?.join(' · '),
      icon: 'Zap',
      type: 'custom'
    },
    {
      slug: 'staff',
      title: 'Team & opportunities',
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

  const renderRecordSection = (section: any) => <ProjectChapter section={section} record={project} people={dynamicPeople} events={associatedEvents} onApply={position=>{setApplyingPosition(position);setIsApplyModalOpen(true);}}/>;

return (
    <div className="min-h-screen bg-paper pt-32 pb-24 px-6 lg:px-12 grid-structure record-page">
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
        <div className="record-summary-composition"><div className="record-summary-heading"><RecordHeading record={project} kind="project"/></div><div className="record-cover"><div className="relative aspect-[4/3] lg:aspect-square border border-ink shadow-[20px_20px_0px_rgba(59,81,238,1)] overflow-hidden">
            <RecordImage src={project.image} alt={project.title} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"/>
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
          </div></div><div className="section-actions">{project.outputUrl&&<a className="action" href={project.outputUrl.startsWith("http")?project.outputUrl:`https://${project.outputUrl}`} target="_blank" rel="noreferrer">{project.outputLabel||"Project outputs & repository"} ↗</a>}</div></div>

        {/* Dynamic Dossier Tabs Grid */}
        <div className="border-t border-ink pt-16">
          <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-8 flex items-center gap-2 select-none">
            <span className="w-12 h-[1px] bg-ink/20" />
            Explore this project
          </div>

          <RecordExperience key={project.slug} title={project.title} sections={[...tabsList,{slug:'writing-media',title:'Writing & media',type:'writing'}]} activeSection={activeTabSlug} onActiveSectionChange={setActiveTabSlug} renderSection={section=>section.type==='writing'?<ConnectedWriting type="project" slug={project.slug}/>: renderRecordSection(section)} glance={<RecordGlance record={project} kind="project"/>}/>
        </div>

        <section className="dossier-contact"><div><h2>Work with this project</h2><p>Questions, collaboration or access to project outputs.</p></div><a className="action" href="mailto:contact@diversity.org.in">Contact CoDIN ↗</a></section>

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
      <ActivityUpdates kind="project" slug={project.slug} />
    </div>
  );
}
