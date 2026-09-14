/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, AlertCircle, Clock, Calendar, MapPin, 
  Users, Mail, Megaphone, Plus, Trash2, Edit2, Layout, HelpCircle
} from 'lucide-react';
import { renderMarkdown } from '../lib/utils';
import { MarkdownMediaHelper } from './MarkdownMediaHelper';

export function getGoogleDriveEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;
  }
  if (url.includes('/preview') || url.includes('/embeddedfolderview')) {
    return url;
  }
  return url;
}

export function migrateFlatScheduleToHierarchical(flatItems: any[]): any[] {
  if (!Array.isArray(flatItems) || flatItems.length === 0) return [];
  if (flatItems[0] && ('sessions' in flatItems[0] || 'days' in flatItems[0] || 'scheduleDays' in flatItems[0])) {
    return flatItems;
  }
  const daysMap: { [date: string]: any } = {};
  flatItems.forEach((item, index) => {
    const rawDate = item.date || 'General Schedule';
    if (!daysMap[rawDate]) {
      daysMap[rawDate] = {
        id: `day-${Date.now()}-${index}-${Math.random()}`,
        date: rawDate,
        name: '',
        sessions: []
      };
    }
    const timeStr = item.time || 'TBA';
    let session = daysMap[rawDate].sessions.find((s: any) => s.timeLabel === timeStr);
    if (!session) {
      session = {
        id: `session-${Date.now()}-${index}-${Math.random()}`,
        timeLabel: timeStr,
        sessionName: '',
        venue: '',
        entries: []
      };
      daysMap[rawDate].sessions.push(session);
    }
    session.entries.push({
      id: `entry-${Date.now()}-${index}-${Math.random()}`,
      topic: item.topic || '',
      speaker: item.speaker || '',
      details: item.details || ''
    });
  });
  return Object.values(daysMap);
}

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: any;
  isCourse?: boolean;
  token?: string;
  onSuccess: () => void;
}

export default function EventFormModal({
  isOpen,
  onClose,
  eventToEdit,
  isCourse: isCourseProp,
  token,
  onSuccess
}: EventFormModalProps) {
  // Primary event fields
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('Conference');
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [eventDates, setEventDates] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStatus, setEventStatus] = useState('Upcoming');
  const [eventDesc, setEventDesc] = useState('');
  const [eventLongDesc, setEventLongDesc] = useState('');
  const [eventImage, setEventImage] = useState('https://images.unsplash.com/photo-1540575467063-178a50c2df87');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');

  // Selected relational graph linkages
  const [selectedCentres, setSelectedCentres] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);

  // Collaborators and Sponsors arrays
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);

  // Temp form fields for Collaborators
  const [collabName, setCollabName] = useState('');
  const [collabLogo, setCollabLogo] = useState('');
  const [collabWebsite, setCollabWebsite] = useState('');

  // Temp form fields for Sponsors
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorLogo, setSponsorLogo] = useState('');
  const [sponsorWebsite, setSponsorWebsite] = useState('');

  // Registration options
  const [regTitle, setRegTitle] = useState('Secure Your Spot');
  const [regDesc, setRegDesc] = useState('Exclusive cohort limited to 15 participants for deep mentorship.');
  const [regBtnText, setRegBtnText] = useState('Apply for Admission');
  const [regBtnLink, setRegBtnLink] = useState('');
  const [regHighlights, setRegHighlights] = useState('Intensive study track, Industry mentorship, Certifications');
  const [paymentMsgChoice, setPaymentMsgChoice] = useState<'markdown' | 'link'>('markdown');
  const [paymentMarkdown, setPaymentMarkdown] = useState('');
  const [paymentGatewayLink, setPaymentGatewayLink] = useState('');

  // Customizable subPages / Dossier Tab Chapters
  const [customPages, setCustomPages] = useState<any[]>([
    {
      slug: 'overview',
      title: 'Active Briefing',
      icon: 'Megaphone',
      type: 'markdown',
      content: { teaser: '', markdown: '' }
    }
  ]);

  // Tab editor accumulator states
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [newPageType, setNewPageType] = useState('markdown');
  const [newPageTeaser, setNewPageTeaser] = useState('');
  const [newPageMarkdown, setNewPageMarkdown] = useState('');
  const [editingPageSlug, setEditingPageSlug] = useState<string | null>(null);

  // Active overall editor tab selection
  const [activeEditorTab, setActiveEditorTab] = useState<'core' | 'admissions' | 'affiliations' | 'collab' | 'dossiers'>('core');
  // Active dossier custom sub-tab selection
  const [activeSubTabSlug, setActiveSubTabSlug] = useState<string>('overview');
  // Temporary selection for selecting a new page type to add
  const [newPageTypeSelection, setNewPageTypeSelection] = useState<string>('markdown');

  // Synchronizes any state change back into customPages
  const updateActivePage = (updater: (cp: any) => any) => {
    setCustomPages(prev => prev.map(p => p.slug === activeSubTabSlug ? updater(p) : p));
  };

  // Deadlines list
  const [dtLabel, setDtLabel] = useState('');
  const [dtDate, setDtDate] = useState('');
  const [dtFootnote, setDtFootnote] = useState('');
  const [dtHighlighted, setDtHighlighted] = useState(false);
  const [draftDatesList, setDraftDatesList] = useState<any[]>([]);
  const [editingDateIdx, setEditingDateIdx] = useState<number | null>(null);

  // Schedule program rows
  const [scTime, setScTime] = useState('');
  const [scTopic, setScTopic] = useState('');
  const [scSpeaker, setScSpeaker] = useState('');
  const [scDate, setScDate] = useState('');
  const [scDetails, setScDetails] = useState('');
  const [scDatePicker, setScDatePicker] = useState('');
  const [scTimeStart, setScTimeStart] = useState('');
  const [scTimeEnd, setScTimeEnd] = useState('');
  const [draftScheduleList, setDraftScheduleList] = useState<any[]>([]);
  const [editingScheduleIdx, setEditingScheduleIdx] = useState<number | null>(null);

  // New Hierarchical Schedule Builder (V2)
  const [v2DriveLink, setV2DriveLink] = useState('');
  const [v2Document, setV2Document] = useState<{ name: string; type: string; dataUrl: string; size?: string } | null>(null);
  const [v2ScheduleDays, setV2ScheduleDays] = useState<any[]>([]);

  // Editing forms state for nested elements
  const [newDayDate, setNewDayDate] = useState('');
  const [newDayDateCustom, setNewDayDateCustom] = useState('');
  const [newDayName, setNewDayName] = useState('');
  const [newDayDescription, setNewDayDescription] = useState('');
  const [editorActiveDayId, setEditorActiveDayId] = useState<string | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);

  // Adding/editing session state
  const [sessionTimeStart, setSessionTimeStart] = useState('');
  const [sessionTimeEnd, setSessionTimeEnd] = useState('');
  const [sessionTimeCustom, setSessionTimeCustom] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [sessionVenue, setSessionVenue] = useState('');
  const [activeSessionDayId, setActiveSessionDayId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Adding/editing entry state
  const [entryTopic, setEntryTopic] = useState('');
  const [entrySpeaker, setEntrySpeaker] = useState('');
  const [entryDetails, setEntryDetails] = useState('');
  const [activeEntrySessionId, setActiveEntrySessionId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const getEventDateOptions = () => {
    const dates: string[] = [];
    if (eventStartDate) {
      const start = new Date(eventStartDate);
      const end = eventEndDate ? new Date(eventEndDate) : start;
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const curr = new Date(start);
        let guard = 0;
        while (curr <= end && guard < 100) {
          dates.push(curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
          curr.setDate(curr.getDate() + 1);
          guard++;
        }
      }
    }
    if (eventDates && !dates.includes(eventDates)) {
      dates.push(eventDates);
    }
    return dates;
  };

  // Registration Fees list
  const [regDeadlineText, setRegDeadlineText] = useState('');
  const [regFeeCategory, setRegFeeCategory] = useState('');
  const [regFeeValue, setRegFeeValue] = useState('');
  const [draftFeesList, setDraftFeesList] = useState<any[]>([]);
  const [editingFeesIdx, setEditingFeesIdx] = useState<number | null>(null);

  // RSVP compliance list (Now with markdown support)
  const [regInstructionInput, setRegInstructionInput] = useState('');
  const [draftInstructionsList, setDraftInstructionsList] = useState<string[]>([]);
  const [editingInstructionsIdx, setEditingInstructionsIdx] = useState<number | null>(null);

  // Custom List (Presenters Layout)
  const [liName, setLiName] = useState('');
  const [liAffiliation, setLiAffiliation] = useState('');
  const [liRole, setLiRole] = useState('');
  const [liIsExternal, setLiIsExternal] = useState(false);
  const [liStaffSlug, setLiStaffSlug] = useState('');
  const [liPhotoUrl, setLiPhotoUrl] = useState('');
  const [liProfileUrl, setLiProfileUrl] = useState('');
  const [liAddAffiliation, setLiAddAffiliation] = useState('');
  const [draftListList, setDraftListList] = useState<any[]>([]);
  const [editingListListIdx, setEditingListListIdx] = useState<number | null>(null);

  // Logistics list (with Map Links)
  const [draftLogisticsKey, setDraftLogisticsKey] = useState('');
  const [draftLogisticsValue, setDraftLogisticsValue] = useState('');
  const [draftLogisticsLink, setDraftLogisticsLink] = useState('');
  const [draftLogisticsList, setDraftLogisticsList] = useState<any[]>([]);
  const [editingLogisticsIdx, setEditingLogisticsIdx] = useState<number | null>(null);

  // Governing Committees groups
  const [draftCommitteeName, setDraftCommitteeName] = useState('');
  const [draftCommitteeMembers, setDraftCommitteeMembers] = useState<any[]>([]);
  const [draftCommitteesList, setDraftCommitteesList] = useState<any[]>([]);
  const [editingCommitteeIdx, setEditingCommitteeIdx] = useState<number | null>(null);

  // Committee single member draft card
  const [draftCommitteeMemberName, setDraftCommitteeMemberName] = useState('');
  const [draftCommitteeMemberAffiliation, setDraftCommitteeMemberAffiliation] = useState('Council for Diversity and Innovation');
  const [draftCommitteeMemberRole, setDraftCommitteeMemberRole] = useState('');
  const [commMemIsExternal, setCommMemIsExternal] = useState(false);
  const [commMemStaffSlug, setCommMemStaffSlug] = useState('');
  const [commMemPhotoUrl, setCommMemPhotoUrl] = useState('');
  const [commMemProfileUrl, setCommMemProfileUrl] = useState('');
  const [commMemAddAffiliation, setCommMemAddAffiliation] = useState('');
  const [editingCommitteeMemberIdx, setEditingCommitteeMemberIdx] = useState<number | null>(null);

  // Contact representatives list
  const [draftContactName, setDraftContactName] = useState('');
  const [draftContactDesignation, setDraftContactDesignation] = useState('');
  const [draftContactEmail, setDraftContactEmail] = useState('');
  const [draftContactPhone, setDraftContactPhone] = useState('');
  const [draftContactList, setDraftContactList] = useState<any[]>([]);
  const [editingContactIdx, setEditingContactIdx] = useState<number | null>(null);

  // Central Presenters Directory
  const [draftPresenters, setDraftPresenters] = useState<any[]>([]);
  const [presIsExternal, setPresIsExternal] = useState(false);
  const [presStaffSlug, setPresStaffSlug] = useState('');
  const [presName, setPresName] = useState('');
  const [presPhotoUrl, setPresPhotoUrl] = useState('');
  const [presProfileUrl, setPresProfileUrl] = useState('');
  const [presRole, setPresRole] = useState('');
  const [editingPresenterIdx, setEditingPresenterIdx] = useState<number | null>(null);

  // Loaded database dynamic affiliations
  const [dbCentres, setDbCentres] = useState<any[]>([]);
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [dbTeam, setDbTeam] = useState<any[]>([]);
  const [isUploadingCloudinary, setIsUploadingCloudinary] = useState(false);
  const [cloudinaryProgress, setCloudinaryProgress] = useState('');

  // Fetch true database directories on mount
  useEffect(() => {
    if (!isOpen) return;
    
    fetch('/api/centres')
      .then(res => res.json())
      .then(data => { 
        const array = Array.isArray(data) ? data : (data && Array.isArray(data.centres) ? data.centres : []);
        setDbCentres(array.filter((c: any) => !c.deleted)); 
      })
      .catch(err => console.error("Could not fetch centres", err));

    fetch('/api/projects')
      .then(res => res.json())
      .then(data => { 
        const array = Array.isArray(data) ? data : (data && Array.isArray(data.projects) ? data.projects : []);
        setDbProjects(array.filter((p: any) => !p.deleted)); 
      })
      .catch(err => console.error("Could not fetch projects", err));

    fetch('/api/people')
      .then(res => res.json())
      .then(data => { 
        const array = Array.isArray(data) ? data : (data && Array.isArray(data.people) ? data.people : []);
        setDbTeam(array.filter((p: any) => !p.deleted)); 
      })
      .catch(err => console.error("Could not fetch team members", err));
  }, [isOpen]);

  // Load existing data when editing is requested
  useEffect(() => {
    if (isOpen && eventToEdit) {
      setEventTitle(eventToEdit.title || '');
      setEventType(eventToEdit.type || 'Conference');
      setCustomTypeInput('');
      setEventDates(eventToEdit.dates || '');
      setEventLocation(eventToEdit.location || '');
      setEventStatus(eventToEdit.status || 'Upcoming');
      setEventDesc(eventToEdit.description || '');
      setEventLongDesc(eventToEdit.longDescription || '');
      setEventImage(eventToEdit.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87');
      setEventStartDate(eventToEdit.startDate || '');
      setEventEndDate(eventToEdit.endDate || '');
      setSelectedCentres(eventToEdit.associatedCentres || []);
      setSelectedProjects(eventToEdit.associatedProjects || []);
      setSelectedPeople(eventToEdit.associatedPeople || []);
      setCollaborators(eventToEdit.collaborators || []);
      setSponsors(eventToEdit.sponsors || []);
      setDraftPresenters(eventToEdit.presenters || []);

      if (eventToEdit.registrationCard) {
        setRegTitle(eventToEdit.registrationCard.title || 'Secure Your Spot');
        setRegDesc(eventToEdit.registrationCard.description || 'Exclusive cohort limited to 15 participants for deep mentorship.');
        setRegBtnText(eventToEdit.registrationCard.buttonText || 'Apply for Admission');
        setRegBtnLink(eventToEdit.registrationCard.buttonLink || '');
        setRegHighlights(Array.isArray(eventToEdit.registrationCard.highlights) ? eventToEdit.registrationCard.highlights.join(', ') : '');
        setPaymentMsgChoice(eventToEdit.registrationCard.paymentMsgChoice || 'markdown');
        setPaymentMarkdown(eventToEdit.registrationCard.paymentMarkdown || '');
        setPaymentGatewayLink(eventToEdit.registrationCard.paymentGatewayLink || '');
      }

      if (eventToEdit.subPages && eventToEdit.subPages.length > 0) {
        setCustomPages(eventToEdit.subPages);
        setActiveSubTabSlug(eventToEdit.subPages[0]?.slug || 'overview');
      } else {
        setCustomPages([
          {
            slug: 'overview',
            title: 'Active Briefing',
            icon: 'Megaphone',
            type: 'markdown',
            content: { teaser: '', markdown: '' }
          }
        ]);
        setActiveSubTabSlug('overview');
      }
    } else {
      // Clear fields to defaults when creating new
      setEventTitle('');
      setEventType('Conference');
      setCustomTypeInput('');
      setEventDates('');
      setEventLocation('');
      setEventStatus('Upcoming');
      setEventDesc('');
      setEventLongDesc('');
      setEventImage('https://images.unsplash.com/photo-1540575467063-178a50c2df87');
      setEventStartDate('');
      setEventEndDate('');
      setSelectedCentres([]);
      setSelectedProjects([]);
      setSelectedPeople([]);
      setCollaborators([]);
      setSponsors([]);
      setDraftPresenters([]);
      setRegTitle('Secure Your Spot');
      setRegDesc('Exclusive cohort limited to 15 participants for deep mentorship.');
      setRegBtnText('Apply for Admission');
      setRegBtnLink('');
      setRegHighlights('Intensive study track, Industry mentorship, Certifications');
      setPaymentMsgChoice('markdown');
      setPaymentMarkdown('');
      setPaymentGatewayLink('');
      setCustomPages([
        {
          slug: 'overview',
          title: 'Active Briefing',
          icon: 'Megaphone',
          type: 'markdown',
          content: { teaser: '', markdown: '' }
        }
      ]);
      setActiveSubTabSlug('overview');
    }
    // Default back to first tab on open
    setActiveEditorTab('core');
  }, [isOpen, eventToEdit]);

  // Sync page states whenever switching sub-tabs
  useEffect(() => {
    const cp = customPages.find(p => p.slug === activeSubTabSlug);
    if (!cp) return;

    setNewPageTitle(cp.title || '');
    setNewPageSlug(cp.slug || '');
    setNewPageType(cp.type || 'markdown');

    if (cp.type === 'markdown') {
      setNewPageTeaser(cp.content?.teaser || '');
      setNewPageMarkdown(cp.content?.markdown || '');
    } else if (cp.type === 'dates') {
      setDraftDatesList(cp.content || []);
    } else if (cp.type === 'schedule') {
      if (cp.content && !Array.isArray(cp.content) && (cp.content.scheduleDays || cp.content.googleDriveLink || cp.content.document)) {
        setV2DriveLink(cp.content.googleDriveLink || '');
        setV2Document(cp.content.document || null);
        setV2ScheduleDays(cp.content.scheduleDays || []);
      } else {
        setV2DriveLink('');
        setV2Document(null);
        setV2ScheduleDays(migrateFlatScheduleToHierarchical(cp.content || []));
      }
    } else if (cp.type === 'registration') {
      setRegDeadlineText(cp.content?.deadline || '');
      setDraftFeesList(cp.content?.fees || []);
      setDraftInstructionsList(cp.content?.instructions || []);
    } else if (cp.type === 'list') {
      setDraftListList(cp.content || []);
    } else if (cp.type === 'logistics') {
      const mapped = Array.isArray(cp.content) ? cp.content : Object.entries(cp.content || {}).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : (value as any).details || '',
        link: typeof value === 'object' ? (value as any).link : undefined
      }));
      setDraftLogisticsList(mapped);
    } else if (cp.type === 'committees') {
      setDraftCommitteesList(cp.content || []);
    } else if (cp.type === 'contact') {
      setDraftContactList(cp.content || []);
    }
  }, [activeSubTabSlug]);

  // Utility to convert standard 12h/24h strings into HTML5 HH:MM 24h format
  const parseTimeTo24h = (timeStr: string): string => {
    if (!timeStr) return '';
    let cleaned = timeStr.trim().toUpperCase();
    const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const ampm = match[3];
      if (ampm === 'PM' && hours < 12) {
        hours += 12;
      } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
      }
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    if (/^\d{2}:\d{2}$/.test(cleaned)) {
      return cleaned;
    }
    return '';
  };

  // Insert markdown logic
  const handleInsertMarkdown = (textareaId: string, prefix: string, suffix: string, defaultValue: string, setter: (val: string) => void) => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const selected = text.substring(start, end);
      const replacement = `${prefix}${selected || defaultValue}${suffix}`;
      setter(text.substring(0, start) + replacement + text.substring(end));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || defaultValue).length);
      }, 50);
    }
  };

  // Reusable markdown toolbar template
  const MarkdownToolbar = ({ textareaId, value, onChange }: { textareaId: string; value: string; onChange: (val: string) => void }) => {
    return (
      <div className="flex flex-wrap gap-1 mb-1 bg-paper/50 p-1 border border-ink border-b-0 font-sans">
        <button type="button" onClick={() => handleInsertMarkdown(textareaId, '**', '**', 'Bold Text', onChange)} className="px-1.5 py-0.5 bg-white hover:bg-brand-acid text-[9px] font-mono font-bold border border-ink uppercase">Bold</button>
        <button type="button" onClick={() => handleInsertMarkdown(textareaId, '*', '*', 'Italic Text', onChange)} className="px-1.5 py-0.5 bg-white hover:bg-brand-acid text-[9px] font-mono italic border border-ink uppercase">Italic</button>
        <button type="button" onClick={() => handleInsertMarkdown(textareaId, '<u>', '</u>', 'Underline Text', onChange)} className="px-1.5 py-0.5 bg-white hover:bg-brand-acid text-[9px] font-mono underline border border-ink uppercase">Underline</button>
        <button type="button" onClick={() => handleInsertMarkdown(textareaId, '\n# ', '', 'Title', onChange)} className="px-1.5 py-0.5 bg-white hover:bg-brand-acid text-[9px] font-mono border border-ink">H1</button>
        <button type="button" onClick={() => handleInsertMarkdown(textareaId, '\n## ', '', 'Subtitle', onChange)} className="px-1.5 py-0.5 bg-white hover:bg-brand-acid text-[9px] font-mono border border-ink">H2</button>
        <button type="button" onClick={() => handleInsertMarkdown(textareaId, '\n### ', '', 'Heading', onChange)} className="px-1.5 py-0.5 bg-white hover:bg-brand-acid text-[9px] font-mono border border-ink">H3</button>
        <button type="button" onClick={() => handleInsertMarkdown(textareaId, '\n- ', '', 'Bullet List Item', onChange)} className="px-1.5 py-0.5 bg-white hover:bg-brand-acid text-[9px] font-mono border border-ink uppercase">• Bullet</button>
        <button type="button" onClick={() => handleInsertMarkdown(textareaId, '\n1. ', '', 'Numbered List Item', onChange)} className="px-1.5 py-0.5 bg-white hover:bg-brand-acid text-[9px] font-mono border border-ink uppercase">1. List</button>
      </div>
    );
  };

  // Cloudinary direct file upload proxy
  const uploadToCloudinary = async ({ dataUrl }: { dataUrl: string }) => {
    setIsUploadingCloudinary(true);
    setCloudinaryProgress('Initializing image stream...');
    try {
      const res = await fetch('/api/upload-cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.url || '';
    } catch (err) {
      console.error(err);
      alert('Cloudinary local upload proxy failed.');
    } finally {
      setIsUploadingCloudinary(false);
      setCloudinaryProgress('');
    }
    return '';
  };

  const toggleSelection = (slug: string, pool: string[], setter: Function) => {
    if (pool.includes(slug)) {
      setter(pool.filter(x => x !== slug));
    } else {
      setter([...pool, slug]);
    }
  };

  // Helper date formulators
  const formatEventDates = (start: string, end: string) => {
    if (!start) return 'TBD';
    const sDate = new Date(start);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const startStr = sDate.toLocaleDateString('en-US', options);
    if (!end || start === end) return startStr;
    const eDate = new Date(end);
    if (sDate.getFullYear() === eDate.getFullYear() && sDate.getMonth() === eDate.getMonth()) {
      return `${sDate.toLocaleDateString('en-US', { month: 'short' })} ${sDate.getDate()} - ${eDate.getDate()}, ${sDate.getFullYear()}`;
    }
    return `${startStr} - ${eDate.toLocaleDateString('en-US', options)}`;
  };

  const calculateEventStatus = (start: string, end: string): string => {
    if (!start) return 'Upcoming';
    const today = new Date();
    today.setHours(0,0,0,0);
    const sDate = new Date(start);
    sDate.setHours(0,0,0,0);
    const eDate = end ? new Date(end) : sDate;
    eDate.setHours(23,59,59,999);

    if (today < sDate) return 'Upcoming';
    if (today >= sDate && today <= eDate) return 'Ongoing';
    return 'Archived';
  };

  const handleMoveCustomPage = (idx: number, dir: 'up' | 'down') => {
    if (idx === 0 && dir === 'up') return;
    if (idx === customPages.length - 1 && dir === 'down') return;
    const dest = dir === 'up' ? idx - 1 : idx + 1;
    const copy = [...customPages];
    const temp = copy[idx];
    copy[idx] = copy[dest];
    copy[dest] = temp;
    setCustomPages(copy);
  };

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
      if (cp.content && !Array.isArray(cp.content) && (cp.content.scheduleDays || cp.content.googleDriveLink || cp.content.document)) {
        setV2DriveLink(cp.content.googleDriveLink || '');
        setV2Document(cp.content.document || null);
        setV2ScheduleDays(cp.content.scheduleDays || []);
      } else {
        setV2DriveLink('');
        setV2Document(null);
        setV2ScheduleDays(migrateFlatScheduleToHierarchical(cp.content || []));
      }
      setDraftScheduleList(Array.isArray(cp.content) ? cp.content : (cp.content?.scheduleDays || []));
    } else if (cp.type === 'registration') {
      setRegDeadlineText(cp.content?.deadline || '');
      setDraftFeesList(cp.content?.fees || []);
      setDraftInstructionsList(cp.content?.instructions || []);
    } else if (cp.type === 'list') {
      setDraftListList(cp.content || []);
    } else if (cp.type === 'logistics') {
      const mapped = Array.isArray(cp.content) ? cp.content : Object.entries(cp.content || {}).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : (value as any).details || '',
        link: typeof value === 'object' ? (value as any).link : undefined
      }));
      setDraftLogisticsList(mapped);
    } else if (cp.type === 'committees') {
      setDraftCommitteesList(cp.content || []);
    } else if (cp.type === 'contact') {
      setDraftContactList(cp.content || []);
    }
  };

  const handleAddOrSaveDossierTab = () => {
    if (!newPageTitle) { alert('Page Name/Heading is required.'); return; }
    const slugName = newPageSlug.trim() || newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (!editingPageSlug && customPages.some(p => p.slug === slugName)) {
      alert('Tab Slug name must be unique.');
      return;
    }

    let tabContent: any = {};
    if (newPageType === 'markdown') {
      tabContent = { teaser: newPageTeaser, markdown: newPageMarkdown };
    } else if (newPageType === 'dates') {
      tabContent = draftDatesList;
    } else if (newPageType === 'schedule') {
      tabContent = {
        googleDriveLink: v2DriveLink,
        document: v2Document,
        scheduleDays: v2ScheduleDays
      };
    } else if (newPageType === 'registration') {
      tabContent = { deadline: regDeadlineText, fees: draftFeesList, instructions: draftInstructionsList };
    } else if (newPageType === 'list') {
      tabContent = draftListList;
    } else if (newPageType === 'logistics') {
      tabContent = draftLogisticsList;
    } else if (newPageType === 'committees') {
      tabContent = draftCommitteesList;
    } else if (newPageType === 'contact') {
      tabContent = draftContactList;
    }

    const draftPage = {
      title: newPageTitle,
      slug: slugName,
      icon: newPageType === 'dates' ? 'CalendarRange' : 
            newPageType === 'schedule' ? 'Clock' : 
            newPageType === 'logistics' ? 'MapPin' :
            newPageType === 'committees' ? 'Users' :
            newPageType === 'contact' ? 'Mail' : 'Megaphone',
      type: newPageType,
      content: tabContent
    };

    if (editingPageSlug) {
      setCustomPages(customPages.map(p => p.slug === editingPageSlug ? draftPage : p));
    } else {
      setCustomPages([...customPages, draftPage]);
    }

    // Reset page states
    setEditingPageSlug(null);
    setNewPageTitle('');
    setNewPageSlug('');
    setNewPageType('markdown');
    setNewPageTeaser('');
    setNewPageMarkdown('');
    setDraftDatesList([]);
    setDraftScheduleList([]);
    setDraftFeesList([]);
    setRegDeadlineText('');
    setDraftInstructionsList([]);
    setDraftListList([]);
    setDraftLogisticsList([]);
    setDraftCommitteesList([]);
    setDraftContactList([]);
    setLiIsExternal(false);
    setLiStaffSlug('');
    setLiPhotoUrl('');
    setLiProfileUrl('');
    setLiAddAffiliation('');
    setCommMemAddAffiliation('');
    setScDatePicker('');
    setScTimeStart('');
    setScTimeEnd('');

    // Clear V2 fields
    setV2DriveLink('');
    setV2Document(null);
    setV2ScheduleDays([]);
    setNewDayDate('');
    setNewDayDateCustom('');
    setNewDayName('');
    setSessionTimeStart('');
    setSessionTimeEnd('');
    setSessionTimeCustom('');
    setSessionName('');
    setSessionVenue('');
    setEntryTopic('');
    setEntrySpeaker('');
    setEntryDetails('');
    setEditingDayId(null);
    setEditingSessionId(null);
    setEditingEntryId(null);
    setActiveSessionDayId(null);
    setActiveEntrySessionId(null);
  };

  // Submit complete details modification
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle) return;

    const formattedDatesStr = eventStartDate ? formatEventDates(eventStartDate, eventEndDate) : eventDates;
    const finalStatus = eventStatus || (eventStartDate ? calculateEventStatus(eventStartDate, eventEndDate) : 'Upcoming');
    const finalType = eventType === 'custom_type' ? customTypeInput : eventType;

    // Slug generation
    const eventSlug = eventToEdit?.slug || eventTitle.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const isCourseParam = isCourseProp || eventToEdit?.isCourse || finalType === 'W2M Residential Course' || finalType === 'Residential Course' || finalType === 'Residential';

    const savedEventObj = {
      ...(eventToEdit || {}),
      title: eventTitle,
      slug: eventSlug,
      type: finalType,
      dates: formattedDatesStr,
      startDate: eventStartDate || null,
      endDate: eventEndDate || null,
      location: eventLocation,
      status: finalStatus,
      description: eventDesc,
      longDescription: eventLongDesc || eventDesc,
      image: eventImage,
      associatedCentres: selectedCentres,
      associatedProjects: selectedProjects,
      associatedPeople: selectedPeople,
      collaborators: collaborators,
      sponsors: sponsors,
      presenters: draftPresenters,
      registrationCard: {
        title: regTitle,
        description: regDesc,
        buttonText: regBtnText,
        buttonLink: regBtnLink,
        highlights: regHighlights.split(',').map(h => h.trim()).filter(h => h.length > 0),
        paymentMsgChoice: paymentMsgChoice,
        paymentMarkdown: paymentMarkdown,
        paymentGatewayLink: paymentGatewayLink
      },
      subPages: customPages
    };

    try {
      const url = eventToEdit ? `/api/events/${eventToEdit._id || eventToEdit.slug}?isCourse=${!!isCourseParam}` : `/api/events?isCourse=${!!isCourseParam}`;
      const method = eventToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(savedEventObj)
      });
      const data = await res.json();
      if (data.success) {
        alert(eventToEdit ? "Excellent! Event updated successfully." : "Superb! Custom event published successfully.");
        onSuccess();
        onClose();
      } else {
        alert("Server failed to persist event: " + (data.error || "Permission constraints."));
      }
    } catch (err) {
      console.error(err);
      alert("Operation failure connecting: " + String(err));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F4F5] w-screen h-screen flex flex-col font-mono text-xs text-left overflow-hidden">
      {/* STICKY HEADER */}
      <div className="bg-white border-b-2 border-ink p-4 sm:p-5 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 select-none">
        <div>
          <span className="font-mono text-[9px] font-black uppercase tracking-widest text-brand-orange border border-brand-orange px-2 py-0.5 mb-1 inline-block">
            {eventToEdit ? "CONFERENCE EDITOR MATRIX" : "CONFERENCE CREATOR MATRIX"}
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-black italic tracking-tight font-bold shrink truncate max-w-[50vw]">
            {eventToEdit ? `Modify Event: ${eventTitle || 'Draft'}` : "Publish Dynamic Bulletin"}
          </h2>
          <p className="font-mono text-[8px] sm:text-[10px] text-ink/40 uppercase mt-0.5">Populate directories dynamically into global databases. Re-order chapters and coordinates.</p>
        </div>
        
        <div className="flex gap-2 leading-none self-stretch sm:self-auto shrink-0 font-mono">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-3.5 py-2 border border-ink bg-paper text-[10px] font-bold uppercase tracking-wide cursor-pointer hover:bg-stone-50 select-none"
          >
            Cancel Draft
          </button>
          <button
            type="button"
            onClick={handleFormSubmit}
            className="flex-1 sm:flex-none px-5 py-2 bg-brand-orange border border-ink text-white font-serif font-black uppercase tracking-widest hover:bg-brand-acid hover:text-ink transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] cursor-pointer select-none"
          >
            {eventToEdit ? "Save Modifications 💾" : "Publish Agenda Event 🚀"}
          </button>
        </div>
      </div>

      {/* STICKY TABS ACCESS BAR */}
      <div className="bg-zinc-100 border-b border-ink/40 p-2 shrink-0 flex flex-wrap gap-1.5 overflow-x-auto select-none">
        {[
          { id: 'core', label: '1. Core Details' },
          { id: 'admissions', label: '2. Admissions & Fees' },
          { id: 'affiliations', label: '3. Connections Graph' },
          { id: 'collab', label: '4. Partners & Sponsors' },
          { id: 'dossiers', label: '5. Dossier Pages, Schedules & Resources' }
        ].map(tab => {
          const isTabActive = activeEditorTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveEditorTab(tab.id as any)}
              className={`px-3 py-1.5 text-[10px] font-bold font-mono tracking-wide border-2 transition-all cursor-pointer rounded-xs ${
                isTabActive 
                  ? 'bg-brand-acid text-black border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] -translate-y-[1px]' 
                  : 'bg-white text-ink/80 border-ink/40 hover:border-ink hover:bg-stone-50 hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SCROLLABLE MAIN FIELD MATRIX */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-paper">
        <form onSubmit={handleFormSubmit} className="space-y-6 max-w-4xl mx-auto pb-16">
          
          {/* PRIMARY METADATA */}
          {activeEditorTab === 'core' && (
            <div className="space-y-5 animate-fade-in">
          <div className="grid sm:grid-cols-2 gap-6 border-b border-ink/10 pb-8">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Event Bulletin Title</label>
              <input required type="text" placeholder="e.g. Diversity AI NLP Summit 2026" className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none" value={eventTitle} onChange={e => setEventTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Convocation Stream / Type</label>
              <select className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none font-bold" value={eventType} onChange={e => setEventType(e.target.value)}>
                <option value="Conference">International Conference</option>
                <option value="Seminar">Academic Seminar</option>
                <option value="Colloquium">Research Colloquium</option>
                <option value="Linguistic Fieldwork">Linguistic Fieldwork</option>
                <option value="Residential Course">Academic Residential Course</option>
                <option value="W2M Residential Course">CoDIN Residential Course</option>
                <option value="custom_type">Custom Bulletin Type (Fill Below)</option>
              </select>
              {eventType === 'custom_type' && (
                <input required type="text" placeholder="Specify custom banner tag description..." className="w-full p-2.5 border border-ink bg-white focus:bg-white mt-1.5 animate-fade-in font-bold text-xs" value={customTypeInput} onChange={e => setCustomTypeInput(e.target.value)} />
              )}
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Primary Date Boundaries</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="w-full p-3 border border-ink bg-paper text-xs uppercase" value={eventStartDate} onChange={e => setEventStartDate(e.target.value)} />
                <input type="date" className="w-full p-3 border border-ink bg-paper text-xs uppercase" value={eventEndDate} onChange={e => setEventEndDate(e.target.value)} />
              </div>
              <input type="text" placeholder="Backup dates placeholder (e.g. June 5 - 12, 2026)" className="w-full p-2.5 border border-ink bg-paper text-xs mt-1.5" value={eventDates} onChange={e => setEventDates(e.target.value)} />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Physical Venue Hub Location</label>
              <input required type="text" placeholder="e.g. IIIT Delhi, Okhla Phase III" className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none font-bold" value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Gate Status Mode</label>
              <select className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none font-bold" value={eventStatus} onChange={e => setEventStatus(e.target.value)}>
                <option value="Upcoming">Upcoming / Registrations Active</option>
                <option value="Ongoing">Ongoing / Sessions Live</option>
                <option value="Completed">Completed / Concluded</option>
                <option value="Archived">Archived / Materials Cached</option>
                <option value="Draft">Draft / Work in Progress</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Aesthetic Cover Image Ref</label>
              <div className="flex gap-2">
                <input type="text" className="flex-1 p-3 border border-ink bg-paper focus:bg-white focus:outline-none" value={eventImage} onChange={e => setEventImage(e.target.value)} />
                <label className="p-3 border border-ink bg-brand-orange text-white uppercase cursor-pointer hover:bg-black font-bold shrink-0">
                  Upload Cover
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const url = await uploadToCloudinary({ dataUrl: reader.result as string });
                        if (url) setEventImage(url);
                      };
                      reader.readAsDataURL(file);
                    }} 
                  />
                </label>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Brief Summary Abstract Teaser</label>
              <textarea required rows={2} placeholder="Shorthand summary displayed on listings..." className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none" value={eventDesc} onChange={e => setEventDesc(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Dossier Long Technical Narrative (Supports Markdown)</label>
              <MarkdownToolbar textareaId="form-event-long-desc" value={eventLongDesc} onChange={setEventLongDesc} />
              <MarkdownMediaHelper 
                onInsert={(text) => handleInsertMarkdown('form-event-long-desc', '', '', text, setEventLongDesc)}
                onUploadingStateChange={setIsUploadingCloudinary}
              />
              <textarea id="form-event-long-desc" rows={4} placeholder="Comprehensive description rendered inside active briefs..." className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none" value={eventLongDesc} onChange={e => setEventLongDesc(e.target.value)} />
              {eventLongDesc && (
                <div className="mt-2 p-3 border border-dashed border-ink bg-paper/30 max-h-[160px] overflow-y-auto">
                  <span className="block text-[8px] font-black uppercase mb-1 text-brand-blue">Dossier Narrative Preview</span>
                  <div className="prose prose-sm font-sans text-xs text-ink" dangerouslySetInnerHTML={{ __html: renderMarkdown(eventLongDesc) }} />
                </div>
              )}
            </div>
          </div>
          </div>
          )}

          {/* ADMISSION CARD & PAYMENT CONFIGURATION */}
          {activeEditorTab === 'admissions' && (
          <div className="border border-ink p-6 mb-8 space-y-6 bg-paper/5 animate-fade-in">
            <h3 className="font-serif text-lg font-black font-bold text-ink">Admission Card &amp; Payment Configuration</h3>
            <p className="font-mono text-[9px] text-ink/50 uppercase leading-snug">
              Configure details shown in the active admission registration sidebar, including the candidate fee instructions or payment sandbox links.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 animate-fade-in text-xs">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Spot Registration Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Secure Your Spot" 
                  className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none" 
                  value={regTitle} 
                  onChange={e => setRegTitle(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Spot Registration Button Text</label>
                <input 
                  type="text" 
                  placeholder="e.g. Apply for Admission" 
                  className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none" 
                  value={regBtnText} 
                  onChange={e => setRegBtnText(e.target.value)} 
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Spot Registration Description</label>
                <textarea 
                  rows={2}
                  placeholder="e.g. Exclusive cohort limited to 15 participants for deep mentorship." 
                  className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none" 
                  value={regDesc} 
                  onChange={e => setRegDesc(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Spot Highlight list (comma separated)</label>
                <input 
                  type="text" 
                  placeholder="Intensive study track, Industry mentorship, Certifications" 
                  className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none" 
                  value={regHighlights} 
                  onChange={e => setRegHighlights(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Custom Ingress Link (Google Forms / external page)</label>
                <input 
                  type="text" 
                  placeholder="e.g. https://forms.gle/... (leave empty for inline-only)" 
                  className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none" 
                  value={regBtnLink} 
                  onChange={e => setRegBtnLink(e.target.value)} 
                />
              </div>

              {/* PAYMENT TYPE CONFIG */}
              <div className="sm:col-span-2 border-t border-ink/10 pt-6 space-y-4">
                <span className="block text-[10px] font-black uppercase text-brand-orange font-mono tracking-wider">Accepted Candidate Fee Payment Action</span>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Payment Option Choice</label>
                    <select 
                      className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none font-bold text-xs" 
                      value={paymentMsgChoice} 
                      onChange={e => setPaymentMsgChoice(e.target.value as 'markdown' | 'link')}
                    >
                      <option value="markdown">Show Customized Instruction Message (Markdown)</option>
                      <option value="link">Redirect to External Payment Gateway Link</option>
                    </select>
                  </div>

                  {paymentMsgChoice === 'link' ? (
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Direct Payment Gateway Link</label>
                      <input 
                        required={paymentMsgChoice === 'link'}
                        type="text" 
                        placeholder="e.g. https://pages.razorpay.com/... or upi://..." 
                        className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none font-sans text-xs font-bold" 
                        value={paymentGatewayLink} 
                        onChange={e => setPaymentGatewayLink(e.target.value)} 
                      />
                    </div>
                  ) : (
                    <div className="sm:col-span-2 space-y-2">
                       <label className="block text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5">Payment Instructions Markdown Message</label>
                       <MarkdownToolbar textareaId="form-payment-markdown" value={paymentMarkdown} onChange={setPaymentMarkdown} />
                       <MarkdownMediaHelper 
                         onInsert={(text) => handleInsertMarkdown('form-payment-markdown', '', '', text, setPaymentMarkdown)}
                         onUploadingStateChange={setIsUploadingCloudinary}
                       />
                       <textarea 
                        id="form-payment-markdown"
                        rows={4} 
                        placeholder="Provide Bank Details, UPI ID, scanning or verification requirements, etc..." 
                        className="w-full p-3 border border-ink bg-paper focus:bg-white focus:outline-none" 
                        value={paymentMarkdown} 
                        onChange={e => setPaymentMarkdown(e.target.value)} 
                      />
                      <p className="text-[9px] text-ink/45">If empty, a default simulated layout letting the student easily pay via click is shown.</p>
                      {paymentMarkdown && (
                        <div className="mt-2 p-3 border border-dashed border-ink bg-paper/30 max-h-[160px] overflow-y-auto">
                          <span className="block text-[8px] font-black uppercase mb-1 text-brand-blue">Payment Card Preview</span>
                          <div className="prose prose-sm font-sans text-xs text-ink" dangerouslySetInnerHTML={{ __html: renderMarkdown(paymentMarkdown) }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
          )}

          {/* DYNAMIC CONNECTIONS DROPDOWN GRAPH */}
          {activeEditorTab === 'affiliations' && (
          <div className="border-b border-ink/10 pb-8 space-y-6 animate-fade-in">
            <h3 className="font-serif text-lg font-black font-bold">Relational Affiliations Graph</h3>
            <div className="grid sm:grid-cols-2 gap-6 animate-fade-in">
              {/* Centres lists */}
              <div className="border border-ink p-4 max-h-[160px] overflow-y-auto bg-paper/20">
                <label className="block text-[9px] font-black uppercase mb-2">centres dropdown (Fetched dynamically)</label>
                <div className="space-y-1 font-sans text-xs">
                  {dbCentres.map(c => (
                    <label key={c.slug} className="flex items-center gap-2 mb-1 cursor-pointer select-none">
                      <input type="checkbox" checked={selectedCentres.includes(c.slug)} onChange={() => toggleSelection(c.slug, selectedCentres, setSelectedCentres)} />
                      <span>{c.shortName || c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Projects lists */}
              <div className="border border-ink p-4 max-h-[160px] overflow-y-auto bg-paper/20">
                <label className="block text-[9px] font-black uppercase mb-2">projects dropdown (Fetched dynamically)</label>
                <div className="space-y-1 font-sans text-xs">
                  {dbProjects.map(p => (
                    <label key={p.slug} className="flex items-center gap-2 mb-1 cursor-pointer select-none">
                      <input type="checkbox" checked={selectedProjects.includes(p.slug)} onChange={() => toggleSelection(p.slug, selectedProjects, setSelectedProjects)} />
                      <span>{p.title || p.id}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* COLLABORATING ORGANISATIONS AND SPONSORS */}
          {activeEditorTab === 'collab' && (
          <div className="border border-ink p-6 mb-8 space-y-6 bg-paper/5 animate-fade-in">
            <h3 className="font-serif text-lg font-black font-bold">Collaborating Organisations &amp; Sponsors</h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Collaborators section */}
              <div className="border border-ink p-4 bg-white/50 space-y-4">
                <span className="block text-[10px] font-black uppercase text-brand-blue font-mono tracking-wider">Event Collaborators ({collaborators.length})</span>
                
                {/* List of collaborators */}
                {collaborators.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {collaborators.map((col, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border border-ink bg-white gap-2 text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {col.logo ? (
                            <img src={col.logo} alt={col.name} className="w-8 h-8 object-contain border border-ink shrink-0 bg-white" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center border border-ink font-mono font-bold text-[9px] shrink-0 bg-zinc-100">CO</div>
                          )}
                          <div className="truncate">
                            <div className="font-bold truncate">{col.name}</div>
                            {col.website && (
                              <a href={col.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-blue truncate hover:underline block">{col.website}</a>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCollaborators(prev => prev.filter((_, i) => i !== idx))}
                          className="px-2 py-1 text-[9px] font-mono font-bold border border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white transition-all uppercase"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-ink/45 italic">No collaborating organisations added yet.</p>
                )}

                {/* Add Collaborator Sub-form */}
                <div className="border-t border-ink/10 pt-4 space-y-3">
                  <div className="flex justify-between items-center bg-brand-blue/5 p-1.5 border border-brand-blue/20">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-ink/75 font-mono">Add New Collaborator</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!collaborators.some(c => c.name.includes("CoDIN"))) {
                          setCollaborators(prev => [...prev, {
                            name: "Council for Diversity and Innovation (CoDIN)",
                            logo: "https://res.cloudinary.com/duarehqqp/image/upload/v1779696459/CDI01-14-NoBG-red_zut1fu.png",
                            website: "https://diversity.org.in"
                          }]);
                        }
                      }}
                      className="px-2 py-0.5 text-[8px] font-mono font-bold border border-brand-blue bg-white text-brand-blue hover:bg-brand-blue hover:text-white transition-all uppercase"
                    >
                      + Add CoDIN Quick
                    </button>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-ink/50 mb-1">Organisation Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Linguistic Society of India" 
                      className="w-full p-2 border border-ink bg-white text-xs font-medium" 
                      value={collabName} 
                      onChange={e => setCollabName(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-ink/50 mb-1">Website URL</label>
                    <input 
                      type="text" 
                      placeholder="e.g. https://lsi.org.in" 
                      className="w-full p-2 border border-ink bg-white text-xs font-mono" 
                      value={collabWebsite} 
                      onChange={e => setCollabWebsite(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-ink/50 mb-1">Logo Image (Upload or URL)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Paste image URL..." 
                        className="flex-1 p-2 border border-ink bg-white text-xs font-mono" 
                        value={collabLogo} 
                        onChange={e => setCollabLogo(e.target.value)} 
                      />
                      <label className="p-2 border border-ink bg-brand-orange text-white uppercase text-[10px] cursor-pointer hover:bg-black font-bold shrink-0 flex items-center">
                        Upload
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const url = await uploadToCloudinary({ dataUrl: reader.result as string });
                              if (url) setCollabLogo(url);
                            };
                            reader.readAsDataURL(file);
                          }} 
                        />
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!collabName) return;
                      setCollaborators(prev => [...prev, { name: collabName, logo: collabLogo || undefined, website: collabWebsite || undefined }]);
                      setCollabName('');
                      setCollabLogo('');
                      setCollabWebsite('');
                    }}
                    className="w-full py-2 bg-ink text-paper text-xs uppercase font-bold tracking-widest hover:bg-brand-acid hover:text-ink transition-all"
                  >
                    Add Collaborator Org
                  </button>
                </div>
              </div>

              {/* Sponsors section */}
              <div className="border border-ink p-4 bg-white/50 space-y-4">
                <span className="block text-[10px] font-black uppercase text-brand-orange font-mono tracking-wider">Event Sponsors ({sponsors.length})</span>
                
                {/* List of sponsors */}
                {sponsors.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {sponsors.map((spo, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border border-ink bg-white gap-2 text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {spo.logo ? (
                            <img src={spo.logo} alt={spo.name} className="w-8 h-8 object-contain border border-ink shrink-0 bg-white" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center border border-ink font-mono font-bold text-[9px] shrink-0 bg-zinc-100">SP</div>
                          )}
                          <div className="truncate">
                            <div className="font-bold truncate">{spo.name}</div>
                            {spo.website && (
                              <a href={spo.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-blue truncate hover:underline block">{spo.website}</a>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSponsors(prev => prev.filter((_, i) => i !== idx))}
                          className="px-2 py-1 text-[9px] font-mono font-bold border border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white transition-all uppercase"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-ink/45 italic">No sponsors added yet.</p>
                )}

                {/* Add Sponsor Sub-form */}
                <div className="border-t border-ink/10 pt-4 space-y-3">
                  <div className="flex justify-between items-center bg-brand-orange/5 p-1.5 border border-brand-orange/20">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-ink/75 font-mono">Add New Sponsor</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!sponsors.some(s => s.name.includes("CoDIN"))) {
                          setSponsors(prev => [...prev, {
                            name: "Council for Diversity and Innovation (CoDIN)",
                            logo: "https://res.cloudinary.com/duarehqqp/image/upload/v1779696459/CDI01-14-NoBG-red_zut1fu.png",
                            website: "https://diversity.org.in"
                          }]);
                        }
                      }}
                      className="px-2 py-0.5 text-[8px] font-mono font-bold border border-brand-orange bg-white text-brand-orange hover:bg-brand-orange hover:text-white transition-all uppercase"
                    >
                      + Add CoDIN Quick
                    </button>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-ink/50 mb-1">Sponsor Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Tata Trusts / Google Research" 
                      className="w-full p-2 border border-ink bg-white text-xs font-medium" 
                      value={sponsorName} 
                      onChange={e => setSponsorName(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-ink/50 mb-1">Website URL</label>
                    <input 
                      type="text" 
                      placeholder="e.g. https://research.google" 
                      className="w-full p-2 border border-ink bg-white text-xs font-mono" 
                      value={sponsorWebsite} 
                      onChange={e => setSponsorWebsite(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-ink/50 mb-1">Logo Image (Upload or URL)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Paste image URL..." 
                        className="flex-1 p-2 border border-ink bg-white text-xs font-mono" 
                        value={sponsorLogo} 
                        onChange={e => setSponsorLogo(e.target.value)} 
                      />
                      <label className="p-2 border border-ink bg-brand-orange text-white uppercase text-[10px] cursor-pointer hover:bg-black font-bold shrink-0 flex items-center">
                        Upload
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const url = await uploadToCloudinary({ dataUrl: reader.result as string });
                              if (url) setSponsorLogo(url);
                            };
                            reader.readAsDataURL(file);
                          }} 
                        />
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!sponsorName) return;
                      setSponsors(prev => [...prev, { name: sponsorName, logo: sponsorLogo || undefined, website: sponsorWebsite || undefined }]);
                      setSponsorName('');
                      setSponsorLogo('');
                      setSponsorWebsite('');
                    }}
                    className="w-full py-2 bg-ink text-paper text-xs uppercase font-bold tracking-widest hover:bg-brand-acid hover:text-ink transition-all"
                  >
                    Add Sponsor
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}



          {/* CHAPTERS / DOSSIER TAB CONTENT SECTIONS */}
          {activeEditorTab === 'dossiers' && (
          <div className="border-b border-ink/10 pb-8 space-y-6 animate-fade-in">
            <h3 className="font-serif text-lg font-black font-bold">Interactive Event Dossier Chapters</h3>

            {/* INTERACTIVE MOVABLE & EDITABLE SUB-TABS BAR */}
            <div className="space-y-2 select-none mb-4">
              <span className="block text-[9px] font-black uppercase tracking-wider text-ink/40">Dossier active tabs list ({customPages.length} chapters) — Drag and Drop or click arrows to reorder, click title to edit</span>
              <div className="flex flex-wrap gap-2 items-center bg-zinc-100 p-2.5 border border-ink/35 rounded">
                {customPages.map((cp, cIdx) => {
                  const isActive = (editingPageSlug === cp.slug || activeSubTabSlug === cp.slug);
                  return (
                    <div 
                      key={cp.slug} 
                      className={`flex items-center gap-1.5 px-3 py-1.5 border font-mono font-bold text-[10px] uppercase tracking-wider transition-all select-none ${
                        isActive 
                          ? 'bg-brand-acid text-ink border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] -translate-y-[1px]' 
                          : 'bg-white text-ink/70 border-ink/40 hover:bg-stone-50 hover:text-ink cursor-pointer'
                      }`}
                    >
                      <span 
                        onClick={() => {
                          handleStartEditDraftedPage(cp);
                          setActiveSubTabSlug(cp.slug);
                        }}
                        className="cursor-pointer select-none"
                      >
                        {cp.title} <span className="font-sans font-normal opacity-50 lowercase">({cp.type})</span>
                      </span>
                      
                      {/* Sub-tab quick reorder and delete actions */}
                      <div className="flex gap-1.5 items-center ml-2 border-l border-ink/20 pl-2">
                        <button 
                          type="button" 
                          disabled={cIdx === 0} 
                          onClick={() => handleMoveCustomPage(cIdx, 'up')} 
                          className="text-ink font-bold hover:text-brand-orange disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed select-none"
                          title="Move Left / Up"
                        >
                          &larr;
                        </button>
                        <button 
                          type="button" 
                          disabled={cIdx === customPages.length - 1} 
                          onClick={() => handleMoveCustomPage(cIdx, 'down')} 
                          className="text-ink font-bold hover:text-brand-orange disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed select-none"
                          title="Move Right / Down"
                        >
                          &rarr;
                        </button>
                        {cIdx > 0 && (
                          <button 
                            type="button" 
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete chapter: ${cp.title}?`)) {
                                setCustomPages(customPages.filter(x => x.slug !== cp.slug));
                                if (activeSubTabSlug === cp.slug || editingPageSlug === cp.slug) {
                                  handleStartEditDraftedPage(customPages[0]);
                                  setActiveSubTabSlug(customPages[0].slug);
                                }
                              }
                            }} 
                            className="text-brand-orange hover:text-ink font-bold ml-1.5 cursor-pointer select-none"
                            title="Delete Chapter"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* ADD NEW CHAPTER TRIGGER */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingPageSlug(null);
                    setNewPageTitle('');
                    setNewPageSlug('');
                    setNewPageType('markdown');
                    setNewPageTeaser('');
                    setNewPageMarkdown('');
                    setDraftDatesList([]);
                    setDraftScheduleList([]);
                    setDraftFeesList([]);
                    setRegDeadlineText('');
                    setDraftInstructionsList([]);
                    setDraftListList([]);
                    setDraftLogisticsList([]);
                    setDraftCommitteesList([]);
                    setDraftContactList([]);
                    setV2DriveLink('');
                    setV2Document(null);
                    setV2ScheduleDays([]);
                  }}
                  className={`px-3 py-1.5 border border-dashed font-mono font-bold text-[10px] uppercase tracking-wider cursor-pointer font-bold ${
                    !editingPageSlug 
                      ? 'bg-brand-orange text-white border-ink shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)]' 
                      : 'text-brand-blue border-brand-blue bg-white hover:bg-stone-50'
                  }`}
                >
                  + Add New Chapter / Sub-Tab
                </button>
              </div>
            </div>

            <div className="border-2 border-ink p-6 space-y-4 bg-paper/5 animate-fade-in relative rounded">
              <div className="font-bold text-[10px] text-brand-blue uppercase">Dossier Tab Content Configurer</div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[8px] font-black uppercase mb-1">Tab Section Label / Heading</label>
                  <input type="text" placeholder="e.g. Abstract Narrative" className="w-full p-2 border border-ink bg-white text-xs font-bold" value={newPageTitle} onChange={e => { setNewPageTitle(e.target.value); if (!editingPageSlug) setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }} />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase mb-1">Dossier Address Slug Identifier (Lowercase, hyphens)</label>
                  <input type="text" placeholder="e.g. abstract-narrative" className="w-full p-2 border border-ink bg-white text-xs font-mono" value={newPageSlug} onChange={e => setNewPageSlug(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase mb-1">Tab Segment Architecture</label>
                  <select className="w-full p-2 border border-ink bg-white font-bold" value={newPageType} onChange={e => setNewPageType(e.target.value)}>
                    <option value="markdown">Text (Markdown with Buttons & Helper)</option>
                    <option value="dates">Deadlines</option>
                    <option value="schedule">List (Schedule with Dates & Details)</option>
                    <option value="registration">Registration Fee & Instruction Guidelines</option>
                    <option value="list">Presenter List</option>
                    <option value="logistics">Logistics Details (Supports Map & Markdown Helper)</option>
                    <option value="committees">Committees List Grouping (Supports Photos)</option>
                    <option value="contact">Contact Representatives</option>
                  </select>
                </div>
              </div>

              {/* DYNAMIC FORMS ACCORDING TO TYPE */}
              {/* 1. MARKDOWN PAGE TYPE */}
              {newPageType === 'markdown' && (
                <div className="space-y-3 p-4 border border-ink bg-white animate-fade-in">
                  <div className="font-bold text-[10px] text-brand-orange uppercase">Text Content Configuration</div>
                  <div>
                    <label className="block text-[8px] font-black uppercase mb-1">Focus Highlights Teaser</label>
                    <input type="text" className="w-full p-2 border border-ink bg-paper" value={newPageTeaser} onChange={e => setNewPageTeaser(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase mb-1">Detailed Content Description (Supports Markdown)</label>
                    <MarkdownToolbar textareaId="create-page-textarea" value={newPageMarkdown} onChange={setNewPageMarkdown} />
                    <MarkdownMediaHelper 
                      onInsert={text => handleInsertMarkdown('create-page-textarea', '', '', text, setNewPageMarkdown)}
                      onUploadingStateChange={setIsUploadingCloudinary}
                    />
                    <textarea id="create-page-textarea" rows={5} className="w-full p-2 border border-ink bg-paper font-sans text-xs focus:bg-white" value={newPageMarkdown} onChange={e => setNewPageMarkdown(e.target.value)} placeholder="Type description content. Selection helper is active." />
                    {newPageMarkdown && (
                      <div className="mt-2 p-3 border border-dashed border-ink bg-paper/30 max-h-[160px] overflow-y-auto">
                        <span className="block text-[8px] font-black uppercase mb-1 text-brand-blue">Live Formatted Preview</span>
                        <div className="prose prose-sm font-sans text-xs text-ink" dangerouslySetInnerHTML={{ __html: renderMarkdown(newPageMarkdown) }} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. DEADLINES PAGE TYPE */}
              {newPageType === 'dates' && (
                <div className="space-y-3 p-4 border border-ink bg-white animate-fade-in">
                  <div className="font-bold text-[10px] text-brand-orange uppercase font-sans">Manage Deadlines List</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1">Deadline Name</label>
                      <input type="text" placeholder="e.g. Abstract Submissions" className="w-full p-2 border border-ink bg-paper text-xs" value={dtLabel} onChange={e => setDtLabel(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-bold">Event Gate Calendar Date</label>
                      <input type="text" placeholder="e.g. June 15, 2026" className="w-full p-2 border border-ink bg-paper text-xs" value={dtDate} onChange={e => setDtDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1">Footnote Indicator</label>
                      <input type="text" placeholder="e.g. Midnight IST" className="w-full p-2 border border-ink bg-paper text-xs" value={dtFootnote} onChange={e => setDtFootnote(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-zinc-50 p-2 border border-ink/10 rounded">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input type="checkbox" checked={dtHighlighted} onChange={e => setDtHighlighted(e.target.checked)} />
                      <span>Highlight in Red-Alert Banner Mode 🚨</span>
                    </label>
                    <div className="flex gap-2">
                      {editingDateIdx !== null && (
                        <button type="button" onClick={() => { setEditingDateIdx(null); setDtLabel(''); setDtDate(''); setDtFootnote(''); setDtHighlighted(false); }} className="px-3 py-1 bg-white text-ink border border-ink text-[9px] uppercase font-bold">Cancel</button>
                      )}
                      <button type="button" onClick={() => {
                        if (!dtLabel || !dtDate) { alert('Label and Date are required'); return; }
                        const record = { label: dtLabel, date: dtDate, footnote: dtFootnote, highlighted: dtHighlighted };
                        if (editingDateIdx !== null) {
                          const copy = [...draftDatesList];
                          copy[editingDateIdx] = record;
                          setDraftDatesList(copy);
                          setEditingDateIdx(null);
                        } else {
                          setDraftDatesList([...draftDatesList, record]);
                        }
                        setDtLabel(''); setDtDate(''); setDtFootnote(''); setDtHighlighted(false);
                      }} className="px-3 py-1 bg-brand-blue text-white text-[9px] uppercase font-bold border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                        {editingDateIdx !== null ? '✓ Save Date' : '+ Add Date Gate'}
                      </button>
                    </div>
                  </div>

                  {draftDatesList.length > 0 && (
                    <div className="mt-2 divide-y divide-ink/10 border border-ink/20 max-h-[160px] overflow-y-auto bg-stone-50 p-2">
                      {draftDatesList.map((d, index) => (
                        <div key={index} className="py-2 flex justify-between items-center text-[11px] bg-white p-2 border border-ink/10 mb-1 rounded">
                          <span>{d.label}: <strong>{d.date}</strong> {d.footnote ? `(${d.footnote})` : ''} {d.highlighted ? <span className="text-red-650 ml-1">🚨 [High]</span> : ''}</span>
                          <div className="flex gap-2 font-mono text-[9px] font-bold">
                            <button type="button" onClick={() => {
                              setEditingDateIdx(index);
                              setDtLabel(d.label);
                              setDtDate(d.date);
                              setDtFootnote(d.footnote || '');
                              setDtHighlighted(d.highlighted || false);
                            }} className="text-brand-blue hover:underline">edit</button>
                            <button type="button" onClick={() => setDraftDatesList(draftDatesList.filter((_, i) => i !== index))} className="text-brand-orange hover:text-ink font-bold font-mono">&times;</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. SCHEDULES TYPE PAGE (Requirement 1 & 3: Calendar Date Picker, Hour picks, Grouping-ready metadata) */}
              {newPageType === 'schedule' && (
                <div className="space-y-4 p-4 border border-ink bg-white animate-fade-in shadow-[3px_3px_0px_rgba(0,0,0,1)] rounded font-sans">
                  <div className="font-bold text-[10px] text-brand-orange uppercase font-mono tracking-wider flex items-center gap-1">🕒 Manage Program / Schedule & Resource Assets</div>
                  
                  {/* Google Drive and PDF/Word Upload Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-50 p-3 border border-ink/15 rounded">
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-mono">Google Drive Embed link</label>
                      <input 
                        type="url" 
                        placeholder="https://drive.google.com/..." 
                        className="w-full p-2 border border-ink bg-white text-xs font-mono" 
                        value={v2DriveLink}
                        onChange={e => setV2DriveLink(e.target.value)}
                      />
                      <span className="block text-[8px] text-ink/50 mt-1">
                        Put any Google Drive link to document, presentation, or folder. It will get embedded directly on the page!
                      </span>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-mono">Upload PDF/Word document</label>
                      <div className="border border-dashed border-ink p-2 rounded text-center bg-white relative cursor-pointer hover:bg-stone-50 transition-colors">
                        <input 
                          type="file" 
                          accept=".pdf,.doc,.docx"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              setV2Document({
                                name: file.name,
                                type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
                                dataUrl: reader.result as string,
                                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        <p className="text-[10px] font-mono font-bold text-ink/70 py-1.5">
                          {v2Document ? `📄 File: ${v2Document.name} (${v2Document.size || 'N/A'})` : 'Drag & drop or Click to upload PDF/Word'}
                        </p>
                      </div>
                      {v2Document && (
                        <button 
                          type="button" 
                          onClick={() => setV2Document(null)} 
                          className="mt-1 text-[9px] font-mono font-bold text-brand-orange hover:underline block text-right w-full"
                        >
                          Remove file &times;
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Day Maker Section */}
                  <div className="bg-stone-50 p-3 border border-ink/20 rounded space-y-2">
                    <span className="block text-[9px] font-black uppercase font-mono text-brand-blue">
                      {editingDayId ? '✍️ Edit Existing Day Details & Description' : '📅 Step 1: Create Day / Date Gasket'}
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[8px] font-black uppercase mb-1 font-mono">Date Selection (Dropdown)</label>
                        <select 
                          className="w-full p-2 border border-ink bg-white text-xs font-mono" 
                          value={newDayDate} 
                          onChange={e => {
                            setNewDayDate(e.target.value);
                            if (e.target.value !== 'custom') {
                              setNewDayDateCustom('');
                            }
                          }}
                        >
                          <option value="">-- Choose Calendar Date --</option>
                          {getEventDateOptions().map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                          <option value="custom">✍️ Type Custom Date Expression...</option>
                        </select>
                      </div>

                      {newDayDate === 'custom' && (
                        <div>
                          <label className="block text-[8px] font-black uppercase mb-1 font-mono">Type Custom Date Expression</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Day 1, Post-Conference, TBA" 
                            className="w-full p-2 border border-ink bg-white text-xs font-mono font-bold" 
                            value={newDayDateCustom}
                            onChange={e => setNewDayDateCustom(e.target.value)}
                          />
                        </div>
                      )}

                      <div className={newDayDate === 'custom' ? 'md:col-span-1' : 'md:col-span-2'}>
                        <label className="block text-[8px] font-black uppercase mb-1 font-mono">Day Name / Key Sub-Theme (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Inaugural session, Hands-on Workshop tracks" 
                          className="w-full p-2 border border-ink bg-white text-xs" 
                          value={newDayName}
                          onChange={e => setNewDayName(e.target.value)}
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[8px] font-black uppercase mb-1 font-mono">Day Description (Optional, markdown supported)</label>
                        <MarkdownToolbar textareaId="new-day-description" value={newDayDescription} onChange={setNewDayDescription} />
                        <div className="flex gap-2">
                          <textarea 
                            id="new-day-description"
                            rows={2}
                            placeholder="Enter description, objectives, links or notes for this full day..." 
                            className="flex-1 p-2 border border-ink bg-white text-xs font-sans rounded-xs" 
                            value={newDayDescription}
                            onChange={e => setNewDayDescription(e.target.value)}
                          />
                          <div className="flex flex-col gap-1 shrink-0 justify-end">
                            <button 
                              type="button" 
                              onClick={() => {
                                const finalDate = newDayDate === 'custom' ? newDayDateCustom.trim() : newDayDate;
                                if (!finalDate) { alert('Please select or specify a Date expression.'); return; }
                                if (editingDayId) {
                                  setV2ScheduleDays(v2ScheduleDays.map(d => d.id === editingDayId ? { ...d, date: finalDate, name: newDayName.trim(), description: newDayDescription.trim() } : d));
                                  setEditingDayId(null);
                                } else {
                                  const newDay = {
                                    id: `day-${Date.now()}-${Math.random()}`,
                                    date: finalDate,
                                    name: newDayName.trim(),
                                    description: newDayDescription.trim(),
                                    sessions: []
                                  };
                                  setV2ScheduleDays([...v2ScheduleDays, newDay]);
                                  setEditorActiveDayId(newDay.id);
                                }
                                setNewDayDate('');
                                setNewDayDateCustom('');
                                setNewDayName('');
                                setNewDayDescription('');
                              }}
                              className="px-3 py-2 bg-brand-blue text-white text-[9px] uppercase font-bold border border-ink shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] select-none whitespace-nowrap cursor-pointer rounded-xs"
                            >
                              {editingDayId ? '✓ Save Day' : '+ Create Day'}
                            </button>
                            {editingDayId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDayId(null);
                                  setNewDayDate('');
                                  setNewDayDateCustom('');
                                  setNewDayName('');
                                  setNewDayDescription('');
                                }}
                                className="px-3 py-1 bg-white text-brand-orange text-[9px] uppercase font-bold border border-ink shadow-[1px_1px_0px_rgba(0,0,0,1)] select-none whitespace-nowrap cursor-pointer rounded-xs"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabbed Day Selectors */}
                  {v2ScheduleDays.length > 0 && (
                    <div className="space-y-1 select-none">
                      <label className="block text-[8px] font-black uppercase text-ink/40 font-mono tracking-wider">Select Day Tab to Configure Sessions</label>
                      <div className="flex flex-wrap gap-1.5 p-2 bg-stone-150 border border-ink/25 rounded bg-[#f6f5f3]">
                        {v2ScheduleDays.map((day, dIdx) => {
                          const effectiveActiveDayId = editorActiveDayId || (v2ScheduleDays[0] ? v2ScheduleDays[0].id : null);
                          const isActive = day.id === effectiveActiveDayId;
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => {
                                setEditorActiveDayId(day.id);
                                setActiveSessionDayId(null);
                                setEditingSessionId(null);
                                setActiveEntrySessionId(null);
                                setEditingEntryId(null);
                              }}
                              className={`px-3 py-1.5 text-[9px] font-bold font-mono tracking-wide border transition-all cursor-pointer rounded-xs ${
                                isActive 
                                  ? 'bg-brand-acid text-black border-ink shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)] -translate-y-[1px]' 
                                  : 'bg-white text-ink/75 border-ink/30 hover:border-ink hover:bg-stone-50'
                              }`}
                            >
                              Day {dIdx + 1}: {day.date} {day.name ? `(${day.name})` : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Hierarchical Days Listing */}
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {v2ScheduleDays.length === 0 ? (
                      <div className="p-6 border border-ink/20 border-dashed text-center font-mono text-xs text-ink/40 bg-zinc-50 rounded">
                        No schedule days created yet. Add a day gate using the generator above to begin building sessions!
                      </div>
                    ) : (
                      v2ScheduleDays
                        .filter(day => {
                          const effectiveActiveDayId = editorActiveDayId || (v2ScheduleDays[0] ? v2ScheduleDays[0].id : null);
                          return day.id === effectiveActiveDayId;
                        })
                        .map((day, dIdx) => (
                        <div key={day.id} className="border-2 border-ink p-3 rounded bg-zinc-50 relative space-y-3">
                          
                          {/* Day Banner */}
                          <div className="flex items-center justify-between border-b border-ink/20 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-brand-acid text-ink font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border border-ink rounded">
                                📅 {day.date}
                              </span>
                              {day.name && (
                                <span className="font-serif italic font-black text-xs text-ink/75">
                                  — &ldquo;{day.name}&rdquo;
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 font-mono text-[9px] font-bold">
                              <button 
                                type="button" 
                                onClick={() => {
                                  setEditingDayId(day.id);
                                  setNewDayName(day.name || '');
                                  setNewDayDescription(day.description || '');
                                  if (getEventDateOptions().includes(day.date)) {
                                    setNewDayDate(day.date);
                                    setNewDayDateCustom('');
                                  } else {
                                    setNewDayDate('custom');
                                    setNewDayDateCustom(day.date);
                                  }
                                }}
                                className="text-brand-blue hover:underline"
                              >
                                Edit Day
                              </button>
                              <button 
                                type="button" 
                                onClick={() => {
                                  const updated = v2ScheduleDays.filter(d => d.id !== day.id);
                                  setV2ScheduleDays(updated);
                                  const effectiveActiveDayId = editorActiveDayId || (v2ScheduleDays[0] ? v2ScheduleDays[0].id : null);
                                  if (effectiveActiveDayId === day.id) {
                                    setEditorActiveDayId(updated[0] ? updated[0].id : null);
                                  }
                                }}
                                className="text-brand-orange hover:underline font-black"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {day.description && (
                            <div className="p-3 border border-ink/20 bg-[#faf9f6] text-[11px] text-ink/80 font-sans rounded-xs">
                              <span className="font-mono text-[8px] font-black uppercase tracking-wider block text-brand-orange mb-1">📖 Day Overview (Supports Markdown)</span>
                              <div className="prose prose-sm leading-normal max-w-none">{day.description}</div>
                            </div>
                          )}

                          {/* Sessions in Day */}
                          <div className="pl-4 border-l-2 border-ink/10 space-y-3">
                            {day.sessions && day.sessions.map((session: any) => (
                              <div key={session.id} className="border border-ink bg-white p-2.5 rounded shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] relative space-y-2">
                                
                                {/* Session Sub-Header */}
                                <div className="flex items-center justify-between bg-zinc-100/50 p-1 px-2 rounded border border-ink/5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-brand-orange bg-white px-1.5 py-0.2 border border-ink/10 rounded">
                                      🕒 {session.timeLabel}
                                    </span>
                                    {session.sessionName && (
                                      <span className="font-serif font-black text-xs text-ink italic">
                                        {session.sessionName}
                                      </span>
                                    )}
                                    {session.venue && (
                                      <span className="font-mono text-[8px] text-brand-blue font-bold tracking-tight bg-brand-blue/10 px-1.5 rounded">
                                        📍 Venue: {session.venue}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 font-mono text-[8px] font-bold">
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setActiveSessionDayId(day.id);
                                        setEditingSessionId(session.id);
                                        setSessionName(session.sessionName || '');
                                        setSessionVenue(session.venue || '');
                                        const parts = session.timeLabel ? session.timeLabel.split(/\s*-\s*/) : [];
                                        if (parts.length === 2) {
                                          const start24 = parseTimeTo24h(parts[0]);
                                          const end24 = parseTimeTo24h(parts[1]);
                                          if (start24 && end24) {
                                            setSessionTimeStart(start24);
                                            setSessionTimeEnd(end24);
                                            setSessionTimeCustom('');
                                          } else {
                                            setSessionTimeStart('');
                                            setSessionTimeEnd('');
                                            setSessionTimeCustom(session.timeLabel || '');
                                          }
                                        } else {
                                          const single24 = parseTimeTo24h(session.timeLabel || '');
                                          if (single24) {
                                            setSessionTimeStart(single24);
                                            setSessionTimeEnd('');
                                            setSessionTimeCustom('');
                                          } else {
                                            setSessionTimeStart('');
                                            setSessionTimeEnd('');
                                            setSessionTimeCustom(session.timeLabel || '');
                                          }
                                        }
                                      }}
                                      className="text-brand-blue hover:underline"
                                    >
                                      Edit Slot
                                    </button>
                                    <span>/</span>
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setV2ScheduleDays(v2ScheduleDays.map(d => d.id === day.id ? { ...d, sessions: d.sessions.filter((s: any) => s.id !== session.id) } : d));
                                      }}
                                      className="text-brand-orange hover:underline font-black"
                                    >
                                      Delete Slot
                                    </button>
                                  </div>
                                </div>

                                {/* Entries in Session list */}
                                <div className="pl-4 space-y-1.5 text-left">
                                  {session.entries && session.entries.map((entry: any) => (
                                    <div key={entry.id} className="p-2 border border-ink/5 bg-zinc-50 hover:bg-stone-50 rounded text-[11px] leading-normal relative flex justify-between items-start gap-4">
                                      <div className="space-y-0.5">
                                        <h5 className="font-serif font-black text-ink">{entry.topic}</h5>
                                        {entry.speaker && (
                                          <p className="font-mono text-[9px] uppercase font-bold text-brand-blue leading-none">Led by: {entry.speaker}</p>
                                        )}
                                        {entry.details && (
                                          <p className="text-[10px] text-ink/65 italic truncate max-w-md font-sans">
                                            {entry.details}
                                          </p>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5 font-mono text-[8px] font-black shrink-0">
                                        <button 
                                          type="button" 
                                          onClick={() => {
                                            setActiveEntrySessionId(session.id);
                                            setEditingEntryId(entry.id);
                                            setEntryTopic(entry.topic || '');
                                            setEntrySpeaker(entry.speaker || '');
                                            setEntryDetails(entry.details || '');
                                          }}
                                          className="text-brand-blue hover:underline"
                                        >
                                          Edit
                                        </button>
                                        <span>/</span>
                                        <button 
                                          type="button" 
                                          onClick={() => {
                                            setV2ScheduleDays(v2ScheduleDays.map(d => {
                                              if (d.id !== day.id) return d;
                                              const updatedSessions = d.sessions.map((s: any) => s.id === session.id ? { ...s, entries: s.entries.filter((e: any) => e.id !== entry.id) } : s);
                                              return { ...d, sessions: updatedSessions };
                                            }));
                                          }}
                                          className="text-brand-orange hover:underline font-bold"
                                        >
                                          &times;
                                        </button>
                                      </div>
                                    </div>
                                  ))}

                                  {/* Dynamic inline entry builder */}
                                  {activeEntrySessionId === session.id ? (
                                    <div className="p-3 border border-dashed border-ink bg-paper/50 rounded space-y-2 mt-2">
                                      <span className="block text-[8px] font-bold text-brand-orange font-mono uppercase">
                                        {editingEntryId ? '📝 Edit Presentation / Segment' : '✍️ Adding Presentation to this Hour Slot'}
                                      </span>
                                      
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[8px] font-mono tracking-tight font-black uppercase text-ink/60 mb-0.5">Presentation Topic / Title</label>
                                          <input 
                                            type="text" 
                                            placeholder="e.g. Opening Address & Remarks"
                                            className="w-full p-1.5 border border-ink text-xs bg-white" 
                                            value={entryTopic}
                                            onChange={e => setEntryTopic(e.target.value)}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[8px] font-mono tracking-tight font-black uppercase text-ink/60 mb-0.5">Speaker / Facilitator / Leads</label>
                                          <input 
                                            type="text" 
                                            placeholder="e.g. Dr. Bornini Lahiri"
                                            className="w-full p-1.5 border border-ink text-xs bg-white" 
                                            value={entrySpeaker}
                                            onChange={e => setEntrySpeaker(e.target.value)}
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-[8px] font-mono tracking-tight font-black uppercase text-ink/60 mb-0.5">Segment details (Prerequisites or syllabus overview)</label>
                                        <MarkdownToolbar textareaId="v2-entry-details-area" value={entryDetails} onChange={setEntryDetails} />
                                        <textarea 
                                          id="v2-entry-details-area"
                                          rows={2}
                                          placeholder="Supports Markdown synopses..."
                                          className="w-full p-1.5 border border-ink text-xs bg-white font-sans focus:bg-white" 
                                          value={entryDetails}
                                          onChange={e => setEntryDetails(e.target.value)}
                                        />
                                      </div>

                                      <div className="flex justify-end gap-2 text-[8px] font-mono font-bold pt-1">
                                        <button 
                                          type="button" 
                                          onClick={() => {
                                            setActiveEntrySessionId(null);
                                            setEditingEntryId(null);
                                            setEntryTopic('');
                                            setEntrySpeaker('');
                                            setEntryDetails('');
                                          }}
                                          className="px-2 py-1 bg-white border border-ink uppercase text-ink rounded"
                                        >
                                          Cancel
                                        </button>
                                        <button 
                                          type="button" 
                                          onClick={() => {
                                            if (!entryTopic.trim()) { alert('Topic/Title is required.'); return; }
                                            setV2ScheduleDays(v2ScheduleDays.map(d => {
                                              if (d.id !== day.id) return d;
                                              const updatedSessions = d.sessions.map((s: any) => {
                                                if (s.id !== session.id) return s;
                                                if (editingEntryId) {
                                                  return { ...s, entries: s.entries.map((e: any) => e.id === editingEntryId ? { ...e, topic: entryTopic.trim(), speaker: entrySpeaker.trim(), details: entryDetails.trim() } : e) };
                                                } else {
                                                  return { ...s, entries: [...s.entries, { id: `entry-${Date.now()}-${Math.random()}`, topic: entryTopic.trim(), speaker: entrySpeaker.trim(), details: entryDetails.trim() }] };
                                                }
                                              });
                                              return { ...d, sessions: updatedSessions };
                                            }));
                                            setActiveEntrySessionId(null);
                                            setEditingEntryId(null);
                                            setEntryTopic('');
                                            setEntrySpeaker('');
                                            setEntryDetails('');
                                          }}
                                          className="px-2 py-1 bg-brand-blue text-white uppercase border border-ink rounded shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                                        >
                                          {editingEntryId ? 'Save' : '+ Save Presentation'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setActiveEntrySessionId(session.id);
                                        setEditingEntryId(null);
                                        setEntryTopic('');
                                        setEntrySpeaker('');
                                        setEntryDetails('');
                                      }}
                                      className="text-[9px] font-mono font-bold text-brand-blue hover:underline py-1 inline-flex items-center gap-1 block"
                                    >
                                      ➕ Add Presentation / Topic under this Hour Slot
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Dynamic inline session builder */}
                            {activeSessionDayId === day.id ? (
                              <div className="p-3 border border-ink/40 bg-white rounded space-y-2 text-left">
                                <span className="block text-[8px] font-bold text-brand-orange font-mono uppercase">
                                  {editingSessionId ? '🕰️ Edit Hour Slot Parameters' : '🕒 Step 2: Establish New Hour Slot / Track Session'}
                                </span>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                  <div className="sm:col-span-2">
                                    <label className="block text-[8px] font-mono tracking-tight font-black uppercase text-ink/65 mb-0.5">Hour Slate Interval</label>
                                    <div className="flex gap-1 items-center">
                                      <input 
                                        type="time" 
                                        className="w-1/2 p-1.5 border border-ink bg-white font-mono text-xs" 
                                        value={sessionTimeStart}
                                        onChange={e => setSessionTimeStart(e.target.value)}
                                      />
                                      <span className="font-bold text-[9px] text-ink/40">—</span>
                                      <input 
                                        type="time" 
                                        className="w-1/2 p-1.5 border border-ink bg-white font-mono text-xs" 
                                        value={sessionTimeEnd}
                                        onChange={e => setSessionTimeEnd(e.target.value)}
                                      />
                                    </div>
                                    <input 
                                      type="text" 
                                      placeholder="Or Alternative custom time string (e.g. Lunch Hour)" 
                                      className="w-full p-1.5 mt-1 border border-ink bg-white font-mono text-[10px] leading-tight font-bold" 
                                      value={sessionTimeCustom}
                                      onChange={e => setSessionTimeCustom(e.target.value)}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[8px] font-mono tracking-tight font-black uppercase text-ink/65 mb-0.5">Session / Parallel Theme Name</label>
                                    <input 
                                      type="text" 
                                      placeholder="e.g. Plenary Keynotes" 
                                      className="w-full p-2 border border-ink bg-white text-xs" 
                                      value={sessionName}
                                      onChange={e => setSessionName(e.target.value)}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[8px] font-mono tracking-tight font-black uppercase text-ink/65 mb-0.5">Physical/Online Venue</label>
                                    <input 
                                      type="text" 
                                      placeholder="e.g. Auditorium 2" 
                                      className="w-full p-2 border border-ink bg-white text-xs" 
                                      value={sessionVenue}
                                      onChange={e => setSessionVenue(e.target.value)}
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2 text-[8px] font-mono font-bold pt-1">
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      setActiveSessionDayId(null);
                                      setEditingSessionId(null);
                                      setSessionTimeStart('');
                                      setSessionTimeEnd('');
                                      setSessionTimeCustom('');
                                      setSessionName('');
                                      setSessionVenue('');
                                    }}
                                    className="px-2 py-1 bg-white border border-ink uppercase text-ink rounded"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      const label = sessionTimeCustom.trim() || 
                                        (sessionTimeStart && sessionTimeEnd ? `${sessionTimeStart} - ${sessionTimeEnd}` : (sessionTimeStart || sessionTimeEnd || 'TBA'));
                                      if (!label && !sessionName.trim()) { alert('Please enter a custom time, pick standard times, or name this session track.'); return; }
                                      
                                      setV2ScheduleDays(v2ScheduleDays.map(d => {
                                        if (d.id !== day.id) return d;
                                        if (editingSessionId) {
                                          return { ...d, sessions: d.sessions.map((s: any) => s.id === editingSessionId ? { ...s, timeLabel: label, sessionName: sessionName.trim(), venue: sessionVenue.trim() } : s) };
                                        } else {
                                          return { ...d, sessions: [...d.sessions, { id: `session-${Date.now()}-${Math.random()}`, timeLabel: label, sessionName: sessionName.trim(), venue: sessionVenue.trim(), entries: [] }] };
                                        }
                                      }));
                                      setActiveSessionDayId(null);
                                      setEditingSessionId(null);
                                      setSessionTimeStart('');
                                      setSessionTimeEnd('');
                                      setSessionTimeCustom('');
                                      setSessionName('');
                                      setSessionVenue('');
                                    }}
                                    className="px-2.5 py-1 bg-brand-orange text-white uppercase border border-ink rounded shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                                  >
                                    {editingSessionId ? 'Save Custom Slot' : '+ Create Hour Slot'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                type="button" 
                                onClick={() => {
                                  setActiveSessionDayId(day.id);
                                  setEditingSessionId(null);
                                  setSessionTimeStart('');
                                  setSessionTimeEnd('');
                                  setSessionTimeCustom('');
                                  setSessionName('');
                                  setSessionVenue('');
                                }}
                                className="w-full text-center border border-dashed border-ink/30 bg-white hover:bg-stone-50 py-2.5 text-[10px] font-mono font-black text-ink/70 rounded uppercase tracking-wider block"
                              >
                                🕰️ Add New Session Track / Hour Slot to this Day
                              </button>
                            )}

                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 4. REGISTRATION DETAILS (Requirement 2 RSVP Markdown Buttons and Previews) */}
              {newPageType === 'registration' && (
                <div className="space-y-4 p-4 border border-ink bg-white animate-fade-in font-sans">
                  <div className="font-bold text-[10px] text-brand-orange uppercase font-mono">Configure Threshold Gates & Registration Guideline RSVP Protocols</div>
                  
                  <div className="grid sm:grid-cols-3 gap-3 border border-ink p-3 bg-zinc-50 rounded">
                    <div className="sm:col-span-3">
                      <label className="block text-[8px] font-black uppercase mb-1 font-mono">Registration Threshold Date Limit (Clear warning)</label>
                      <input type="text" placeholder="e.g. Midnight, June 14, 2026" className="w-full p-2 border border-ink bg-white text-xs" value={regDeadlineText} onChange={e => setRegDeadlineText(e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-mono">Category Label</label>
                      <input type="text" placeholder="e.g. For PhD Scholar" className="w-full p-2 border border-ink bg-white text-xs" value={regFeeCategory} onChange={e => setRegFeeCategory(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-mono">Pricing fee schedule</label>
                      <input type="text" placeholder="e.g. ₹ 4,500 INR" className="w-full p-2 border border-ink bg-white text-xs font-mono" value={regFeeValue} onChange={e => setRegFeeValue(e.target.value)} />
                    </div>
                    <div className="flex items-end text-right justify-end font-mono">
                      {editingFeesIdx !== null && (
                        <button type="button" onClick={() => { setEditingFeesIdx(null); setRegFeeCategory(''); setRegFeeValue(''); }} className="px-2 py-1.5 bg-white border border-ink text-[10px] font-bold uppercase rounded mr-1">Cancel</button>
                      )}
                      <button type="button" onClick={() => {
                        if (!regFeeCategory || !regFeeValue) { alert('Fee Category and Pricing input are required.'); return; }
                        const record = { category: regFeeCategory, fee: regFeeValue };
                        if (editingFeesIdx !== null) {
                          const copy = [...draftFeesList];
                          copy[editingFeesIdx] = record;
                          setDraftFeesList(copy);
                          setEditingFeesIdx(null);
                        } else {
                          setDraftFeesList([...draftFeesList, record]);
                        }
                        setRegFeeCategory(''); setRegFeeValue('');
                      }} className="px-3 py-2 bg-brand-orange text-white text-[9px] uppercase font-bold border border-ink shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
                        {editingFeesIdx !== null ? '✓ Save Pricing' : '+ Add Booking Tier'}
                      </button>
                    </div>

                    {draftFeesList.length > 0 && (
                      <div className="col-span-3 mt-1 divide-y divide-ink/10 text-[9px] bg-white border border-ink/20 max-h-[100px] overflow-y-auto">
                        {draftFeesList.map((f, idx) => (
                          <div key={idx} className="p-1 px-2.5 flex justify-between items-center bg-white text-xs">
                            <span className="font-mono">{f.category}: <strong className="text-brand-orange">{f.fee}</strong></span>
                            <div className="flex gap-2 font-mono text-[9px] font-bold">
                              <button type="button" onClick={() => {
                                setEditingFeesIdx(idx);
                                setRegFeeCategory(f.category);
                                setRegFeeValue(f.fee);
                              }} className="text-brand-blue hover:underline">edit</button>
                              <button type="button" onClick={() => setDraftFeesList(draftFeesList.filter((_, i) => i !== idx))} className="text-brand-orange font-bold">&times;</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* INSTRUCTIONS (With Markdown Toolbar and Live Preview) */}
                  <div className="border border-dashed border-ink/20 p-3 bg-paper/5 mt-2 rounded">
                    <label className="block text-[9px] font-black uppercase mb-1 font-mono">RSVP Instructions & Booking Guidelines statement (Supports Markdown)</label>
                    <div className="space-y-2">
                      <MarkdownToolbar textareaId="form-rsvp-instruction" value={regInstructionInput} onChange={setRegInstructionInput} />
                      <textarea id="form-rsvp-instruction" rows={3} placeholder="Type instruction statement. Selecting text and clicking toolbar inserts markup." className="w-full p-2 border border-ink bg-white font-sans text-xs focus:bg-white" value={regInstructionInput} onChange={e => setRegInstructionInput(e.target.value)} />
                      
                      {regInstructionInput && (
                        <div className="p-2.5 border border-dashed border-brand-blue/30 bg-white text-[11px]">
                          <span className="block text-[8px] font-black uppercase mb-1 text-brand-blue font-mono">Instruction Statement Live Preview</span>
                          <div className="prose prose-sm text-ink leading-normal font-sans" dangerouslySetInnerHTML={{ __html: renderMarkdown(regInstructionInput) }} />
                        </div>
                      )}

                      <div className="flex justify-end font-mono">
                        {editingInstructionsIdx !== null && (
                          <button type="button" onClick={() => { setEditingInstructionsIdx(null); setRegInstructionInput(''); }} className="px-3 py-1 bg-white text-ink border border-ink text-[10px] font-bold uppercase ml-1">Cancel</button>
                        )}
                        <button type="button" onClick={() => {
                          if (!regInstructionInput.trim()) return;
                          if (editingInstructionsIdx !== null) {
                            const copy = [...draftInstructionsList];
                            copy[editingInstructionsIdx] = regInstructionInput.trim();
                            setDraftInstructionsList(copy);
                            setEditingInstructionsIdx(null);
                          } else {
                            setDraftInstructionsList([...draftInstructionsList, regInstructionInput.trim()]);
                          }
                          setRegInstructionInput('');
                        }} className="px-3 py-1 bg-brand-blue text-white text-[8px] font-bold uppercase border border-ink shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
                          {editingInstructionsIdx !== null ? '✓ Save Guideline' : '+ Add RSVP Instruction Statement'}
                        </button>
                      </div>
                    </div>

                    {draftInstructionsList.length > 0 && (
                      <div className="mt-2 divide-y divide-ink/10 font-mono text-[9px] bg-white border border-ink/10 max-h-[120px] overflow-y-auto p-1.5 text-xs rounded">
                        {draftInstructionsList.map((ins, idx) => (
                          <div key={idx} className="p-1.5 flex justify-between items-start bg-white gap-2">
                            <span className="break-words max-w-[85%] font-sans" dangerouslySetInnerHTML={{ __html: (idx + 1) + ". " + renderMarkdown(ins) }} />
                            <div className="flex gap-2 shrink-0 font-mono text-[9px] font-bold">
                              <button type="button" onClick={() => {
                                setEditingInstructionsIdx(idx);
                                setRegInstructionInput(ins);
                              }} className="text-brand-blue hover:underline">edit</button>
                              <button type="button" onClick={() => setDraftInstructionsList(draftInstructionsList.filter((_, i) => i !== idx))} className="text-brand-orange font-bold font-mono">Remove</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. DYNAMIC PRESENTER PAGE LIST (Requirement 5: Same UI structure as Committees) */}
              {newPageType === 'list' && (
                <div className="space-y-3 p-4 border border-ink bg-white font-sans animate-fade-in shadow-[3px_3px_0px_rgba(0,0,0,1)] rounded text-left">
                  <div className="font-bold text-[10px] text-brand-orange uppercase font-mono tracking-wider">🎙️ Manage Presenters / Instructors Directory</div>
                  
                  <div className="border border-ink/15 p-3 bg-zinc-50 rounded space-y-2">
                    <span className="block text-[8px] font-black uppercase text-brand-blue font-mono">Add Presenter / Instructor to this Tab segment</span>
                    
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={!liIsExternal} onChange={() => { setLiIsExternal(false); setLiName(''); setLiPhotoUrl(''); setLiProfileUrl(''); setLiStaffSlug(''); setLiAddAffiliation(''); setLiAffiliation('Council for Diversity and Innovation'); }} />
                        <span>CoDIN Staff</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={liIsExternal} onChange={() => { setLiIsExternal(true); setLiName(''); setLiPhotoUrl(''); setLiProfileUrl(''); setLiStaffSlug(''); setLiAddAffiliation(''); setLiAffiliation(''); }} />
                        <span>External Member</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {!liIsExternal ? (
                        <div>
                          <label className="block text-[7px] font-bold mb-0.5">Select CoDIN Staff Member</label>
                          <select 
                            className="w-full p-2 border border-ink bg-white text-xs font-bold font-mono"
                            value={liStaffSlug}
                            onChange={e => {
                              const slug = e.target.value;
                              setLiStaffSlug(slug);
                              const item = dbTeam.find(p => p.slug === slug);
                              if (item) {
                                setLiName(item.name);
                                setLiAffiliation('Council for Diversity and Innovation');
                                setLiPhotoUrl(item.image || '');
                                setLiProfileUrl(`/people/${item.slug}`);
                                setLiAddAffiliation('');
                              }
                            }}
                          >
                            <option value="">-- Choose Staff Member --</option>
                            {dbTeam.map(t => (
                              <option key={t.slug} value={t.slug}>{t.name}</option>
                            ))}
                          </select>

                          {liStaffSlug && (
                            <div className="mt-2 font-mono">
                              <label className="block text-[7px] font-bold mb-0.5">Additional Affiliation (Optional)</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Director, BigTech Lab" 
                                className="w-full p-1.5 border border-ink bg-white text-xs font-normal"
                                value={liAddAffiliation}
                                onChange={e => {
                                  setLiAddAffiliation(e.target.value);
                                  setLiAffiliation(`Council for Diversity and Innovation${e.target.value ? `, ${e.target.value}` : ''}`);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="col-span-1 md:col-span-2 border-b border-ink/5 pb-2">
                            <label className="block text-[7px] font-bold mb-0.5 font-mono">Select Existing Collaborator (Optional)</label>
                            <select
                              className="w-full p-2 border border-ink bg-white text-xs font-bold font-mono"
                              onChange={e => {
                                const slug = e.target.value;
                                if (!slug || slug === 'new') {
                                  setLiName('');
                                  setLiAffiliation('');
                                  setLiPhotoUrl('');
                                  setLiProfileUrl('');
                                  setLiIsExternal(false);
                                } else {
                                  const item = dbTeam.find(p => p.slug === slug);
                                  if (item) {
                                    setLiName(item.name);
                                    setLiAffiliation(item.role || '');
                                    setLiPhotoUrl(item.image || '');
                                    setLiProfileUrl(`/people/${item.slug}`);
                                    setLiIsExternal(true);
                                  }
                                }
                              }}
                            >
                              <option value="new">-- Register a New Collaborator --</option>
                              {dbTeam.filter((p: any) => p.boardMemberType === 'external').map(t => (
                                <option key={t.slug} value={t.slug}>{t.name} ({t.role})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[7px] font-bold mb-0.5">Presenter Name</label>
                            <input type="text" className="w-full p-1.5 border border-ink bg-white text-xs font-normal" value={liName} onChange={e => setLiName(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[7px] font-bold mb-0.5 font-mono">External Affiliation</label>
                            <input type="text" className="w-full p-1.5 border border-ink bg-white text-xs font-normal" value={liAffiliation} onChange={e => setLiAffiliation(e.target.value)} />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-[7px] font-bold mb-0.5 font-mono">Assigned Role tag</label>
                        <input type="text" placeholder="e.g. Primary Mentor, Invited Speaker" className="w-full p-1.5 border border-ink bg-white text-xs font-normal font-mono" value={liRole} onChange={e => setLiRole(e.target.value)} />
                      </div>

                      {liIsExternal ? (
                        <div>
                          <label className="block text-[7px] font-bold mb-0.5 flex justify-between font-mono">
                            <span>Biography URL Link</span> 
                            <span className="text-[6px] opacity-45">(Optional)</span>
                          </label>
                          <input type="text" placeholder="e.g. https://academia.edu/scholar" className="w-full p-1.5 border border-ink bg-white text-xs font-normal font-mono" value={liProfileUrl} onChange={e => setLiProfileUrl(e.target.value)} />
                        </div>
                      ) : null}

                      {liIsExternal && (
                        <div className="col-span-2">
                          <label className="block text-[7px] font-bold mb-0.5 col-span-2 font-mono">Photograph (Cloudinary Upload)</label>
                          <div className="flex gap-2">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="flex-1 text-[9px] font-mono border border-ink bg-paper p-1 cursor-pointer" 
                              onChange={async (e) => {
                                if (!e.target.files?.[0]) return;
                                const reader = new FileReader();
                                reader.onload = async () => {
                                  const url = await uploadToCloudinary({ dataUrl: reader.result as string });
                                  if (url) setLiPhotoUrl(url);
                                };
                                reader.readAsDataURL(e.target.files[0]);
                              }}
                            />
                            {liPhotoUrl && (
                              <img src={liPhotoUrl} alt="Preview" className="w-8 h-8 object-cover border border-ink bg-white rounded font-bold animate-fade-in" referrerPolicy="no-referrer" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1.5 border-t border-zinc-100 font-mono">
                      {editingListListIdx !== null && (
                        <button type="button" onClick={() => { setEditingListListIdx(null); setLiName(''); setLiAffiliation(''); setLiRole(''); setLiPhotoUrl(''); setLiProfileUrl(''); setLiStaffSlug(''); setLiIsExternal(false); setLiAddAffiliation(''); }} className="px-2.5 py-1 bg-zinc-200 text-ink text-[8px] font-bold uppercase rounded">Cancel</button>
                      )}
                      <button 
                        type="button" 
                        onClick={async () => {
                          if (!liName) { alert('Presenter Name is required'); return; }
                          
                          let finalSlug = '';
                          if (liIsExternal) {
                            const normalizedSlug = liName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                            finalSlug = normalizedSlug;
                            const existingPerson = dbTeam.find(p => p.slug === normalizedSlug || p.name.toLowerCase() === liName.toLowerCase());
                            if (existingPerson) {
                              finalSlug = existingPerson.slug;
                            }
                            
                            const userStored = localStorage.getItem('lms_user');
                            const userObj = userStored ? JSON.parse(userStored) : null;
                            const jwtToken = token || userObj?.token || '';
                            
                            const headers: Record<string, string> = {
                              "Content-Type": "application/json"
                            };
                            if (jwtToken) {
                              headers["Authorization"] = `Bearer ${jwtToken}`;
                            }

                            const payload = {
                              slug: finalSlug,
                              name: liName,
                              fullName: liName,
                              role: liAffiliation || "Our Collaborator",
                              email: existingPerson?.email || `${finalSlug}@diversity.org.in`,
                              bio: existingPerson?.bio || "Collaborating specialist associated with custom seminars, committees, and research projects.",
                              image: liPhotoUrl || "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600",
                              boardMemberType: "external",
                              bannerImages: existingPerson?.bannerImages || [],
                              education: existingPerson?.education || [],
                              experience: existingPerson?.experience || [],
                              publications: existingPerson?.publications || [],
                              socials: existingPerson?.socials || {}
                            };

                            try {
                              if (existingPerson) {
                                await fetch(`/api/people/${existingPerson.slug}`, {
                                  method: "PUT",
                                  headers,
                                  body: JSON.stringify(payload)
                                });
                              } else {
                                await fetch('/api/people', {
                                  method: "POST",
                                  headers,
                                  body: JSON.stringify(payload)
                                });
                              }
                              if (eventToEdit) {
                                await fetch('/api/lms/sync/event-member', {
                                  method: "POST",
                                  headers,
                                  body: JSON.stringify({
                                    eventId: eventToEdit._id || eventToEdit.slug,
                                    name: liName,
                                    role: liRole || "Presenter",
                                    isExternal: liIsExternal,
                                    staffSlug: liIsExternal ? undefined : liStaffSlug,
                                    entityType: 'presenter',
                                    action: 'add'
                                  })
                                }).catch(err => console.error("Could not sync event member add", err));
                              }
                              window.dispatchEvent(new Event("people_data_updated"));
                              const res = await fetch('/api/people');
                              if (res.ok) {
                                const data = await res.json();
                                setDbTeam((data.people || []).filter((p: any) => !p.deleted));
                              }
                            } catch (e) {
                              console.error("Could not register or update external collaborator:", e);
                            }
                          }

                          if (!liIsExternal) {
                            if (eventToEdit) {
                              const userStored = localStorage.getItem('lms_user');
                              const userObj = userStored ? JSON.parse(userStored) : null;
                              const jwtToken = token || userObj?.token || '';
                              const headers: Record<string, string> = {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${jwtToken}`
                              };
                              await fetch('/api/lms/sync/event-member', {
                                method: "POST",
                                headers,
                                body: JSON.stringify({
                                  eventId: eventToEdit._id || eventToEdit.slug,
                                  name: liName,
                                  role: liRole || "Presenter",
                                  isExternal: liIsExternal,
                                  staffSlug: liStaffSlug,
                                  entityType: 'presenter',
                                  action: 'add'
                                })
                              }).catch(err => console.error("Could not sync event member add", err));
                            }
                          }

                          const record = { 
                            name: liName, 
                            affiliation: liAffiliation, 
                            role: liRole,
                            isExternal: liIsExternal,
                            staffSlug: liIsExternal ? undefined : liStaffSlug,
                            photoUrl: liPhotoUrl || undefined,
                            profileUrl: liIsExternal ? `/people/${finalSlug}` : `/people/${liStaffSlug}`
                          };
                          if (editingListListIdx !== null) {
                            const copy = [...draftListList];
                            copy[editingListListIdx] = record;
                            setDraftListList(copy);
                            setEditingListListIdx(null);
                          } else {
                            setDraftListList([...draftListList, record]);
                          }
                          setLiName(''); setLiAffiliation(''); setLiRole(''); setLiPhotoUrl(''); setLiProfileUrl(''); setLiStaffSlug(''); setLiIsExternal(false); setLiAddAffiliation('');
                        }} 
                        className="px-3 py-1 bg-brand-light font-bold text-ink text-[9px] uppercase border border-ink shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                      >
                        {editingListListIdx !== null ? '✓ Save Presenter' : '+ Add Presenter Row'}
                      </button>
                    </div>

                    {draftListList.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-1.5 bg-white p-1.5 border border-ink/10 rounded max-h-[120px] overflow-y-auto">
                        {draftListList.map((li, idx) => (
                          <div key={idx} className="p-1 px-2 border border-zinc-150 bg-stone-50 leading-tight rounded flex justify-between items-center text-[9px] uppercase font-bold relative group">
                            <span className="truncate pr-4 flex items-center gap-1.5 select-none">
                              {li.photoUrl ? (
                                <img src={li.photoUrl} className="w-4 h-4 rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="w-4 h-4 rounded-full bg-zinc-200 block text-center flex items-center justify-center text-[7px] font-serif pr-0.5">{li.name.charAt(0)}</span>
                              )}
                              <span className="truncate">{li.name} ({li.role || 'Presenter'})</span>
                            </span>
                            <div className="flex gap-1.5">
                              <button type="button" onClick={() => {
                                setEditingListListIdx(idx);
                                setLiIsExternal(li.isExternal || false);
                                setLiStaffSlug(li.staffSlug || '');
                                setLiName(li.name);
                                setLiAffiliation(li.affiliation || '');
                                setLiRole(li.role || '');
                                setLiPhotoUrl(li.photoUrl || '');
                                setLiProfileUrl(li.profileUrl || '');
                                
                                const prefix = "Council for Diversity and Innovation";
                                let parsedAdd = '';
                                if (li.affiliation && li.affiliation.startsWith(prefix)) {
                                  if (li.affiliation.length > prefix.length) {
                                    parsedAdd = li.affiliation.substring(prefix.length + 2);
                                  }
                                }
                                setLiAddAffiliation(parsedAdd);
                              }} className="text-brand-blue uppercase text-[7px] font-bold hover:underline">edit</button>
                              <button type="button" onClick={() => {
                                const targetItem = draftListList[idx];
                                if (eventToEdit && targetItem && targetItem.name) {
                                  fetch('/api/lms/sync/event-member', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token || ""}`,
                                    },
                                    body: JSON.stringify({
                                      eventId: eventToEdit._id || eventToEdit.slug,
                                      name: targetItem.name,
                                      entityType: 'presenter',
                                      action: 'remove'
                                    })
                                  }).catch(err => console.error("Could not sync event presenter removal", err));
                                }
                                setDraftListList(draftListList.filter((_, i) => i !== idx));
                              }} className="text-brand-orange hover:text-ink font-semibold">&times;</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. LOGISTICS INFORMATION (Requirement 1 & 9: Added Markdown buttons helper & edit bug crash mitigation) */}
              {newPageType === 'logistics' && (
                <div className="space-y-4 p-4 border border-ink bg-white font-sans animate-fade-in mb-2">
                  <div className="font-bold text-[10px] text-brand-orange uppercase font-mono">Manage Venue & Logistics (Supports Google Map Link, Buttons & Markdown Previews)</div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-bold font-mono">Heading Key (e.g. Physical Venue, Accommodation, Flight Booking)</label>
                      <input type="text" placeholder="e.g. Main Venue Hub" className="w-full p-2 border border-ink bg-paper text-xs font-bold" value={draftLogisticsKey} onChange={e => setDraftLogisticsKey(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-bold font-mono">Google Map Link URL (e.g. Link to location map)</label>
                      <input type="text" placeholder="e.g. https://maps.google.com/?q=..." className="w-full p-2 border border-ink bg-paper text-xs font-mono" value={draftLogisticsLink} onChange={e => setDraftLogisticsLink(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-bold font-mono">Logistics description content (Supports Markdown & Media Helpers)</label>
                      <MarkdownToolbar textareaId="form-logistics-value" value={draftLogisticsValue} onChange={setDraftLogisticsValue} />
                      <MarkdownMediaHelper 
                        onInsert={(text) => handleInsertMarkdown('form-logistics-value', '', '', text, setDraftLogisticsValue)}
                        onUploadingStateChange={setIsUploadingCloudinary}
                      />
                      <textarea id="form-logistics-value" placeholder="Provide details with clear Markdown syntax..." rows={3} className="w-full p-2 border border-ink bg-paper font-sans text-xs focus:bg-white" value={draftLogisticsValue} onChange={e => setDraftLogisticsValue(e.target.value)} />
                      
                      {draftLogisticsValue && (
                        <div className="mt-2 p-2.5 border border-dashed border-brand-blue/30 bg-stone-50 max-h-[140px] overflow-y-auto">
                          <span className="block text-[8px] font-black uppercase mb-1 text-brand-blue font-mono">Logistics Section Live Preview</span>
                          <div className="prose prose-sm text-ink leading-normal font-sans text-[11px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(draftLogisticsValue) }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 font-mono">
                    {editingLogisticsIdx !== null && (
                      <button type="button" onClick={() => { setEditingLogisticsIdx(null); setDraftLogisticsKey(''); setDraftLogisticsValue(''); setDraftLogisticsLink(''); }} className="px-3 py-1 bg-white text-ink border border-ink text-[10px] font-bold uppercase mr-1">Cancel</button>
                    )}
                    <button type="button" onClick={() => {
                      if (!draftLogisticsKey || !draftLogisticsValue) { alert('Logistics key and descriptions cannot be empty.'); return; }
                      const record = { key: draftLogisticsKey, value: draftLogisticsValue, link: draftLogisticsLink || undefined };
                      if (editingLogisticsIdx !== null) {
                        const copy = [...draftLogisticsList];
                        copy[editingLogisticsIdx] = record;
                        setDraftLogisticsList(copy);
                        setEditingLogisticsIdx(null);
                      } else {
                        setDraftLogisticsList([...draftLogisticsList, record]);
                      }
                      setDraftLogisticsKey(''); setDraftLogisticsValue(''); setDraftLogisticsLink('');
                    }} className="px-3 py-1 bg-brand-blue text-white text-[9px] uppercase font-bold border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      {editingLogisticsIdx !== null ? '✓ Save Logistics Section' : '+ Add Logistics Section'}
                    </button>
                  </div>

                  {draftLogisticsList.length > 0 && (
                    <div className="mt-2 border border-ink/20 bg-stone-50 p-2 space-y-1 rounded max-h-[160px] overflow-y-auto">
                      {draftLogisticsList.map((log, idx) => (
                        <div key={idx} className="p-2 border border-ink/10 bg-white flex justify-between items-start text-xs rounded leading-normal font-sans">
                          <div className="max-w-[80%]">
                            <strong className="uppercase font-mono text-[9px] block text-brand-orange">{log.key}</strong>
                            {log.link && <span className="text-[9px] text-brand-blue block font-mono truncate">📍 Map link: {log.link}</span>}
                            <span className="text-ink text-xs line-clamp-1 block truncate mt-0.5 leading-snug">{log.value}</span>
                          </div>
                          <div className="flex gap-2 shrink-0 font-mono text-[9px] font-bold">
                            <button type="button" onClick={() => {
                              setEditingLogisticsIdx(idx);
                              setDraftLogisticsKey(log.key);
                              setDraftLogisticsValue(log.value);
                              setDraftLogisticsLink(log.link || '');
                            }} className="text-brand-blue hover:underline">edit</button>
                            <button type="button" onClick={() => setDraftLogisticsList(draftLogisticsList.filter((_, i) => i !== idx))} className="text-brand-orange">&times;</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 7. COMMITTEES SECTION (Requirement 5: external member photo upload / database dynamic select dropdowns) */}
              {newPageType === 'committees' && (
                <div className="space-y-4 p-4 border border-ink bg-white font-sans animate-fade-in mb-2">
                  <div className="font-bold text-[10px] text-brand-orange uppercase font-mono">Manage Committees (Supports External / Staff dynamic options & Photo uploads)</div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-mono">Committee Group Name</label>
                      <input type="text" placeholder="e.g. Governing Advisory Council" className="w-full p-2 border border-ink bg-paper text-xs font-bold" value={draftCommitteeName} onChange={e => setDraftCommitteeName(e.target.value)} />
                    </div>

                    {/* Committee Member Editor Card */}
                    <div className="border border-ink/10 p-3 bg-zinc-50 rounded space-y-2">
                      <span className="block text-[8px] font-black uppercase text-brand-blue font-mono">Add Member to above Committee Group</span>
                      
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" checked={!commMemIsExternal} onChange={() => { setCommMemIsExternal(false); setDraftCommitteeMemberName(''); setCommMemPhotoUrl(''); setCommMemProfileUrl(''); }} />
                          <span>CoDIN Staff</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" checked={commMemIsExternal} onChange={() => { setCommMemIsExternal(true); setDraftCommitteeMemberName(''); setCommMemPhotoUrl(''); setCommMemProfileUrl(''); }} />
                          <span>External Member</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {!commMemIsExternal ? (
                          <div>
                            <label className="block text-[7px] font-bold mb-0.5">Select CoDIN Staff Member</label>
                            <select 
                              className="w-full p-2 border border-ink bg-white text-xs font-bold font-mono"
                              value={commMemStaffSlug}
                              onChange={e => {
                                const slug = e.target.value;
                                setCommMemStaffSlug(slug);
                                const item = dbTeam.find(p => p.slug === slug);
                                if (item) {
                                  setDraftCommitteeMemberName(item.name);
                                  setDraftCommitteeMemberAffiliation('Council for Diversity and Innovation');
                                  setCommMemPhotoUrl(item.image || '');
                                  setCommMemProfileUrl(`/people/${item.slug}`);
                                  setCommMemAddAffiliation('');
                                }
                              }}
                            >
                              <option value="">-- Choose Staff Member --</option>
                              {dbTeam.map(t => (
                                <option key={t.slug} value={t.slug}>{t.name}</option>
                              ))}
                            </select>

                            {commMemStaffSlug && (
                              <div className="mt-2 font-mono">
                                <label className="block text-[7px] font-bold mb-0.5">Additional Affiliation (Optional)</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g. Director, BigTech Lab" 
                                  className="w-full p-1.5 border border-ink bg-white text-xs font-normal"
                                  value={commMemAddAffiliation}
                                  onChange={e => {
                                    setCommMemAddAffiliation(e.target.value);
                                    setDraftCommitteeMemberAffiliation(`Council for Diversity and Innovation${e.target.value ? `, ${e.target.value}` : ''}`);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="col-span-1 md:col-span-2 border-b border-ink/5 pb-2">
                              <label className="block text-[7px] font-bold mb-0.5 font-mono">Select Existing Collaborator (Optional)</label>
                              <select
                                className="w-full p-2 border border-ink bg-white text-xs font-bold font-mono"
                                onChange={e => {
                                  const slug = e.target.value;
                                  if (!slug || slug === 'new') {
                                    setDraftCommitteeMemberName('');
                                    setDraftCommitteeMemberAffiliation('');
                                    setCommMemPhotoUrl('');
                                    setCommMemProfileUrl('');
                                    setCommMemIsExternal(false);
                                  } else {
                                    const item = dbTeam.find(p => p.slug === slug);
                                    if (item) {
                                      setDraftCommitteeMemberName(item.name);
                                      setDraftCommitteeMemberAffiliation(item.role || '');
                                      setCommMemPhotoUrl(item.image || '');
                                      setCommMemProfileUrl(`/people/${item.slug}`);
                                      setCommMemIsExternal(true);
                                    }
                                  }
                                }}
                              >
                                <option value="new">-- Register a New Collaborator --</option>
                                {dbTeam.filter((p: any) => p.boardMemberType === 'external').map(t => (
                                  <option key={t.slug} value={t.slug}>{t.name} ({t.role})</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[7px] font-bold mb-0.5">Member Name</label>
                              <input type="text" className="w-full p-1.5 border border-ink bg-white text-xs font-normal" value={draftCommitteeMemberName} onChange={e => setDraftCommitteeMemberName(e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-[7px] font-bold mb-0.5 font-mono">External Affiliation</label>
                              <input type="text" className="w-full p-1.5 border border-ink bg-white text-xs font-normal" value={draftCommitteeMemberAffiliation} onChange={e => setDraftCommitteeMemberAffiliation(e.target.value)} />
                            </div>
                          </>
                        )}

                        <div>
                          <label className="block text-[7px] font-bold mb-0.5">Assigned Role in Group</label>
                          <input type="text" placeholder="e.g. Chair, Co-Convenor" className="w-full p-1.5 border border-ink bg-white font-normal text-xs" value={draftCommitteeMemberRole} onChange={e => setDraftCommitteeMemberRole(e.target.value)} />
                        </div>

                        {commMemIsExternal ? (
                          <div>
                            <label className="block text-[7px] font-bold mb-0.5 flex justify-between">
                              <span>Biography URL Link</span> 
                              <span className="text-[6px] opacity-45">(Optional)</span>
                            </label>
                            <input type="text" placeholder="e.g. https://academia.edu/scholar" className="w-full p-1.5 border border-ink bg-white font-normal text-xs" value={commMemProfileUrl} onChange={e => setCommMemProfileUrl(e.target.value)} />
                          </div>
                        ) : null}

                        {commMemIsExternal && (
                          <div className="col-span-2">
                            <label className="block text-[7px] font-bold mb-0.5">Photograph (Cloudinary Upload)</label>
                            <div className="flex gap-2">
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="flex-1 text-[9px] font-mono border border-ink bg-paper p-1 cursor-pointer" 
                                onChange={async (e) => {
                                  if (!e.target.files?.[0]) return;
                                  const reader = new FileReader();
                                  reader.onload = async () => {
                                    const url = await uploadToCloudinary({ dataUrl: reader.result as string });
                                    if (url) setCommMemPhotoUrl(url);
                                  };
                                  reader.readAsDataURL(e.target.files[0]);
                                }}
                              />
                              {commMemPhotoUrl && (
                                <img src={commMemPhotoUrl} alt="Preview" className="w-8 h-8 object-cover border border-ink bg-white rounded font-bold" referrerPolicy="no-referrer" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1 border-t border-zinc-100">
                        {editingCommitteeMemberIdx !== null && (
                          <button type="button" onClick={() => { setEditingCommitteeMemberIdx(null); setDraftCommitteeMemberName(''); setDraftCommitteeMemberAffiliation(''); setDraftCommitteeMemberRole(''); setCommMemPhotoUrl(''); setCommMemProfileUrl(''); setCommMemStaffSlug(''); setCommMemIsExternal(false); setCommMemAddAffiliation(''); }} className="px-2 py-0.5 bg-zinc-200 text-ink text-[8px] font-bold uppercase rounded font-mono">Cancel</button>
                        )}
                        <button 
                          type="button" 
                          onClick={async () => {
                            if (!draftCommitteeMemberName) { alert('Representative member Name is required'); return; }
                            
                            let finalSlug = '';
                            if (commMemIsExternal) {
                              const normalizedSlug = draftCommitteeMemberName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                              finalSlug = normalizedSlug;
                              const existingPerson = dbTeam.find(p => p.slug === normalizedSlug || p.name.toLowerCase() === draftCommitteeMemberName.toLowerCase());
                              if (existingPerson) {
                                finalSlug = existingPerson.slug;
                              }
                              
                              const userStored = localStorage.getItem('lms_user');
                              const userObj = userStored ? JSON.parse(userStored) : null;
                              const jwtToken = token || userObj?.token || '';
                              
                              const headers: Record<string, string> = {
                                "Content-Type": "application/json"
                              };
                              if (jwtToken) {
                                headers["Authorization"] = `Bearer ${jwtToken}`;
                              }

                              const payload = {
                                slug: finalSlug,
                                name: draftCommitteeMemberName,
                                fullName: draftCommitteeMemberName,
                                role: draftCommitteeMemberAffiliation || "Our Collaborator",
                                email: existingPerson?.email || `${finalSlug}@diversity.org.in`,
                                bio: existingPerson?.bio || "Collaborating specialist associated with custom seminars, committees, and research projects.",
                                image: commMemPhotoUrl || "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600",
                                boardMemberType: "external",
                                bannerImages: existingPerson?.bannerImages || [],
                                education: existingPerson?.education || [],
                                experience: existingPerson?.experience || [],
                                publications: existingPerson?.publications || [],
                                socials: existingPerson?.socials || {}
                              };

                              try {
                                if (existingPerson) {
                                  await fetch(`/api/people/${existingPerson.slug}`, {
                                    method: "PUT",
                                    headers,
                                    body: JSON.stringify(payload)
                                  });
                                } else {
                                  await fetch('/api/people', {
                                    method: "POST",
                                    headers,
                                    body: JSON.stringify(payload)
                                  });
                                }
                                if (eventToEdit) {
                                  await fetch('/api/lms/sync/event-member', {
                                    method: "POST",
                                    headers,
                                    body: JSON.stringify({
                                      eventId: eventToEdit._id || eventToEdit.slug,
                                      name: draftCommitteeMemberName,
                                      role: draftCommitteeMemberRole || `${draftCommitteeName || "Committee"} Member`,
                                      isExternal: commMemIsExternal,
                                      staffSlug: commMemIsExternal ? undefined : commMemStaffSlug,
                                      groupName: draftCommitteeName,
                                      entityType: 'committee',
                                      action: 'add'
                                    })
                                  }).catch(err => console.error("Could not sync event committee member add", err));
                                }
                                window.dispatchEvent(new Event("people_data_updated"));
                                const res = await fetch('/api/people');
                                if (res.ok) {
                                  const data = await res.json();
                                  setDbTeam((data.people || []).filter((p: any) => !p.deleted));
                                }
                              } catch (e) {
                                console.error("Could not register or update external collaborator:", e);
                              }
                            }

                            if (!commMemIsExternal) {
                              if (eventToEdit) {
                                const userStored = localStorage.getItem('lms_user');
                                const userObj = userStored ? JSON.parse(userStored) : null;
                                const jwtToken = token || userObj?.token || '';
                                const headers: Record<string, string> = {
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${jwtToken}`
                                };
                                await fetch('/api/lms/sync/event-member', {
                                  method: "POST",
                                  headers,
                                  body: JSON.stringify({
                                    eventId: eventToEdit._id || eventToEdit.slug,
                                    name: draftCommitteeMemberName,
                                    role: draftCommitteeMemberRole || "Member",
                                    isExternal: commMemIsExternal,
                                    staffSlug: commMemStaffSlug,
                                    groupName: draftCommitteeName,
                                    entityType: 'committee',
                                    action: 'add'
                                  })
                                }).catch(err => console.error("Could not sync event committee member add", err));
                              }
                            }

                            const record = { 
                              name: draftCommitteeMemberName, 
                              affiliation: draftCommitteeMemberAffiliation, 
                              role: draftCommitteeMemberRole,
                              isExternal: commMemIsExternal,
                              staffSlug: commMemIsExternal ? undefined : commMemStaffSlug,
                              photoUrl: commMemPhotoUrl || undefined,
                              profileUrl: commMemIsExternal ? `/people/${finalSlug}` : `/people/${commMemStaffSlug}`
                            };
                            if (editingCommitteeMemberIdx !== null) {
                              const copy = [...draftCommitteeMembers];
                              copy[editingCommitteeMemberIdx] = record;
                              setDraftCommitteeMembers(copy);
                              setEditingCommitteeMemberIdx(null);
                            } else {
                              setDraftCommitteeMembers([...draftCommitteeMembers, record]);
                            }
                            setDraftCommitteeMemberName(''); setDraftCommitteeMemberAffiliation('Council for Diversity and Innovation'); setDraftCommitteeMemberRole(''); setCommMemPhotoUrl(''); setCommMemProfileUrl(''); setCommMemStaffSlug(''); setCommMemIsExternal(false); setCommMemAddAffiliation('');
                          }} 
                          className="px-2 py-0.5 bg-brand-light font-bold text-ink text-[10px] uppercase border border-ink shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                        >
                          {editingCommitteeMemberIdx !== null ? '✓ Save Member' : '+ Add Member to Group'}
                        </button>
                      </div>

                      {draftCommitteeMembers.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-1.5 bg-white p-1.5 border border-ink/10 rounded max-h-[100px] overflow-y-auto">
                          {draftCommitteeMembers.map((m, mIdx) => (
                            <div key={mIdx} className="p-1 px-2 border border-zinc-150 bg-stone-50 leading-tight rounded flex justify-between items-center text-[9px] uppercase font-bold relative group">
                              <span className="truncate pr-4 flex items-center gap-1.5">
                                {m.photoUrl && <img src={m.photoUrl} className="w-4 h-4 rounded-full object-cover" referrerPolicy="no-referrer" />}
                                <span className="truncate">{m.name} ({m.role || 'Member'})</span>
                              </span>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => {
                                  setEditingCommitteeMemberIdx(mIdx);
                                  setCommMemIsExternal(m.isExternal || false);
                                  setCommMemStaffSlug(m.staffSlug || '');
                                  setDraftCommitteeMemberName(m.name);
                                  setDraftCommitteeMemberAffiliation(m.affiliation || '');
                                  setDraftCommitteeMemberRole(m.role || '');
                                  setCommMemPhotoUrl(m.photoUrl || '');
                                  setCommMemProfileUrl(m.profileUrl || '');
                                  
                                  const prefix = "Council for Diversity and Innovation";
                                  let parsedAdd = '';
                                  if (m.affiliation && m.affiliation.startsWith(prefix)) {
                                    if (m.affiliation.length > prefix.length) {
                                      parsedAdd = m.affiliation.substring(prefix.length + 2);
                                    }
                                  }
                                  setCommMemAddAffiliation(parsedAdd);
                                }} className="text-brand-blue uppercase text-[7px] font-bold hover:underline">edit</button>
                                <button type="button" onClick={() => {
                                  const targetMember = draftCommitteeMembers[mIdx];
                                  if (eventToEdit && targetMember && targetMember.name) {
                                    fetch('/api/lms/sync/event-member', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${token || ""}`,
                                      },
                                      body: JSON.stringify({
                                        eventId: eventToEdit._id || eventToEdit.slug,
                                        name: targetMember.name,
                                        entityType: 'committee',
                                        action: 'remove'
                                      })
                                    }).catch(err => console.error("Could not sync event committee member removal", err));
                                  }
                                  setDraftCommitteeMembers(draftCommitteeMembers.filter((_, i) => i !== mIdx));
                                }} className="text-brand-orange hover:text-ink">&times;</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-150">
                      {editingCommitteeIdx !== null && (
                        <button type="button" onClick={() => { setEditingCommitteeIdx(null); setDraftCommitteeName(''); setDraftCommitteeMembers([]); }} className="px-3 py-1 bg-white text-ink border border-ink text-[9px] uppercase font-bold">Cancel</button>
                      )}
                      <button 
                        type="button" 
                        onClick={() => {
                          if (!draftCommitteeName || draftCommitteeMembers.length === 0) { alert('Specify Council Name and add members first.'); return; }
                          const record = { name: draftCommitteeName, members: [...draftCommitteeMembers] };
                          if (editingCommitteeIdx !== null) {
                            const copy = [...draftCommitteesList];
                            copy[editingCommitteeIdx] = record;
                            setDraftCommitteesList(copy);
                            setEditingCommitteeIdx(null);
                          } else {
                            setDraftCommitteesList([...draftCommitteesList, record]);
                          }
                          setDraftCommitteeName(''); setDraftCommitteeMembers([]);
                        }} 
                        className="px-3 py-1 bg-brand-orange text-white text-[9px] uppercase font-bold border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                      >
                        {editingCommitteeIdx !== null ? '✓ Save Committee Group' : '+ Complete Committee Group'}
                      </button>
                    </div>

                    {draftCommitteesList.length > 0 && (
                      <div className="border border-ink bg-zinc-50 p-2 space-y-1 rounded max-h-[160px] overflow-y-auto">
                        {draftCommitteesList.map((com, index) => (
                          <div key={index} className="p-2 border border-ink/10 bg-white leading-normal rounded flex justify-between items-center text-[10px] font-mono">
                            <div>
                              <span>🏛️ <strong>{com.name}</strong> ({com.members.length} members added)</span>
                            </div>
                            <div className="flex gap-2 shrink-0 font-bold">
                              <button type="button" onClick={() => {
                                setEditingCommitteeIdx(index);
                                setDraftCommitteeName(com.name);
                                setDraftCommitteeMembers(com.members || []);
                              }} className="text-brand-blue hover:underline">edit</button>
                              <button type="button" onClick={() => {
                                const targetCom = draftCommitteesList[index];
                                if (eventToEdit && targetCom && targetCom.members) {
                                  targetCom.members.forEach((m: any) => {
                                    if (m && m.name) {
                                      fetch('/api/lms/sync/event-member', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${token || ""}`,
                                        },
                                        body: JSON.stringify({
                                          eventId: eventToEdit._id || eventToEdit.slug,
                                          name: m.name,
                                          entityType: 'committee',
                                          action: 'remove'
                                        })
                                      }).catch(err => console.error("Could not sync event committee group removal", err));
                                    }
                                  });
                                }
                                setDraftCommitteesList(draftCommitteesList.filter((_, i) => i !== index));
                              }} className="text-brand-orange">&times;</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 8. CONTACT PAGE TYPE */}
              {newPageType === 'contact' && (
                <div className="space-y-3 p-4 border border-ink bg-white font-sans animate-fade-in">
                  <div className="font-bold text-[10px] text-brand-orange uppercase font-mono">Manage Contact Representatives</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-mono">Representative Name</label>
                      <input type="text" placeholder="e.g. Dr. A. Kumar" className="w-full p-2 border border-ink bg-paper text-xs" value={draftContactName} onChange={e => setDraftContactName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-mono">Affiliation Designations</label>
                      <input type="text" placeholder="e.g. Summit Convenor" className="w-full p-2 border border-ink bg-paper text-xs" value={draftContactDesignation} onChange={e => setDraftContactDesignation(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-mono">Support Email</label>
                      <input type="email" placeholder="e.g. helper@codin.org" className="w-full p-2 border border-ink bg-paper text-xs font-mono" value={draftContactEmail} onChange={e => setDraftContactEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-1 font-mono">Phone Helpline No.</label>
                      <input type="text" placeholder="e.g. +91 11 2659..." className="w-full p-2 border border-ink bg-paper text-xs font-mono" value={draftContactPhone} onChange={e => setDraftContactPhone(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 text-right font-mono">
                    {editingContactIdx !== null && (
                      <button type="button" onClick={() => { setEditingContactIdx(null); setDraftContactName(''); setDraftContactDesignation(''); setDraftContactEmail(''); setDraftContactPhone(''); }} className="px-3 py-1 bg-white text-ink border border-ink text-[9px] uppercase font-bold">Cancel</button>
                    )}
                    <button type="button" onClick={() => {
                      if (!draftContactName || !draftContactEmail) { alert('Representative name and support email are required.'); return; }
                      const record = { name: draftContactName, designation: draftContactDesignation, email: draftContactEmail, phone: draftContactPhone };
                      if (editingContactIdx !== null) {
                        const copy = [...draftContactList];
                        copy[editingContactIdx] = record;
                        setDraftContactList(copy);
                        setEditingContactIdx(null);
                      } else {
                        setDraftContactList([...draftContactList, record]);
                      }
                      setDraftContactName(''); setDraftContactDesignation(''); setDraftContactEmail(''); setDraftContactPhone('');
                    }} className="px-3 py-1 bg-brand-blue text-white text-[9px] uppercase font-bold border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      {editingContactIdx !== null ? '✓ Save Contact' : '+ Add Contact Representative'}
                    </button>
                  </div>

                  {draftContactList.length > 0 && (
                    <div className="mt-2 divide-y divide-ink/10 border border-ink/20 max-h-[160px] overflow-y-auto bg-stone-50 p-2 space-y-1 rounded">
                      {draftContactList.map((cont, idx) => (
                        <div key={idx} className="p-2 border border-ink/10 bg-white flex justify-between items-center text-[10px] font-mono leading-tight">
                          <span>{cont.name} (<strong>{cont.designation}</strong>) - {cont.email} {cont.phone ? `(${cont.phone})` : ''}</span>
                          <div className="flex gap-2 shrink-0 font-bold">
                            <button type="button" onClick={() => {
                              setEditingContactIdx(idx);
                              setDraftContactName(cont.name);
                              setDraftContactDesignation(cont.designation);
                              setDraftContactEmail(cont.email);
                              setDraftContactPhone(cont.phone || '');
                            }} className="text-brand-blue hover:underline">edit</button>
                            <button type="button" onClick={() => setDraftContactList(draftContactList.filter((_, i) => i !== idx))} className="text-brand-orange hover:text-ink">&times;</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* COMPREHENSIVE ADD ACTIONS SECTIONS */}
              <div className="flex justify-end gap-2 border-t border-ink/15 pt-3 font-mono">
                {editingPageSlug && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingPageSlug(null);
                      setNewPageTitle('');
                      setNewPageSlug('');
                      setNewPageType('markdown');
                      setNewPageTeaser('');
                      setNewPageMarkdown('');
                      setDraftDatesList([]);
                      setDraftScheduleList([]);
                      setDraftFeesList([]);
                      setRegDeadlineText('');
                      setDraftInstructionsList([]);
                      setDraftListList([]);
                      setDraftLogisticsList([]);
                      setDraftCommitteesList([]);
                      setDraftContactList([]);
                    }} 
                    className="px-4 py-2 bg-paper text-ink text-[10px] uppercase font-bold border border-ink"
                  >
                    Cancel Editing
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={handleAddOrSaveDossierTab} 
                  className="px-6 py-2 bg-brand-acid text-ink text-[10px] leading-relaxed uppercase border border-ink shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] font-bold"
                >
                  {editingPageSlug ? 'Update Page / Tab 💾' : 'Draft Page / Tab +'}
                </button>
              </div>
            </div>

            {/* PRESENT TABS DETAILED COORDINATES INFO */}
            <div className="mt-4 p-4 border border-dashed border-ink bg-stone-50 rounded">
              <span className="block text-[8px] font-black uppercase text-brand-orange mb-1 font-mono">Editor Coordinates Matrix</span>
              <p className="text-[10px] leading-relaxed text-ink/70">
                You can rearrange active chapters and headings using the <strong>interactive arrows (&larr; &amp; &rarr;)</strong> in the chapters tabs bar above. Re-ordering chapters here automatically updates the active agenda rendering sequence for attendees. Make sure to click <strong>&ldquo;Update Page / Tab 💾&rdquo;</strong> to save any updates back to the selected chapter.
              </p>
            </div>
          </div>
          )}

          {/* DISCARD/SAVE ACTION ROW */}
          <div className="flex justify-end gap-4 pt-4 font-mono">
            {isUploadingCloudinary && (
              <span className="text-[10px] text-brand-orange font-bold animate-pulse pr-4 self-center uppercase tracking-wider">{cloudinaryProgress || 'Image file streaming to database cloud...'}</span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-ink hover:bg-paper cursor-pointer font-bold uppercase text-[10px]"
            >
              Discard Draft
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-brand-orange border border-ink text-white font-serif font-bold uppercase tracking-widest hover:bg-brand-acid hover:text-ink transition-all shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] cursor-pointer"
            >
              {eventToEdit ? "Save Event Modifications &rarr;" : "Publish Agenda Event &rarr;"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
