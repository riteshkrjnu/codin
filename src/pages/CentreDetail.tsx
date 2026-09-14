/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { centres as staticCentres, projects as staticProjects, team as staticTeam, events as staticEvents, onlineCourses, residentialCourses } from '../data/config';
import { useLatestPeople } from '../lib/peopleOverrides';
import { cn, renderMarkdown } from '../lib/utils';
import { MarkdownMediaHelper } from '../components/MarkdownMediaHelper';
import { 
  ArrowLeft, ArrowUpRight, BookOpen, User, Zap, Star, Calendar, 
  MapPin, Users, Lightbulb, GraduationCap, FileText, Globe, Info,
  Edit3, Trash2, Plus, ArrowUp, ArrowDown, Save, X, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const iconMap: Record<string, any> = {
  aims: Lightbulb,
  people: Users,
  projects: Zap,
  courses: GraduationCap,
  publications: BookOpen,
  Info
};

function getIcon(name: string) {
  return iconMap[name] || Info;
}

export default function CentreDetail() {
  const peopleList = useLatestPeople();
  const { slug } = useParams();
  const { user } = useAuth();
  
  // Dynamic state hooks for dynamic DB data resolution
  const [centre, setCentre] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTabSlug, setActiveTabSlug] = useState<string>('aims');

  // Edit fields state
  const [editName, setEditName] = useState("");
  const [editShortName, setEditShortName] = useState("");
  const [editTagline, setEditTagline] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editAims, setEditAims] = useState<string[]>([]);
  const [editPublications, setEditPublications] = useState<any[]>([]);
  const [editSubPages, setEditSubPages] = useState<any[]>([]);

  // Sub-items adder states
  const [newAimInput, setNewAimInput] = useState("");
  const [aimEditIndex, setAimEditIndex] = useState<number | null>(null);
  const [aimEditText, setAimEditText] = useState("");

  const [newPubTitle, setNewPubTitle] = useState("");
  const [newPubAuthors, setNewPubAuthors] = useState("");
  const [newPubJournal, setNewPubJournal] = useState("");
  const [newPubYear, setNewPubYear] = useState("");
  const [pubEditIndex, setPubEditIndex] = useState<number | null>(null);
  const [pubEditTitle, setPubEditTitle] = useState("");
  const [pubEditAuthors, setPubEditAuthors] = useState("");
  const [pubEditJournal, setPubEditJournal] = useState("");
  const [pubEditYear, setPubEditYear] = useState("");

  const [newTabTitle, setNewTabTitle] = useState("");
  const [newTabTeaser, setNewTabTeaser] = useState("");
  const [newTabMarkdown, setNewTabMarkdown] = useState("");

  const fetchCentre = async () => {
    try {
      const response = await fetch(`/api/centres/${slug}`);
      if (response.ok) {
        const resData = await response.json();
        if (resData.centre) {
          setCentre(resData.centre);
          populateEditFields(resData.centre);
        }
      } else {
        const local = staticCentres.find(c => c.slug === slug);
        if (local) {
          setCentre(local);
          populateEditFields(local);
        }
      }
    } catch (e) {
      console.error("Failed to load centre data, using fallback:", e);
      const local = staticCentres.find(c => c.slug === slug);
      if (local) {
        setCentre(local);
        populateEditFields(local);
      }
    } finally {
      setLoading(false);
    }
  };

  const populateEditFields = (c: any) => {
    setEditName(c.name || "");
    setEditShortName(c.shortName || "");
    setEditTagline(c.tagline || "");
    setEditDescription(c.description || "");
    setEditImage(c.image || "");
    setEditAims(c.aims || []);
    setEditPublications(c.publications || []);
    setEditSubPages(c.subPages || []);
  };

  useEffect(() => {
    fetchCentre();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-brand-orange mx-auto mb-4" />
          <p className="font-mono text-xs uppercase tracking-widest text-ink/60">Fetching Centre Register Dossier...</p>
        </div>
      </div>
    );
  }

  if (!centre) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <h1 className="text-4xl font-serif font-black mb-4">Centre Not Found</h1>
          <Link to="/" className="text-brand-blue font-mono font-bold uppercase tracking-widest hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Get associated entities
  const associatedProjects = staticProjects.filter(p => centre.projects?.includes(p.slug) || p.associatedCentres?.includes(centre.slug));
  const associatedPeople = peopleList.filter(t => centre.people?.includes(t.slug) || t.centres?.includes(centre.slug));
  const associatedEvents = staticEvents.filter(e => e.associatedCentres?.includes(centre.slug));

  // Dynamic editorial controls
  const handleSaveCentre = async () => {
    const updatedCentre = {
      name: editName,
      shortName: editShortName,
      tagline: editTagline,
      description: editDescription,
      image: editImage,
      aims: editAims,
      publications: editPublications,
      subPages: editSubPages,
    };

    try {
      const response = await fetch(`/api/centres/${centre.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || ""}`,
        },
        body: JSON.stringify(updatedCentre),
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.centre) {
          setCentre(resData.centre);
        } else {
          setCentre((prev: any) => ({ ...prev, ...updatedCentre }));
        }
        setIsEditing(false);
        alert("Centre dossier successfully updated!");
      } else {
        const err = await response.json();
        alert(err.error || "Failed to save Centre changes.");
      }
    } catch (e) {
      console.error(e);
      alert("Network or system connection problem while saving.");
    }
  };

  // Reorder custom sub-page tabs
  const handleMoveTab = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editSubPages.length) return;
    const updated = [...editSubPages];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setEditSubPages(updated);
  };

  const handleRemoveTab = (index: number) => {
    setEditSubPages(editSubPages.filter((_, i) => i !== index));
  };

  const handleAddTab = () => {
    if (!newTabTitle.trim()) {
      alert("Custom tab title required.");
      return;
    }
    const tabSlug = newTabTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (editSubPages.some(tab => tab.slug === tabSlug) || ['aims', 'people', 'projects', 'courses', 'publications'].includes(tabSlug)) {
      alert("A tab with this title or custom classification already exists.");
      return;
    }

    const newTab = {
      slug: tabSlug,
      title: newTabTitle.trim(),
      icon: 'Info',
      type: 'markdown',
      content: {
        teaser: newTabTeaser.trim() || undefined,
        markdown: newTabMarkdown.trim() || "Details coming soon..."
      }
    };

    setEditSubPages([...editSubPages, newTab]);
    setNewTabTitle("");
    setNewTabTeaser("");
    setNewTabMarkdown("");
  };

  const handleUpdateTabMarkdown = (index: number, markdown: string) => {
    const updated = [...editSubPages];
    updated[index] = {
      ...updated[index],
      content: {
        ...updated[index].content,
        markdown
      }
    };
    setEditSubPages(updated);
  };

  const handleUpdateTabTeaser = (index: number, teaser: string) => {
    const updated = [...editSubPages];
    updated[index] = {
      ...updated[index],
      content: {
        ...updated[index].content,
        teaser
      }
    };
    setEditSubPages(updated);
  };

  // Aims item editors
  const handleAddAim = () => {
    if (!newAimInput.trim()) return;
    setEditAims([...editAims, newAimInput.trim()]);
    setNewAimInput("");
  };

  const handleStartEditAim = (index: number) => {
    setAimEditIndex(index);
    setAimEditText(editAims[index]);
  };

  const handleSaveAimEdit = (index: number) => {
    if (!aimEditText.trim()) return;
    const updated = [...editAims];
    updated[index] = aimEditText.trim();
    setEditAims(updated);
    setAimEditIndex(null);
  };

  const handleRemoveAim = (index: number) => {
    setEditAims(editAims.filter((_, i) => i !== index));
  };

  const handleMoveAim = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= editAims.length) return;
    const updated = [...editAims];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setEditAims(updated);
  };

  // Publications item editors
  const handleAddPub = () => {
    if (!newPubTitle.trim()) return;
    const newPub = {
      title: newPubTitle.trim(),
      authors: newPubAuthors.trim() || "Council Cohort",
      journal: newPubJournal.trim() || "Linguistic Research Journal",
      year: Number(newPubYear) || new Date().getFullYear()
    };
    setEditPublications([...editPublications, newPub]);
    setNewPubTitle("");
    setNewPubAuthors("");
    setNewPubJournal("");
    setNewPubYear("");
  };

  const handleStartEditPub = (index: number) => {
    const pub = editPublications[index];
    setPubEditIndex(index);
    setPubEditTitle(pub.title);
    setPubEditAuthors(pub.authors);
    setPubEditJournal(pub.journal);
    setPubEditYear(String(pub.year));
  };

  const handleSavePubEdit = (index: number) => {
    if (!pubEditTitle.trim()) return;
    const updated = [...editPublications];
    updated[index] = {
      title: pubEditTitle.trim(),
      authors: pubEditAuthors.trim(),
      journal: pubEditJournal.trim(),
      year: Number(pubEditYear) || new Date().getFullYear()
    };
    setEditPublications(updated);
    setPubEditIndex(null);
  };

  const handleRemovePub = (index: number) => {
    setEditPublications(editPublications.filter((_, i) => i !== index));
  };

  const handleMovePub = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= editPublications.length) return;
    const updated = [...editPublications];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setEditPublications(updated);
  };

  // Courses resolving (matches courses listed in centre config)
  const matchingOnlineCourses = (onlineCourses || []).filter(oc => centre.courses?.includes(oc.slug));
  const matchingResidentialCourses = (residentialCourses || []).filter(rc => centre.courses?.includes(rc.slug));

  // Dossier tab compiling
  const tabsList = [
    {
      slug: 'aims',
      title: 'Missions & Aims',
      icon: 'aims',
      type: 'custom'
    },
    {
      slug: 'people',
      title: 'Faculty & Researchers',
      icon: 'people',
      type: 'custom'
    },
    {
      slug: 'projects',
      title: 'Research Projects',
      icon: 'projects',
      type: 'custom'
    },
    {
      slug: 'courses',
      title: 'Courses & Masterclasses',
      icon: 'courses',
      type: 'custom'
    },
    {
      slug: 'publications',
      title: 'Publications Dossier',
      icon: 'publications',
      type: 'custom'
    },
    ...(isEditing ? editSubPages : (centre.subPages || []))
  ];

  const activeTab = tabsList.find(t => t.slug === activeTabSlug) || tabsList[0];

  return (
    <div className="min-h-screen bg-paper pt-32 pb-24 px-6 lg:px-12 grid-structure">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Navigation Action Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12 pb-6 border-b border-ink/10">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.3em] hover:text-brand-blue transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Science Index
          </Link>

          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="h-10 px-5 border border-ink bg-brand-acid text-ink font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-ink hover:text-brand-acid transition-all cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
            >
              {isEditing ? (
                <>
                  <X className="w-3.5 h-3.5" /> Cancel Edits
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" /> Modify Centre Dossier
                </>
              )}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="border-2 border-ink bg-white shadow-[12px_12px_0px_rgba(0,0,0,1)] p-8 md:p-12 space-y-12 text-ink animate-fade-in mb-20">
            {/* Editing Section Header */}
            <div className="border-b border-ink/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="font-mono text-[10px] bg-brand-orange text-white px-2.5 py-1 uppercase tracking-widest font-black border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  Centre Registry Architect
                </span>
                <h2 className="text-3xl md:text-5xl font-serif font-black tracking-tight mt-4">
                  Dossier Configuration
                </h2>
              </div>
              <button
                type="button"
                onClick={handleSaveCentre}
                className="h-14 px-8 bg-brand-blue text-paper border-2 border-ink font-mono text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-ink hover:text-brand-acid transition-all cursor-pointer shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px]"
              >
                <Save className="w-4 h-4" /> Save Dossier &amp; Synchronize
              </button>
            </div>

            {/* Part 1: Core metadata */}
            <div className="space-y-6">
              <h3 className="font-serif text-xl font-black uppercase text-brand-orange">1. Core Metadata</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-mono text-[10px] uppercase font-black text-ink/50 mb-1.5">Official Centre Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-3 border border-ink bg-paper/25 font-serif text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-black text-ink/50 mb-1.5">Abbreviation Label (shortName)</label>
                  <input
                    type="text"
                    value={editShortName}
                    onChange={(e) => setEditShortName(e.target.value)}
                    className="w-full p-3 border border-ink bg-paper/25 font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-mono text-[10px] uppercase font-black text-ink/50 mb-1.5">Tagline / Mission Statement</label>
                  <textarea
                    rows={2}
                    value={editTagline}
                    onChange={(e) => setEditTagline(e.target.value)}
                    className="w-full p-3 border border-ink bg-paper/25 font-serif text-xs italic"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-black text-ink/50 mb-1.5">Display Banner Image URL</label>
                  <input
                    type="text"
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    className="w-full p-3 border border-ink bg-paper/25 font-mono text-xs animate-fade-in"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase font-black text-ink/50 mb-1.5">Executive Summary Description</label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-3 border border-ink bg-paper/25 font-serif text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Part 2: Missions & Aims list */}
            <div className="space-y-6 pt-6 border-t border-ink/10">
              <h3 className="font-serif text-xl font-black uppercase text-brand-orange">2. Missions &amp; Aims Register</h3>
              
              {/* Existing aims */}
              <div className="space-y-3">
                {editAims.map((aim, index) => (
                  <div key={index} className="p-4 border border-ink bg-white flex items-center justify-between gap-4 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                    {aimEditIndex === index ? (
                      <div className="flex-grow flex gap-2">
                        <input
                          type="text"
                          value={aimEditText}
                          onChange={(e) => setAimEditText(e.target.value)}
                          className="flex-grow p-1.5 border border-ink font-mono text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveAimEdit(index)}
                          className="px-3 bg-brand-blue text-paper text-xs font-mono font-bold"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wide flex-grow leading-tight">
                        {index + 1}. {aim}
                      </span>
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                      {aimEditIndex !== index && (
                        <button
                          type="button"
                          onClick={() => handleStartEditAim(index)}
                          className="p-1 hover:text-brand-blue font-mono text-[10px] uppercase font-black border border-ink px-2 py-0.5"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleMoveAim(index, 'up')}
                        disabled={index === 0}
                        className="p-1 border border-ink bg-white disabled:opacity-25"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveAim(index, 'down')}
                        disabled={index === editAims.length - 1}
                        className="p-1 border border-ink bg-white disabled:opacity-25"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAim(index)}
                        className="p-1 border border-brand-orange text-brand-orange bg-white hover:bg-brand-orange hover:text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add aim */}
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Insert new core aim target..."
                  value={newAimInput}
                  onChange={(e) => setNewAimInput(e.target.value)}
                  className="flex-grow p-3 border border-ink bg-white font-mono text-xs uppercase"
                />
                <button
                  type="button"
                  onClick={handleAddAim}
                  className="h-12 px-6 bg-ink text-paper font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Aim
                </button>
              </div>
            </div>

            {/* Part 3: Publications Dossier */}
            <div className="space-y-6 pt-6 border-t border-ink/10">
              <h3 className="font-serif text-xl font-black uppercase text-brand-orange">3. Publications Dossier</h3>
              
              {/* Existing Publications */}
              <div className="space-y-3">
                {editPublications.map((pub, index) => (
                  <div key={index} className="p-4 border border-ink bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                    {pubEditIndex === index ? (
                      <div className="flex-grow space-y-2 w-full">
                        <input
                          type="text"
                          value={pubEditTitle}
                          onChange={(e) => setPubEditTitle(e.target.value)}
                          placeholder="Title"
                          className="w-full p-1.5 border border-ink font-serif text-xs font-bold"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={pubEditAuthors}
                            onChange={(e) => setPubEditAuthors(e.target.value)}
                            placeholder="Authors"
                            className="p-1 border border-ink font-mono text-[10px] bg-white"
                          />
                          <input
                            type="text"
                            value={pubEditJournal}
                            onChange={(e) => setPubEditJournal(e.target.value)}
                            placeholder="Journal"
                            className="p-1 border border-ink font-mono text-[10px] bg-white"
                          />
                          <input
                            type="text"
                            value={pubEditYear}
                            onChange={(e) => setPubEditYear(e.target.value)}
                            placeholder="Year"
                            className="p-1 border border-ink font-mono text-[10px] bg-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSavePubEdit(index)}
                          className="px-4 py-1.5 bg-brand-blue text-paper text-xs font-mono font-bold"
                        >
                          Save Changes
                        </button>
                      </div>
                    ) : (
                      <div className="flex-grow">
                        <h4 className="font-serif text-sm font-black">"{pub.title}"</h4>
                        <p className="font-mono text-[9px] uppercase tracking-wide text-ink/70">
                          By {pub.authors} &bull; {pub.year} &bull; {pub.journal}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {pubEditIndex !== index && (
                        <button
                          type="button"
                          onClick={() => handleStartEditPub(index)}
                          className="p-1 hover:text-brand-blue font-mono text-[9px] uppercase font-black border border-ink px-2 py-0.5 bg-white"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleMovePub(index, 'up')}
                        disabled={index === 0}
                        className="p-1 border border-ink bg-white disabled:opacity-25"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMovePub(index, 'down')}
                        disabled={index === editPublications.length - 1}
                        className="p-1 border border-ink bg-white disabled:opacity-25"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePub(index)}
                        className="p-1 border border-brand-orange text-brand-orange bg-white hover:bg-brand-orange hover:text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add publication */}
              <div className="border border-dashed border-ink p-4 space-y-3 bg-paper/5 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                <span className="block font-mono text-[10px] uppercase tracking-wider font-extrabold text-ink/50">Register New Academic Paper</span>
                <input
                  type="text"
                  placeholder="Paper Title"
                  value={newPubTitle}
                  onChange={(e) => setNewPubTitle(e.target.value)}
                  className="w-full p-2 border border-ink bg-white font-serif text-xs font-semibold"
                />
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Authors (Comma separated)"
                    value={newPubAuthors}
                    onChange={(e) => setNewPubAuthors(e.target.value)}
                    className="p-2 border border-ink bg-white font-mono text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Journal / Publisher"
                    value={newPubJournal}
                    onChange={(e) => setNewPubJournal(e.target.value)}
                    className="p-2 border border-ink bg-white font-mono text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Year"
                    value={newPubYear}
                    onChange={(e) => setNewPubYear(e.target.value)}
                    className="p-2 border border-ink bg-white font-mono text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPub}
                  className="py-2 px-6 bg-ink text-paper font-mono text-[10px] font-black uppercase tracking-wider"
                >
                  Verify &amp; Add Publication
                </button>
              </div>
            </div>

            {/* Part 4: Dynamic Sub-Pages Tabs & Tab Reordering */}
            <div className="space-y-6 pt-6 border-t border-ink/10">
              <h3 className="font-serif text-xl font-black uppercase text-brand-orange">4. Custom Markdown Pages &amp; Tab Reordering</h3>
              
              {/* Existing custom tabs */}
              <div className="space-y-4">
                {editSubPages.map((tab, idx) => (
                  <div 
                    key={idx} 
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", idx.toString());
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const dragIdx = parseInt(e.dataTransfer.getData("text/plain"));
                      if (!isNaN(dragIdx) && dragIdx !== idx) {
                        const list = [...editSubPages];
                        const draggedItem = list[dragIdx];
                        list.splice(dragIdx, 1);
                        list.splice(idx, 0, draggedItem);
                        setEditSubPages(list);
                      }
                    }}
                    className="p-6 border border-ink bg-paper/10 space-y-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-paper/20 cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-ink/10">
                      <div>
                        <span className="font-mono text-[10px] uppercase font-black text-ink/40">Tab Rank #{idx + 1} <span className="text-[8px] text-brand-orange animate-pulse">(⇅ drag-and-drop enabled)</span></span>
                        <h4 className="font-serif text-lg font-black">{tab.title} <span className="font-mono text-xs font-bold text-brand-blue">({tab.slug})</span></h4>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveTab(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 border border-ink bg-white disabled:opacity-25"
                          title="Move tab up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveTab(idx, 'down')}
                          disabled={idx === editSubPages.length - 1}
                          className="p-1 border border-ink bg-white disabled:opacity-25"
                          title="Move tab down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveTab(idx)}
                          className="p-1 border border-brand-orange text-brand-orange bg-white hover:bg-brand-orange hover:text-white"
                          title="Delete tab"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block font-mono text-[9px] uppercase tracking-wider font-extrabold text-ink/60">Heading/Teaser Summary Block</label>
                      <input
                        type="text"
                        value={tab.content?.teaser || ""}
                        onChange={(e) => handleUpdateTabTeaser(idx, e.target.value)}
                        className="w-full p-2 border border-ink bg-white font-serif text-xs italic"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block font-mono text-[9px] uppercase tracking-wider font-extrabold text-ink/60">Markdown / Rich Content Text Body</label>
                      <MarkdownMediaHelper 
                        onInsert={(text) => handleUpdateTabMarkdown(idx, (tab.content?.markdown || "") + text)}
                      />
                      <textarea
                        rows={6}
                        value={tab.content?.markdown || ""}
                        onChange={(e) => handleUpdateTabMarkdown(idx, e.target.value)}
                        className="w-full p-2 border border-ink bg-white font-mono text-xs bg-white text-[11px]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add custom tab */}
              <div className="border border-dashed border-ink p-6 space-y-4 bg-paper/5 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                <span className="block font-mono text-[10px] uppercase tracking-wider font-extrabold text-ink/50">Append Custom Informational Tab</span>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-mono text-[8px] uppercase tracking-wider font-bold text-ink/60">Tab Title Label *</label>
                    <input
                      type="text"
                      placeholder="Infrastructure & Lab Hardware"
                      value={newTabTitle}
                      onChange={(e) => setNewTabTitle(e.target.value)}
                      className="w-full p-2.5 border border-ink bg-white font-sans text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-mono text-[8px] uppercase tracking-wider font-bold text-ink/60">Teaser / Intro Statement</label>
                    <input
                      type="text"
                      placeholder="Supercomputing cluster and archival rigs at CDI..."
                      value={newTabTeaser}
                      onChange={(e) => setNewTabTeaser(e.target.value)}
                      className="w-full p-2.5 border border-ink bg-white font-serif text-xs italic"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block font-mono text-[8px] uppercase tracking-wider font-bold text-ink/60">Markdown Body Content</label>
                  <MarkdownMediaHelper 
                    onInsert={(text) => setNewTabMarkdown(prev => prev + text)}
                  />
                  <textarea
                    rows={4}
                    placeholder="Paste Markdown descriptions, guidelines, lists, or tables here..."
                    value={newTabMarkdown}
                    onChange={(e) => setNewTabMarkdown(e.target.value)}
                    className="w-full p-2.5 border border-ink bg-white font-mono text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddTab}
                  className="py-2.5 px-6 bg-ink text-paper font-mono text-[10px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Append Tab Module
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-ink/20 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleSaveCentre}
                className="h-14 px-8 bg-brand-blue text-paper border-2 border-ink font-mono text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-ink transition-colors cursor-pointer shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px]"
              >
                <Save className="w-4 h-4" /> Save Dossier &amp; Synchronize DB
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="h-14 px-6 border-2 border-ink text-ink bg-white hover:bg-ink/5 font-mono text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancel Edits
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Hero Area */}
        <div className="grid lg:grid-cols-2 gap-24 items-end mb-20 animate-fade-in">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="font-mono text-[10px] font-bold border border-ink px-3 py-1 bg-white">
                CENTRE // {centre.shortName}
              </div>
              <div className="px-4 py-1 text-[10px] font-mono font-black uppercase tracking-widest bg-brand-acid text-ink shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                Active Research Unit
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-black leading-tight uppercase mb-8">
              {centre.name}
            </h1>

            <p className="font-serif text-2xl font-light italic leading-relaxed text-ink/80 max-w-xl">
              {centre.tagline}
            </p>
          </div>

          <div className="relative aspect-[16/10] lg:aspect-square border border-ink shadow-[20px_20px_0px_var(--color-brand-blue)] overflow-hidden bg-white animate-fade-in">
            <img 
              src={centre.image} 
              alt={centre.name} 
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 right-4 bg-paper p-6 border border-ink shadow-[8px_8px_0px_rgba(0,0,0,1)]">
               <span className="font-mono font-black text-2xl opacity-40">{centre.shortName}</span>
            </div>
          </div>
        </div>

        {/* Executive Description Banner */}
        <div className="border-t border-ink pt-12 mb-20">
          <div className="max-w-4xl">
            <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-4">
              Executive Focus
            </div>
            <p className="font-serif text-2xl md:text-3xl font-medium leading-relaxed italic text-ink/90">
              {centre.description}
            </p>
          </div>
        </div>

        {/* Interactive Dossier Tabs Grid */}
        <div className="border-t border-ink pt-16">
          <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-8 flex items-center gap-2">
            <span className="w-12 h-[1px] bg-ink/20" />
            Centre Intelligence Dossier
          </div>

          <div className="grid lg:grid-cols-12 gap-16 items-start">
            {/* Tab Controls Sidebar */}
            <div className="lg:col-span-3 lg:sticky lg:top-24">
              <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 scrollbar-none">
                {tabsList.map((tab) => {
                  const TabIcon = getIcon(tab.icon || 'Info');
                  const isActive = activeTab.slug === tab.slug;
                  return (
                    <button
                      key={tab.slug}
                      onClick={() => setActiveTabSlug(tab.slug)}
                      className={cn(
                        "flex items-center gap-3.5 px-5 py-4 border text-left font-mono text-[10px] uppercase tracking-wider font-black transition-all shrink-0 lg:shrink",
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

              {/* Research Access Box */}
              <div className="mt-8 hidden lg:block p-8 border border-ink bg-brand-orange text-paper shadow-[8px_8px_0px_rgba(0,0,0,1)]">
                <div className="font-black text-2xl uppercase tracking-tighter mb-2">Research Access:</div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-tighter opacity-90 leading-normal mb-6">
                  To collaborate or license any linguistic datasets from our inventory, email our coordination hubs.
                </p>
                <a 
                  href={`mailto:contact@diversity.org.in?subject=Inquiry: ${centre.name}`}
                  className="font-mono text-[10px] font-black uppercase tracking-widest text-paper hover:text-brand-acid underline"
                >
                  Mail Coordinator &rarr;
                </a>
              </div>
            </div>

            {/* Tab Display Panel */}
            <div className="lg:col-span-9 p-8 md:p-12 border-2 border-ink bg-white shadow-[12px_12px_0px_rgba(0,0,0,1)] min-h-[480px]">
              
              {/* Tab Header block */}
              <div className="flex items-center gap-3.5 mb-10 pb-6 border-b border-ink/10">
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
                    CENTRE INTELLIGENCE REGISTER // SECTION {activeTab.slug.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Tab content switcher */}
              <div className="animate-fade-in">
                
                {/* 1. Standard Aims Tab */}
                {activeTab.slug === 'aims' && (
                  <div className="space-y-12">
                    <div className="space-y-6">
                      {centre.aims.map((aim, i) => (
                        <div 
                          key={i} 
                          className="flex gap-6 p-8 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-brand-acid/10 transition-colors"
                        >
                          <div className="font-mono text-2xl font-black text-brand-blue">
                            0{i + 1}
                          </div>
                          <div>
                            <p className="font-mono text-xs font-black uppercase tracking-wider text-ink leading-normal">
                              {aim}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Operational Resource Cards */}
                    {centre.relevantCards && centre.relevantCards.length > 0 && (
                      <div className="pt-8 border-t border-ink/10">
                        <div className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/30 mb-6">
                          Operational Resources & Hardware
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                          {centre.relevantCards.map((card, i) => (
                            <div 
                              key={i}
                              className="p-8 border border-ink bg-brand-acid/5 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between"
                            >
                              <div className="flex items-center gap-3 mb-4 text-brand-orange">
                                 <Star className="w-4 h-4 fill-current" />
                                 <h4 className="font-mono text-xs font-black uppercase tracking-widest text-ink leading-none">
                                   {card.title}
                                 </h4>
                              </div>
                              <p className="font-mono text-[10px] font-bold uppercase tracking-tight text-ink/60 leading-normal">
                                {card.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Standard People Tab */}
                {activeTab.slug === 'people' && (
                  <div className="grid sm:grid-cols-2 gap-6">
                    {associatedPeople.map((person) => (
                      <Link
                        key={person.slug}
                        to={`/people/${person.slug}`}
                        className="p-6 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-brand-acid hover:-translate-y-1 hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] transition-all flex gap-4 items-center group text-ink"
                      >
                        <img 
                          src={person.image || null} 
                          alt={person.fullName || person.name} 
                          className="w-16 h-16 object-cover border border-ink grayscale group-hover:grayscale-0 transition-transform duration-500 rounded-none shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="space-y-1 overflow-hidden pr-2">
                           <h4 className="font-serif text-lg font-black leading-tight truncate">
                             {person.fullName || person.name}
                           </h4>
                           <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/50 leading-tight">
                             {person.role}
                           </p>
                           <p className="font-mono text-[9px] text-brand-blue font-bold group-hover:underline lead-none">
                             View Profile →
                           </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* 3. Standard Projects Tab */}
                {activeTab.slug === 'projects' && (
                  <div className="grid gap-6">
                    {associatedProjects.map((p) => (
                      <Link
                        key={p.slug}
                        to={`/projects/${p.slug}`}
                        className="p-6 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-ink hover:text-paper group transition-all"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-mono text-[9px] font-bold border border-current px-2 py-0.5">
                            {p.id}
                          </span>
                          <span className="font-mono text-[8.5px] font-black uppercase bg-brand-acid text-ink px-2.5 py-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                            {p.tag}
                          </span>
                        </div>
                        <h3 className="font-serif text-2xl font-black group-hover:text-brand-acid transition-colors leading-tight mb-2">
                          {p.title}
                        </h3>
                        <p className="text-xs opacity-75 group-hover:opacity-100 mb-4 font-medium leading-relaxed">
                          {p.description}
                        </p>
                        <div className="flex justify-between font-mono text-[9px] font-black uppercase tracking-wider">
                          <span>Status: {p.status}</span>
                          <span className="group-hover:translate-x-1 transition-transform">Explore &rarr;</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* 4. Standard Courses Tab */}
                {activeTab.slug === 'courses' && (
                  <div className="space-y-12">
                    {/* Online iteration matching */}
                    {matchingOnlineCourses.length > 0 && (
                      <div>
                        <div className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/30 mb-6 font-bold">
                          Online Masterclasses & Certifications
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                          {matchingOnlineCourses.map(oc => (
                            <Link
                              key={oc.slug}
                              to={`/academy/online/${oc.slug}`}
                              className="p-6 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-brand-acid transition-all flex flex-col justify-between text-ink"
                            >
                              <div>
                                <div className="font-mono text-[9px] font-bold uppercase text-brand-orange bg-brand-orange/15 px-2.5 py-1 inline-block border border-brand-orange/20 mb-3">
                                  {oc.type}
                                </div>
                                <h4 className="font-serif text-xl font-black mb-1 leading-tight">{oc.title}</h4>
                                <p className="text-xs text-ink/65 mb-4 leading-relaxed line-clamp-2">{oc.description}</p>
                              </div>
                              <div className="font-mono text-[9.5px] text-brand-blue font-semibold border-t border-ink/10 pt-3 flex justify-between uppercase">
                                <span>Credits: {oc.credits} // {oc.duration}</span>
                                <span className="font-black group-hover:underline">Join →</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* On-Site/Residential Courses matching */}
                    {matchingResidentialCourses.length > 0 && (
                      <div className="pt-6 border-t border-ink/10">
                        <div className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/30 mb-6 font-bold">
                          Field-School Programs & Intensives
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                          {matchingResidentialCourses.map(rc => (
                            <Link
                              key={rc.slug}
                              to={`/academy/residential/${rc.slug}`}
                              className="p-6 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-brand-blue hover:text-white transition-all flex flex-col justify-between text-ink group"
                            >
                              <div className="group-hover:text-white">
                                <div className="font-mono text-[9px] font-bold uppercase text-brand-blue bg-brand-blue/10 px-2.5 py-1 inline-block border border-brand-blue/20 group-hover:bg-white/10 group-hover:text-white mb-3">
                                  On-Site Course // {rc.status}
                                </div>
                                <h4 className="font-serif text-xl font-black mb-1 group-hover:text-brand-acid leading-tight">{rc.title}</h4>
                                <p className="font-mono text-[10px] opacity-65 leading-tight mb-4">{rc.location}</p>
                              </div>
                              <div className="font-mono text-[9.5px] text-brand-blue group-hover:text-white font-semibold border-t border-ink/10 group-hover:border-white/10 pt-3 flex justify-between uppercase leading-none">
                                <span>{rc.dates}</span>
                                <span className="font-black">Explore →</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {matchingOnlineCourses.length === 0 && matchingResidentialCourses.length === 0 && (
                      <div className="p-8 border border-ink/20 text-center font-mono text-xs text-ink/40 uppercase">
                        No active courses currently assigned to this research centre
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Standard Publications Tab */}
                {activeTab.slug === 'publications' && (
                  <div className="space-y-6">
                    {centre.publications && centre.publications.map((pub, idx) => (
                      <div 
                        key={idx}
                        className="p-8 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] transition-all flex items-start gap-6"
                      >
                        <div className="p-4 bg-brand-orange text-paper border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] shrink-0">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div className="space-y-2 overflow-hidden">
                          <h4 className="font-serif text-xl font-black tracking-tight leading-snug">
                            "{pub.title}"
                          </h4>
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/65">
                            By {pub.authors} &bull; {pub.year}
                          </p>
                          <div className="inline-block font-mono text-[9px] font-black bg-brand-acid/20 text-brand-blue border border-brand-blue/30 px-2 py-0.5 rounded-none uppercase">
                            {pub.journal}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 6. Custom Sub-Pages Rendering (as in Event / Project descriptions) */}
                {activeTab.type === 'markdown' && (
                  <div className="space-y-6">
                    {(activeTab as any).content?.teaser && (
                      <p className="font-serif text-2xl italic leading-relaxed text-ink/80 border-l-4 border-brand-orange pl-6 mb-8 uppercase tracking-tight">
                        {(activeTab as any).content.teaser}
                      </p>
                    )}
                    <div 
                      className="prose max-w-none text-ink text-sm leading-relaxed font-sans tracking-tight bg-paper/50 p-6 border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] text-left"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown((activeTab as any).content?.markdown || '') }}
                    />
                  </div>
                )}
                
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {/* Dynamic Connected Events Listing */}
        {associatedEvents.length > 0 && (
          <div className="mt-32 pt-24 border-t border-ink">
            <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-8 flex items-center gap-2">
              <span className="w-12 h-[1px] bg-ink/20" />
              Connected Centre Events & Sprints
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {associatedEvents.map((e) => (
                <Link
                  key={e.slug}
                  to={`/events/${e.slug}`}
                  className="p-8 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-brand-blue hover:text-white group transition-all"
                >
                  <div className="flex flex-wrap items-center gap-3 text-[9px] font-mono uppercase text-ink/50 group-hover:text-white/70 mb-4">
                    <span className="border border-current px-2.5 py-0.5 bg-paper text-ink group-hover:bg-brand-acid group-hover:text-ink">
                      {e.type}
                    </span>
                    <span>{e.dates}</span>
                  </div>
                  <h3 className="font-serif text-2xl font-black group-hover:text-brand-acid transition-colors mb-2">
                    {e.title}
                  </h3>
                  <p className="text-xs opacity-75 group-hover:opacity-90 leading-relaxed mb-4">
                    {e.description}
                  </p>
                  <div className="flex justify-end font-mono text-[9px] font-black uppercase tracking-widest text-brand-blue group-hover:text-brand-acid leading-none">
                    Review Docket &rarr;
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
