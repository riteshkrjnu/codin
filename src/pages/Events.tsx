import { useLifecycleNow } from '../lib/lifecycleClock';
import { Catalogue } from '../site/PublicPages';
import { getEffectiveStatus } from '../lib/courseStatus';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { events as defaultEvents, centres, team, projects } from '../data/config';
import { 
  Calendar, MapPin, ArrowUpRight, Search, SlidersHorizontal, Landmark, User, 
  Briefcase, RefreshCw, Archive, Play, AlertCircle, Plus, X, Trash2, Edit3, Save, Check,
  Users, Mail, Phone, Bold, Italic, Underline, Heading1, Heading2, Heading3, List, ListOrdered, Upload, Clock, Handshake, Coins
} from 'lucide-react';
import { renderMarkdown } from '../lib/utils';
import { MarkdownMediaHelper } from '../components/MarkdownMediaHelper';
import EventFormModal from '../components/EventFormModal';
import { getResolvedEventFee } from '../lib/eventFees';

// Helpers for automated event status tracking and formatted dates
const formatEventDates = (startStr: string, endStr: string): string => {
  if (!startStr) return '';
  if (!endStr) {
    const s = new Date(startStr);
    return s.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  const s = new Date(startStr);
  const e = new Date(endStr);
  
  const sMonth = s.toLocaleDateString('en-US', { month: 'long' });
  const eMonth = e.toLocaleDateString('en-US', { month: 'long' });
  const sDay = s.getDate();
  const eDay = e.getDate();
  const sYear = s.getFullYear();
  const eYear = e.getFullYear();
  
  if (sYear === eYear) {
    if (sMonth === eMonth) {
      if (sDay === eDay) {
        return `${sMonth} ${sDay}, ${sYear}`;
      }
      return `${sMonth} ${sDay}-${eDay}, ${sYear}`;
    }
    return `${sMonth} ${sDay} - ${eMonth} ${eDay}, ${sYear}`;
  }
  return `${sMonth} ${sDay}, ${sYear} - ${eMonth} ${eDay}, ${sYear}`;
};

const calculateEventStatus = (startDate: string, endDate: string) => getEffectiveStatus({ status: 'Upcoming', startDate, endDate });
const isEndDateInPast = (event: any) => getEffectiveStatus(event) === 'Completed';

export default function Events() {
  const now=useLifecycleNow();
  const { user } = useAuth();
  const token = user?.token;

  const [dynamicEvents, setDynamicEvents] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const hasDefaultOngoing = defaultEvents.some(e => e.status === 'Ongoing' && !(e as any).deleted);
    return hasDefaultOngoing ? 'Ongoing' : 'Upcoming';
  });
  const [hasInitializedStatus, setHasInitializedStatus] = useState(false);
  const [hasInitialFetchCompleted, setHasInitialFetchCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateQuery, setDateQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // New Event Modal Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const handleEditEventClick = (event: any) => {
    setEditingEvent(event);
    setShowCreateModal(true);
  };

  const handleCreateNewClick = () => {
    setEditingEvent(null);
    setShowCreateModal(true);
  };

  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('Conference');
  const [eventDates, setEventDates] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStatus, setEventStatus] = useState('Upcoming');
  const [eventDesc, setEventDesc] = useState('');
  const [eventLongDesc, setEventLongDesc] = useState('');
  const [eventImage, setEventImage] = useState('https://images.unsplash.com/photo-1540575467063-178a50c2df87');

  // Selected multi-choices
  const [selectedCentres, setSelectedCentres] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);

  // Page highlights / registrationCard customizable parts (Requirement 1)
  const [regTitle, setRegTitle] = useState('Secure Your Spot');
  const [regDesc, setRegDesc] = useState('Exclusive cohort limited to 15 participants for deep mentorship.');
  const [regBtnText, setRegBtnText] = useState('Apply for Admission');
  const [regBtnLink, setRegBtnLink] = useState('');
  const [regHighlights, setRegHighlights] = useState('Intensive study track, Industry mentorship, Certifications');

  // New Customizable subPages (Requirement 6)
  const [customPages, setCustomPages] = useState<any[]>([
    {
      slug: 'overview',
      title: 'Active Briefing',
      icon: 'Megaphone',
      type: 'markdown',
      content: { teaser: '', markdown: '' }
    }
  ]);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [newPageType, setNewPageType] = useState('markdown');
  const [newPageTeaser, setNewPageTeaser] = useState('');
  const [newPageMarkdown, setNewPageMarkdown] = useState('');

  // Event Start and End dates for Calendar picking (Requirement 2)
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');

  // Custom Event Type/Convocation stream inputs (Requirement 3)
  const [customTypeInput, setCustomTypeInput] = useState('');

  // Editing existing tabs in the drafted lists (Requirement 5)
  const [editingPageSlug, setEditingPageSlug] = useState<string | null>(null);

  // States for Tab Content accumulators (Requirement 5 & 6)
  // For 'dates' (Deadlines)
  const [dtLabel, setDtLabel] = useState('');
  const [dtDate, setDtDate] = useState('');
  const [dtFootnote, setDtFootnote] = useState('');
  const [dtHighlighted, setDtHighlighted] = useState(false);
  const [draftDatesList, setDraftDatesList] = useState<any[]>([]);

  // For 'schedule' (List - Speakers Program)
  const [scTime, setScTime] = useState('');
  const [scTopic, setScTopic] = useState('');
  const [scSpeaker, setScSpeaker] = useState('');
  const [draftScheduleList, setDraftScheduleList] = useState<any[]>([]);

  // For 'registration' (Registration Details)
  const [regDeadlineText, setRegDeadlineText] = useState('');
  const [regFeeCategory, setRegFeeCategory] = useState('');
  const [regFeeValue, setRegFeeValue] = useState('');
  const [draftFeesList, setDraftFeesList] = useState<any[]>([]);
  const [regInstructionInput, setRegInstructionInput] = useState('');
  const [draftInstructionsList, setDraftInstructionsList] = useState<string[]>([]);

  // For 'list' (Presenter/Member List)
  const [liName, setLiName] = useState('');
  const [liAffiliation, setLiAffiliation] = useState('');
  const [liRole, setLiRole] = useState('');
  const [draftListList, setDraftListList] = useState<any[]>([]);

  // For 'logistics' tab segment
  const [draftLogisticsKey, setDraftLogisticsKey] = useState('');
  const [draftLogisticsValue, setDraftLogisticsValue] = useState('');
  const [draftLogisticsLink, setDraftLogisticsLink] = useState('');
  const [draftLogisticsList, setDraftLogisticsList] = useState<any[]>([]);

  // Editing indices for dynamic structures list editing
  const [editingDateIdx, setEditingDateIdx] = useState<number | null>(null);
  const [editingScheduleIdx, setEditingScheduleIdx] = useState<number | null>(null);
  const [editingFeesIdx, setEditingFeesIdx] = useState<number | null>(null);
  const [editingInstructionsIdx, setEditingInstructionsIdx] = useState<number | null>(null);
  const [editingListListIdx, setEditingListListIdx] = useState<number | null>(null);
  const [editingLogisticsIdx, setEditingLogisticsIdx] = useState<number | null>(null);
  const [editingCommitteeMemberIdx, setEditingCommitteeMemberIdx] = useState<number | null>(null);
  const [editingCommitteeIdx, setEditingCommitteeIdx] = useState<number | null>(null);
  const [editingContactIdx, setEditingContactIdx] = useState<number | null>(null);

  // Presenters State Management (Requirement 2 & 5)
  const [draftPresenters, setDraftPresenters] = useState<any[]>([]);
  const [presIsExternal, setPresIsExternal] = useState(false);
  const [presStaffSlug, setPresStaffSlug] = useState('');
  const [presName, setPresName] = useState('');
  const [presPhotoUrl, setPresPhotoUrl] = useState('');
  const [presProfileUrl, setPresProfileUrl] = useState('');
  const [presRole, setPresRole] = useState('');
  const [editingPresenterIdx, setEditingPresenterIdx] = useState<number | null>(null);

  // Dynamic states for Relational Affiliations Graph metadata
  const [dbCentres, setDbCentres] = useState<any[]>(centres);
  const [dbProjects, setDbProjects] = useState<any[]>(projects);
  const [dbTeam, setDbTeam] = useState<any[]>(team);

  // Additional states for Presenter List (newPageType === 'list')
  const [liIsExternal, setLiIsExternal] = useState(false);
  const [liStaffSlug, setLiStaffSlug] = useState('');
  const [liPhotoUrl, setLiPhotoUrl] = useState('');
  const [liProfileUrl, setLiProfileUrl] = useState('');

  // Additional states for Committee Members (newPageType === 'committees')
  const [commMemIsExternal, setCommMemIsExternal] = useState(false);
  const [commMemStaffSlug, setCommMemStaffSlug] = useState('');
  const [commMemPhotoUrl, setCommMemPhotoUrl] = useState('');
  const [commMemProfileUrl, setCommMemProfileUrl] = useState('');

  // For 'committees' tab segment
  const [draftCommitteeName, setDraftCommitteeName] = useState('');
  const [draftCommitteeMemberName, setDraftCommitteeMemberName] = useState('');
  const [draftCommitteeMemberAffiliation, setDraftCommitteeMemberAffiliation] = useState('');
  const [draftCommitteeMemberRole, setDraftCommitteeMemberRole] = useState('');
  const [draftCommitteeMembers, setDraftCommitteeMembers] = useState<any[]>([]);
  const [draftCommitteesList, setDraftCommitteesList] = useState<{name: string, members: any[]}[]>([]);

  // For 'contact' tab segment
  const [draftContactName, setDraftContactName] = useState('');
  const [draftContactDesignation, setDraftContactDesignation] = useState('');
  const [draftContactEmail, setDraftContactEmail] = useState('');
  const [draftContactPhone, setDraftContactPhone] = useState('');
  const [draftContactList, setDraftContactList] = useState<{name: string, designation: string, email: string, phone: string}[]>([]);

  // Cloudinary Secure upload states for cover photo upload
  const [isUploadingCloudinary, setIsUploadingCloudinary] = useState(false);
  const [cloudinaryProgress, setCloudinaryProgress] = useState('');

  // Custom non-blocking confirmation modal state to avoid iframe window.confirm blocks
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDangerous?: boolean;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const uploadToCloudinary = async (params: { dataUrl?: string; imageUrl?: string }): Promise<string> => {
    setIsUploadingCloudinary(true);
    setCloudinaryProgress("Optimizing image and securing cloud link...");
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
      alert("Image uploads failed. Please make sure that Cloudinary environment credentials are set or verify image file is standard.");
      return params.imageUrl || params.dataUrl || "";
    } finally {
      setIsUploadingCloudinary(false);
      setCloudinaryProgress("");
    }
  };

  // Sync / fetch all events
  const loadAllEvents = async () => {
    try {
      setLoading(true);
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/events', { headers });
      const data = await res.json();
      if (data.events && Array.isArray(data.events)) {
        setDynamicEvents(data.events);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setHasInitialFetchCompleted(true);
    }
  };

  useEffect(() => {
    loadAllEvents();
  }, [token]);

  useEffect(() => {
    // Fetch Centres
    fetch('/api/centres')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.centres)) {
          setDbCentres(data.centres.filter(c => !c.deleted));
        }
      })
      .catch(err => console.error("Failed to fetch centres", err));

    // Fetch Projects
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.projects)) {
          setDbProjects(data.projects);
        }
      })
      .catch(err => console.error("Failed to fetch projects", err));

    // Fetch People / Team
    fetch('/api/people')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.people)) {
          setDbTeam(data.people.filter(p => !p.deleted));
        }
      })
      .catch(err => console.error("Failed to fetch people", err));
  }, []);

  // Merge static defaults with Dynamic loaded events. Avoid duplicate keys via slug.
  const allMergedEvents = useMemo(() => {
    return dynamicEvents.map(e => ({ ...e, status: getEffectiveStatus(e,now) }));
  }, [dynamicEvents,now]);

  // Auto-initialize default status tab: 'Ongoing' if ongoing events exist, otherwise 'Upcoming'
  useEffect(() => {
    if (hasInitialFetchCompleted && !hasInitializedStatus && allMergedEvents.length > 0) {
      const activeEvents = allMergedEvents.filter(e => !e.deleted);
      const hasOngoing = activeEvents.some(e => e.status === 'Ongoing');
      if (!hasOngoing) {
        setStatusFilter('Upcoming');
      } else {
        setStatusFilter('Ongoing');
      }
      setHasInitializedStatus(true);
    }
  }, [allMergedEvents, hasInitialFetchCompleted, hasInitializedStatus]);

  // Gather unique available types configured
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    allMergedEvents.forEach(e => {
      if (e.type) types.add(e.type);
    });
    return Array.from(types);
  }, [allMergedEvents]);

  // Multi-axis filter
  const filteredEvents = useMemo(() => {
    return allMergedEvents.filter(e => {
      // If statusFilter is 'Trash', we only show items where deleted is true
      if (statusFilter === 'Trash') {
        if (!e.deleted) return false;
      } else {
        // If statusFilter is anything else, we hide deleted items
        if (e.deleted) return false;
        if (statusFilter !== 'all') {
          if (statusFilter === 'Archived') {
            if (e.status !== 'Archived') return false;
          } else if (statusFilter === 'Completed') {
            if (e.status !== 'Completed') return false;
          } else {
            if (e.status !== statusFilter) return false;
          }
        }
      }

      if (selectedType !== 'all' && e.type !== selectedType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesDesc = e.description.toLowerCase().includes(q);
        const matchesLoc = e.location.toLowerCase().includes(q);
        const matchesType = e.type.toLowerCase().includes(q);

        const matchesCentre = (e.associatedCentres || []).some((cSlug: string) => {
          const c = dbCentres.find(item => item.slug === cSlug);
          return c?.name.toLowerCase().includes(q) || c?.shortName.toLowerCase().includes(q);
        });

        const matchesPeople = (e.associatedPeople || []).some((pSlug: string) => {
          const person = dbTeam.find(item => item.slug === pSlug);
          return person?.name.toLowerCase().includes(q);
        });

        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesType && !matchesCentre && !matchesPeople) {
          return false;
        }
      }

      if (dateQuery.trim()) {
        const dq = dateQuery.toLowerCase();
        if (!e.dates.toLowerCase().includes(dq)) return false;
      }

      return true;
    });
  }, [allMergedEvents, selectedType, statusFilter, searchQuery, dateQuery]);

  const handleResetFilters = () => {
    setSelectedType('all');
    setStatusFilter('all');
    setSearchQuery('');
    setDateQuery('');
  };

  // Add custom Sub-page builder handler
  const handleAddCustomSubPageDraft = () => {
    if (!newPageTitle || !newPageSlug) {
      alert("Please provide both Tab Title and unique Slug.");
      return;
    }
    const slugName = newPageSlug.toLowerCase().trim().replace(/\s+/g, '-');
    
    // Check duplication unless we are editing that exact slug
    if (!editingPageSlug && customPages.some(p => p.slug === slugName)) {
      alert("Hold: A tab with this relative slug already exists in drafting.");
      return;
    }

    let finalContent: any = null;
    if (newPageType === 'markdown') {
      finalContent = { teaser: newPageTeaser, markdown: newPageMarkdown };
    } else if (newPageType === 'dates') {
      finalContent = [...draftDatesList];
    } else if (newPageType === 'schedule') {
      finalContent = Array.isArray(draftScheduleList) ? draftScheduleList : { scheduleDays: draftScheduleList };
    } else if (newPageType === 'registration') {
      finalContent = {
        deadline: regDeadlineText,
        fees: [...draftFeesList],
        instructions: [...draftInstructionsList]
      };
    } else if (newPageType === 'list') {
      finalContent = [...draftListList];
    } else if (newPageType === 'logistics') {
      finalContent = [...draftLogisticsList];
    } else if (newPageType === 'committees') {
      finalContent = [...draftCommitteesList];
    } else if (newPageType === 'contact') {
      finalContent = [...draftContactList];
    } else {
      finalContent = [];
    }

    const draftPage = {
      slug: slugName,
      title: newPageTitle,
      icon: newPageType === 'dates' ? 'CalendarRange' : 
            newPageType === 'schedule' ? 'Clock' : 
            newPageType === 'logistics' ? 'MapPin' :
            newPageType === 'committees' ? 'Users' :
            newPageType === 'contact' ? 'Mail' : 'Megaphone',
      type: newPageType,
      content: finalContent
    };

    if (editingPageSlug) {
      setCustomPages(customPages.map(p => p.slug === editingPageSlug ? draftPage : p));
      setEditingPageSlug(null);
    } else {
      setCustomPages([...customPages, draftPage]);
    }

    // Reset page drafts
    setNewPageTitle('');
    setNewPageSlug('');
    setNewPageTeaser('');
    setNewPageMarkdown('');
    setDraftDatesList([]);
    setDraftScheduleList([]);
    setDraftFeesList([]);
    setRegDeadlineText('');
    setDraftInstructionsList([]);
    setDraftListList([]);
    setDraftLogisticsKey('');
    setDraftLogisticsValue('');
    setDraftLogisticsList([]);
    setDraftCommitteeName('');
    setDraftCommitteeMembers([]);
    setDraftCommitteeMemberName('');
    setDraftCommitteeMemberAffiliation('');
    setDraftCommitteeMemberRole('');
    setDraftCommitteesList([]);
    setDraftContactName('');
    setDraftContactDesignation('');
    setDraftContactEmail('');
    setDraftContactPhone('');
    setDraftContactList([]);
  };

  // Reorder custom sub-pages (Requirement 6)
  const handleMoveCustomPage = (idx: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= customPages.length) return;
    const copy = [...customPages];
    const temp = copy[idx];
    copy[idx] = copy[newIdx];
    copy[newIdx] = temp;
    setCustomPages(copy);
  };

  // Edit action to load any drafted tab back into inputs
  const handleStartEditDraftedPage = (cp: any) => {
    setEditingPageSlug(cp.slug);
    setNewPageTitle(cp.title);
    setNewPageSlug(cp.slug);
    setNewPageType(cp.type);

    if (cp.type === 'markdown') {
      setNewPageTeaser(cp.content?.teaser || '');
      setNewPageMarkdown(cp.content?.markdown || '');
    } else if (cp.type === 'dates') {
      setDraftDatesList(cp.content || []);
    } else if (cp.type === 'schedule') {
      setDraftScheduleList(Array.isArray(cp.content) ? cp.content : (cp.content?.scheduleDays || []));
    } else if (cp.type === 'registration') {
      setRegDeadlineText(cp.content?.deadline || '');
      setDraftFeesList(cp.content?.fees || []);
      setDraftInstructionsList(cp.content?.instructions || []);
    } else if (cp.type === 'list') {
      setDraftListList(cp.content || []);
    } else if (cp.type === 'logistics') {
      const mappedLogistics = Object.entries(cp.content || {}).map(([key, value]) => ({
        key,
        value: value
      }));
      setDraftLogisticsList(mappedLogistics);
    } else if (cp.type === 'committees') {
      setDraftCommitteesList(cp.content || []);
    } else if (cp.type === 'contact') {
      setDraftContactList(cp.content || []);
    }
  };

  // Soft delete trash action
  const handleTrashEvent = (idOrSlug: string, titleStr: string, isCourse?: boolean) => {
    setConfirmModal({
      isOpen: true,
      title: 'Move to Trash Can',
      message: `Are you sure you want to send "${titleStr}" to the trash?`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/events/${idOrSlug}?isCourse=${!!isCourse}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (!res.ok) {
            throw new Error(`Trash response status: ${res.status}`);
          }
          const data = await res.json();
          if (data.success) {
            alert("Success! Sent to Trash.");
            loadAllEvents();
          } else {
            alert("Error: " + (data.error || "Failed to trash the event."));
          }
        } catch (err) {
          console.error(err);
          alert("Error: " + String(err));
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Retrieve (un-delete) action
  const handleRetrieveEvent = async (idOrSlug: string, isCourse?: boolean) => {
    try {
      // Find current event object from our list
      const eventToRestore = allMergedEvents.find(e => e._id === idOrSlug || e.slug === idOrSlug);
      if (!eventToRestore) {
        alert("Event data could not be found locally.");
        return;
      }
      
      const payload = {
        ...eventToRestore,
        deleted: false
      };

      const res = await fetch(`/api/events/${idOrSlug}?isCourse=${!!isCourse}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error(`Retrieve response status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        alert("Success! Event has been restored.");
        loadAllEvents();
      } else {
        alert("Error: " + (data.error || "Failed to retrieve the event."));
      }
    } catch (err) {
      console.error(err);
      alert("Error: " + String(err));
    }
  };

  // Permanent Delete action
  const handlePermanentDeleteEvent = (idOrSlug: string, titleStr: string, isCourse?: boolean) => {
    setConfirmModal({
      isOpen: true,
      title: 'CRITICAL WARNING: Permanent Deletion',
      message: `Are you absolutely sure you want to PERMANENTLY and IRREVERSIBLY delete "${titleStr}"? This action cannot be undone and will purge this entry from the database.`,
      confirmText: 'Permanently Delete',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/events/${idOrSlug}?permanent=true&isCourse=${!!isCourse}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (!res.ok) {
            throw new Error(`Permanent deletion response status: ${res.status}`);
          }
          const data = await res.json();
          if (data.success) {
            alert("Success! The item was permanently removed from database.");
            loadAllEvents();
          } else {
            alert("Error: " + (data.error || "Failed to permanently delete. Check your superadmin role credentials."));
          }
        } catch (err) {
          console.error(err);
          alert("Error: " + String(err));
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // multi checkboxes toggling
  const toggleSelection = (slug: string, pool: string[], setter: Function) => {
    if (pool.includes(slug)) {
      setter(pool.filter(x => x !== slug));
    } else {
      setter([...pool, slug]);
    }
  };

  const canManage = user && ['admin','superadmin'].includes(user.role);
  return <>
    <Catalogue kind="events" controls={{ records: allMergedEvents.filter(e =>
      (selectedType==='all'||e.type===selectedType) && (!dateQuery.trim()||String(e.dates||[e.startDate,e.endDate].join(' ')).toLowerCase().includes(dateQuery.toLowerCase()))),
      includeUnpublished: !!canManage,
      searchText: e => [e.location,e.type,...(e.associatedCentres||[]).map((slug:string)=>dbCentres.find(c=>c.slug===slug)?.name),...(e.associatedPeople||[]).map((slug:string)=>dbTeam.find(p=>p.slug===slug)?.name)].join(' '),
      toolbar: canManage ? <div className="section-actions"><button className="action" onClick={handleCreateNewClick}>Create New Event</button></div> : undefined,
      filters: <div className="advanced-filter-grid"><label>Dates<input placeholder="e.g. July 2026, Year, Month..." value={dateQuery} onChange={e=>setDateQuery(e.target.value)}/></label><label>Event category<select value={selectedType} onChange={e=>setSelectedType(e.target.value)}><option value="all">All event types</option>{availableTypes.map(type=><option key={type}>{type}</option>)}</select></label><button onClick={handleResetFilters}>Reset filters</button></div>,
      actions: canManage ? event => event.deleted ? <><button onClick={()=>handleRetrieveEvent(event._id||event.slug,event.isCourse)}>Restore</button><button onClick={()=>handlePermanentDeleteEvent(event._id||event.slug,event.title,event.isCourse)}>Permanent Delete</button></> : <><button onClick={()=>handleEditEventClick(event)}>Edit</button><button onClick={()=>handleTrashEvent(event._id||event.slug,event.title,event.isCourse)}>Delete</button></> : undefined,
    }}/>
            {/* SUPERADMIN CREATION MODAL (Consolidated to use unified EventFormModal from the same source) */}
      {showCreateModal && (
        <EventFormModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingEvent(null);
          }}
          eventToEdit={editingEvent}
          token={token}
          onSuccess={loadAllEvents}
        />
      )}

      {/* CUSTOM NON-BLOCKING CONFIRMATION DIALOG (Supports iframe/sandboxed environments) */}
      {confirmModal.isOpen && (
        <div id="custom-confirm-modal" className="fixed inset-0 z-[100] overflow-y-auto bg-ink/75 backdrop-blur-sm flex items-center justify-center p-6 bg-paper/90">
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
                className="px-4 py-2 border border-ink bg-paper hover:bg-ink/5 tracking-wider uppercase font-bold transition-all"
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                }}
                className={`px-4 py-2 border border-ink text-white font-bold tracking-wider uppercase shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all ${
                  confirmModal.isDangerous ? 'bg-red-650 hover:bg-red-700 bg-red-600' : 'bg-brand-blue hover:bg-ink'
                }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

  </>;
}
