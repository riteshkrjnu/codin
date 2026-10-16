/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Trash2, Upload, Sparkles, Pencil, Save, 
  Landmark, Users, Globe, ExternalLink, Image as ImageIcon,
  CheckCircle2, ArrowUpRight, BookOpen, Calendar, HelpCircle
} from 'lucide-react';
import { renderMarkdown } from '../lib/utils';
import { MarkdownMediaHelper } from './MarkdownMediaHelper';
import { centres, team } from '../data/config';
import { ProjectCollaborator, ProjectPartnerAgency } from '../data/projects/types';

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

  const applyLink = () => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement;
    const defaultUrl = "https://example.com";
    if (!el) {
      onChange(value + "[Link text](" + defaultUrl + ")");
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const originalText = el.value;
    const selected = originalText.substring(start, end);
    if (selected) {
      const replacement = `[${selected}](${defaultUrl})`;
      onChange(originalText.substring(0, start) + replacement + originalText.substring(end));
      setTimeout(() => {
        el.focus();
        const urlStart = start + selected.length + 3;
        el.setSelectionRange(urlStart, urlStart + defaultUrl.length);
      }, 50);
    } else {
      const defaultText = "Link text";
      const replacement = `[${defaultText}](${defaultUrl})`;
      onChange(originalText.substring(0, start) + replacement + originalText.substring(end));
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + 1, start + 1 + defaultText.length);
      }, 50);
    }
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
      <button type="button" onClick={applyLink} className="px-2 py-0.5 bg-white hover:bg-brand-acid border border-ink font-mono font-bold select-none cursor-pointer text-brand-blue">🔗 Link</button>
    </div>
  );
}

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: any | null;
  token?: string;
  onSuccess: (savedProject: any) => void;
}

export default function ProjectFormModal({
  isOpen,
  onClose,
  projectToEdit,
  token,
  onSuccess
}: ProjectFormModalProps) {
  const isEdit = !!projectToEdit;

  // Cloudinary upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const uploadToCloudinary = async (dataUrl: string): Promise<string> => {
    setIsUploading(true);
    setUploadProgress("Uploading asset to Cloudinary...");
    try {
      const res = await fetch('/api/upload-cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      } else {
        alert("Upload failed. Make sure server Cloudinary variables are configured.");
        return "";
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading image to Cloudinary.");
      return "";
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  // Dynamic centres and people fetched from server
  const [dynamicCentres, setDynamicCentres] = useState<any[]>(centres);
  const [dynamicPeople, setDynamicPeople] = useState<any[]>(team);

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

  useEffect(() => {
    loadCentres();
    loadPeople();
  }, []);

  // Primary form fields
  const [formData, setFormData] = useState({
    id: '',
    slug: '',
    title: '',
    tag: 'Flagship AI Initiative',
    description: '',
    longDescription: '',
    methodology: '',
    aims: '', // Comma separated
    impact: '', // Newline separated
    keywords: '', // Comma separated
    color: 'bg-brand-acid',
    status: 'Ongoing',
    year: new Date().getFullYear().toString(),
    startDate: '',
    endDate: '',
    image: '',
    outputUrl: '',
    outputLabel: '',
  });

  // Links and Sub-items
  const [relatedLinks, setRelatedLinks] = useState<Array<{ name: string; url: string }>>([]);
  const [associatedCentres, setAssociatedCentres] = useState<string[]>([]);
  const [projectDirectors, setProjectDirectors] = useState<string[]>([]);
  const [projectStaffs, setProjectStaffs] = useState<string[]>([]);
  const [openPositions, setOpenPositions] = useState<Array<{ title: string; description: string; deadline: string; applyLink: string }>>([]);
  const [subPages, setSubPages] = useState<any[]>([]);

  // Multimedia
  const [overviewImages, setOverviewImages] = useState<string[]>([]);
  const [overviewYoutubeLinks, setOverviewYoutubeLinks] = useState<string[]>([]);
  const [methodologyImages, setMethodologyImages] = useState<string[]>([]);
  const [methodologyYoutubeLinks, setMethodologyYoutubeLinks] = useState<string[]>([]);
  const [newOverviewYoutube, setNewOverviewYoutube] = useState("");
  const [newMethodologyYoutube, setNewMethodologyYoutube] = useState("");

  // Collaborators, Funding Agencies, Supporting Agencies
  const [fundingAgencies, setFundingAgencies] = useState<ProjectPartnerAgency[]>([]);
  const [supportingAgencies, setSupportingAgencies] = useState<ProjectPartnerAgency[]>([]);
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);

  // Temp input states for Funding Agencies
  const [tempFunderName, setTempFunderName] = useState("");
  const [tempFunderRole, setTempFunderRole] = useState("");
  const [tempFunderWebsite, setTempFunderWebsite] = useState("");
  const [tempFunderLogo, setTempFunderLogo] = useState("");

  // Temp input states for Supporting Agencies
  const [tempSupportName, setTempSupportName] = useState("");
  const [tempSupportRole, setTempSupportRole] = useState("");
  const [tempSupportWebsite, setTempSupportWebsite] = useState("");
  const [tempSupportLogo, setTempSupportLogo] = useState("");

  // Temp input states for Collaborators
  const [tempCollabName, setTempCollabName] = useState("");
  const [tempCollabRole, setTempCollabRole] = useState("");
  const [tempCollabWebsite, setTempCollabWebsite] = useState("");
  const [tempCollabLogo, setTempCollabLogo] = useState("");

  // Editing state for array items
  const [editingFunderIdx, setEditingFunderIdx] = useState<number | null>(null);
  const [editingSupportIdx, setEditingSupportIdx] = useState<number | null>(null);
  const [editingCollabIdx, setEditingCollabIdx] = useState<number | null>(null);
  const [editingPositionIdx, setEditingPositionIdx] = useState<number | null>(null);
  const [editingOverviewYtIdx, setEditingOverviewYtIdx] = useState<number | null>(null);
  const [editingMethodologyYtIdx, setEditingMethodologyYtIdx] = useState<number | null>(null);

  // Adding staff helpers
  const [newStaffSelection, setNewStaffSelection] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonFullName, setNewPersonFullName] = useState("");
  const [newPersonRole, setNewPersonRole] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonBio, setNewPersonBio] = useState("");
  const [newPersonBoardType, setNewPersonBoardType] = useState<"staff" | "board" | "rab">("staff");
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);
  const [createPersonError, setCreatePersonError] = useState("");

  // Adding career position helpers
  const [newPositionTitle, setNewPositionTitle] = useState("");
  const [newPositionDeadline, setNewPositionDeadline] = useState("");
  const [newPositionDescription, setNewPositionDescription] = useState("");
  const [newPositionApplyLink, setNewPositionApplyLink] = useState("");

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Synchronize state when opening or projectToEdit changes
  useEffect(() => {
    if (projectToEdit) {
      setFormData({
        id: projectToEdit.id || projectToEdit._id || '',
        slug: projectToEdit.slug || '',
        title: projectToEdit.title || '',
        tag: projectToEdit.tag || 'Special Research Stream',
        description: projectToEdit.description || '',
        longDescription: projectToEdit.longDescription || '',
        methodology: projectToEdit.methodology || '',
        aims: Array.isArray(projectToEdit.aims) ? projectToEdit.aims.join(', ') : (projectToEdit.aims || ''),
        impact: Array.isArray(projectToEdit.impact) ? projectToEdit.impact.join('\n') : (projectToEdit.impact || ''),
        keywords: Array.isArray(projectToEdit.keywords) ? projectToEdit.keywords.join(', ') : (projectToEdit.keywords || ''),
        color: projectToEdit.color || 'bg-brand-acid',
        status: projectToEdit.status || 'Ongoing',
        year: projectToEdit.year || new Date().getFullYear().toString(),
        startDate: projectToEdit.startDate || '',
        endDate: projectToEdit.endDate || '',
        image: projectToEdit.image || '',
        outputUrl: projectToEdit.outputUrl || '',
        outputLabel: projectToEdit.outputLabel || '',
      });

      setRelatedLinks(projectToEdit.relatedLinks || []);
      setAssociatedCentres(projectToEdit.associatedCentres || []);
      setProjectDirectors(projectToEdit.projectDirectors || []);
      setProjectStaffs(projectToEdit.projectStaffs || []);
      setOpenPositions(projectToEdit.openPositions || []);
      setSubPages(projectToEdit.subPages || []);

      setOverviewImages(projectToEdit.overviewImages || []);
      setOverviewYoutubeLinks(projectToEdit.overviewYoutubeLinks || []);
      setMethodologyImages(projectToEdit.methodologyImages || []);
      setMethodologyYoutubeLinks(projectToEdit.methodologyYoutubeLinks || []);

      // Parse funding agencies
      if (Array.isArray(projectToEdit.fundingAgencies) && projectToEdit.fundingAgencies.length > 0) {
        setFundingAgencies(projectToEdit.fundingAgencies);
      } else if (projectToEdit.fundingAgency) {
        setFundingAgencies(
          projectToEdit.fundingAgency.split(',').map((name: string) => ({
            name: name.trim(),
            role: 'Primary Funding Body'
          })).filter((f: any) => Boolean(f.name))
        );
      } else {
        setFundingAgencies([]);
      }

      // Parse supporting agencies
      if (Array.isArray(projectToEdit.supportingAgencies) && projectToEdit.supportingAgencies.length > 0) {
        setSupportingAgencies(projectToEdit.supportingAgencies);
      } else if (projectToEdit.collaboratingAgency) {
        setSupportingAgencies(
          projectToEdit.collaboratingAgency.split(',').map((name: string) => ({
            name: name.trim(),
            role: 'Supporting / Co-funding Body'
          })).filter((s: any) => Boolean(s.name))
        );
      } else {
        setSupportingAgencies([]);
      }

      // Parse collaborators
      if (Array.isArray(projectToEdit.collaborators) && projectToEdit.collaborators.length > 0) {
        setCollaborators(projectToEdit.collaborators);
      } else {
        setCollaborators([]);
      }
    } else {
      // Default reset for New Project
      setFormData({
        id: `PROJ-${Math.floor(100 + Math.random() * 900)}`,
        slug: '',
        title: '',
        tag: 'Special Research Stream',
        description: '',
        longDescription: '',
        methodology: '',
        aims: 'Documentation, Preservation, Machine Translation',
        impact: 'Baseline transformers for low-resource varieties\n10+ communities actively engaged\nStandardized open acoustic corpus',
        keywords: 'AI, NLP, Speech, Low-Resource, Tribal',
        color: 'bg-brand-acid',
        status: 'Ongoing',
        year: new Date().getFullYear().toString(),
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        image: '',
        outputUrl: '',
        outputLabel: '',
      });

      setRelatedLinks([]);
      setAssociatedCentres([]);
      setProjectDirectors([]);
      setProjectStaffs([]);
      setOpenPositions([]);
      setSubPages([]);
      setOverviewImages([]);
      setOverviewYoutubeLinks([]);
      setMethodologyImages([]);
      setMethodologyYoutubeLinks([]);
      setFundingAgencies([]);
      setSupportingAgencies([]);
      setCollaborators([]);
    }

    // Reset input fields
    setTempFunderName("");
    setTempFunderRole("");
    setTempFunderWebsite("");
    setTempFunderLogo("");

    setTempSupportName("");
    setTempSupportRole("");
    setTempSupportWebsite("");
    setTempSupportLogo("");

    setTempCollabName("");
    setTempCollabRole("");
    setTempCollabWebsite("");
    setTempCollabLogo("");

    setEditingFunderIdx(null);
    setEditingSupportIdx(null);
    setEditingCollabIdx(null);
    setEditingPositionIdx(null);
    setEditingOverviewYtIdx(null);
    setEditingMethodologyYtIdx(null);

    setNewStaffSelection("");
    setNewPersonName("");
    setNewPersonFullName("");
    setNewPersonRole("");
    setNewPersonEmail("");
    setNewPersonBio("");
    setCreatePersonError("");
    setSubmitError("");
  }, [projectToEdit, isOpen]);

  // Handle inline creation of a new person and assign to project
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
          Authorization: `Bearer ${token || ""}`
        },
        body: JSON.stringify(dataModel)
      });
      if (response.ok) {
        if (!projectStaffs.includes(generatedSlug)) {
          setProjectStaffs([...projectStaffs, generatedSlug]);
        }
        
        // Reset form
        setNewPersonName("");
        setNewPersonFullName("");
        setNewPersonRole("");
        setNewPersonEmail("");
        setNewPersonBio("");
        setNewPersonBoardType("staff");
        setCreatePersonError("");

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

  // Collaborators, Funding & Supporting agencies array helpers (with EDIT & ADD support)
  const handleSaveFunder = () => {
    if (!tempFunderName.trim()) return;
    const item: ProjectPartnerAgency = {
      name: tempFunderName.trim(),
      role: tempFunderRole.trim() || 'Funding Agency',
      website: tempFunderWebsite.trim(),
      logo: tempFunderLogo.trim()
    };
    if (editingFunderIdx !== null && editingFunderIdx >= 0 && editingFunderIdx < fundingAgencies.length) {
      const updated = [...fundingAgencies];
      updated[editingFunderIdx] = item;
      setFundingAgencies(updated);
      setEditingFunderIdx(null);
    } else {
      setFundingAgencies([...fundingAgencies, item]);
    }
    setTempFunderName("");
    setTempFunderRole("");
    setTempFunderWebsite("");
    setTempFunderLogo("");
  };

  const handleStartEditFunder = (idx: number) => {
    const f = fundingAgencies[idx];
    if (!f) return;
    setEditingFunderIdx(idx);
    setTempFunderName(f.name || "");
    setTempFunderRole(f.role || "");
    setTempFunderWebsite(f.website || "");
    setTempFunderLogo(f.logo || "");
  };

  const handleCancelEditFunder = () => {
    setEditingFunderIdx(null);
    setTempFunderName("");
    setTempFunderRole("");
    setTempFunderWebsite("");
    setTempFunderLogo("");
  };

  const handleSaveSupport = () => {
    if (!tempSupportName.trim()) return;
    const item: ProjectPartnerAgency = {
      name: tempSupportName.trim(),
      role: tempSupportRole.trim() || 'Supporting Agency',
      website: tempSupportWebsite.trim(),
      logo: tempSupportLogo.trim()
    };
    if (editingSupportIdx !== null && editingSupportIdx >= 0 && editingSupportIdx < supportingAgencies.length) {
      const updated = [...supportingAgencies];
      updated[editingSupportIdx] = item;
      setSupportingAgencies(updated);
      setEditingSupportIdx(null);
    } else {
      setSupportingAgencies([...supportingAgencies, item]);
    }
    setTempSupportName("");
    setTempSupportRole("");
    setTempSupportWebsite("");
    setTempSupportLogo("");
  };

  const handleStartEditSupport = (idx: number) => {
    const s = supportingAgencies[idx];
    if (!s) return;
    setEditingSupportIdx(idx);
    setTempSupportName(s.name || "");
    setTempSupportRole(s.role || "");
    setTempSupportWebsite(s.website || "");
    setTempSupportLogo(s.logo || "");
  };

  const handleCancelEditSupport = () => {
    setEditingSupportIdx(null);
    setTempSupportName("");
    setTempSupportRole("");
    setTempSupportWebsite("");
    setTempSupportLogo("");
  };

  const handleSaveCollaborator = () => {
    if (!tempCollabName.trim()) return;
    const item: ProjectCollaborator = {
      name: tempCollabName.trim(),
      role: tempCollabRole.trim() || 'Research Partner',
      website: tempCollabWebsite.trim(),
      logo: tempCollabLogo.trim()
    };
    if (editingCollabIdx !== null && editingCollabIdx >= 0 && editingCollabIdx < collaborators.length) {
      const updated = [...collaborators];
      updated[editingCollabIdx] = item;
      setCollaborators(updated);
      setEditingCollabIdx(null);
    } else {
      setCollaborators([...collaborators, item]);
    }
    setTempCollabName("");
    setTempCollabRole("");
    setTempCollabWebsite("");
    setTempCollabLogo("");
  };

  const handleStartEditCollaborator = (idx: number) => {
    const c = collaborators[idx];
    if (!c) return;
    setEditingCollabIdx(idx);
    setTempCollabName(c.name || "");
    setTempCollabRole(c.role || "");
    setTempCollabWebsite(c.website || "");
    setTempCollabLogo(c.logo || "");
  };

  const handleCancelEditCollaborator = () => {
    setEditingCollabIdx(null);
    setTempCollabName("");
    setTempCollabRole("");
    setTempCollabWebsite("");
    setTempCollabLogo("");
  };

  const handleSavePosition = () => {
    if (!newPositionTitle.trim() || !newPositionDescription.trim()) return;
    const item = {
      title: newPositionTitle.trim(),
      description: newPositionDescription.trim(),
      deadline: newPositionDeadline.trim() || 'Ongoing',
      applyLink: newPositionApplyLink.trim()
    };
    if (editingPositionIdx !== null && editingPositionIdx >= 0 && editingPositionIdx < openPositions.length) {
      const updated = [...openPositions];
      updated[editingPositionIdx] = item;
      setOpenPositions(updated);
      setEditingPositionIdx(null);
    } else {
      setOpenPositions([...openPositions, item]);
    }
    setNewPositionTitle("");
    setNewPositionDescription("");
    setNewPositionDeadline("");
    setNewPositionApplyLink("");
  };

  const handleStartEditPosition = (idx: number) => {
    const pos = openPositions[idx];
    if (!pos) return;
    setEditingPositionIdx(idx);
    setNewPositionTitle(pos.title || "");
    setNewPositionDeadline(pos.deadline || "");
    setNewPositionDescription(pos.description || "");
    setNewPositionApplyLink(pos.applyLink || "");
  };

  const handleCancelEditPosition = () => {
    setEditingPositionIdx(null);
    setNewPositionTitle("");
    setNewPositionDeadline("");
    setNewPositionDescription("");
    setNewPositionApplyLink("");
  };

  // Subpage management helpers
  const addSubPage = () => {
    setSubPages([...subPages, {
      slug: `subpage-${subPages.length + 1}`,
      title: 'New Dossier Chapter',
      icon: 'BookOpen',
      type: 'markdown',
      content: { teaser: '', markdown: '' }
    }]);
  };

  const removeSubPage = (idx: number) => {
    setSubPages(subPages.filter((_, i) => i !== idx));
  };

  const handleMoveSubPage = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= subPages.length) return;
    const list = [...subPages];
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setSubPages(list);
  };

  const updateSubPageCore = (idx: number, key: string, val: string) => {
    setSubPages(subPages.map((item, i) => {
      if (i === idx) {
        const updated = { ...item, [key]: val };
        if (key === 'type') {
          updated.content = val === 'markdown' 
            ? { teaser: '', markdown: '' } 
            : val === 'list' 
              ? [] 
              : {};
        }
        return updated;
      }
      return item;
    }));
  };

  const updateSubPageMarkdownContent = (idx: number, field: string, val: string) => {
    setSubPages(subPages.map((item, i) => {
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
    setSubPages(subPages.map((item, i) => {
      if (i === subIdx) {
        const list = Array.isArray(item.content) ? [...item.content] : [];
        list.push({ name: '', role: '', affiliation: '', url: '', photoUrl: '' });
        return { ...item, content: list };
      }
      return item;
    }));
  };

  const updateSubPageListItem = (subIdx: number, itemIdx: number, field: string, val: string) => {
    setSubPages(subPages.map((item, i) => {
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
    setSubPages(subPages.map((item, i) => {
      if (i === subIdx && Array.isArray(item.content)) {
        const list = item.content.filter((_, elemIdx) => elemIdx !== itemIdx);
        return { ...item, content: list };
      }
      return item;
    }));
  };

  // Final form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert("Session expired. Please log in with admin privileges.");
      return;
    }

    const trimmedSlug = (formData.slug.trim() || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
      .toLowerCase();

    if (!trimmedSlug) {
      setSubmitError("Project slug or title is required.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const aimsArray = formData.aims.split(',').map(s => s.trim()).filter(Boolean);
      const impactArray = formData.impact.split('\n').map(s => s.trim()).filter(Boolean);
      const keywordsArray = formData.keywords.split(',').map(s => s.trim()).filter(Boolean);

      // Derive legacy string values for fundingAgency and collaboratingAgency to guarantee search filter compatibility
      const fundingAgencyStr = fundingAgencies.length > 0 
        ? fundingAgencies.map(f => f.name).join(', ') 
        : (projectToEdit?.fundingAgency || '');

      const collaboratingAgencyStr = [...supportingAgencies, ...collaborators].length > 0
        ? [...supportingAgencies, ...collaborators].map(c => c.name).join(', ')
        : (projectToEdit?.collaboratingAgency || '');

      const payload = {
        ...formData,
        slug: trimmedSlug,
        aims: aimsArray,
        impact: impactArray,
        keywords: keywordsArray,
        relatedLinks,
        associatedCentres,
        projectDirectors,
        projectStaffs,
        openPositions,
        subPages,
        overviewImages,
        overviewYoutubeLinks,
        methodologyImages,
        methodologyYoutubeLinks,
        fundingAgencies,
        supportingAgencies,
        collaborators,
        fundingAgency: fundingAgencyStr,
        collaboratingAgency: collaboratingAgencyStr
      };

      const url = isEdit 
        ? `/api/projects/${projectToEdit.slug || trimmedSlug}` 
        : '/api/projects';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const savedProject = data.project || payload;

        // Auto-register newly added open job roles to CoDIN announcements bulletin
        try {
          const existingTitles = isEdit ? ((projectToEdit?.openPositions || []).map((p: any) => p.title)) : [];
          const newlyAdded = openPositions.filter((pos: any) => !existingTitles.includes(pos.title));
          for (const pos of newlyAdded) {
            await fetch('/api/announcements', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                title: `Job Opportunity: ${pos.title} in project "${formData.title}"`,
                category: 'Recruitment',
                date: `Apply by: ${pos.deadline || 'Ongoing'}`,
                description: `${pos.description}. Full details are available on the ${formData.title} project staff panel.`,
                link: `/projects/${trimmedSlug}`,
                highlighted: true,
                showInBulletin: true
              })
            });
          }
        } catch (annError) {
          console.error("Failed to auto-register job ad announcement:", annError);
        }

        onSuccess(savedProject);
        onClose();
      } else {
        const errData = await res.json();
        setSubmitError(errData.error || 'Server validation error.');
      }
    } catch (err: any) {
      console.error("Save Project Error:", err);
      setSubmitError(err.message || 'Error saving project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-ink/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-paper border-4 border-ink shadow-[16px_16px_0px_rgba(0,0,0,1)] w-full max-w-4xl max-h-[90vh] overflow-y-auto relative my-8"
      >
        {/* Modal Sticky Header */}
        <div className="bg-brand-acid border-b-2 border-ink p-5 sticky top-0 z-30 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-ink animate-pulse" />
            <h3 className="font-mono text-xs sm:text-sm font-black uppercase tracking-widest text-ink">
              {isEdit ? `CMS // Edit Research Pipeline (${projectToEdit?.slug || projectToEdit?.id})` : 'CMS // Instantiate New Research Project'}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-brand-orange border border-transparent hover:border-ink cursor-pointer"
          >
            <X className="w-5 h-5 text-ink" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">

          {submitError && (
            <div className="p-3 bg-red-100 border-2 border-red-600 text-red-800 font-mono text-xs font-bold uppercase tracking-wider">
              {submitError}
            </div>
          )}

          {/* Section 1: Basic Identifiers & Brand */}
          <div className="space-y-4">
            <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange border-b border-ink/10 pb-1 select-none">
              1. Basic Identifiers & Brand
            </h4>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Project Code (ID) *</label>
                <input 
                  type="text" 
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g. PROJ-001"
                  required
                  className="w-full h-10 px-3 border border-ink font-mono text-xs focus:outline-none uppercase"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Project Display Title *</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      title: newTitle,
                      slug: prev.slug || newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                    }));
                  }}
                  placeholder="e.g. Project Kailash"
                  required
                  className="w-full h-10 px-3 border border-ink font-serif font-black text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Project Unique Slug *</label>
                <input 
                  type="text" 
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. kailash"
                  required
                  className="w-full h-10 px-3 border border-ink font-mono text-xs focus:outline-none lowercase"
                />
              </div>
              <div>
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Sub-brand Badge Tag</label>
                <input 
                  type="text" 
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  placeholder="e.g. Flagship AI Initiative"
                  required
                  className="w-full h-10 px-3 border border-ink font-mono text-xs focus:outline-none uppercase"
                />
              </div>
              <div>
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Color Preset</label>
                <select 
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 px-2 border border-ink font-mono text-[10px] font-bold focus:outline-none bg-white"
                >
                  <option value="bg-brand-acid">ACID GREEN (Primary)</option>
                  <option value="bg-brand-blue text-white">ROYAL BLUE</option>
                  <option value="bg-brand-orange text-white">MANDARIN ORANGE</option>
                  <option value="bg-paper">COSMIC PAPER (Light Gray)</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Project Phase Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-2 border border-ink font-mono text-[10px] font-bold focus:outline-none bg-white"
                >
                  <option value="Ongoing">Ongoing (Active Research)</option>
                  <option value="Upcoming">Upcoming Pipeline</option>
                  <option value="Completed">Completed Efforts</option>
                  <option value="Archived">Archived Registry</option>
                  <option value="Draft">Draft Stage</option>
                </select>
              </div>
              <div>
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Initiation Year *</label>
                <input 
                  type="text" 
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="e.g. 2024"
                  required
                  className="w-full h-10 px-3 border border-ink font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Start Date (Optional)</label>
                <input 
                  type="date" 
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full h-10 px-2 border border-ink font-mono text-[10px] focus:outline-none bg-white"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Project Output Page / Website URL (Optional)</label>
                <input 
                  type="url" 
                  value={formData.outputUrl}
                  onChange={(e) => setFormData({ ...formData, outputUrl: e.target.value })}
                  placeholder="e.g. https://github.com/my-org/my-project"
                  className="w-full h-10 px-3 border border-ink font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Link Button Label</label>
                <input 
                  type="text" 
                  value={formData.outputLabel}
                  onChange={(e) => setFormData({ ...formData, outputLabel: e.target.value })}
                  placeholder="Default: Project Output Page / Repository"
                  className="w-full h-10 px-3 border border-ink font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Cover Image Source</label>
              <div className="flex gap-2">
                <input 
                  type="url" 
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-banner or upload below"
                  className="flex-1 h-10 px-3 border border-ink font-mono text-xs focus:outline-none"
                />
                <label className="px-4 py-2 bg-slate-100 hover:bg-brand-acid text-ink font-mono text-[10px] font-black uppercase tracking-wider border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5 cursor-pointer uppercase select-none shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  {isUploading ? "Uploading..." : "Upload Cover 📷"}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const url = await uploadToCloudinary(reader.result as string);
                        if (url) setFormData(prev => ({ ...prev, image: url }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
              {formData.image && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={formData.image} alt="Preview" className="w-20 h-12 object-cover border border-ink" referrerPolicy="no-referrer" />
                  <span className="text-[8px] font-mono text-ink/50 uppercase">Cover image linked</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Research Parameters, Methodology, & Strategic Aims */}
          <div className="space-y-4">
            <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange border-b border-ink/10 pb-1 select-none">
              2. Research Parameters, Methodology, & Strategic Aims
            </h4>

            <div>
              <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Brief Description (Showcase Teaser)</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Provide a concise 2-sentence teaser summarizing the core research bounds..."
                className="w-full p-3 border border-ink font-mono text-xs focus:outline-none"
              />
            </div>

            {/* Strategic Overview */}
            <div>
              <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Executive Mission Summary (Strategic Overview tab content)</label>
              <MarkdownHelperBar 
                textareaId="proj-form-longdesc" 
                value={formData.longDescription}
                onChange={(val) => setFormData({ ...formData, longDescription: val })}
              />
              <MarkdownMediaHelper 
                onInsert={(text) => setFormData({ ...formData, longDescription: formData.longDescription + text })}
              />
              <textarea 
                id="proj-form-longdesc"
                value={formData.longDescription}
                onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                rows={4}
                placeholder="Explain why this project was instantiated, its political background, and community impact..."
                className="w-full p-3 border border-ink font-mono text-xs focus:outline-none"
              />
              {formData.longDescription && (
                <div className="mt-2 p-3 border border-dashed border-ink bg-slate-50 max-h-[140px] overflow-y-auto">
                  <label className="block text-[8px] font-black uppercase mb-1 text-brand-blue select-none">Live Overview Markdown Preview</label>
                  <div 
                    className="prose prose-sm max-w-none text-ink font-sans text-xs font-semibold"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(formData.longDescription) }}
                  />
                </div>
              )}
            </div>

            {/* Fieldwork Methodology */}
            <div>
              <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Technical Framework & Fieldwork Methodology</label>
              <MarkdownHelperBar 
                textareaId="proj-form-methodology" 
                value={formData.methodology}
                onChange={(val) => setFormData({ ...formData, methodology: val })}
              />
              <MarkdownMediaHelper 
                onInsert={(text) => setFormData({ ...formData, methodology: formData.methodology + text })}
              />
              <textarea 
                id="proj-form-methodology"
                value={formData.methodology}
                onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                rows={4}
                placeholder="Explain the technical workflow, data formats (e.g. Wav/JSON), annotation standard, etc..."
                className="w-full p-3 border border-ink font-mono text-xs focus:outline-none"
              />
              {formData.methodology && (
                <div className="mt-2 p-3 border border-dashed border-ink bg-slate-50 max-h-[140px] overflow-y-auto">
                  <label className="block text-[8px] font-black uppercase mb-1 text-brand-blue select-none">Live Methodology Markdown Preview</label>
                  <div 
                    className="prose prose-sm max-w-none text-ink font-sans text-xs font-semibold"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(formData.methodology) }}
                  />
                </div>
              )}
            </div>

            {/* Aims, Impact & Keywords */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Strategic Priorities / Aims (Comma-separated list)</label>
                <input 
                  type="text" 
                  value={formData.aims}
                  onChange={(e) => setFormData({ ...formData, aims: e.target.value })}
                  placeholder="e.g. Bias Mitigation, Training Datasets, Linguistic Equity"
                  className="w-full h-10 px-3 border border-ink font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Focus Keywords (Comma-separated list)</label>
                <input 
                  type="text" 
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="e.g. AI, NLP, Low-Resource Varieties"
                  className="w-full h-10 px-3 border border-ink font-mono text-xs focus:outline-none uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Strategic Project Impact Values (One impact statement per line)</label>
              <textarea 
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                rows={3}
                placeholder="e.g. Traditional archiving standard implemented&#10;Inclusion of 250+ tribal linguistic nodes&#10;Active research center partnership established"
                className="w-full p-2.5 border border-ink font-mono text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Organizational Alliances, Leadership & Staffing */}
          <div className="space-y-6 pt-4 border-t border-ink/10">
            <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange border-b border-ink/10 pb-1 select-none">
              3. Organizational Alliances, Leadership &amp; Staffing
            </h4>

            {/* Associated Centres */}
            <div>
              <label className="block font-mono text-[8.5px] font-bold uppercase mb-2 text-ink/75">
                Link Project to Specific Centres
              </label>
              <div className="flex flex-wrap gap-2">
                {dynamicCentres.map(c => (
                  <label key={c.slug} className="flex items-center gap-1.5 px-2.5 py-1.5 border border-ink bg-white cursor-pointer font-mono text-[9px] font-bold select-none hover:bg-brand-acid transition-colors">
                    <input 
                      type="checkbox"
                      checked={associatedCentres.includes(c.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssociatedCentres([...associatedCentres, c.slug]);
                        } else {
                          setAssociatedCentres(associatedCentres.filter(slug => slug !== c.slug));
                        }
                      }}
                      className="w-3 h-3 accent-brand-blue"
                    />
                    {c.shortName || c.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Project Directors */}
            <div>
              <label className="block font-mono text-[8.5px] font-bold uppercase mb-2 text-ink/75">
                Project Directors from Existing Staff
              </label>
              <div className="flex flex-wrap gap-2">
                {dynamicPeople.map(member => (
                  <label key={member.slug} className="flex items-center gap-1.5 px-2.5 py-1.5 border border-ink bg-white cursor-pointer font-mono text-[9px] font-bold select-none hover:bg-brand-acid transition-colors">
                    <input 
                      type="checkbox"
                      checked={projectDirectors.includes(member.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setProjectDirectors([...projectDirectors, member.slug]);
                        } else {
                          setProjectDirectors(projectDirectors.filter(slug => slug !== member.slug));
                        }
                      }}
                      className="w-3 h-3 accent-brand-blue"
                    />
                    {member.fullName || member.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Project Staff */}
            <div className="border border-ink p-4 bg-white/70 space-y-4 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <div className="font-mono text-[9px] font-black uppercase text-brand-blue select-none border-b border-ink/5 pb-1">
                Add Project Staff from Existing Council Staff
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-grow">
                  <label className="block font-mono text-[8.5px] font-bold uppercase mb-1">Select Existing Staff Member</label>
                  <select 
                    value={newStaffSelection}
                    onChange={(e) => setNewStaffSelection(e.target.value)}
                    className="w-full h-8 px-2 border border-ink font-mono text-[10px] focus:outline-none bg-white"
                  >
                    <option value="">-- Choose Staff Member --</option>
                    {dynamicPeople.map(member => (
                      <option key={member.slug} value={member.slug}>{member.fullName || member.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (newStaffSelection) {
                      if (!projectStaffs.includes(newStaffSelection)) {
                        setProjectStaffs([...projectStaffs, newStaffSelection]);
                      }
                      setNewStaffSelection("");
                    }
                  }}
                  className="h-8 px-4 border border-ink bg-brand-acid text-ink font-mono text-[9px] font-bold uppercase hover:bg-white cursor-pointer whitespace-nowrap"
                >
                  + Add Staff
                </button>
              </div>

              {/* In-line Create & Register New Person to Council & Project */}
              <div className="border border-brand-orange border-dashed p-3 bg-brand-orange/5 space-y-3 pt-3">
                <div className="text-[9px] font-mono font-bold text-brand-orange uppercase tracking-wider border-b border-brand-orange/20 pb-1 flex items-center justify-between select-none">
                  <span>Create & Register New Person to Council Database</span>
                  <span className="text-[8px] text-ink/40 font-normal normal-case">Adds automatically as Project Staff</span>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-3 text-left">
                  <div>
                    <label className="block font-mono text-[8px] font-bold uppercase text-ink/80 mb-1">Full Name *</label>
                    <input 
                      type="text"
                      value={newPersonFullName}
                      onChange={(e) => {
                        setNewPersonFullName(e.target.value);
                        if (!newPersonName) setNewPersonName(e.target.value);
                      }}
                      placeholder="e.g. Dr. Ramesh Kumar Sharma"
                      className="w-full h-8 px-2 border border-ink font-mono text-[10px] focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[8px] font-bold uppercase text-ink/80 mb-1">Display/Short Name *</label>
                    <input 
                      type="text"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      placeholder="e.g. Dr. Ramesh Kumar"
                      className="w-full h-8 px-2 border border-ink font-mono text-[10px] focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[8px] font-bold uppercase text-ink/80 mb-1">Designation / Role *</label>
                    <input 
                      type="text"
                      value={newPersonRole}
                      onChange={(e) => setNewPersonRole(e.target.value)}
                      placeholder="e.g. Project Researcher"
                      className="w-full h-8 px-2 border border-ink font-mono text-[10px] focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[8px] font-bold uppercase text-ink/80 mb-1">Email Address *</label>
                    <input 
                      type="email"
                      value={newPersonEmail}
                      onChange={(e) => setNewPersonEmail(e.target.value)}
                      placeholder="e.g. ramesh@council.edu"
                      className="w-full h-8 px-2 border border-ink font-mono text-[10px] focus:outline-none bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-mono text-[8px] font-bold uppercase text-ink/80 mb-1">Brief Biography (Optional)</label>
                    <textarea 
                      value={newPersonBio}
                      onChange={(e) => setNewPersonBio(e.target.value)}
                      placeholder="Enter a short bio or research interests..."
                      rows={2}
                      className="w-full p-2 border border-ink font-mono text-[10px] focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[8px] font-bold uppercase text-ink/80 mb-1">Database Category / Role Type</label>
                    <select 
                      value={newPersonBoardType}
                      onChange={(e: any) => setNewPersonBoardType(e.target.value)}
                      className="w-full h-8 px-2 border border-ink font-mono text-[10px] focus:outline-none bg-white"
                    >
                      <option value="staff">Council Staff / Researcher Only</option>
                      <option value="board">Governing Board Member</option>
                      <option value="rab">Research Advisory Board (RAB)</option>
                    </select>
                  </div>

                  {createPersonError && (
                    <div className="sm:col-span-2 text-[9px] text-brand-orange bg-brand-orange/5 font-mono font-semibold p-2 border border-brand-orange/20">
                      Error: {createPersonError}
                    </div>
                  )}

                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="button"
                      disabled={isCreatingPerson}
                      onClick={handleCreateAndAddStaff}
                      className="px-3 py-1.5 border border-ink bg-brand-blue text-white font-mono text-[9px] font-bold uppercase hover:bg-ink cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {isCreatingPerson ? "Creating Profile..." : "Create & Add As Staff"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Current Project Staff Listed */}
              <div className="border-t border-ink/10 pt-3">
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-1.5 text-ink/40 select-none">
                  Current Project Staff Listed ({projectStaffs.length})
                </label>
                <div className="space-y-1.5">
                  {projectStaffs.map((staff, idx) => {
                    const matchedMember = dynamicPeople.find(m => m.slug === staff);
                    const displayedText = matchedMember ? `${matchedMember.fullName || matchedMember.name} (Council Staff)` : staff;
                    return (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 border border-ink text-[10px] font-mono">
                        <span>{displayedText}</span>
                        <button 
                          type="button"
                          onClick={() => setProjectStaffs(projectStaffs.filter((_, i) => i !== idx))}
                          className="text-brand-orange hover:text-ink font-black text-xs px-1 cursor-pointer"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
                  {projectStaffs.length === 0 && (
                    <p className="text-[10px] italic text-ink/40 font-mono select-none">No staff currently added to project.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Job Advertisement Vacancies Board */}
            <div className="border border-ink p-4 bg-white/70 space-y-4 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <div className="font-mono text-[9px] font-black uppercase text-brand-orange select-none border-b border-ink/5 pb-1 flex items-center gap-1.5">
                Job Advertisement Board &amp; Application Manager
              </div>
              
              <div className="space-y-3 p-3 bg-white border border-ink font-mono text-[10px]">
                <div className="flex items-center justify-between border-b border-ink/5 pb-1">
                  <span className="font-mono text-[8.5px] uppercase font-black text-brand-blue block">
                    {editingPositionIdx !== null ? `Edit Vacancy Opening #${editingPositionIdx + 1}` : 'Advertise a New Vacancy / Recruitment Opportunity'}
                  </span>
                  {editingPositionIdx !== null && (
                    <button
                      type="button"
                      onClick={handleCancelEditPosition}
                      className="text-brand-orange text-[8px] uppercase underline cursor-pointer hover:text-ink font-bold"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Job Vacancy Title</label>
                    <input 
                      type="text"
                      value={newPositionTitle}
                      onChange={(e) => setNewPositionTitle(e.target.value)}
                      placeholder="e.g. Lead Linguistic Scholar"
                      className="w-full h-8 px-2 border border-ink focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Submit Application Deadline</label>
                    <input 
                      type="text"
                      value={newPositionDeadline}
                      onChange={(e) => setNewPositionDeadline(e.target.value)}
                      placeholder="e.g. June 25, 2026 or Ongoing"
                      className="w-full h-8 px-2 border border-ink focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Vacancy Role Description</label>
                    <textarea 
                      value={newPositionDescription}
                      onChange={(e) => setNewPositionDescription(e.target.value)}
                      placeholder="Describe the research responsibilities, community engagement..."
                      rows={2}
                      className="w-full p-2 border border-ink focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Application Detail URL Link (Optional)</label>
                    <input 
                      type="text" 
                      value={newPositionApplyLink}
                      onChange={(e) => setNewPositionApplyLink(e.target.value)}
                      placeholder="Leave blank to use CoDIN integrated application page"
                      className="w-full h-8 px-2 border border-ink focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  {editingPositionIdx !== null && (
                    <button
                      type="button"
                      onClick={handleCancelEditPosition}
                      className="px-3 py-1.5 border border-ink bg-white text-ink font-black uppercase hover:bg-zinc-100 cursor-pointer text-[9px]"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSavePosition}
                    className={`px-3 py-1.5 border border-ink font-black uppercase cursor-pointer text-[9px] ${
                      editingPositionIdx !== null 
                        ? 'bg-brand-blue text-white hover:bg-ink'
                        : 'bg-brand-orange text-white hover:bg-ink'
                    }`}
                  >
                    {editingPositionIdx !== null ? '💾 Update Vacancy Opening' : '+ Add Vacancy Opening'}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-ink/10">
                <label className="block font-mono text-[8.5px] font-bold uppercase mb-2 text-ink/45">
                  Currently Live Advertised Job Roles ({openPositions.length})
                </label>
                <div className="space-y-2">
                  {openPositions.map((pos, pIdx) => (
                    <div key={pIdx} className="bg-white border border-ink p-3 space-y-1 relative shadow-[2px_2px_0px_rgba(0,0,0,1)] text-[10px] font-mono">
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEditPosition(pIdx)}
                          className="p-1 hover:bg-brand-acid text-ink border border-ink/30 hover:border-ink bg-white shadow-[1px_1px_0px_rgba(0,0,0,1)] rounded-sm cursor-pointer flex items-center gap-1 text-[8.5px] font-bold uppercase"
                          title="Edit vacancy details"
                        >
                          <Pencil className="w-3 h-3 text-brand-blue" />
                          <span>Edit</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            if (editingPositionIdx === pIdx) handleCancelEditPosition();
                            setOpenPositions(openPositions.filter((_, i) => i !== pIdx));
                          }}
                          className="p-1 hover:bg-brand-orange text-brand-orange hover:text-white border border-transparent hover:border-ink rounded-sm shrink-0 cursor-pointer"
                          title="Remove job vacancy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="font-serif font-black text-sm text-ink pr-20">{pos.title}</div>
                      <div className="text-[8px] text-brand-blue uppercase font-bold">Apply date deadline: {pos.deadline}</div>
                      <div className="text-ink/65 line-clamp-2 uppercase tracking-tighter text-[8px] pr-20">{pos.description}</div>
                    </div>
                  ))}
                  {openPositions.length === 0 && (
                    <p className="font-mono text-[9px] text-ink/40 uppercase italic">No career vacancies currently listed.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Funding, Supporting Agencies & Collaborators (NEW MULTI-AGENCY CAPABILITIES) */}
          <div className="space-y-6 pt-4 border-t border-ink/10">
            <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange border-b border-ink/10 pb-1 select-none flex items-center justify-between">
              <span>4. Funding Agencies, Supporting Bodies &amp; Collaborators</span>
              <span className="text-[8px] text-ink/40 font-normal lowercase">Multiple partners with logos &amp; websites</span>
            </h4>

            {/* 4A: Funding Agencies */}
            <div className="border border-ink p-4 space-y-4 bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <div className="font-mono text-[9.5px] font-black uppercase text-brand-blue flex items-center gap-1.5 select-none border-b border-ink/10 pb-1.5">
                <Landmark className="w-3.5 h-3.5 text-brand-orange" />
                Funding Agencies ({fundingAgencies.length})
              </div>

              {/* Add Funder Form */}
              <div className="p-3 bg-paper/30 border border-ink/40 space-y-3 font-mono text-[10px]">
                {editingFunderIdx !== null && (
                  <div className="flex items-center justify-between bg-brand-acid/30 border border-ink px-2.5 py-1 text-[9px] font-bold text-ink">
                    <span>✏️ Editing Funding Agency #{editingFunderIdx + 1}: {fundingAgencies[editingFunderIdx]?.name}</span>
                    <button 
                      type="button"
                      onClick={handleCancelEditFunder}
                      className="text-brand-orange underline text-[8.5px] cursor-pointer hover:text-ink font-mono uppercase font-bold"
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Agency / Grantor Name *</label>
                    <input 
                      type="text" 
                      value={tempFunderName}
                      onChange={(e) => setTempFunderName(e.target.value)}
                      placeholder="e.g. Ministry of Tribal Affairs"
                      className="w-full h-8 px-2 border border-ink focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Role / Grant Label</label>
                    <input 
                      type="text" 
                      value={tempFunderRole}
                      onChange={(e) => setTempFunderRole(e.target.value)}
                      placeholder="e.g. Primary Funding Body / Grantor"
                      className="w-full h-8 px-2 border border-ink focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Official Website URL</label>
                    <input 
                      type="url" 
                      value={tempFunderWebsite}
                      onChange={(e) => setTempFunderWebsite(e.target.value)}
                      placeholder="e.g. https://tribal.nic.in"
                      className="w-full h-8 px-2 border border-ink focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Logo or Photograph URL</label>
                    <div className="flex gap-1.5">
                      <input 
                        type="url" 
                        value={tempFunderLogo}
                        onChange={(e) => setTempFunderLogo(e.target.value)}
                        placeholder="https://... or upload"
                        className="w-full h-8 px-2 border border-ink focus:outline-none bg-white"
                      />
                      <label className="px-2.5 h-8 bg-slate-100 hover:bg-brand-acid border border-ink text-[8.5px] font-bold uppercase flex items-center justify-center cursor-pointer shrink-0 select-none">
                        <span>Upload 📸</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const url = await uploadToCloudinary(reader.result as string);
                              if (url) setTempFunderLogo(url);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {tempFunderLogo && (
                  <div className="flex items-center gap-2 pt-1">
                    <img src={tempFunderLogo} alt="Logo preview" className="w-8 h-8 object-contain border border-ink bg-white p-0.5" referrerPolicy="no-referrer" />
                    <span className="text-[8px] text-ink/50 uppercase">Logo verified & ready to attach</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  {editingFunderIdx !== null && (
                    <button 
                      type="button" 
                      onClick={handleCancelEditFunder}
                      className="px-3 py-1.5 border border-ink bg-white text-ink font-mono text-[9px] font-bold uppercase hover:bg-zinc-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={handleSaveFunder}
                    className={`px-3.5 py-1.5 border border-ink font-mono text-[9px] font-black uppercase cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                      editingFunderIdx !== null 
                        ? 'bg-brand-blue text-white hover:bg-ink'
                        : 'bg-brand-acid text-ink hover:bg-ink hover:text-white'
                    }`}
                  >
                    {editingFunderIdx !== null ? '💾 Update Funding Agency' : '+ Add Funding Agency'}
                  </button>
                </div>
              </div>

              {/* Funders List */}
              <div className="space-y-2">
                {fundingAgencies.map((funder, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 border border-ink bg-paper/20 text-[10px] font-mono">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {funder.logo ? (
                        <img src={funder.logo} alt={funder.name} className="w-9 h-9 object-contain border border-ink bg-white p-0.5 shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 border border-ink bg-white flex items-center justify-center font-mono font-black text-xs text-brand-blue shrink-0">
                          {funder.name.charAt(0)}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <div className="font-serif font-black text-xs text-ink truncate">{funder.name}</div>
                        <div className="text-[8px] text-brand-orange uppercase font-bold">{funder.role || 'Funding Agency'}</div>
                        {funder.website && (
                          <a href={funder.website} target="_blank" rel="noopener noreferrer" className="text-[8px] text-brand-blue hover:underline inline-flex items-center gap-0.5 truncate">
                            {funder.website} <ArrowUpRight className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleStartEditFunder(idx)}
                        className="p-1 px-2 hover:bg-brand-acid text-ink border border-ink/40 hover:border-ink bg-white shadow-[1px_1px_0px_rgba(0,0,0,1)] rounded-sm cursor-pointer flex items-center gap-1 text-[8.5px] font-bold uppercase"
                        title="Edit funding agency"
                      >
                        <Pencil className="w-3 h-3 text-brand-blue" />
                        <span>Edit</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (editingFunderIdx === idx) handleCancelEditFunder();
                          setFundingAgencies(fundingAgencies.filter((_, i) => i !== idx));
                        }}
                        className="p-1 hover:bg-brand-orange text-brand-orange hover:text-white border border-transparent hover:border-ink rounded-sm shrink-0 cursor-pointer"
                        title="Delete agency"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {fundingAgencies.length === 0 && (
                  <p className="text-[9.5px] italic text-ink/40 font-mono">No funding agencies added yet.</p>
                )}
              </div>
            </div>

            {/* 4B: Supporting & Co-funding Agencies */}
            <div className="border border-ink p-4 space-y-4 bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <div className="font-mono text-[9.5px] font-black uppercase text-brand-blue flex items-center gap-1.5 select-none border-b border-ink/10 pb-1.5">
                <Users className="w-3.5 h-3.5 text-brand-orange" />
                Supporting &amp; Co-funding Agencies ({supportingAgencies.length})
              </div>

              {/* Add Supporting Agency Form */}
              <div className="p-3 bg-paper/30 border border-ink/40 space-y-3 font-mono text-[10px]">
                {editingSupportIdx !== null && (
                  <div className="flex items-center justify-between bg-brand-acid/30 border border-ink px-2.5 py-1 text-[9px] font-bold text-ink">
                    <span>✏️ Editing Supporting Agency #{editingSupportIdx + 1}: {supportingAgencies[editingSupportIdx]?.name}</span>
                    <button 
                      type="button"
                      onClick={handleCancelEditSupport}
                      className="text-brand-orange underline text-[8.5px] cursor-pointer hover:text-ink font-mono uppercase font-bold"
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Supporting Body Name *</label>
                    <input 
                      type="text" 
                      value={tempSupportName}
                      onChange={(e) => setTempSupportName(e.target.value)}
                      placeholder="e.g. Tribal Research Centre, Ooty"
                      className="w-full h-8 px-2 border border-ink focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Role / Affiliation</label>
                    <input 
                      type="text" 
                      value={tempSupportRole}
                      onChange={(e) => setTempSupportRole(e.target.value)}
                      placeholder="e.g. Co-funding Agency / Host Institute"
                      className="w-full h-8 px-2 border border-ink focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Official Website URL</label>
                    <input 
                      type="url" 
                      value={tempSupportWebsite}
                      onChange={(e) => setTempSupportWebsite(e.target.value)}
                      placeholder="e.g. https://trc.tn.gov.in"
                      className="w-full h-8 px-2 border border-ink focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Logo or Photograph URL</label>
                    <div className="flex gap-1.5">
                      <input 
                        type="url" 
                        value={tempSupportLogo}
                        onChange={(e) => setTempSupportLogo(e.target.value)}
                        placeholder="https://... or upload"
                        className="w-full h-8 px-2 border border-ink focus:outline-none bg-white"
                      />
                      <label className="px-2.5 h-8 bg-slate-100 hover:bg-brand-acid border border-ink text-[8.5px] font-bold uppercase flex items-center justify-center cursor-pointer shrink-0 select-none">
                        <span>Upload 📸</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const url = await uploadToCloudinary(reader.result as string);
                              if (url) setTempSupportLogo(url);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {tempSupportLogo && (
                  <div className="flex items-center gap-2 pt-1">
                    <img src={tempSupportLogo} alt="Logo preview" className="w-8 h-8 object-contain border border-ink bg-white p-0.5" referrerPolicy="no-referrer" />
                    <span className="text-[8px] text-ink/50 uppercase">Logo verified & ready to attach</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  {editingSupportIdx !== null && (
                    <button 
                      type="button" 
                      onClick={handleCancelEditSupport}
                      className="px-3 py-1.5 border border-ink bg-white text-ink font-mono text-[9px] font-bold uppercase hover:bg-zinc-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={handleSaveSupport}
                    className={`px-3.5 py-1.5 border border-ink font-mono text-[9px] font-black uppercase cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                      editingSupportIdx !== null 
                        ? 'bg-brand-blue text-white hover:bg-ink'
                        : 'bg-brand-acid text-ink hover:bg-ink hover:text-white'
                    }`}
                  >
                    {editingSupportIdx !== null ? '💾 Update Supporting Agency' : '+ Add Supporting Agency'}
                  </button>
                </div>
              </div>

              {/* Supporting Agencies List */}
              <div className="space-y-2">
                {supportingAgencies.map((support, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 border border-ink bg-paper/20 text-[10px] font-mono">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {support.logo ? (
                        <img src={support.logo} alt={support.name} className="w-9 h-9 object-contain border border-ink bg-white p-0.5 shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 border border-ink bg-white flex items-center justify-center font-mono font-black text-xs text-brand-orange shrink-0">
                          {support.name.charAt(0)}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <div className="font-serif font-black text-xs text-ink truncate">{support.name}</div>
                        <div className="text-[8px] text-brand-blue uppercase font-bold">{support.role || 'Supporting Agency'}</div>
                        {support.website && (
                          <a href={support.website} target="_blank" rel="noopener noreferrer" className="text-[8px] text-brand-blue hover:underline inline-flex items-center gap-0.5 truncate">
                            {support.website} <ArrowUpRight className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleStartEditSupport(idx)}
                        className="p-1 px-2 hover:bg-brand-acid text-ink border border-ink/40 hover:border-ink bg-white shadow-[1px_1px_0px_rgba(0,0,0,1)] rounded-sm cursor-pointer flex items-center gap-1 text-[8.5px] font-bold uppercase"
                        title="Edit supporting agency"
                      >
                        <Pencil className="w-3 h-3 text-brand-blue" />
                        <span>Edit</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (editingSupportIdx === idx) handleCancelEditSupport();
                          setSupportingAgencies(supportingAgencies.filter((_, i) => i !== idx));
                        }}
                        className="p-1 hover:bg-brand-orange text-brand-orange hover:text-white border border-transparent hover:border-ink rounded-sm shrink-0 cursor-pointer"
                        title="Delete agency"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {supportingAgencies.length === 0 && (
                  <p className="text-[9.5px] italic text-ink/40 font-mono">No supporting agencies added yet.</p>
                )}
              </div>
            </div>

            {/* 4C: Collaborators */}
            <div className="border border-ink p-4 space-y-4 bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <div className="font-mono text-[9.5px] font-black uppercase text-brand-blue flex items-center gap-1.5 select-none border-b border-ink/10 pb-1.5">
                <Globe className="w-3.5 h-3.5 text-brand-orange" />
                Project Collaborators ({collaborators.length})
              </div>

              {/* Add Collaborator Form */}
              <div className="p-3 bg-paper/30 border border-ink/40 space-y-3 font-mono text-[10px]">
                {editingCollabIdx !== null && (
                  <div className="flex items-center justify-between bg-brand-acid/30 border border-ink px-2.5 py-1 text-[9px] font-bold text-ink">
                    <span>✏️ Editing Collaborator #{editingCollabIdx + 1}: {collaborators[editingCollabIdx]?.name}</span>
                    <button 
                      type="button"
                      onClick={handleCancelEditCollaborator}
                      className="text-brand-orange underline text-[8.5px] cursor-pointer hover:text-ink font-mono uppercase font-bold"
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Collaborating Partner / Institution Name *</label>
                    <input 
                      type="text" 
                      value={tempCollabName}
                      onChange={(e) => setTempCollabName(e.target.value)}
                      placeholder="e.g. Central Institute of Indian Languages"
                      className="w-full h-8 px-2 border border-ink focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Collaboration Domain / Role</label>
                    <input 
                      type="text" 
                      value={tempCollabRole}
                      onChange={(e) => setTempCollabRole(e.target.value)}
                      placeholder="e.g. Academic Linguistic Partner / Field Co-op"
                      className="w-full h-8 px-2 border border-ink focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Official Website URL</label>
                    <input 
                      type="url" 
                      value={tempCollabWebsite}
                      onChange={(e) => setTempCollabWebsite(e.target.value)}
                      placeholder="e.g. https://ciil.org"
                      className="w-full h-8 px-2 border border-ink focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-ink/75 mb-0.5">Logo or Photograph URL</label>
                    <div className="flex gap-1.5">
                      <input 
                        type="url" 
                        value={tempCollabLogo}
                        onChange={(e) => setTempCollabLogo(e.target.value)}
                        placeholder="https://... or upload"
                        className="w-full h-8 px-2 border border-ink focus:outline-none bg-white"
                      />
                      <label className="px-2.5 h-8 bg-slate-100 hover:bg-brand-acid border border-ink text-[8.5px] font-bold uppercase flex items-center justify-center cursor-pointer shrink-0 select-none">
                        <span>Upload 📸</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const url = await uploadToCloudinary(reader.result as string);
                              if (url) setTempCollabLogo(url);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {tempCollabLogo && (
                  <div className="flex items-center gap-2 pt-1">
                    <img src={tempCollabLogo} alt="Logo preview" className="w-8 h-8 object-contain border border-ink bg-white p-0.5" referrerPolicy="no-referrer" />
                    <span className="text-[8px] text-ink/50 uppercase">Logo verified & ready to attach</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  {editingCollabIdx !== null && (
                    <button 
                      type="button" 
                      onClick={handleCancelEditCollaborator}
                      className="px-3 py-1.5 border border-ink bg-white text-ink font-mono text-[9px] font-bold uppercase hover:bg-zinc-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={handleSaveCollaborator}
                    className={`px-3.5 py-1.5 border border-ink font-mono text-[9px] font-black uppercase cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                      editingCollabIdx !== null 
                        ? 'bg-brand-blue text-white hover:bg-ink'
                        : 'bg-brand-acid text-ink hover:bg-ink hover:text-white'
                    }`}
                  >
                    {editingCollabIdx !== null ? '💾 Update Collaborator' : '+ Add Collaborator'}
                  </button>
                </div>
              </div>

              {/* Collaborators List */}
              <div className="space-y-2">
                {collaborators.map((collab, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 border border-ink bg-paper/20 text-[10px] font-mono">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {collab.logo ? (
                        <img src={collab.logo} alt={collab.name} className="w-9 h-9 object-contain border border-ink bg-white p-0.5 shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 border border-ink bg-white flex items-center justify-center font-mono font-black text-xs text-brand-acid bg-ink text-paper shrink-0">
                          {collab.name.charAt(0)}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <div className="font-serif font-black text-xs text-ink truncate">{collab.name}</div>
                        <div className="text-[8px] text-brand-orange uppercase font-bold">{collab.role || 'Collaborator'}</div>
                        {collab.website && (
                          <a href={collab.website} target="_blank" rel="noopener noreferrer" className="text-[8px] text-brand-blue hover:underline inline-flex items-center gap-0.5 truncate">
                            {collab.website} <ArrowUpRight className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleStartEditCollaborator(idx)}
                        className="p-1 px-2 hover:bg-brand-acid text-ink border border-ink/40 hover:border-ink bg-white shadow-[1px_1px_0px_rgba(0,0,0,1)] rounded-sm cursor-pointer flex items-center gap-1 text-[8.5px] font-bold uppercase"
                        title="Edit collaborator"
                      >
                        <Pencil className="w-3 h-3 text-brand-blue" />
                        <span>Edit</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (editingCollabIdx === idx) handleCancelEditCollaborator();
                          setCollaborators(collaborators.filter((_, i) => i !== idx));
                        }}
                        className="p-1 hover:bg-brand-orange text-brand-orange hover:text-white border border-transparent hover:border-ink rounded-sm shrink-0 cursor-pointer"
                        title="Delete collaborator"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {collaborators.length === 0 && (
                  <p className="text-[9.5px] italic text-ink/40 font-mono">No collaborators added yet.</p>
                )}
              </div>
            </div>

          </div>

          {/* Section 5: Multimedia Content & Media Pipeline */}
          <div className="space-y-6 pt-4 border-t border-ink/10">
            <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange border-b border-ink/10 pb-1 select-none">
              5. Multimedia Content & Media Pipeline
            </h4>

            {/* Strategic Overview Multimedia */}
            <div className="border border-ink p-4 space-y-4 bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <div className="font-mono text-[9px] font-bold uppercase text-brand-blue select-none">
                A. Strategic Overview Multimedia
              </div>

              {/* Images */}
              <div className="space-y-2">
                <label className="block font-mono text-[8.5px] font-bold uppercase">Overview Images</label>
                <div className="flex flex-wrap gap-3">
                  {overviewImages.map((img: string, i: number) => (
                    <div key={i} className="relative w-20 aspect-video border border-ink overflow-hidden group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setOverviewImages(overviewImages.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-brand-orange/90 text-white font-mono text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer uppercase select-none"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-brand-acid border border-ink font-mono text-[9px] font-bold cursor-pointer inline-flex items-center gap-1 select-none">
                    <Upload className="w-3 h-3" />
                    Upload Overview Image to Cloud
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const url = await uploadToCloudinary(reader.result as string);
                          if (url) setOverviewImages([...overviewImages, url]);
                        };
                        reader.readAsDataURL(f);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* YouTube Links */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-mono text-[8.5px] font-bold uppercase">Overview YouTube Videos</label>
                  {editingOverviewYtIdx !== null && (
                    <button 
                      type="button" 
                      onClick={() => { setEditingOverviewYtIdx(null); setNewOverviewYoutube(""); }}
                      className="text-brand-orange text-[8px] uppercase underline cursor-pointer hover:text-ink font-bold"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {overviewYoutubeLinks.map((link: string, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 border p-1.5 text-xs font-mono">
                      <span className="truncate pr-4 text-[10px]">{link}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOverviewYtIdx(i);
                            setNewOverviewYoutube(link);
                          }}
                          className="p-1 px-1.5 hover:bg-brand-acid text-ink border border-ink/30 hover:border-ink bg-white shadow-[1px_1px_0px_rgba(0,0,0,1)] rounded-sm cursor-pointer flex items-center gap-0.5 text-[8px] font-bold uppercase"
                          title="Edit video URL"
                        >
                          <Pencil className="w-2.5 h-2.5 text-brand-blue" />
                          <span>Edit</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (editingOverviewYtIdx === i) {
                              setEditingOverviewYtIdx(null);
                              setNewOverviewYoutube("");
                            }
                            setOverviewYoutubeLinks(overviewYoutubeLinks.filter((_, idx) => idx !== i));
                          }}
                          className="p-1 hover:bg-brand-orange text-brand-orange hover:text-white border border-transparent hover:border-ink rounded-sm cursor-pointer"
                          title="Remove video"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newOverviewYoutube}
                    onChange={(e) => setNewOverviewYoutube(e.target.value)}
                    placeholder="Paste YouTube Video URL..."
                    className="flex-1 h-8 px-2 border border-ink font-mono text-[10px]"
                  />
                  {editingOverviewYtIdx !== null && (
                    <button 
                      type="button" 
                      onClick={() => { setEditingOverviewYtIdx(null); setNewOverviewYoutube(""); }}
                      className="px-2.5 border border-ink bg-white text-ink font-mono text-[9px] font-bold uppercase hover:bg-zinc-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!newOverviewYoutube.trim()) return;
                      if (editingOverviewYtIdx !== null && editingOverviewYtIdx >= 0 && editingOverviewYtIdx < overviewYoutubeLinks.length) {
                        const updated = [...overviewYoutubeLinks];
                        updated[editingOverviewYtIdx] = newOverviewYoutube.trim();
                        setOverviewYoutubeLinks(updated);
                        setEditingOverviewYtIdx(null);
                      } else {
                        setOverviewYoutubeLinks([...overviewYoutubeLinks, newOverviewYoutube.trim()]);
                      }
                      setNewOverviewYoutube("");
                    }}
                    className={`px-3 font-mono text-[9px] font-bold border border-ink uppercase cursor-pointer ${
                      editingOverviewYtIdx !== null ? 'bg-brand-blue text-white hover:bg-ink' : 'bg-ink hover:bg-brand-blue text-white'
                    }`}
                  >
                    {editingOverviewYtIdx !== null ? '💾 Update Video' : '+ Add Video'}
                  </button>
                </div>
              </div>
            </div>

            {/* Methodology Multimedia */}
            <div className="border border-ink p-4 space-y-4 bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <div className="font-mono text-[9px] font-bold uppercase text-brand-blue select-none">
                B. Methodology Multimedia
              </div>

              {/* Images */}
              <div className="space-y-2">
                <label className="block font-mono text-[8.5px] font-bold uppercase">Methodology Images</label>
                <div className="flex flex-wrap gap-3">
                  {methodologyImages.map((img: string, i: number) => (
                    <div key={i} className="relative w-20 aspect-video border border-ink overflow-hidden group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setMethodologyImages(methodologyImages.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-brand-orange/90 text-white font-mono text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer uppercase select-none"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-brand-acid border border-ink font-mono text-[9px] font-bold cursor-pointer inline-flex items-center gap-1 select-none">
                    <Upload className="w-3 h-3" />
                    Upload Methodology Image to Cloud
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const url = await uploadToCloudinary(reader.result as string);
                          if (url) setMethodologyImages([...methodologyImages, url]);
                        };
                        reader.readAsDataURL(f);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* YouTube Links */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-mono text-[8.5px] font-bold uppercase">Methodology YouTube Videos</label>
                  {editingMethodologyYtIdx !== null && (
                    <button 
                      type="button" 
                      onClick={() => { setEditingMethodologyYtIdx(null); setNewMethodologyYoutube(""); }}
                      className="text-brand-orange text-[8px] uppercase underline cursor-pointer hover:text-ink font-bold"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {methodologyYoutubeLinks.map((link: string, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 border p-1.5 text-xs font-mono">
                      <span className="truncate pr-4 text-[10px]">{link}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMethodologyYtIdx(i);
                            setNewMethodologyYoutube(link);
                          }}
                          className="p-1 px-1.5 hover:bg-brand-acid text-ink border border-ink/30 hover:border-ink bg-white shadow-[1px_1px_0px_rgba(0,0,0,1)] rounded-sm cursor-pointer flex items-center gap-0.5 text-[8px] font-bold uppercase"
                          title="Edit video URL"
                        >
                          <Pencil className="w-2.5 h-2.5 text-brand-blue" />
                          <span>Edit</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (editingMethodologyYtIdx === i) {
                              setEditingMethodologyYtIdx(null);
                              setNewMethodologyYoutube("");
                            }
                            setMethodologyYoutubeLinks(methodologyYoutubeLinks.filter((_, idx) => idx !== i));
                          }}
                          className="p-1 hover:bg-brand-orange text-brand-orange hover:text-white border border-transparent hover:border-ink rounded-sm cursor-pointer"
                          title="Remove video"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newMethodologyYoutube}
                    onChange={(e) => setNewMethodologyYoutube(e.target.value)}
                    placeholder="Paste YouTube Video URL..."
                    className="flex-1 h-8 px-2 border border-ink font-mono text-[10px]"
                  />
                  {editingMethodologyYtIdx !== null && (
                    <button 
                      type="button" 
                      onClick={() => { setEditingMethodologyYtIdx(null); setNewMethodologyYoutube(""); }}
                      className="px-2.5 border border-ink bg-white text-ink font-mono text-[9px] font-bold uppercase hover:bg-zinc-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!newMethodologyYoutube.trim()) return;
                      if (editingMethodologyYtIdx !== null && editingMethodologyYtIdx >= 0 && editingMethodologyYtIdx < methodologyYoutubeLinks.length) {
                        const updated = [...methodologyYoutubeLinks];
                        updated[editingMethodologyYtIdx] = newMethodologyYoutube.trim();
                        setMethodologyYoutubeLinks(updated);
                        setEditingMethodologyYtIdx(null);
                      } else {
                        setMethodologyYoutubeLinks([...methodologyYoutubeLinks, newMethodologyYoutube.trim()]);
                      }
                      setNewMethodologyYoutube("");
                    }}
                    className={`px-3 font-mono text-[9px] font-bold border border-ink uppercase cursor-pointer ${
                      editingMethodologyYtIdx !== null ? 'bg-brand-blue text-white hover:bg-ink' : 'bg-ink hover:bg-brand-blue text-white'
                    }`}
                  >
                    {editingMethodologyYtIdx !== null ? '💾 Update Video' : '+ Add Video'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: External References & Related Links */}
          <div className="space-y-4 pt-4 border-t border-ink/10">
            <div className="flex items-center justify-between border-b border-ink/10 pb-1">
              <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange select-none">
                6. External Reference Materials & Assets
              </h4>
              <button 
                type="button" 
                onClick={() => setRelatedLinks([...relatedLinks, { name: '', url: '' }])}
                className="px-2.5 py-1 border border-ink bg-brand-acid text-ink font-mono text-[9px] font-bold uppercase tracking-widest hover:bg-white flex items-center gap-1 cursor-pointer select-none"
              >
                + Add Reference
              </button>
            </div>

            <div className="space-y-2">
              {relatedLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 border border-ink p-2 bg-paper/20">
                  <input 
                    type="text" 
                    value={link.name}
                    onChange={(e) => {
                      const updated = [...relatedLinks];
                      updated[idx].name = e.target.value;
                      setRelatedLinks(updated);
                    }}
                    placeholder="Link Label" 
                    className="w-1/3 h-8 px-2 border border-ink font-mono text-[10px]"
                  />
                  <input 
                    type="url" 
                    value={link.url}
                    onChange={(e) => {
                      const updated = [...relatedLinks];
                      updated[idx].url = e.target.value;
                      setRelatedLinks(updated);
                    }}
                    placeholder="URL Address (e.g. https://...)" 
                    className="w-2/3 h-8 px-2 border border-ink font-mono text-[10px]"
                  />
                  <button 
                    type="button"
                    onClick={() => setRelatedLinks(relatedLinks.filter((_, i) => i !== idx))}
                    className="p-1 hover:bg-brand-orange border border-transparent hover:border-ink rounded shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-ink" />
                  </button>
                </div>
              ))}
              {relatedLinks.length === 0 && (
                <p className="text-[10px] font-mono text-ink/40 uppercase italic">No external references added.</p>
              )}
            </div>
          </div>

          {/* Section 7: Strategic Sub-Pages & Custom Dossier Tabs */}
          <div className="space-y-4 pt-4 border-t border-ink/10">
            <div className="flex items-center justify-between border-b border-ink/10 pb-1">
              <h4 className="font-mono text-[10px] font-black uppercase text-brand-orange select-none">
                7. Strategic Sub-Pages & Custom Dossier Tabs
              </h4>
              <button 
                type="button" 
                onClick={addSubPage}
                className="px-2.5 py-1 border border-ink bg-brand-acid text-ink font-mono text-[9px] font-bold uppercase tracking-widest hover:bg-white flex items-center gap-1 cursor-pointer select-none"
              >
                + Instantiate Custom Dossier Tab
              </button>
            </div>

            <div className="space-y-6">
              {subPages.map((tab, idx) => (
                <div 
                  key={idx}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", idx.toString())}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragIdx = parseInt(e.dataTransfer.getData("text/plain"));
                    if (!isNaN(dragIdx) && dragIdx !== idx) {
                      const list = [...subPages];
                      const dragged = list[dragIdx];
                      list.splice(dragIdx, 1);
                      list.splice(idx, 0, dragged);
                      setSubPages(list);
                    }
                  }}
                  className="border-2 border-ink p-4 space-y-4 bg-paper/10 relative shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-paper/20 cursor-grab active:cursor-grabbing transition-colors"
                >
                  <div className="flex justify-between items-center gap-4 border-b border-ink/10 pb-2 select-none">
                    <span className="font-mono text-[10px] font-black text-brand-blue uppercase">
                      Dossier Tab config #{idx+1} <span className="text-[8px] text-ink/40 font-normal lowercase">(drag & drop to reorder)</span>
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button 
                        type="button" 
                        disabled={idx === 0} 
                        onClick={() => handleMoveSubPage(idx, 'up')}
                        className="p-1 px-2 border border-ink hover:bg-brand-orange text-[10px] font-bold font-mono uppercase bg-white disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        &uarr;
                      </button>
                      <button 
                        type="button" 
                        disabled={idx === subPages.length - 1} 
                        onClick={() => handleMoveSubPage(idx, 'down')}
                        className="p-1 px-2 border border-ink hover:bg-brand-orange text-[10px] font-bold font-mono uppercase bg-white disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        &darr;
                      </button>
                      <button 
                        type="button"
                        onClick={() => removeSubPage(idx)}
                        className="p-1 hover:bg-brand-orange border border-transparent hover:border-ink rounded cursor-pointer ml-1"
                        title="Delete Tab"
                      >
                        <Trash2 className="w-4 h-4 text-ink" />
                      </button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-mono text-[8px] font-bold uppercase mb-1">Tab Label / Title</label>
                      <input 
                        type="text" 
                        value={tab.title}
                        onChange={(e) => updateSubPageCore(idx, 'title', e.target.value)}
                        placeholder="e.g. Royalties Framework" 
                        required
                        className="w-full h-8 px-2 border border-ink font-mono text-[10px] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[8px] font-bold uppercase mb-1">Unique Slug (Key)</label>
                      <input 
                        type="text" 
                        value={tab.slug}
                        onChange={(e) => updateSubPageCore(idx, 'slug', e.target.value)}
                        placeholder="e.g. royalties" 
                        required
                        className="w-full h-8 px-2 border border-ink font-mono text-[10px] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[8px] font-bold uppercase mb-1">Tab Type</label>
                      <select 
                        value={tab.type}
                        onChange={(e) => updateSubPageCore(idx, 'type', e.target.value)}
                        className="w-full h-8 px-2 border border-ink font-mono text-[10px] bg-white"
                      >
                        <option value="markdown">MARKDOWN TEXT</option>
                        <option value="list">TABULAR DATAFRAME LIST</option>
                        <option value="events">RELATED EVENTS</option>
                      </select>
                    </div>
                  </div>

                  {/* Markdown Subpage */}
                  {tab.type === 'markdown' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block font-mono text-[8px] font-bold uppercase mb-1">Teaser introductory accent</label>
                        <input 
                          type="text"
                          value={tab.content?.teaser || ''}
                          onChange={(e) => updateSubPageMarkdownContent(idx, 'teaser', e.target.value)}
                          placeholder="Teaser highlight summary sentence..."
                          className="w-full h-8 px-2 border border-ink font-mono text-[10px] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[8px] font-bold uppercase mb-1">Markdown Body (Main Content)</label>
                        <MarkdownHelperBar 
                          textareaId={`subpage-markdown-${idx}`} 
                          value={tab.content?.markdown || ''}
                          onChange={(val) => updateSubPageMarkdownContent(idx, 'markdown', val)}
                        />
                        <MarkdownMediaHelper 
                          onInsert={(text) => updateSubPageMarkdownContent(idx, 'markdown', (tab.content?.markdown || '') + text)}
                        />
                        <textarea 
                          id={`subpage-markdown-${idx}`}
                          value={tab.content?.markdown || ''}
                          onChange={(e) => updateSubPageMarkdownContent(idx, 'markdown', e.target.value)}
                          rows={4}
                          placeholder="Write clean markdown or structured paragraphs..."
                          className="w-full p-2 border border-ink font-mono text-[10px] focus:outline-none bg-white"
                        />
                        {tab.content?.markdown && (
                          <div className="mt-2 p-3 border border-dashed border-ink bg-slate-50 max-h-[140px] overflow-y-auto">
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

                  {/* List Subpage */}
                  {tab.type === 'list' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between select-none">
                        <span className="font-mono text-[8px] font-bold uppercase text-ink/50">Tabular Dataset list</span>
                        <button 
                          type="button" 
                          onClick={() => addSubPageListItem(idx)}
                          className="px-2.5 py-1 border border-ink bg-brand-acid text-ink font-mono text-[9px] font-bold uppercase hover:bg-white cursor-pointer"
                        >
                          + Add Dataset Row
                        </button>
                      </div>

                      <div className="space-y-4">
                        {(Array.isArray(tab.content) ? tab.content : []).map((row: any, rIdx: number) => (
                          <div key={rIdx} className="bg-white p-3 border border-ink space-y-3 relative shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                            <div className="flex justify-between items-center select-none border-b border-ink/10 pb-1">
                              <span className="font-mono text-[8px] uppercase tracking-wider text-brand-blue font-bold">List Row #{rIdx + 1}</span>
                              <button 
                                type="button" 
                                onClick={() => removeSubPageListItem(idx, rIdx)}
                                className="text-brand-orange hover:text-ink font-bold font-mono text-[9px] uppercase flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[8px] font-mono font-bold uppercase text-ink/70 mb-0.5">Name / Label</label>
                                <input 
                                  type="text" 
                                  value={row.name || ''} 
                                  onChange={(e) => updateSubPageListItem(idx, rIdx, 'name', e.target.value)}
                                  placeholder="Partner / Station name"
                                  className="w-full h-8 px-2 border border-ink font-mono text-[10px] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-mono font-bold uppercase text-ink/70 mb-0.5">Agency / Affiliation</label>
                                <input 
                                  type="text" 
                                  value={row.affiliation || ''} 
                                  onChange={(e) => updateSubPageListItem(idx, rIdx, 'affiliation', e.target.value)}
                                  placeholder="e.g. Tribal Research Centre"
                                  className="w-full h-8 px-2 border border-ink font-mono text-[10px] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-mono font-bold uppercase text-ink/70 mb-0.5">Role / Status</label>
                                <input 
                                  type="text" 
                                  value={row.role || ''} 
                                  onChange={(e) => updateSubPageListItem(idx, rIdx, 'role', e.target.value)}
                                  placeholder="e.g. Active Capturing"
                                  className="w-full h-8 px-2 border border-ink font-mono text-[10px] focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="block text-[8px] font-mono font-bold uppercase text-ink/70 mb-0.5">Web Link (Optional)</label>
                                <input 
                                  type="text" 
                                  value={row.url || ''} 
                                  onChange={(e) => updateSubPageListItem(idx, rIdx, 'url', e.target.value)}
                                  placeholder="e.g. https://..."
                                  className="w-full h-8 px-2 border border-ink font-mono text-[10px] focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[8px] font-mono font-bold uppercase text-ink/70 mb-0.5">Logo or Photo URL</label>
                                <div className="flex gap-1.5 items-center">
                                  <input 
                                    type="text" 
                                    value={row.photoUrl || ''} 
                                    onChange={(e) => updateSubPageListItem(idx, rIdx, 'photoUrl', e.target.value)}
                                    placeholder="https://... or upload"
                                    className="flex-grow h-8 px-2 border border-ink font-mono text-[10px] focus:outline-none"
                                  />
                                  <label className="h-8 px-2 border border-ink bg-white font-mono text-[8px] font-black uppercase flex items-center justify-center cursor-pointer select-none hover:bg-brand-acid shrink-0">
                                    <span>Upload 📸</span>
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onloadend = async () => {
                                          const url = await uploadToCloudinary(reader.result as string);
                                          if (url) updateSubPageListItem(idx, rIdx, 'photoUrl', url);
                                        };
                                        reader.readAsDataURL(file);
                                      }}
                                    />
                                  </label>
                                </div>
                                {row.photoUrl && (
                                  <img src={row.photoUrl} alt="" className="w-8 h-8 object-cover border border-ink mt-1" referrerPolicy="no-referrer" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!Array.isArray(tab.content) || tab.content.length === 0) && (
                          <p className="text-[9px] font-mono text-ink/40 uppercase italic select-none">No dataset rows configured. Click add row.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Events Subpage */}
                  {tab.type === 'events' && (
                    <div className="p-3 border border-ink bg-white font-mono text-[9px] text-brand-blue uppercase leading-relaxed select-none">
                      💡 Related Events: Instantiating this dynamic dossier page lists and links to all academic summits, research fieldwork, workshops, and courses associated with this project automatically. No manual entries are needed.
                    </div>
                  )}
                </div>
              ))}
              {subPages.length === 0 && (
                <p className="text-[10px] font-mono text-ink/40 uppercase italic select-none">No custom dossier pages compiled yet.</p>
              )}
            </div>
          </div>

          {/* Sticky Footer Action Bar */}
          <div className="pt-6 border-t-2 border-ink flex justify-end gap-3 sticky bottom-0 bg-paper p-4 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <button 
              type="button" 
              onClick={onClose}
              className="h-12 px-6 border border-ink bg-white font-mono text-xs font-bold uppercase hover:bg-brand-orange hover:text-white tracking-widest cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="h-12 px-8 border border-ink bg-ink text-paper font-mono text-xs font-black uppercase tracking-widest hover:bg-brand-acid hover:text-ink transition-all shadow-[4px_4px_0px_rgba(0,0,0,1)] inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Saving Pipeline..." : isEdit ? "Save Pipeline Dossier" : "Instantiate Research Project"}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
