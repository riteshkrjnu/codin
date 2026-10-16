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

const calculateEventStatus = (startStr: string, endStr: string): 'Upcoming' | 'Ongoing' | 'Archived' => {
  if (!startStr) return 'Upcoming';
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date(startStr);
  end.setHours(23, 59, 59, 999);
  
  const now = new Date();
  if (now < start) {
    return 'Upcoming';
  } else if (now >= start && now <= end) {
    return 'Ongoing';
  } else {
    return 'Archived';
  }
};

const isEndDateInPast = (event: any): boolean => {
  const now = new Date();
  
  // 1. If we have an explicit endDate, use it
  if (event.endDate) {
    const end = new Date(event.endDate);
    end.setHours(23, 59, 59, 999);
    return now > end;
  }
  
  // 2. Otherwise parse it from event.dates string
  if (event.dates) {
    const datesStr = event.dates;
    
    try {
      // Split by comma first to extract year and date part
      const commaParts = datesStr.split(',');
      if (commaParts.length >= 2) {
        const yearStr = commaParts[commaParts.length - 1].trim(); // e.g. "2026"
        const datePart = commaParts.slice(0, commaParts.length - 1).join(',').trim(); // e.g. "July 12 - July 14"
        
        // Check if there is a dash indicating range
        if (datePart.includes('-')) {
          const dashParts = datePart.split('-');
          const endPart = dashParts[dashParts.length - 1].trim(); // e.g., "July 14" or "28"
          
          let endDateStr = '';
          // If the endPart does not have a month name (e.g. "25" or "28"), extract month name from the startPart
          if (/^\d+/.test(endPart)) {
            const startPart = dashParts[0].trim(); // e.g. "May 18"
            const match = startPart.match(/^([A-Za-z]+)/);
            if (match) {
              const month = match[1];
              endDateStr = `${month} ${endPart} ${yearStr}`;
            }
          } else {
            endDateStr = `${endPart} ${yearStr}`;
          }
          
          if (endDateStr) {
            const parsedEnd = new Date(endDateStr);
            if (!isNaN(parsedEnd.getTime())) {
              parsedEnd.setHours(23, 59, 59, 999);
              return now > parsedEnd;
            }
          }
        } else {
          // No dash, single date: e.g. "July 12"
          const parsedEnd = new Date(`${datePart} ${yearStr}`);
          if (!isNaN(parsedEnd.getTime())) {
            parsedEnd.setHours(23, 59, 59, 999);
            return now > parsedEnd;
          }
        }
      }
    } catch (err) {
      console.error("Failed to parse event dates:", datesStr, err);
    }
  }
  
  return false;
};

export default function Events() {
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
        if (Array.isArray(data)) {
          setDbCentres(data.filter(c => !c.deleted));
        }
      })
      .catch(err => console.error("Failed to fetch centres", err));

    // Fetch Projects
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDbProjects(data);
        }
      })
      .catch(err => console.error("Failed to fetch projects", err));

    // Fetch People / Team
    fetch('/api/people')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDbTeam(data.filter(p => !p.deleted));
        }
      })
      .catch(err => console.error("Failed to fetch people", err));
  }, []);

  // Merge static defaults with Dynamic loaded events. Avoid duplicate keys via slug.
  const allMergedEvents = useMemo(() => {
    const list = [...dynamicEvents];
    defaultEvents.forEach(se => {
      if (!list.some(de => de.slug === se.slug)) {
        list.push(se);
      }
    });
    return list.map(e => {
      // Respect explicit database / model status. Only fallback to date calculation if status is not set
      if (!e.status && isEndDateInPast(e)) {
        return {
          ...e,
          status: 'Archived' as const
        };
      }
      return e;
    });
  }, [dynamicEvents]);

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

  return (
    <div className="pt-32 pb-24 grid-structure min-h-screen bg-paper">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        
        {/* Header Block with administrative buttons */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
          <div className="max-w-4xl text-left">
            <div className="inline-block px-4 py-1 border border-ink text-[10px] font-mono font-bold uppercase tracking-[0.3em] mb-4 bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              CONVOCATIONS // SUMMITS // SPRINTS
            </div>
            <h1 className="text-6xl md:text-8xl font-serif font-black leading-none mb-8 italic text-left">
              CoDIN <br />
              <span className="text-outline text-brand-blue uppercase not-italic font-black">Schedules</span>
            </h1>
            <p className="font-serif text-2xl text-ink/75 leading-relaxed text-left">
              Our centers continuously bring community members, field linguists, policy-makers, and computer scientists together to train them in building self-owned, soveregin AI models and datasets.
            </p>
          </div>

          {/* Superadmin button if logged in */}
          {user && (user.role === 'superadmin' || user.role === 'admin') && (
            <div className="shrink-0">
              <button
                onClick={handleCreateNewClick}
                className="h-14 px-8 bg-brand-orange text-white flex items-center gap-3 font-mono font-bold uppercase tracking-widest text-xs hover:bg-ink shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] border border-ink cursor-pointer font-bold"
              >
                <Plus className="w-5 h-5 text-white" strokeWidth={3} />
                Create New Event
              </button>
            </div>
          )}
        </div>

        {/* Filters Panel & Inputs */}
        <div className="p-6 md:p-8 border-2 border-ink bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)] mb-12">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider mb-6 text-ink/40">
            <SlidersHorizontal className="w-4 h-4 text-ink" />
            Bulletins Search & Filter Interface
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-left">
            {/* Searchword input */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                Search Words
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Topic, Host Name or Text..."
                  className="w-full p-3 pl-10 border border-ink bg-paper/30 focus:outline-none focus:border-brand-blue font-mono text-xs focus:bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-ink/40" />
              </div>
            </div>

            {/* Date Search Input */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                Filter by Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. July 2026, Year, Month..."
                  className="w-full p-3 pl-10 border border-ink bg-paper/30 focus:outline-none focus:border-brand-blue font-mono text-xs focus:bg-white"
                  value={dateQuery}
                  onChange={(e) => setDateQuery(e.target.value)}
                />
                <Calendar className="w-4 h-4 absolute left-3.5 top-3.5 text-ink/40" />
              </div>
            </div>

            {/* Arbitrary Event Type Dropdown */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/60">
                Event Category
              </label>
              <select
                className="w-full p-3 border border-ink bg-paper/30 focus:outline-none focus:border-brand-blue font-mono text-xs uppercase font-bold appearance-none cursor-pointer focus:bg-white"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">ANY CONVOCATION TYPE</option>
                {availableTypes.map(t => (
                  <option key={t} value={t}>{t.toUpperCase()}S</option>
                ))}
              </select>
            </div>

            {/* Reset Fields Button */}
            <div className="flex flex-col justify-end">
              <button
                onClick={handleResetFilters}
                className="w-full p-3 border border-ink bg-paper text-ink font-mono text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-acid transition-colors shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer font-bold"
              >
                <RefreshCw className="w-4 h-4 text-ink" />
                Reset Active Filters
              </button>
            </div>
          </div>

          {/* Classification Status Tabs */}
          <div className="border-t border-ink/10 pt-6 flex flex-wrap items-center justify-between gap-4 text-left">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/40 mr-2 md:block hidden">
                STATUS CLASSIFICATION:
              </span>

              <button
                onClick={() => setStatusFilter('Upcoming')}
                className={`px-4 py-2 border border-ink font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'Upcoming'
                    ? 'bg-ink text-paper shadow-[3px_3px_0px_var(--color-brand-acid)]'
                    : 'bg-paper hover:bg-brand-acid/20 text-ink'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-orange inline-block" />
                Upcoming ({allMergedEvents.filter(e => e.status === 'Upcoming' && !e.deleted).length})
              </button>

              <button
                onClick={() => setStatusFilter('Ongoing')}
                className={`px-4 py-2 border border-ink font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'Ongoing'
                    ? 'bg-ink text-paper shadow-[3px_3px_0px_var(--color-brand-acid)]'
                    : 'bg-paper hover:bg-brand-acid/20 text-ink'
                }`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-blue"></span>
                </span>
                Ongoing ({allMergedEvents.filter(e => e.status === 'Ongoing' && !e.deleted).length})
              </button>

              <button
                onClick={() => setStatusFilter('Completed')}
                className={`px-4 py-2 border border-ink font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'Completed'
                    ? 'bg-ink text-paper shadow-[3px_3px_0px_var(--color-brand-acid)]'
                    : 'bg-paper hover:bg-brand-acid/20 text-ink'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                Completed ({allMergedEvents.filter(e => e.status === 'Completed' && !e.deleted).length})
              </button>

              <button
                onClick={() => setStatusFilter('Archived')}
                className={`px-4 py-2 border border-ink font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'Archived'
                    ? 'bg-ink text-paper shadow-[3px_3px_0px_var(--color-brand-acid)]'
                    : 'bg-paper hover:bg-brand-acid/20 text-ink'
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-ink/40" />
                Archived ({allMergedEvents.filter(e => e.status === 'Archived' && !e.deleted).length})
              </button>

              {user && (user.role === 'superadmin' || user.role === 'admin') && (
                <>
                  <button
                    onClick={() => setStatusFilter('Draft')}
                    className={`px-4 py-2 border border-ink font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer relative ${
                      statusFilter === 'Draft'
                        ? 'bg-ink text-paper shadow-[3px_3px_0px_var(--color-brand-acid)]'
                        : 'bg-paper hover:bg-brand-acid/20 text-ink'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 bg-yellow-500 rounded-full inline-block" />
                    Drafts ({allMergedEvents.filter(e => e.status === 'Draft' && !e.deleted).length})
                  </button>

                  <button
                    onClick={() => setStatusFilter('Trash')}
                    className={`px-4 py-2 border border-ink font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      statusFilter === 'Trash'
                        ? 'bg-ink text-paper shadow-[3px_3px_0px_var(--color-brand-acid)]'
                        : 'bg-paper hover:bg-brand-acid/20 text-ink'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-brand-orange" />
                    Trash ({allMergedEvents.filter(e => e.deleted).length})
                  </button>
                </>
              )}

              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 border border-ink font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-ink text-paper shadow-[3px_3px_0px_var(--color-brand-acid)]'
                    : 'bg-paper hover:bg-brand-acid/20 text-ink'
                }`}
              >
                All Active ({allMergedEvents.filter(e => !e.deleted).length})
              </button>
            </div>

            <div className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/50 bg-paper px-3 py-1 border border-ink border-dashed font-bold">
              STATION SEARCH DATA: SHOWING {filteredEvents.length} OF {allMergedEvents.length} BULLETINS
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid gap-12 text-left">
          <AnimatePresence mode="popLayout">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <motion.div
                  key={event.slug}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="p-8 md:p-12 border border-ink bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] transition-all flex flex-col xl:flex-row gap-12 font-bold"
                >
                  {/* Visual Thumbnail */}
                  <div className="w-full xl:w-[400px] aspect-[16/10] xl:aspect-square border border-ink overflow-hidden shrink-0 relative bg-paper shadow-[6px_6px_0px_var(--color-brand-acid)] group">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 font-bold"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 flex gap-1.5">
                      <span className={`px-2.5 py-1 text-[8px] font-mono font-black uppercase tracking-widest border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                        event.status === 'Upcoming' ? 'bg-brand-orange text-white' :
                        event.status === 'Ongoing' ? 'bg-brand-acid text-ink animate-pulse' :
                        event.status === 'Completed' ? 'bg-emerald-600 text-white' :
                        event.status === 'Draft' ? 'bg-amber-400 text-ink' :
                        'bg-ink/10 text-ink/75 bg-paper'
                      }`}>
                        {event.status}
                      </span>
                    </div>

                    <div className="absolute top-4 right-4">
                      <span className="px-2.5 py-1 text-[8px] font-mono font-black uppercase tracking-wider border border-ink bg-white text-ink shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                        {getResolvedEventFee(event).display}
                      </span>
                    </div>

                    <div className="absolute bottom-4 left-4 bg-paper border border-ink px-3 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-ink font-semibold">
                      {event.type}
                    </div>
                  </div>

                  {/* Event Metadata */}
                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-6 mb-6 font-mono text-xs font-bold uppercase tracking-wider text-ink/60">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-brand-orange" />
                          {event.dates}
                        </span>
                        <span className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-brand-blue" />
                          {event.location}
                        </span>
                        <span className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-brand-orange" />
                          {getResolvedEventFee(event).display}
                        </span>
                      </div>

                      <h2 className="font-serif text-3xl md:text-4xl font-black mb-4 hover:text-brand-blue transition-colors leading-tight font-bold">
                        <Link to={`/events/${event.slug}${event.isCourse ? '?isCourse=true' : ''}`} className="hover:no-underline text-ink hover:text-brand-blue font-bold">
                          {event.title}
                        </Link>
                      </h2>

                      <div 
                        className="font-mono text-xs text-ink/70 leading-relaxed mb-8 max-w-4xl font-semibold"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(event.description) }}
                      />

                      <div className="grid md:grid-cols-3 gap-6 border-t border-ink/10 pt-6 mt-6 text-left">
                        {/* Connected Centres */}
                        <div>
                          <div className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-ink/30 mb-3 flex items-center gap-1.5">
                            <Landmark className="w-3.5 h-3.5 text-brand-orange" />
                            Affiliated Centres
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(event.associatedCentres || []).map((cSlug: string) => {
                              const c = dbCentres.find(item => item.slug === cSlug);
                              if (!c) return null;
                              return (
                                <Link
                                  key={cSlug}
                                  to={`/centres/${c.slug}`}
                                  className="px-2.5 py-1 border border-ink text-[10px] font-mono font-bold uppercase tracking-wider bg-brand-acid/10 hover:bg-brand-acid text-ink transition-colors hover:no-underline font-semibold"
                                >
                                  {c.shortName}
                                </Link>
                              );
                            })}
                          </div>
                        </div>

                        {/* Connected Projects */}
                        <div>
                          <div className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-ink/30 mb-3 flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-brand-blue" />
                            Linked Projects
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(event.associatedProjects || []).map((pSlug: string) => {
                              const p = dbProjects.find(item => item.slug === pSlug);
                              if (!p) return null;
                              return (
                                <Link
                                  key={pSlug}
                                  to={`/projects/${p.slug}`}
                                  className="px-2.5 py-1 border border-ink text-[10px] font-mono font-bold uppercase tracking-wider bg-brand-orange/10 hover:bg-brand-orange hover:text-white text-ink transition-all hover:no-underline font-semibold"
                                >
                                  {p.id}
                                </Link>
                              );
                            })}
                          </div>
                        </div>

                        {/* Connected People -> Replaced with Collaborators */}
                        <div>
                          <div className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-ink/30 mb-3 flex items-center gap-1.5 font-bold">
                            <Handshake className="w-3.5 h-3.5 text-brand-blue" strokeWidth={3} />
                            Event Hosts
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {event.collaborators && event.collaborators.length > 0 ? (
                              event.collaborators.map((col: any, idx: number) => {
                                const Content = col.logo ? (
                                  <img 
                                    src={col.logo} 
                                    alt={col.name} 
                                    title={col.name}
                                    className="w-10 h-10 object-contain border border-ink p-1 bg-white hover:scale-105 transition-transform shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="px-2 py-1 border border-ink text-[9px] font-mono font-bold uppercase tracking-wider bg-brand-blue/10 text-ink leading-tight shrink-0">
                                    {col.name}
                                  </span>
                                );
                                if (col.website) {
                                  return (
                                    <a 
                                      key={idx} 
                                      href={col.website} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="inline-block hover:no-underline"
                                    >
                                      {Content}
                                    </a>
                                  );
                                }
                                return <div key={idx} className="inline-block">{Content}</div>;
                              })
                            ) : (
                              <span className="text-[10px] font-mono text-ink/40">CoDIN Core Network</span>
                            )}
                          </div>
                        </div>

                        {/* Sponsors Section */}
                        {event.sponsors && event.sponsors.length > 0 && (
                          <div>
                            <div className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-ink/30 mb-3 flex items-center gap-1.5 font-bold">
                              <Coins className="w-3.5 h-3.5 text-brand-orange" strokeWidth={3} />
                              Sponsors
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {event.sponsors.map((spo: any, idx: number) => {
                                const Content = spo.logo ? (
                                  <img 
                                    src={spo.logo} 
                                    alt={spo.name} 
                                    title={spo.name}
                                    className="w-10 h-10 object-contain border border-ink p-1 bg-white hover:scale-105 transition-transform shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="px-2 py-1 border border-ink text-[9px] font-mono font-bold uppercase tracking-wider bg-brand-orange/10 text-ink leading-tight shrink-0">
                                    {spo.name}
                                  </span>
                                );
                                if (spo.website) {
                                  return (
                                    <a 
                                      key={idx} 
                                      href={spo.website} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="inline-block hover:no-underline"
                                    >
                                      {Content}
                                    </a>
                                  );
                                }
                                return <div key={idx} className="inline-block">{Content}</div>;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 xl:mt-12 flex justify-end gap-3 flex-wrap">
                      {user && (user.role === 'superadmin' || user.role === 'admin') && (
                        <>
                          {event.deleted ? (
                            <>
                              <button
                                onClick={() => handleRetrieveEvent(event._id || event.slug, event.isCourse)}
                                className="px-4 py-3.5 border border-ink bg-green-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-black hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 cursor-pointer font-bold"
                              >
                                <Check className="w-4 h-4 text-white" />
                                Retrieve
                              </button>
                              <button
                                onClick={() => handlePermanentDeleteEvent(event._id || event.slug, event.title, event.isCourse)}
                                className="px-4 py-3.5 border border-ink bg-red-700 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-black hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 cursor-pointer font-bold"
                              >
                                <X className="w-1.5 h-1.5 transform scale-150 inline-block font-black" />
                                Permanent Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditEventClick(event)}
                                className="px-4 py-3.5 border border-ink bg-brand-orange text-white font-mono text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-black hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4 text-white" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleTrashEvent(event._id || event.slug, event.title, event.isCourse)}
                                className="px-4 py-3.5 border border-ink bg-red-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-black hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 text-white" />
                                Delete
                              </button>
                            </>
                          )}
                        </>
                      )}

                      <Link
                        to={`/events/${event.slug}${event.isCourse ? '?isCourse=true' : ''}`}
                        className="px-4 py-3.5 border border-ink bg-white text-ink font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-brand-acid hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 group hover:no-underline font-bold"
                      >
                        Explore Event Docket
                        <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-12 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] text-center max-w-2xl mx-auto flex flex-col items-center gap-4 border-2"
              >
                <AlertCircle className="w-12 h-12 text-brand-orange" />
                <div>
                  <h3 className="font-serif text-2xl font-black mb-2">No Matching Convocations</h3>
                  <p className="font-mono text-xs text-ink/50 uppercase tracking-wider">
                    We couldn't locate any events matching your selected filter variables or text search.
                  </p>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2.5 border border-ink bg-brand-acid font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all cursor-pointer font-bold"
                >
                  Clear All Search Inputs
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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

    </div>
  );
}
