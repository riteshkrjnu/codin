import { Catalogue } from '../site/PublicPages';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, ArrowUpRight, Landmark, Briefcase, Mail, BookOpen, RefreshCw, Plus, X, Upload, Edit3 } from 'lucide-react';
import { centres, projects } from '../data/config';
import { getUpdatedPeople, savePersonOverride } from '../lib/peopleOverrides';
import { Person } from '../data/people/types';
import { useAuth } from '../context/AuthContext';

export default function People() {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCentre, setSelectedCentre] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // New person form states
  const [isAdding, setIsAdding] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonFullName, setNewPersonFullName] = useState("");
  const [newPersonRole, setNewPersonRole] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonBio, setNewPersonBio] = useState("");
  const [newPersonImage, setNewPersonImage] = useState("");
  const [newPersonBoardType, setNewPersonBoardType] = useState<"staff" | "board" | "rab" | "external">("staff");
  const [addingError, setAddingError] = useState("");
  const [savingNewPerson, setSavingNewPerson] = useState(false);

  // Editing states
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editPersonName, setEditPersonName] = useState("");
  const [editPersonFullName, setEditPersonFullName] = useState("");
  const [editPersonRole, setEditPersonRole] = useState("");
  const [editPersonEmail, setEditPersonEmail] = useState("");
  const [editPersonBio, setEditPersonBio] = useState("");
  const [editPersonImage, setEditPersonImage] = useState("");
  const [editPersonBoardType, setEditPersonBoardType] = useState<"staff" | "board" | "rab" | "external">("staff");
  const [editingError, setEditingError] = useState("");
  const [savingEditPerson, setSavingEditPerson] = useState(false);

  useEffect(() => {
    if (editingPerson) {
      setEditPersonName(editingPerson.name || "");
      setEditPersonFullName(editingPerson.fullName || "");
      setEditPersonRole(editingPerson.role || "");
      setEditPersonEmail(editingPerson.email || "");
      setEditPersonBio(editingPerson.bio || "");
      setEditPersonImage(editingPerson.image || "");
      setEditPersonBoardType(editingPerson.boardMemberType || "staff");
      setEditingError("");
    }
  }, [editingPerson]);

  const handleEditPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    if (!editPersonName.trim()) {
      setEditingError("Name is required");
      return;
    }
    setSavingEditPerson(true);
    setEditingError("");

    try {
      const token = user?.token;
      const headers: any = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const updatedModel = {
        ...editingPerson,
        name: editPersonName,
        fullName: editPersonFullName,
        role: editPersonRole,
        email: editPersonEmail,
        bio: editPersonBio,
        image: editPersonImage,
        boardMemberType: editPersonBoardType,
      };

      const response = await fetch(`/api/people/${editingPerson.slug}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updatedModel)
      });

      if (response.ok) {
        setEditingPerson(null);
        fetchPeople();
        window.dispatchEvent(new Event("people_data_updated"));
      } else {
        const err = await response.json();
        setEditingError(err.error || "Failed to update person.");
      }
    } catch (e) {
      console.error(e);
      setEditingError("Network error. Failed to connect to server.");
    } finally {
      setSavingEditPerson(false);
    }
  };

  // Sync with updates/overrides from backend API
  const fetchPeople = async () => {
    try {
      const res = await fetch('/api/people');
      if (res.ok) {
        const data = await res.json();
        setPeople(data.people || []);
      } else {
        setPeople(getUpdatedPeople());
      }
    } catch (err) {
      console.error(err);
      setPeople(getUpdatedPeople());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
    const handleUpdate = () => {
      fetchPeople();
    };
    window.addEventListener('people_data_updated', handleUpdate);
    return () => window.removeEventListener('people_data_updated', handleUpdate);
  }, []);

  // Filter options
  const allCentres = useMemo(() => centres, []);
  const allProjects = useMemo(() => projects, []);

  // Filter & Search Logic
  const filteredPeople = useMemo(() => {
    return people.filter(p => {
      // 1. Search Query Match
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = q === "" || 
        p.name.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.bio.toLowerCase().includes(q) ||
        p.publications?.some(pub => pub.toLowerCase().includes(q)) ||
        p.education?.some(edu => edu.degree.toLowerCase().includes(q) || edu.institution.toLowerCase().includes(q)) ||
        p.experience?.some(exp => exp.role.toLowerCase().includes(q) || exp.organization.toLowerCase().includes(q));

      // 2. Centre Filter Match
      const matchCentre = selectedCentre === "all" || p.centres?.includes(selectedCentre);

      // 3. Project Filter Match
      // Check if person lists this project OR is named in projectDirectors / projectStaffs
      const matchProject = selectedProject === "all" || (
        p.slug === projects.find(proj => proj.slug === selectedProject)?.projectDirectors.find(slug => slug === p.slug) ||
        projects.find(proj => proj.slug === selectedProject)?.projectStaffs?.includes(p.slug) ||
        (p as any).projects?.includes(selectedProject)
      );

      return matchQuery && matchCentre && matchProject;
    });
  }, [people, searchQuery, selectedCentre, selectedProject]);

  const corePeople = useMemo(() => {
    return filteredPeople.filter(p => p.boardMemberType !== 'external');
  }, [filteredPeople]);

  const collaboratorPeople = useMemo(() => {
    return filteredPeople.filter(p => p.boardMemberType === 'external');
  }, [filteredPeople]);

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) {
      setAddingError("Name is required");
      return;
    }
    if (!newPersonEmail.trim()) {
      setAddingError("Email is required");
      return;
    }
    const slug = newPersonName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const dataModel = {
      slug,
      name: newPersonName.trim(),
      fullName: newPersonFullName.trim() || newPersonName.trim(),
      role: newPersonRole.trim() || "Council Personnel",
      email: newPersonEmail.trim().toLowerCase(),
      bio: newPersonBio.trim(),
      image: newPersonImage.trim() || "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600",
      boardMemberType: newPersonBoardType,
      bannerImages: [],
      education: [],
      experience: [],
      publications: [],
      socials: {}
    };

    setSavingNewPerson(true);
    setAddingError("");
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
        setIsAdding(false);
        setNewPersonName("");
        setNewPersonFullName("");
        setNewPersonRole("");
        setNewPersonEmail("");
        setNewPersonBio("");
        setNewPersonImage("");
        setNewPersonBoardType("staff");
        fetchPeople();
        window.dispatchEvent(new Event("people_data_updated"));
      } else {
        const err = await response.json();
        setAddingError(err.error || "Failed to create person.");
      }
    } catch (e) {
      console.error(e);
      setAddingError("Network error. Failed to connect to server.");
    } finally {
      setSavingNewPerson(false);
    }
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCentre("all");
    setSelectedProject("all");
  };

  const isPrivileged = user?.role === 'admin' || user?.role === 'superadmin';

  return <>
    <Catalogue kind="people" controls={{records: filteredPeople,
      toolbar: isPrivileged ? <div className="section-actions"><button className="action" onClick={()=>setIsAdding(true)}>Add New Person</button></div> : undefined,
      filters: <div className="advanced-filter-grid">                  {/* Centre Selection */}
                  <div className="space-y-2">
                    <label className="block font-mono text-[10px] font-black uppercase tracking-widest text-ink/50">Filter by Affiliated Centre</label>
                    <select
                      value={selectedCentre}
                      onChange={(e) => setSelectedCentre(e.target.value)}
                      className="w-full p-3 border border-ink bg-paper/30 font-mono text-xs uppercase font-bold appearance-none cursor-pointer focus:outline-none focus:border-brand-blue"
                    >
                      <option value="all">ANY CENTRE affiliation</option>
                      {allCentres.map(c => (
                        <option key={c.slug} value={c.slug}>{c.name.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Project Selection */}
                  <div className="space-y-2">
                    <label className="block font-mono text-[10px] font-black uppercase tracking-widest text-ink/50">Filter by Research Program</label>
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="w-full p-3 border border-ink bg-paper/30 font-mono text-xs uppercase font-bold appearance-none cursor-pointer focus:outline-none focus:border-brand-blue"
                    >
                      <option value="all">ANY RESEARCH WORK</option>
                      {allProjects.map(p => (
                        <option key={p.slug} value={p.slug}>{p.title.toUpperCase()}</option>
                      ))}
                    </select>
                  </div><button onClick={handleReset}>Reset filters</button></div>,
      searchText: person => [person.role,JSON.stringify(person.publications||[]),JSON.stringify(person.education||[])].join(' '),
      actions: isPrivileged ? person => <button onClick={()=>{setEditingPerson(person as any);}}>Edit</button> : undefined,
    }}/>
        {/* Creation Overlay Modal */}
        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-paper border-4 border-ink shadow-[16px_16px_0px_rgba(0,0,0,1)] w-full max-w-2xl overflow-hidden flex flex-col my-8"
              >
                {/* Modal Header */}
                <div className="border-b-4 border-ink p-6 bg-brand-orange text-white flex justify-between items-center shrink-0">
                  <h3 className="font-serif font-black text-2xl uppercase tracking-tight">Create Researcher Profile</h3>
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="p-1 text-white hover:text-ink hover:bg-white border border-transparent hover:border-ink transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Form fields */}
                <form onSubmit={handleCreatePerson} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                  {addingError && (
                    <div className="p-4 border border-ink bg-brand-orange/10 text-brand-orange text-xs font-mono font-bold uppercase tracking-wider">
                      Error: {addingError}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Display/Short Name *</label>
                      <input 
                        type="text"
                        required
                        placeholder="John Doe"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        className="w-full p-3 border border-ink bg-white font-mono text-xs uppercase"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Full Name &amp; Academic Honors</label>
                      <input 
                        type="text"
                        placeholder="Dr. John Doe, Ph.D."
                        value={newPersonFullName}
                        onChange={(e) => setNewPersonFullName(e.target.value)}
                        className="w-full p-3 border border-ink bg-white font-serif text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Designation / Role Title</label>
                      <input 
                        type="text"
                        placeholder="Lead Computational Linguist"
                        value={newPersonRole}
                        onChange={(e) => setNewPersonRole(e.target.value)}
                        className="w-full p-3 border border-ink bg-white font-mono text-xs uppercase"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Dossier Email Address *</label>
                      <input 
                        type="email"
                        required
                        placeholder="john@codin.org"
                        value={newPersonEmail}
                        onChange={(e) => setNewPersonEmail(e.target.value)}
                        className="w-full p-3 border border-ink bg-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Council Classification Category</label>
                      <select 
                        value={newPersonBoardType}
                        onChange={(e: any) => setNewPersonBoardType(e.target.value)}
                        className="w-full p-3 border border-ink bg-white font-mono text-xs uppercase font-extrabold"
                      >
                        <option value="staff">Staff / Primary Personnel</option>
                        <option value="board">The Board &amp; Leadership</option>
                        <option value="rab">Research Advisory Board</option>
                        <option value="external">Our Collaborator (External Member)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Profile Image URL</label>
                      <input 
                        type="text"
                        placeholder="https://images.unsplash.com/... or paste link"
                        value={newPersonImage}
                        onChange={(e) => setNewPersonImage(e.target.value)}
                        className="w-full p-3 border border-ink bg-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Brief Executive Biography</label>
                    <textarea 
                      rows={4}
                      placeholder="Share a brief introduction to this expert's work, active computational agendas, and background..."
                      value={newPersonBio}
                      onChange={(e) => setNewPersonBio(e.target.value)}
                      className="w-full p-3 border border-ink bg-white font-serif text-xs leading-relaxed"
                    />
                  </div>

                  {/* Submission and Action Triggers */}
                  <div className="pt-4 border-t border-ink/10 flex flex-col sm:flex-row gap-4">
                    <button
                      type="submit"
                      disabled={savingNewPerson}
                      className="h-14 px-8 bg-brand-blue text-paper border border-ink font-mono text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-ink transition-colors cursor-pointer shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px] disabled:opacity-50 flex-grow"
                    >
                      {savingNewPerson ? "Saving record..." : "Register Profile"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="h-14 px-6 border border-ink text-ink font-mono text-xs font-black uppercase tracking-widest hover:bg-ink/5 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editing Overlay Modal */}
        <AnimatePresence>
          {editingPerson && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-paper border-4 border-ink shadow-[16px_16px_0px_rgba(0,0,0,1)] w-full max-w-2xl overflow-hidden flex flex-col my-8"
              >
                {/* Modal Header */}
                <div className="border-b-4 border-ink p-6 bg-brand-blue text-white flex justify-between items-center shrink-0">
                  <h3 className="font-serif font-black text-2xl uppercase tracking-tight">Edit Researcher Profile</h3>
                  <button 
                    type="button"
                    onClick={() => setEditingPerson(null)}
                    className="p-1 text-white hover:text-ink hover:bg-white border border-transparent hover:border-ink transition-colors animate-none"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Form fields */}
                <form onSubmit={handleEditPerson} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                  {editingError && (
                    <div className="p-4 border border-ink bg-brand-orange/10 text-brand-orange text-xs font-mono font-bold uppercase tracking-wider">
                      Error: {editingError}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Display/Short Name *</label>
                      <input 
                        type="text"
                        required
                        placeholder="John Doe"
                        value={editPersonName}
                        onChange={(e) => setEditPersonName(e.target.value)}
                        className="w-full p-3 border border-ink bg-white font-mono text-xs uppercase"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Full Name &amp; Academic Honors</label>
                      <input 
                        type="text"
                        placeholder="Dr. John Doe, Ph.D."
                        value={editPersonFullName}
                        onChange={(e) => setEditPersonFullName(e.target.value)}
                        className="w-full p-3 border border-ink bg-white font-serif text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Designation / Role Title</label>
                      <input 
                        type="text"
                        placeholder="Lead Computational Linguist"
                        value={editPersonRole}
                        onChange={(e) => setEditPersonRole(e.target.value)}
                        className="w-full p-3 border border-ink bg-white font-mono text-xs uppercase"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Dossier Email Address *</label>
                      <input 
                        type="email"
                        required
                        placeholder="john@codin.org"
                        value={editPersonEmail}
                        onChange={(e) => setEditPersonEmail(e.target.value)}
                        className="w-full p-3 border border-ink bg-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Council Classification Category</label>
                      <select 
                        value={editPersonBoardType}
                        onChange={(e: any) => setEditPersonBoardType(e.target.value)}
                        className="w-full p-3 border border-ink bg-white font-mono text-xs uppercase font-extrabold"
                      >
                        <option value="staff">Staff / Primary Personnel</option>
                        <option value="board">The Board &amp; Leadership</option>
                        <option value="rab">Research Advisory Board</option>
                        <option value="external">Our Collaborator (External Member)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Profile Image URL</label>
                      <input 
                        type="text"
                        placeholder="https://images.unsplash.com/... or paste link"
                        value={editPersonImage}
                        onChange={(e) => setEditPersonImage(e.target.value)}
                        className="w-full p-3 border border-ink bg-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block font-mono text-[10px] uppercase font-black text-ink/75">Brief Executive Biography</label>
                    <textarea 
                      rows={4}
                      placeholder="Share a brief introduction to this expert's work, active computational agendas, and background..."
                      value={editPersonBio}
                      onChange={(e) => setEditPersonBio(e.target.value)}
                      className="w-full p-3 border border-ink bg-white font-serif text-xs leading-relaxed"
                    />
                  </div>

                  {/* Submission and Action Triggers */}
                  <div className="pt-4 border-t border-ink/10 flex flex-col sm:flex-row gap-4">
                    <button
                      type="submit"
                      disabled={savingEditPerson}
                      className="h-14 px-8 bg-brand-blue text-paper border border-ink font-mono text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-ink transition-colors cursor-pointer shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px] disabled:opacity-50 flex-grow"
                    >
                      {savingEditPerson ? "Saving changes..." : "Save Profile Details"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPerson(null)}
                      className="h-14 px-6 border border-ink text-ink font-mono text-xs font-black uppercase tracking-widest hover:bg-ink/5 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
  </>;
}
