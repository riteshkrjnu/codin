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

  return (
    <div className="min-h-screen bg-paper pt-32 pb-24 px-6 lg:px-12 grid-structure">
      <div className="max-w-[1600px] mx-auto w-full">
        {/* Page Header */}
        <div className="border-b border-ink/20 pb-12 mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-brand-orange mb-4">
              Council Cohorts &amp; Faculty
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-black tracking-tight leading-none mb-6">
              Council <span className="text-outline">Directory</span>
            </h1>
            <p className="font-serif text-xl md:text-2xl text-ink/80 italic font-light max-w-4xl leading-relaxed">
              Meet the primary researchers, linguists, technology strategists, and preservation experts coordinating programs for linguistic and cultural equity.
            </p>
          </div>
          {isPrivileged && (
            <button
              onClick={() => setIsAdding(true)}
              className="h-14 px-6 border border-ink bg-brand-acid text-ink font-mono text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-ink hover:text-brand-acid transition-all cursor-pointer shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] shrink-0"
            >
              <Plus className="w-4 h-4" /> Add New Person
            </button>
          )}
        </div>

        {/* Search and Filters Strip */}
        <div className="mb-12 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search people by name, designation, journal papers, credentials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-6 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue font-mono text-xs uppercase tracking-wider uppercase-placeholder"
              />
            </div>
            
            {/* Toggle Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-14 px-6 border border-ink font-mono text-xs font-black uppercase tracking-widest flex items-center gap-2.5 transition-colors cursor-pointer ${showFilters ? 'bg-ink text-paper' : 'bg-paper/30 hover:bg-ink/5'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters {showFilters ? '[Hide]' : '[Show]'}
            </button>

            {/* Clear Filters Button */}
            {(searchQuery || selectedCentre !== "all" || selectedProject !== "all") && (
              <button
                onClick={handleReset}
                className="h-14 px-6 border border-ink bg-brand-acid text-ink font-mono text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-ink hover:text-brand-acid transition-all cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          {/* Filter Sub-panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 border border-ink bg-white/40 grid md:grid-cols-2 gap-6 mt-2 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
                  {/* Centre Selection */}
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
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Results Count */}
        <div className="mb-8 font-mono text-[10px] uppercase font-black tracking-widest text-ink/40 flex items-center justify-between">
          <span>Displaying {filteredPeople.length} member{filteredPeople.length !== 1 ? 's' : ''} matched</span>
          <span>SYSTEM ACTIVE • COHORT FEED</span>
        </div>

        {/* Directory Sections */}
        {filteredPeople.length > 0 ? (
          <div className="space-y-16 animate-fade-in">
            {/* 1. Core Cohorts Map */}
            {corePeople.length > 0 && (
              <div>
                <div className="border-b border-dashed border-ink/20 pb-4 mb-8 flex items-center gap-4">
                  <h2 className="font-serif text-2xl font-black text-ink uppercase tracking-tight">The Council &amp; Core Team</h2>
                  <span className="font-mono text-[10px] bg-brand-acid text-ink border border-ink py-0.5 px-2 font-bold uppercase tracking-widest">{corePeople.length} Core</span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <AnimatePresence mode="popLayout">
                    {corePeople.map((person, idx) => {
                      const pProjects = projects.filter(proj => 
                        proj.projectDirectors.includes(person.slug) || 
                        proj.projectStaffs?.includes(person.slug) ||
                        (person as any).projects?.includes(proj.slug)
                      );
                      const pCentres = centres.filter(centre => person.centres?.includes(centre.slug));

                      return (
                        <motion.div
                          key={person.slug}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                          className="border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex flex-col group h-full justify-between"
                        >
                          {/* Header photograph area */}
                          <div className="relative h-64 bg-ink/5 border-b border-ink overflow-hidden shrink-0">
                            <img
                              src={person.image || null}
                              alt={person.fullName}
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 object-top"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-4 right-4 bg-brand-acid text-ink border border-ink font-mono text-[8px] font-black tracking-widest uppercase px-2 py-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                              COUNCIL-STAFF
                            </div>
                            {isPrivileged && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingPerson(person);
                                }}
                                className="absolute top-4 left-4 bg-white hover:bg-brand-acid text-ink border border-ink p-2 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all z-10 cursor-pointer animate-none"
                                title="Edit Information"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Meta info area */}
                          <div className="p-6 flex-grow flex flex-col justify-between">
                            <div>
                              {/* Designation */}
                              <div className="font-mono text-[9px] font-bold text-brand-orange uppercase tracking-wider mb-2 leading-none">
                                {person.role}
                              </div>
                              {/* Name */}
                              <h3 className="serif font-black text-2xl mb-4 group-hover:text-brand-blue tracking-tight transition-colors">
                                {person.fullName || person.name}
                              </h3>
                              {/* Brief Snippet from bio */}
                              <p className="font-serif text-sm italic text-ink/70 leading-relaxed line-clamp-3 mb-6">
                                {person.bio}
                              </p>
                            </div>

                            {/* Connections / metadata tags */}
                            <div className="space-y-4 pt-4 border-t border-dashed border-ink/20 mt-auto">
                              {pCentres.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono text-[8.5px] font-black uppercase text-ink/45 shrink-0 flex items-center gap-1"><Landmark className="w-3 h-3" /> Centres:</span>
                                  {pCentres.map(c => (
                                    <span key={c.slug} className="font-mono text-[8px] font-bold uppercase bg-brand-acid/35 px-1.5 py-0.2 select-none border border-ink/10 rounded-sm">
                                      {c.shortName}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {pProjects.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono text-[8.5px] font-black uppercase text-ink/45 shrink-0 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Projects:</span>
                                  {pProjects.map(proj => (
                                    <span key={proj.slug} className="font-mono text-[8px] font-bold uppercase bg-brand-blue/10 px-1.5 py-0.2 select-none border border-ink/10 rounded-sm">
                                      {proj.id}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action footer link */}
                          <div className="border-t border-ink shrink-0">
                            <Link
                              to={`/people/${person.slug}`}
                              className="w-full py-4.5 bg-paper/50 hover:bg-brand-acid font-mono text-[10px] font-black tracking-widest text-ink block text-center uppercase transition-all flex items-center justify-center gap-2 group-hover:bg-brand-acid"
                            >
                              Inspect Dossier &amp; Profile <ArrowUpRight className="w-3.5 h-3.5 mt-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </Link>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* 2. Collaborators Map */}
            {collaboratorPeople.length > 0 && (
              <div>
                <div className="border-b border-dashed border-ink/20 pb-4 mb-8 flex items-center gap-4 mt-8">
                  <h2 className="font-serif text-2xl font-black text-ink uppercase tracking-tight">Our Collaborators</h2>
                  <span className="font-mono text-[10px] bg-brand-blue text-white border border-ink py-0.5 px-2 font-bold uppercase tracking-widest">{collaboratorPeople.length} Collaborator{collaboratorPeople.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <AnimatePresence mode="popLayout">
                    {collaboratorPeople.map((person, idx) => {
                      const pProjects = projects.filter(proj => 
                        proj.projectDirectors.includes(person.slug) || 
                        proj.projectStaffs?.includes(person.slug) ||
                        (person as any).projects?.includes(proj.slug)
                      );
                      const pCentres = centres.filter(centre => person.centres?.includes(centre.slug));

                      return (
                        <motion.div
                          key={person.slug}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                          className="border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex flex-col group h-full justify-between border-dashed border-2 hover:border-solid hover:border-brand-blue"
                        >
                          {/* Header photograph area */}
                          <div className="relative h-64 bg-ink/5 border-b border-ink overflow-hidden shrink-0">
                            <img
                              src={person.image || null}
                              alt={person.fullName}
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 object-top hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-4 right-4 bg-brand-blue text-white border border-ink font-mono text-[8.5px] font-black tracking-widest uppercase px-2.5 py-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                              COLLABORATOR
                            </div>
                            {isPrivileged && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingPerson(person);
                                }}
                                className="absolute top-4 left-4 bg-white hover:bg-brand-acid text-ink border border-ink p-2 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all z-10 cursor-pointer animate-none"
                                title="Edit Information"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Meta info area */}
                          <div className="p-6 flex-grow flex flex-col justify-between">
                            <div>
                              {/* Designation */}
                              <div className="font-mono text-[9px] font-bold text-brand-orange uppercase tracking-wider mb-2 leading-none">
                                {person.role}
                              </div>
                              {/* Name */}
                              <h3 className="serif font-black text-2xl mb-4 group-hover:text-brand-blue tracking-tight transition-colors">
                                {person.fullName || person.name}
                              </h3>
                              {/* Brief Snippet from bio */}
                              <p className="font-serif text-sm italic text-ink/70 leading-relaxed line-clamp-3 mb-6">
                                {person.bio}
                              </p>
                            </div>

                            {/* Connections / metadata tags */}
                            <div className="space-y-4 pt-4 border-t border-dashed border-ink/20 mt-auto">
                              {pCentres.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono text-[8.5px] font-black uppercase text-ink/45 shrink-0 flex items-center gap-1"><Landmark className="w-3 h-3" /> Centres:</span>
                                  {pCentres.map(c => (
                                    <span key={c.slug} className="font-mono text-[8px] font-bold uppercase bg-brand-acid/35 px-1.5 py-0.2 select-none border border-ink/10 rounded-sm">
                                      {c.shortName}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {pProjects.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono text-[8.5px] font-black uppercase text-ink/45 shrink-0 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Projects:</span>
                                  {pProjects.map(proj => (
                                    <span key={proj.slug} className="font-mono text-[8px] font-bold uppercase bg-brand-blue/10 px-1.5 py-0.2 select-none border border-ink/10 rounded-sm">
                                      {proj.id}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action footer link */}
                          <div className="border-t border-ink shrink-0">
                            <Link
                              to={`/people/${person.slug}`}
                              className="w-full py-4.5 bg-paper/50 hover:bg-brand-blue font-mono text-[10px] font-black tracking-widest text-ink block text-center uppercase transition-all flex items-center justify-center gap-2 group-hover:bg-brand-blue group-hover:text-white"
                            >
                              Inspect Dossier &amp; Profile <ArrowUpRight className="w-3.5 h-3.5 mt-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </Link>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 border border-ink border-dashed">
            <span className="inline-block p-4 bg-ink/5 rounded-full mb-4">
              <Search className="w-8 h-8 opacity-30" />
            </span>
            <h3 className="font-serif text-2xl font-black mb-2">No matches found</h3>
            <p className="font-mono text-xs text-ink/55 max-w-sm mx-auto mb-6">
              Adjust your spelling or filter query constraints to scan the personnel record pool again.
            </p>
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-ink bg-ink text-paper font-mono text-[10px] font-black uppercase tracking-widest hover:bg-brand-acid hover:text-ink transition-colors cursor-pointer"
            >
              Exhaustive Pool Reset
            </button>
          </div>
        )}

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
      </div>
    </div>
  );
}
