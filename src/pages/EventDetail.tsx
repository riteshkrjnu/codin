/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  useParams,
  Link,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import {
  events as defaultEvents,
  centres,
  team,
  projects,
} from "../data/config";
import { useLatestPeople, resolvePersonImage } from "../lib/peopleOverrides";
import { cn, renderMarkdown } from "../lib/utils";
import { getEffectiveStatus } from "../lib/courseStatus";
import { useAuth } from "../context/AuthContext";
import { MarkdownMediaHelper } from "../components/MarkdownMediaHelper";
import { read, utils } from "xlsx";
import EventFormModal from "../components/EventFormModal";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ArrowUpRight,
  BookOpen,
  Clock,
  Landmark,
  User,
  Briefcase,
  Zap,
  Megaphone,
  CreditCard,
  Users,
  Mail,
  UserCheck,
  CalendarRange,
  Award,
  Milestone,
  Compass,
  ShieldAlert,
  Contact,
  Atom,
  Inbox,
  ShieldCheck,
  Map,
  Code,
  Users2,
  HelpCircle,
  AlertCircle,
  Upload,
  Plus,
  Trash2,
  Play,
  FileText,
  ExternalLink,
  Shield,
  Lock,
  Check,
  Edit3,
  Save,
  X,
  RefreshCw,
} from "lucide-react";

const iconMap: Record<string, any> = {
  Megaphone,
  Calendar,
  Clock,
  CreditCard,
  BookOpen,
  MapPin,
  Users,
  Mail,
  UserCheck,
  CalendarRange,
  Award,
  Milestone,
  Compass,
  ShieldAlert,
  Contact,
  Atom,
  Inbox,
  ShieldCheck,
  Map,
  Code,
  User,
  Landmark,
  Briefcase,
  Zap,
  AlertCircle,
};

function getIcon(name: string) {
  return iconMap[name] || HelpCircle;
}

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

export default function EventDetail() {
  const peopleList = useLatestPeople();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const token = user?.token;

  const [event, setEvent] = useState<any>(null);
  const getVenueMapLink = () => {
    if (!event) return null;
    if (event.subPages && event.subPages.length > 0) {
      for (const sp of event.subPages) {
        if (sp.type === "logistics" && Array.isArray(sp.content)) {
          const found = sp.content.find((item: any) => item && item.link);
          if (found && found.link) {
            return found.link;
          }
        }
      }
    }
    return null;
  };
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTabSlug, setActiveTabSlug] = useState<string>("overview");

  const [activeScheduleDayIdx, setActiveScheduleDayIdx] = useState<number>(0);
  useEffect(() => {
    setActiveScheduleDayIdx(0);
  }, [activeTabSlug, slug]);

  // Participant status
  const [myStatus, setMyStatus] = useState<any>(null);
  const [simulateEnrolled, setSimulateEnrolled] = useState(() => {
    return (
      searchParams.get("simulate") === "enrolled" ||
      searchParams.get("simulateEnrolled") === "true"
    );
  });

  const effectiveMyStatus = simulateEnrolled
    ? {
        accepted: true,
        participant: {
          name: user?.name || "Simulation Instructor",
          affiliation: "World 2 Multi-LMS",
          admissionStatus: "Confirmed",
          paymentStatus: "Confirmed",
          fee: "0",
          paymentDeadline: "N/A",
        },
      }
    : myStatus;
  const [payingFee, setPayingFee] = useState(false);
  const [enrollingMaterials, setEnrollingMaterials] = useState(false);

  // Organizer Panel Lists
  const [participantsList, setParticipantsList] = useState<any[]>([]);
  const [totalReceived, setTotalReceived] = useState(0);
  const [isCohortPublished, setIsCohortPublished] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);

  // New Participant manual form
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualAffiliation, setManualAffiliation] = useState("");
  const [manualFee, setManualFee] = useState(1500);
  const [manualDeadline, setManualDeadline] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);

  // Inline edit state for participants
  const [editingParticipantId, setEditingParticipantId] = useState<
    string | null
  >(null);
  const [editName, setEditName] = useState("");
  const [editAffiliation, setEditAffiliation] = useState("");
  const [editFee, setEditFee] = useState<number>(0);

  // Bulk selection state
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);

  // Courseware Session Manager States
  const [activeMaterial, setActiveMaterial] = useState<any>(null);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionDesc, setNewSessionDesc] = useState("");
  const [addingSession, setAddingSession] = useState(false);

  // New material form states
  const [activeModuleForMaterial, setActiveModuleForMaterial] = useState<
    string | null
  >(null);
  const [matTitle, setMatTitle] = useState("");
  const [matType, setMatType] = useState("pdf");
  const [matUrl, setMatUrl] = useState("");
  const [matText, setMatText] = useState("");

  // Helpers for automated event status tracking and formatted dates
  const formatEventDates = (startStr: string, endStr: string): string => {
    if (!startStr) return "";
    if (!endStr) {
      const s = new Date(startStr);
      return s.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    const s = new Date(startStr);
    const e = new Date(endStr);

    const sMonth = s.toLocaleDateString("en-US", { month: "long" });
    const eMonth = e.toLocaleDateString("en-US", { month: "long" });
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
    return `${sMonth} ${sDay}, ${sYear} - ${eMonth} ${eDay}, ${eYear}`;
  };

  const calculateEventStatus = (startStr: string, endStr: string): string => {
    if (!startStr) return "Upcoming";
    const now = new Date();
    const s = new Date(startStr);
    const e = endStr ? new Date(endStr) : s;

    // Set times to midnight for day-based comparison
    now.setHours(0, 0, 0, 0);
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);

    if (now < s) {
      return "Upcoming";
    } else if (now >= s && now <= e) {
      return "Ongoing";
    } else {
      return "Archived";
    }
  };

  const toggleSelection = (slug: string, pool: string[], setter: Function) => {
    if (pool.includes(slug)) {
      setter(pool.filter((x) => x !== slug));
    } else {
      setter([...pool, slug]);
    }
  };

  // Edit Event Modal Form states
  const [showEditModal, setShowEditModal] = useState(false);
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
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("Conference");
  const [eventDates, setEventDates] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventStatus, setEventStatus] = useState("Upcoming");
  const [eventDesc, setEventDesc] = useState("");
  const [eventLongDesc, setEventLongDesc] = useState("");
  const [eventImage, setEventImage] = useState(
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
  );
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [customTypeInput, setCustomTypeInput] = useState("");

  // Selected multi-choices
  const [selectedCentres, setSelectedCentres] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);

  // Page highlights / registrationCard customizable parts
  const [regTitle, setRegTitle] = useState("Secure Your Spot");
  const [regDesc, setRegDesc] = useState(
    "Exclusive cohort limited to 15 participants for deep mentorship.",
  );
  const [regBtnText, setRegBtnText] = useState("Apply for Admission");
  const [regBtnLink, setRegBtnLink] = useState("");
  const [regHighlights, setRegHighlights] = useState(
    "Intensive study track, Industry mentorship, Certifications",
  );

  // Customizable subPages
  const [customPages, setCustomPages] = useState<any[]>([]);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [newPageType, setNewPageType] = useState("markdown");
  const [newPageTeaser, setNewPageTeaser] = useState("");
  const [newPageMarkdown, setNewPageMarkdown] = useState("");
  const [editingPageSlug, setEditingPageSlug] = useState<string | null>(null);

  // Tab content accumulators
  const [dtLabel, setDtLabel] = useState("");
  const [dtDate, setDtDate] = useState("");
  const [dtFootnote, setDtFootnote] = useState("");
  const [dtHighlighted, setDtHighlighted] = useState(false);
  const [draftDatesList, setDraftDatesList] = useState<any[]>([]);

  const [scTime, setScTime] = useState("");
  const [scTopic, setScTopic] = useState("");
  const [scSpeaker, setScSpeaker] = useState("");
  const [draftScheduleList, setDraftScheduleList] = useState<any[]>([]);

  const [regDeadlineText, setRegDeadlineText] = useState("");
  const [regFeeCategory, setRegFeeCategory] = useState("");
  const [regFeeValue, setRegFeeValue] = useState("");
  const [draftFeesList, setDraftFeesList] = useState<any[]>([]);
  const [regInstructionInput, setRegInstructionInput] = useState("");
  const [draftInstructionsList, setDraftInstructionsList] = useState<string[]>(
    [],
  );

  const [liName, setLiName] = useState("");
  const [liAffiliation, setLiAffiliation] = useState("");
  const [liRole, setLiRole] = useState("");
  const [draftListList, setDraftListList] = useState<any[]>([]);

  // Logistics details architecture
  const [draftLogisticsKey, setDraftLogisticsKey] = useState("");
  const [draftLogisticsValue, setDraftLogisticsValue] = useState("");
  const [draftLogisticsLink, setDraftLogisticsLink] = useState("");
  const [draftLogisticsList, setDraftLogisticsList] = useState<any[]>([]);

  // Editing indices for dynamic structures list editing
  const [editingDateIdx, setEditingDateIdx] = useState<number | null>(null);
  const [editingScheduleIdx, setEditingScheduleIdx] = useState<number | null>(
    null,
  );
  const [editingFeesIdx, setEditingFeesIdx] = useState<number | null>(null);
  const [editingInstructionsIdx, setEditingInstructionsIdx] = useState<
    number | null
  >(null);
  const [editingListListIdx, setEditingListListIdx] = useState<number | null>(
    null,
  );
  const [editingLogisticsIdx, setEditingLogisticsIdx] = useState<number | null>(
    null,
  );
  const [editingCommitteeMemberIdx, setEditingCommitteeMemberIdx] = useState<
    number | null
  >(null);
  const [editingCommitteeIdx, setEditingCommitteeIdx] = useState<number | null>(
    null,
  );
  const [editingContactIdx, setEditingContactIdx] = useState<number | null>(
    null,
  );

  // Presenters State Management (Requirement 2 & 5)
  const [draftPresenters, setDraftPresenters] = useState<any[]>([]);
  const [presIsExternal, setPresIsExternal] = useState(false);
  const [presStaffSlug, setPresStaffSlug] = useState("");
  const [presName, setPresName] = useState("");
  const [presPhotoUrl, setPresPhotoUrl] = useState("");
  const [presProfileUrl, setPresProfileUrl] = useState("");
  const [presRole, setPresRole] = useState("");
  const [editingPresenterIdx, setEditingPresenterIdx] = useState<number | null>(
    null,
  );

  // Governing Committees list architecture
  const [draftCommitteeName, setDraftCommitteeName] = useState("");
  const [draftCommitteeMembers, setDraftCommitteeMembers] = useState<any[]>([]);
  const [draftCommitteeMemberName, setDraftCommitteeMemberName] = useState("");
  const [draftCommitteeMemberAffiliation, setDraftCommitteeMemberAffiliation] =
    useState("");
  const [draftCommitteeMemberRole, setDraftCommitteeMemberRole] = useState("");
  const [draftCommitteesList, setDraftCommitteesList] = useState<any[]>([]);

  // Contact Representatives architecture
  const [draftContactName, setDraftContactName] = useState("");
  const [draftContactDesignation, setDraftContactDesignation] = useState("");
  const [draftContactEmail, setDraftContactEmail] = useState("");
  const [draftContactPhone, setDraftContactPhone] = useState("");
  const [draftContactList, setDraftContactList] = useState<any[]>([]);

  // Cloudinary image upload states
  const [isUploadingCloudinary, setIsUploadingCloudinary] = useState(false);
  const [cloudinaryProgress, setCloudinaryProgress] = useState("");

  const uploadToCloudinary = async ({ dataUrl }: { dataUrl: string }) => {
    setIsUploadingCloudinary(true);
    setCloudinaryProgress("Initializing image stream...");
    try {
      const res = await fetch("/api/upload-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok)
        throw new Error("Proxy Cloudinary server response exception");
      const data = await res.json();
      setCloudinaryProgress("Success!");
      return data.url;
    } catch (err) {
      console.error(err);
      alert("Cloudinary local files proxy failed: " + String(err));
    } finally {
      setIsUploadingCloudinary(false);
      setCloudinaryProgress("");
    }
    return "";
  };

  const handleEditEventClick = () => {
    setShowEditModal(true);
  };

  const handleMoveCustomPage = (idx: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= customPages.length) return;
    const copy = [...customPages];
    const temp = copy[idx];
    copy[idx] = copy[newIdx];
    copy[newIdx] = temp;
    setCustomPages(copy);
  };

  const handleStartEditDraftedPage = (cp: any) => {
    setEditingPageSlug(cp.slug);
    setNewPageTitle(cp.title);
    setNewPageSlug(cp.slug);
    setNewPageType(cp.type);

    if (cp.type === "markdown") {
      setNewPageTeaser(cp.content?.teaser || "");
      setNewPageMarkdown(cp.content?.markdown || "");
    } else if (cp.type === "dates") {
      setDraftDatesList(cp.content || []);
    } else if (cp.type === "schedule") {
      setDraftScheduleList(cp.content || []);
    } else if (cp.type === "registration") {
      setRegDeadlineText(cp.content?.deadline || "");
      setDraftFeesList(cp.content?.fees || []);
      setDraftInstructionsList(cp.content?.instructions || []);
    } else if (cp.type === "list") {
      setDraftListList(cp.content || []);
    } else if (cp.type === "logistics") {
      const mappedLogistics = Object.entries(cp.content || {}).map(
        ([key, value]) => ({
          key,
          value: value,
        }),
      );
      setDraftLogisticsList(mappedLogistics);
    } else if (cp.type === "committees") {
      setDraftCommitteesList(cp.content || []);
    } else if (cp.type === "contact") {
      setDraftContactList(cp.content || []);
    }
  };

  // Check if active user is an organizer / instructor for this event
  const isOrganizer =
    user &&
    (user.role === "superadmin" ||
      user.role === "admin" ||
      event?.associatedPeople?.includes(user._id) ||
      event?.instructors?.some((inst: any) => inst.user === user._id) ||
      event?.tas?.some((t: any) => t.user === user._id));

  const getEventApiUrl = (idOrSlug: string) => {
    const isCourseParam =
      searchParams.get("isCourse") === "true" || event?.isCourse;
    return `/api/events/${idOrSlug}${isCourseParam ? "?isCourse=true" : ""}`;
  };

  // Load Event and Participant logic
  async function loadEventAndStatus() {
    try {
      setLoading(true);
      const isCourseParam = searchParams.get("isCourse") === "true";
      const res = await fetch(
        `/api/events/${slug}${isCourseParam ? "?isCourse=true" : ""}`,
      );
      const data = await res.json();
      if (data.event) {
        setEvent(data.event);
        if (data.event.modulesList && data.event.modulesList.length > 0) {
          const firstMod = data.event.modulesList[0];
          if (firstMod.materials && firstMod.materials.length > 0) {
            setActiveMaterial(firstMod.materials[0]);
          }
        }
      } else {
        const fallback = defaultEvents.find((e) => e.slug === slug);
        setEvent(fallback || null);
      }
    } catch (err) {
      console.error("Failed to load event dynamic data, using fallback", err);
      const fallback = defaultEvents.find((e) => e.slug === slug);
      setEvent(fallback || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEventAndStatus();
  }, [slug]);

  // Load User specific acceptance status
  async function loadUserStatus() {
    if (!token || !slug) return;
    try {
      const res = await fetch(`/api/events/${slug}/my-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.accepted) {
        setMyStatus(data);
      } else {
        setMyStatus(null);
      }
    } catch (err) {
      console.error("Failed to check candidate status:", err);
    }
  }

  // Load complete lists for administrators / organizers
  async function loadOrganizerLists() {
    if (!token || !slug) return;
    try {
      const res = await fetch(`/api/events/${slug}/participants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setParticipantsList(data.participants);
        setTotalReceived(data.totalReceived);
        const anyPublished = data.participants.some((p: any) => p.isPublished);
        setIsCohortPublished(anyPublished);
      }
    } catch (err) {
      console.error("Failed to fetch participant rosters:", err);
    }
  }

  useEffect(() => {
    loadUserStatus();
    if (isOrganizer) {
      loadOrganizerLists();
    }
  }, [slug, token, isOrganizer]);

  // URL query tab override e.g. ?tab=sessions
  useEffect(() => {
    const override = searchParams.get("tab");
    if (override) {
      setActiveTabSlug(override);
    }
  }, [searchParams]);

  // Handle Event simulated Payment
  const handlePayFee = async () => {
    if (!token) return;
    try {
      setPayingFee(true);
      const res = await fetch(`/api/events/${slug}/pay-fee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        alert("Payment Simulated Successfully! Your slot is now Confirmed.");
        loadUserStatus();
        loadEventAndStatus(); // reload outline files
      } else {
        alert("Payment Error: " + data.error);
      }
    } catch (err) {
      alert("Checkout platform failed: " + String(err));
    } finally {
      setPayingFee(false);
    }
  };

  // Self-enroll directly for materials access
  const handleEnrollMaterials = async () => {
    if (!token) {
      alert(
        "Please login or register first to enroll in this completed course / access materials.",
      );
      return;
    }
    try {
      setEnrollingMaterials(true);
      const res = await fetch(`/api/events/${slug}/enroll-materials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        alert("Enrollment Complete! Simulated payment processed successfully.");
        loadUserStatus();
        loadEventAndStatus();
        if (event?.isCourse || event?.type?.includes("Residential")) {
          navigate(`/academy/online/${event?.slug}`);
        } else {
          setActiveTabSlug("sessions");
        }
      } else {
        alert("Enrollment Error: " + data.error);
      }
    } catch (err) {
      alert("Failed to enroll: " + String(err));
    } finally {
      setEnrollingMaterials(false);
    }
  };

  // Drag & drop excel parsing
  const handleExcelParser = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingExcel(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const data = new Uint8Array(arrayBuffer);

        let jsonData: any[] = [];

        // Attempt standard XLSX parse
        try {
          const wb = read(data, { type: "array" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          jsonData = utils.sheet_to_json(ws);
        } catch (wbErr) {
          console.warn(
            "XLSX direct array reading skipped or failed, using CSV fallback:",
            wbErr,
          );
        }

        // CSV parsing fallback for raw text or if array parsing was empty
        if (!jsonData || jsonData.length === 0 || file.name.endsWith(".csv")) {
          try {
            const textDecoder = new TextDecoder("utf-8");
            const csvText = textDecoder.decode(data);
            const lines = csvText
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter((line) => line.length > 0);
            if (lines.length >= 2) {
              const headers = lines[0]
                .split(",")
                .map((h) => h.trim().replace(/^["']|["']$/g, ""));
              const parsedRows = [];
              for (let i = 1; i < lines.length; i++) {
                const row = lines[i];
                const values: string[] = [];
                let insideQuote = false;
                let currentVal = "";
                for (let j = 0; j < row.length; j++) {
                  const char = row[j];
                  if (char === '"' || char === "'") {
                    insideQuote = !insideQuote;
                  } else if (char === "," && !insideQuote) {
                    values.push(currentVal.trim().replace(/^["']|["']$/g, ""));
                    currentVal = "";
                  } else {
                    currentVal += char;
                  }
                }
                values.push(currentVal.trim().replace(/^["']|["']$/g, ""));

                const obj: any = {};
                headers.forEach((h, idx) => {
                  if (h) {
                    obj[h] = values[idx] || "";
                  }
                });
                parsedRows.push(obj);
              }
              if (parsedRows.length > 0) {
                jsonData = parsedRows;
              }
            }
          } catch (csvErr) {
            console.error("CSV string decode fallback failed:", csvErr);
          }
        }

        if (!jsonData || jsonData.length === 0) {
          alert(
            "Parsed spreadsheet contains 0 records or has invalid format. Please ensure headers are correct.",
          );
          return;
        }

        const res = await fetch(`/api/events/${slug}/participants/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ participants: jsonData }),
        });
        const rdata = await res.json();
        if (rdata.success) {
          alert(
            `Success! Imported ${rdata.count} candidates to the event registry.`,
          );
          loadOrganizerLists();
        } else {
          alert("Registry upload failed: " + rdata.error);
        }
      } catch (err) {
        console.error(err);
        alert(
          "Error parsing file. Ensure it is a valid Excel/CSV spreadsheet format.",
        );
      } finally {
        setUploadingExcel(false);
        // Clear value to allow re-selection
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Add Participant manually
  const handleAddParticipantManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail) return;

    try {
      setAddingParticipant(true);
      const res = await fetch(`/api/events/${slug}/participants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: manualEmail,
          name: manualName,
          affiliation: manualAffiliation,
          fee: manualFee,
          paymentDeadline: manualDeadline,
          paymentStatus: "Pending",
          admissionStatus: "Pending",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Manual applicant added successfully!");
        setManualEmail("");
        setManualName("");
        setManualAffiliation("");
        loadOrganizerLists();
      } else {
        alert("Failed to insert: " + data.error);
      }
    } catch (e) {
      alert("Server failure: " + String(e));
    } finally {
      setAddingParticipant(false);
    }
  };

  // Toggle dynamic paid status manually
  const toggleParticipantStatus = async (
    pId: string,
    currentStatus: string,
    feeAmount: number,
  ) => {
    try {
      const nextStatus =
        currentStatus === "Confirmed" ? "Pending" : "Confirmed";
      const paidValue = nextStatus === "Confirmed" ? feeAmount : 0;

      const res = await fetch(`/api/events/${slug}/participants/${pId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentStatus: nextStatus,
          amountPaid: paidValue,
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadOrganizerLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle dynamic admission status manually
  const toggleAdmissionStatus = async (pId: string, currentStatus: string) => {
    try {
      const nextStatus =
        currentStatus === "Confirmed" ? "Pending" : "Confirmed";
      const res = await fetch(`/api/events/${slug}/participants/${pId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ admissionStatus: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        loadOrganizerLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Remove participant registration
  const deleteParticipantRow = async (pId: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this applicant from the accepted roster?",
      )
    )
      return;
    try {
      const res = await fetch(`/api/events/${slug}/participants/${pId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        // Remove from selection if deleted
        setSelectedParticipantIds((prev) => prev.filter((id) => id !== pId));
        loadOrganizerLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Inline editing actions
  const startEditingParticipant = (p: any) => {
    setEditingParticipantId(p._id);
    setEditName(p.name || "");
    setEditAffiliation(p.affiliation || "");
    setEditFee(p.fee || 0);
  };

  const cancelEditingParticipant = () => {
    setEditingParticipantId(null);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    pId: string,
  ) => {
    if (e.key === "Enter") {
      saveParticipantInline(pId);
    } else if (e.key === "Escape") {
      cancelEditingParticipant();
    }
  };

  const saveParticipantInline = async (pId: string) => {
    try {
      const res = await fetch(`/api/events/${slug}/participants/${pId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          affiliation: editAffiliation,
          fee: editFee,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingParticipantId(null);
        loadOrganizerLists();
      } else {
        alert("Failed to update participant: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving candidate edit");
    }
  };

  // Bulk operation actions
  const handleBulkAction = async (
    action: "markPaid" | "confirmAdmission" | "delete",
    value?: boolean,
  ) => {
    if (selectedParticipantIds.length === 0) {
      alert(
        "Please select at least one candidate from the checklist below to perform bulk actions.",
      );
      return;
    }

    if (action === "delete") {
      if (
        !confirm(
          `Are you absolutely sure you want to permanently delete all ${selectedParticipantIds.length} checked candidate records?`,
        )
      ) {
        return;
      }
    }

    try {
      const res = await fetch(`/api/events/${slug}/participants/bulk-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids: selectedParticipantIds,
          action,
          value,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedParticipantIds([]);
        loadOrganizerLists();
        alert("Bulk action executed successfully!");
      } else {
        alert("Bulk operation failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Server error occurred whilst applying bulk action.");
    }
  };

  // Toggle publish state
  const handleCohortPublication = async (publish: boolean) => {
    try {
      const res = await fetch(`/api/events/${slug}/participants/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ publish }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCohortPublished(publish);
        alert(
          publish
            ? "Cohort list is now published publicly!"
            : "Cohort list hidden from visitors.",
        );
        loadOrganizerLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Dynamic Module Session (Organizer tool)
  const handleAddSession = async () => {
    if (!newSessionTitle) return;
    try {
      setAddingSession(true);
      const updatedModules = [...(event.modulesList || [])];
      const newModId = "session_" + Date.now().toString();
      updatedModules.push({
        _id: newModId,
        title: newSessionTitle,
        description: newSessionDesc,
        materials: [],
      });

      const res = await fetch(getEventApiUrl(event._id || event.slug), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modulesList: updatedModules }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Session/Module created successfully!");
        setNewSessionTitle("");
        setNewSessionDesc("");
        setEvent(data.event);
      }
    } catch (e) {
      alert("Error adding module: " + String(e));
    } finally {
      setAddingSession(false);
    }
  };

  // Add Session Material Core
  const handleAddMaterial = async (modId: string) => {
    if (!matTitle) return;
    try {
      const updatedModules = (event.modulesList || []).map((m: any) => {
        if (m._id === modId) {
          const matArray = [...(m.materials || [])];
          matArray.push({
            _id: "mat_" + Date.now().toString(),
            title: matTitle,
            type: matType,
            url: matUrl,
            text: matText,
            group: "Core Session Deliverables",
          });
          return { ...m, materials: matArray };
        }
        return m;
      });

      const res = await fetch(getEventApiUrl(event._id || event.slug), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modulesList: updatedModules }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Asset uploaded successfully to session materials!");
        setMatTitle("");
        setMatUrl("");
        setMatText("");
        setActiveModuleForMaterial(null);
        setEvent(data.event);
      }
    } catch (e) {
      alert(String(e));
    }
  };

  // Delete material
  const handleDeleteMaterial = async (modId: string, matId: string) => {
    if (!confirm("Are you sure you want to delete this resource asset?"))
      return;
    try {
      const updatedModules = (event.modulesList || []).map((m: any) => {
        if (m._id === modId) {
          return {
            ...m,
            materials: (m.materials || []).filter((x: any) => x._id !== matId),
          };
        }
        return m;
      });

      const res = await fetch(getEventApiUrl(event._id || event.slug), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modulesList: updatedModules }),
      });
      const data = await res.json();
      if (data.success) {
        setEvent(data.event);
        if (activeMaterial?._id === matId) {
          setActiveMaterial(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete dynamic module folder
  const handleDeleteModule = async (modId: string) => {
    if (
      !confirm(
        "Delete this entire session module along with all its uploaded resources?",
      )
    )
      return;
    try {
      const updatedModules = (event.modulesList || []).filter(
        (m: any) => m._id !== modId,
      );
      const res = await fetch(getEventApiUrl(event._id || event.slug), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modulesList: updatedModules }),
      });
      const data = await res.json();
      if (data.success) {
        setEvent(data.event);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper py-24">
        <RefreshCw className="w-12 h-12 text-brand-orange animate-spin mb-4" />
        <span className="font-mono text-xs font-black uppercase tracking-widest text-ink/40">
          Securing dynamic handshake...
        </span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <h1 className="text-4xl font-serif font-black mb-4">
            Event Dossier Not Decoupled
          </h1>
          <Link
            to="/events"
            className="text-brand-blue font-mono font-bold uppercase tracking-widest hover:underline"
          >
            Back to All Events
          </Link>
        </div>
      </div>
    );
  }

  // Find linked entities
  const associatedCentres = centres.filter((c) =>
    event.associatedCentres?.includes(c.slug),
  );
  const associatedProjects = projects.filter((p) =>
    event.associatedProjects?.includes(p.slug),
  );
  const associatedPeople = peopleList.filter((t) =>
    event.associatedPeople?.includes(t.slug),
  );

  // Determine standard sub-pages/tabs list
  const tabsList = [
    ...((event.subPages && event.subPages.length > 0)
      ? event.subPages
      : [
          {
            slug: "overview",
            title: "Active Briefing",
            icon: "Megaphone",
            type: "markdown",
            content: { teaser: event.description, markdown: event.longDescription },
          },
        ]),
  ];

  // Append accepted cohort list if published publicly
  if (
    isCohortPublished &&
    !tabsList.some((t) => t.slug === "accepted-cohort")
  ) {
    tabsList.push({
      slug: "accepted-cohort",
      title: "Cohort Fellows",
      icon: "ShieldCheck",
      type: "list",
      content: participantsList
        .filter((p) => p.admissionStatus === "Confirmed")
        .map((p) => ({
          name: p.name,
          role: "Cohort Fellow",
          affiliation: p.affiliation,
        })),
    });
  }

  // Add Courseware & Session materials tab for confirmed attendees or organizers/TAs
  const hasCoursewareAccess =
    (effectiveMyStatus &&
      effectiveMyStatus.participant?.admissionStatus === "Confirmed") ||
    isOrganizer;
  const isCompletedCourse = event && getEffectiveStatus(event) === "Completed";
  // if (hasCoursewareAccess && !tabsList.some(t => t.slug === 'sessions')) {
  //   tabsList.push({
  //     slug: 'sessions',
  //     title: 'Sessions & Resources',
  //     icon: 'BookOpen',
  //     type: 'custom_materials',
  //     content: event.modulesList || []
  //   });
  // }

  // Add Organizer dashboard to tab bars of course instructors / admins
  if (isOrganizer && !tabsList.some((t) => t.slug === "organizer-controls")) {
    tabsList.push({
      slug: "organizer-controls",
      title: "Instructors / Admin Desk",
      icon: "Users",
      type: "organizer_dashboard",
      content: {},
    });
  }

  const activeTab =
    tabsList.find((t) => t.slug === activeTabSlug) ||
    tabsList[0] ||
    {
      slug: "overview",
      title: "Active Briefing",
      icon: "Megaphone",
      type: "markdown",
      content: { teaser: event.description, markdown: event.longDescription },
    };

  return (
    <div className="min-h-screen bg-paper pt-32 pb-24 px-6 lg:px-12 grid-structure">
      <div className="max-w-[1600px] mx-auto">
        {/* Helper custom alert message */}
        {searchParams.get("alertMsg") && (
          <div className="mb-8 p-5 border border-brand-orange bg-brand-orange/5 text-brand-orange font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-between gap-4 animate-fade-in shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3">
              <span className="text-sm">⚠️</span>
              <span>{searchParams.get("alertMsg")}</span>
            </div>
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete("alertMsg");
                navigate(url.pathname + url.search, { replace: true });
              }}
              className="text-[10px] underline uppercase hover:text-ink cursor-pointer font-black"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Course Simulation Dashboard */}
        {(isOrganizer ||
          searchParams.get("simulate") === "unenrolled" ||
          searchParams.get("simulate") === "enrolled") && (
          <div className="mb-12 p-6 border-2 border-dashed border-brand-orange bg-brand-orange/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] animate-fade-in">
            <div className="max-w-2xl text-left">
              <h4 className="font-mono text-xs font-black uppercase tracking-widest text-brand-orange flex items-center gap-2">
                ⚠️ COURSE SIMULATOR SYSTEM: INSTRUCTOR PLAYGROUND
              </h4>
              <p className="text-[10px] text-ink/75 font-mono mt-2 leading-relaxed uppercase">
                You are previewing this residency course iteration as an authorized instructor/organizer. Toggle the interactive simulator controls below to review the student onboarding pipeline.
              </p>
            </div>
            <div className="flex gap-4 shrink-0">
              <button
                onClick={() => {
                  setSimulateEnrolled(false);
                  const url = new URL(window.location.href);
                  url.searchParams.set("simulate", "unenrolled");
                  navigate(url.pathname + url.search, { replace: true });
                }}
                className={`h-11 px-6 border border-ink font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  !simulateEnrolled
                    ? "bg-brand-orange text-white shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                    : "bg-paper hover:bg-brand-orange/10 text-ink"
                }`}
              >
                Unenrolled Preview
              </button>
              <button
                onClick={() => {
                  setSimulateEnrolled(true);
                  const url = new URL(window.location.href);
                  url.searchParams.set("simulate", "enrolled");
                  navigate(url.pathname + url.search, { replace: true });
                }}
                className={`h-11 px-6 border border-ink font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  simulateEnrolled
                    ? "bg-brand-orange text-white shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                    : "bg-paper hover:bg-brand-orange/10 text-ink"
                }`}
              >
                Simulated Enrolled View
              </button>
            </div>
          </div>
        )}

        {/* Navigation Action Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12 pb-6 border-b border-ink/10">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.3em] hover:text-brand-blue transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Events Agenda
          </Link>

          {isOrganizer && (
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleEditEventClick}
                className="h-10 px-5 border border-ink bg-brand-acid text-ink font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-ink hover:text-brand-acid transition-all cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-bold"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Event
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: "Permanently Delete Event",
                    message: `Are you absolutely sure you want to permanently delete "${event.title}"? This action is irreversible.`,
                    confirmText: "Delete Permanently",
                    cancelText: "Cancel",
                    isDangerous: true,
                    onConfirm: async () => {
                      try {
                        const res = await fetch(
                          getEventApiUrl(event._id || event.slug),
                          {
                            method: "DELETE",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                          },
                        );
                        const data = await res.json();
                        if (data.success) {
                          alert("Success! Event has been permanently deleted.");
                          window.location.href = "/events";
                        } else {
                          alert(
                            "Deletion failure: " +
                              (data.error || "Permission denied"),
                          );
                        }
                      } catch (err) {
                        console.error(err);
                        alert(
                          "Error connecting to backend delete route: " +
                            String(err),
                        );
                      } finally {
                        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                      }
                    },
                  });
                }}
                className="h-10 px-5 border border-ink bg-white hover:bg-brand-orange hover:text-white text-ink font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 text-brand-orange hover:text-white" />{" "}
                Delete Event
              </button>
            </div>
          )}
        </div>

        {/* Hero Area */}
        <div className="grid lg:grid-cols-2 gap-24 items-end mb-20 animate-fade-in">
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span
                className={`px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-widest border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                  event.status === "Upcoming"
                    ? "bg-brand-orange text-white"
                    : event.status === "Ongoing"
                      ? "bg-brand-acid text-ink animate-pulse"
                      : event.status === "Completed"
                        ? "bg-emerald-600 text-white"
                        : event.status === "Draft"
                          ? "bg-amber-400 text-ink"
                          : "bg-ink/10 text-ink/75 bg-paper"
                }`}
              >
                {event.status} Event
              </span>
              <div className="px-4 py-1 text-[10px] font-mono font-black uppercase tracking-widest bg-brand-acid text-ink border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] font-semibold">
                {event.type}
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-black leading-tight mb-12 text-left font-bold">
              {event.title}
            </h1>

            {/* Timings / Location Box */}
            <div className="border border-ink bg-white p-8 mb-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] grid sm:grid-cols-2 gap-8">
              <div className="space-y-2 text-left">
                <div className="font-mono text-[10px] font-black uppercase tracking-wider text-ink/30 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-brand-orange" /> Schedule
                  Gates
                </div>
                <p className="font-mono text-xs font-black uppercase text-ink">
                  {event.dates}
                </p>
              </div>
              <div className="space-y-2 text-left">
                <div className="font-mono text-[10px] font-black uppercase tracking-wider text-ink/30 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-brand-blue" /> Venue Hub
                </div>
                <p className="font-mono text-xs font-black uppercase text-ink">
                  {getVenueMapLink() ? (
                    <a
                      href={getVenueMapLink()!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-brand-blue inline-flex items-center gap-1"
                    >
                      {event.location} <span className="text-[9px]">📍</span>
                    </a>
                  ) : (
                    event.location
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="relative aspect-[16/10] lg:aspect-square border border-ink shadow-[20px_20px_0px_var(--color-brand-orange)] overflow-hidden bg-white group/banner">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
              referrerPolicy="no-referrer"
            />
            {isOrganizer && (
              <div className="absolute inset-0 bg-ink/75 opacity-0 group-hover/banner:opacity-100 transition-opacity flex flex-col justify-center items-center gap-4 p-6 z-10 font-mono text-xs">
                <p className="text-white uppercase font-black tracking-wider text-[11px]">
                  Banner Photograph Controls
                </p>
                <label className="px-4 py-2 border border-white bg-brand-orange text-white text-xs uppercase tracking-widest cursor-pointer shadow-[3px_3px_0px_rgba(255,255,255,1)] hover:bg-black font-black font-bold">
                  {isUploadingCloudinary
                    ? "Uploading Photo..."
                    : "Replace Photo 📷"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingCloudinary}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const dataUrl = reader.result as string;
                        const cloudUrl = await uploadToCloudinary({ dataUrl });
                        if (cloudUrl) {
                          try {
                            const res = await fetch(
                              getEventApiUrl(event._id || event.slug),
                              {
                                method: "PUT",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  ...event,
                                  image: cloudUrl,
                                }),
                              },
                            );
                            if (res.ok) {
                              alert(
                                "Success! Photograph uploaded & updated on system database.",
                              );
                              loadEventAndStatus();
                            } else {
                              alert(
                                "Photograph could not be synced to the database.",
                              );
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: "Permanently Delete Event",
                      message: `Are you absolutely sure you want to permanently delete "${event.title}"? This action is irreversible.`,
                      confirmText: "Delete Permanently",
                      cancelText: "Cancel",
                      isDangerous: true,
                      onConfirm: async () => {
                        try {
                          const res = await fetch(
                            getEventApiUrl(event._id || event.slug),
                            {
                              method: "DELETE",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                            },
                          );
                          const data = await res.json();
                          if (data.success) {
                            alert(
                              "Success! Event has been permanently deleted.",
                            );
                            window.location.href = "/events";
                          } else {
                            alert(
                              "Deletion failure: " +
                                (data.error || "Permission denied"),
                            );
                          }
                        } catch (err) {
                          console.error(err);
                          alert(
                            "Error connecting inside overlay: " + String(err),
                          );
                        }
                      },
                    });
                  }}
                  className="px-4 py-2 border border-white bg-red-600 text-white text-xs uppercase tracking-widest shadow-[3px_3px_0px_rgba(255,255,255,1)] hover:bg-black font-black font-bold"
                >
                  Delete Event 🗑️
                </button>
              </div>
            )}
            <div className="absolute top-4 right-4 bg-paper p-6 border border-ink shadow-[8px_8px_0px_rgba(0,0,0,1)]">
              <Zap className="w-12 h-12 text-ink opacity-20" />
            </div>
          </div>
        </div>

        {/* Executive summary block */}
        <div className="border-t border-ink pt-16 mb-20">
          <div className="max-w-4xl text-left">
            <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-6">
              Event Abstract & Core Directives
            </div>
            <p className="font-serif text-3xl font-medium leading-relaxed italic text-ink/90">
              {event.longDescription || event.description}
            </p>
          </div>
        </div>

        {/* Interactive Customizable Sub-Pages & Tabs Grid */}
        <div className="border-t border-ink pt-16">
          <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/40 mb-10 flex items-center gap-2">
            <span className="w-12 h-[1px] bg-ink/20" />
            Interactive Event Dossier & Customizable Chapters
          </div>

          <div className="grid lg:grid-cols-12 gap-16 items-start">
            {/* Sidebar Tab Control - 2 Cols */}
            <div className="lg:col-span-2 lg:sticky lg:top-24 max-h-[calc(100vh-140px)] overflow-y-auto">
              <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 scrollbar-none antialiased">
                {tabsList.map((tab) => {
                  const TabIcon = getIcon(tab.icon || "Megaphone");
                  const isActive = activeTab.slug === tab.slug;
                  return (
                    <button
                      key={tab.slug}
                      onClick={() => setActiveTabSlug(tab.slug)}
                      className={cn(
                        "flex items-center gap-3.5 px-5 py-4 border text-left font-mono text-[10px] uppercase tracking-wider font-black transition-all shrink-0 lg:shrink cursor-pointer",
                        isActive
                          ? "bg-ink text-paper border-ink border-2 shadow-[4px_4px_0px_var(--color-brand-acid)]"
                          : "bg-white hover:bg-brand-acid/15 border-ink/40 text-ink shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:border-ink hover:translate-x-0.5",
                      )}
                    >
                      <TabIcon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tab.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Connected Supervisor / Organiser Box on sidebar */}
              <div className="mt-12 hidden lg:grid gap-8 p-6 bg-white border border-ink/30 shadow-[4px_4px_0px_rgba(0,0,0,1)] text-left">
                <div>
                  <div className="text-[9px] font-mono font-black uppercase tracking-widest text-ink/30 mb-3">
                    Host Supervisor
                  </div>
                  {associatedCentres.map((c) => (
                    <Link
                      to={`/centres/${c.slug}`}
                      key={c.slug}
                      className="font-serif font-black text-xs hover:underline uppercase text-brand-blue tracking-tight hover:no-underline block mb-2 font-bold"
                    >
                      {c.shortName} / {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Active Tab Content Panel - 6 Cols */}
            <div className="lg:col-span-6 p-8 md:p-12 border-2 border-ink bg-white shadow-[12px_12px_0px_rgba(0,0,0,1)] min-h-[480px] flex flex-col justify-between">
              {/* Tab Header block */}
              <div>
                <div className="flex items-center gap-3.5 mb-10 pb-6 border-b border-ink/10 text-left">
                  <div className="p-3 bg-brand-acid text-ink border border-ink shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                    {(() => {
                      const ActiveIcon = getIcon(activeTab.icon || "Megaphone");
                      return <ActiveIcon className="w-5 h-5 text-ink" />;
                    })()}
                  </div>
                  <div>
                    <h2 className="font-serif text-3xl font-black text-ink uppercase leading-none font-bold">
                      {activeTab.title}
                    </h2>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 font-bold mt-1">
                      Event Document Segment // Section{" "}
                      {activeTab.slug.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Tab Content Router */}
                <div className="animate-fade-in text-left">
                  {/* type 1: markdown */}
                  {activeTab.type === "markdown" && (
                    <div className="space-y-6">
                      {activeTab.content.teaser && (
                        <p className="font-serif text-2xl italic leading-relaxed text-ink/80 border-l-4 border-brand-orange pl-6 mb-8 uppercase tracking-tight">
                          {activeTab.content.teaser}
                        </p>
                      )}
                      <div
                        className="prose max-w-none text-ink text-sm leading-relaxed bg-paper/50 p-6 border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(
                            activeTab.content.markdown || "",
                          ),
                        }}
                      />
                    </div>
                  )}

                  {/* type 2: dates */}
                  {activeTab.type === "dates" && (
                    <div className="space-y-6">
                      <div className="border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] divide-y divide-ink">
                        {activeTab.content.map((dt: any, idx: number) => (
                          <div
                            key={idx}
                            className={cn(
                              "p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-colors",
                              dt.highlighted
                                ? "bg-brand-acid/30"
                                : "hover:bg-paper/30",
                            )}
                          >
                            <div className="font-mono text-xs font-black uppercase tracking-wider text-ink">
                              {dt.label}
                            </div>
                            <div className="flex flex-col sm:items-end shrink-0">
                              <span className="font-mono text-xs font-black text-brand-orange uppercase bg-ink text-paper py-1 px-3 border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] font-semibold">
                                {dt.date}
                              </span>
                              {dt.footnote && (
                                <span className="font-mono text-[9px] text-ink/50 uppercase mt-1.5 font-black tracking-widest font-bold">
                                  {dt.footnote}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* type 3: schedule */}
                  {activeTab.type === "schedule" && (
                    <div className="space-y-8 text-left">
                      {(() => {
                        const contentObj = activeTab.content || {};
                        const isV2Format = contentObj && !Array.isArray(contentObj) && (contentObj.scheduleDays || contentObj.googleDriveLink || contentObj.document);

                        if (isV2Format) {
                          const { googleDriveLink, document, scheduleDays = [] } = contentObj;
                          return (
                            <div className="space-y-6">
                              {/* Document Downloader Widget */}
                              {document && (
                                <div className="p-4 border-2 border-ink bg-zinc-50 rounded flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                                  <div className="flex items-center gap-3">
                                    <div className="p-3 bg-brand-orange/10 border border-brand-orange text-brand-orange rounded">
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                      </svg>
                                    </div>
                                    <div className="text-left">
                                      <p className="font-bold text-[9px] font-mono uppercase text-brand-orange">Attached Document</p>
                                      <p className="font-serif text-sm font-black text-ink">{document.name}</p>
                                      {document.size && <p className="text-[10px] text-ink/55 font-mono">Size: {document.size}</p>}
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0 leading-none">
                                    <a 
                                      href={document.dataUrl} 
                                      download={document.name}
                                      className="flex-1 sm:flex-none text-center px-4 py-2.5 bg-brand-acid text-black border border-ink text-xs font-bold font-mono tracking-wider hover:-translate-x-[1px] hover:-translate-y-[1px] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all uppercase rounded-xs"
                                    >
                                      Download Material
                                    </a>
                                    {document.type === 'application/pdf' && (
                                      <a 
                                        href={document.dataUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 sm:flex-none text-center px-4 py-2.5 bg-white text-ink border border-ink text-xs font-bold font-mono tracking-wider hover:-translate-x-[1px] hover:-translate-y-[1px] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all uppercase rounded-xs"
                                      >
                                        Preview PDF File
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Google Drive Embedded Presentation Viewer */}
                              {googleDriveLink && (
                                <div className="border border-ink rounded overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-white">
                                  <div className="bg-ink text-paper p-3 px-4 font-mono text-[9px] uppercase tracking-widest flex items-center justify-between">
                                    <span className="font-bold">🌐 Embedded Google Drive Viewer</span>
                                    <a href={googleDriveLink} target="_blank" rel="noopener noreferrer" className="text-brand-acid hover:underline uppercase font-bold text-[8px]">Open in Tab &rarr;</a>
                                  </div>
                                  <div className="w-full aspect-[4/3] sm:aspect-[16/9] bg-stone-100">
                                    <iframe 
                                      src={getGoogleDriveEmbedUrl(googleDriveLink) || ''} 
                                      className="w-full h-full border-none" 
                                      allow="autoplay"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Hierarchical Schedule Days */}
                              <div className="space-y-6">
                                {scheduleDays.length === 0 ? (
                                  <div className="p-8 border border-ink border-dashed bg-white text-center font-mono text-xs text-ink/45">
                                    No scheduled day segments listed yet.
                                  </div>
                                ) : (
                                  <>
                                    {/* Day-wise tabs */}
                                    <div className="flex flex-wrap gap-2 border-b border-ink/10 pb-4 select-none mb-2">
                                      {scheduleDays.map((day: any, idx: number) => {
                                        const selectedDayIdx = activeScheduleDayIdx < scheduleDays.length ? activeScheduleDayIdx : 0;
                                        const isSelected = idx === selectedDayIdx;
                                        return (
                                          <button
                                            key={day.id || idx}
                                            type="button"
                                            onClick={() => setActiveScheduleDayIdx(idx)}
                                            className={`px-4 py-2 font-mono text-left tracking-wide border-2 transition-all cursor-pointer rounded-xs ${
                                              isSelected
                                                ? 'bg-brand-acid text-black border-ink shadow-[3px_3px_0px_rgba(0,0,0,1)] -translate-y-[1.5px]'
                                                : 'bg-white text-ink/75 border-ink/30 hover:border-ink hover:text-ink hover:bg-stone-50'
                                            }`}
                                          >
                                            <span className="block text-[8px] opacity-60 font-black tracking-normal uppercase mb-0.5">DAY {idx + 1}</span>
                                            <span className="font-bold text-xs">{day.date || `Day ${idx + 1}`}</span>
                                            {day.name && (
                                              <span className="block text-[8px] font-normal opacity-50 truncate max-w-[140px] lowercase">{day.name}</span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Selected Day View */}
                                    {(() => {
                                      const selectedDayIdx = activeScheduleDayIdx < scheduleDays.length ? activeScheduleDayIdx : 0;
                                      const day = scheduleDays[selectedDayIdx];
                                      if (!day) return null;
                                      return (
                                        <div key={day.id || selectedDayIdx} className="space-y-6 animate-fade-in text-left">
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-ink pb-3">
                                            <h3 className="font-serif text-xl sm:text-2xl font-black italic text-brand-orange flex items-center gap-2">
                                              <Calendar className="w-5 h-5 text-brand-orange shrink-0" />
                                              <span>{day.date}</span>
                                              {day.name && (
                                                <span className="hidden sm:inline-block font-mono text-[9px] text-ink bg-brand-acid border border-ink px-2 py-0.5 tracking-tight font-black uppercase rounded-xs ml-2 normal-case">
                                                  {day.name}
                                                </span>
                                              )}
                                            </h3>
                                            {day.name && (
                                              <div className="sm:hidden self-start">
                                                <span className="font-mono text-[9px] text-ink bg-brand-acid border border-ink px-2 py-0.5 tracking-tight font-black uppercase rounded-xs">
                                                  {day.name}
                                                </span>
                                              </div>
                                            )}
                                          </div>

                                          {/* Optional Day Description with Markdown support */}
                                          {day.description && (
                                            <div 
                                              className="p-5 border-2 border-ink bg-amber-50/20 text-xs text-ink/85 font-sans prose prose-sm max-w-none leading-relaxed shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-xs"
                                              dangerouslySetInnerHTML={{ __html: renderMarkdown(day.description) }} 
                                            />
                                          )}

                                          <div className="space-y-4">
                                            {day.sessions && day.sessions.map((session: any, sIdx: number) => (
                                              <div key={session.id || sIdx} className="border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)]">
                                                
                                                {/* Timeslot Header bar */}
                                                <div className="bg-zinc-50 border-b border-ink/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
                                                  <div className="flex flex-wrap items-center gap-2.5">
                                                    <span className="font-mono text-xs font-black uppercase tracking-wider text-brand-orange flex items-center gap-1.5 font-semibold">
                                                      <Clock className="w-4 h-4 text-brand-orange" />
                                                      {session.timeLabel}
                                                    </span>
                                                    {session.sessionName && (
                                                      <span className="font-serif font-black text-sm text-ink italic">
                                                        — &ldquo;{session.sessionName}&rdquo;
                                                      </span>
                                                    )}
                                                  </div>
                                                  {session.venue && (
                                                    <span className="font-mono text-[9px] text-brand-blue uppercase font-bold bg-brand-blue/5 border border-brand-blue/15 px-2.5 py-0.5 rounded flex items-center gap-1 leading-none self-start sm:self-auto">
                                                      <MapPin className="w-3.5 h-3.5" />
                                                      {session.venue}
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Sessions Nested list */}
                                                <div className="divide-y divide-ink/10">
                                                  {session.entries && session.entries.map((entry: any, eIdx: number) => (
                                                    <div key={entry.id || eIdx} className="p-5 text-left space-y-2">
                                                      <div>
                                                        <h4 className="font-serif text-lg font-black text-ink leading-snug">
                                                          {entry.topic}
                                                        </h4>
                                                        {entry.speaker && (
                                                          <span className="px-2.5 py-0.5 bg-brand-blue/10 text-brand-blue font-mono text-[9px] font-black uppercase tracking-wider border border-brand-blue/15 font-bold inline-block mt-1.5">
                                                            Led by: {entry.speaker}
                                                          </span>
                                                        )}
                                                      </div>
                                                      {entry.details && (
                                                        <div 
                                                          className="text-xs text-ink/75 font-sans prose prose-sm max-w-none leading-relaxed pl-3 border-l border-ink/15" 
                                                          dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.details) }} 
                                                        />
                                                      )}
                                                    </div>
                                                  ))}
                                                  {(!session.entries || session.entries.length === 0) && (
                                                    <div className="p-4 text-center font-mono text-[10px] text-ink/40">
                                                      No individual presentations assigned.
                                                    </div>
                                                  )}
                                                </div>

                                              </div>
                                            ))}
                                            {(!day.sessions || day.sessions.length === 0) && (
                                              <div className="p-6 text-center border-dashed border border-ink/10 font-mono text-xs text-ink/40">
                                                No parallel sessions declared.
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Legacies flat list rendering logic
                        const items = activeTab.content || event.schedule || [];
                        const grouped: { [key: string]: any[] } = {};
                        items.forEach((item: any) => {
                          const d = item.date || "General Schedule";
                          if (!grouped[d]) grouped[d] = [];
                          grouped[d].push(item);
                        });

                        const groupedEntries = Object.entries(grouped);

                        if (items.length === 0) {
                          return (
                            <div className="p-8 border border-ink border-dashed bg-white text-center font-mono text-xs text-ink/45">
                              No schedule segments configured yet.
                            </div>
                          );
                        }

                        // Tab index for legacy grouped entries
                        const selectedGroupIdx = activeScheduleDayIdx < groupedEntries.length ? activeScheduleDayIdx : 0;
                        const [selectedDate, dayItems] = groupedEntries[selectedGroupIdx] || [];

                        return (
                          <div className="space-y-6">
                            {groupedEntries.length > 1 && (
                              <div className="flex flex-wrap gap-1.5 border-b border-ink/20 pb-3">
                                {groupedEntries.map(([date], idx) => {
                                  const isSelected = idx === selectedGroupIdx;
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setActiveScheduleDayIdx(idx)}
                                      className={`px-3 py-1.5 font-mono font-black text-xs uppercase tracking-wide border-2 transition-all cursor-pointer rounded-xs select-none ${
                                        isSelected
                                          ? 'bg-brand-acid text-black border-ink shadow-[3px_3px_0px_rgba(0,0,0,1)] -translate-y-[1px]'
                                          : 'bg-white text-ink/75 border-ink/30 hover:border-ink hover:text-ink hover:bg-stone-50'
                                      }`}
                                    >
                                      <span className="block text-[8px] opacity-60 font-medium tracking-tight mb-0.5">DAY {idx + 1}</span>
                                      <span className="font-bold">{date}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {selectedDate && (
                              <div className="space-y-3 animate-fade-in">
                                <h3 className="font-serif text-xl font-black italic text-brand-orange border-b-2 border-ink pb-1 flex items-center gap-2">
                                  <Calendar className="w-5 h-5 text-brand-orange" />
                                  {selectedDate}
                                </h3>
                                <div className="border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] divide-y divide-ink">
                                  {dayItems.map((item: any, itemIdx: number) => (
                                    <div
                                      key={itemIdx}
                                      className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 hover:bg-brand-acid/10 transition-colors"
                                    >
                                      <div className="sm:w-1/4 shrink-0 font-mono text-xs font-black uppercase tracking-wider text-brand-orange flex items-center gap-1.5 font-semibold">
                                        <Clock className="w-4 h-4 text-brand-orange" />
                                        {item.time}
                                      </div>
                                      <div className="sm:w-3/4 text-left">
                                        <h4 className="font-serif text-xl font-black mb-1.5 text-ink leading-snug font-bold">
                                          {item.topic}
                                        </h4>
                                        {item.speaker && (
                                          <span className="px-2.5 py-1 bg-brand-blue/15 text-brand-blue font-mono text-[9px] font-black uppercase tracking-widest border border-brand-blue/20 font-bold inline-block mb-2">
                                            Led by: {item.speaker}
                                          </span>
                                        )}
                                        {item.details && (
                                          <div className="text-xs text-ink/70 mt-2 font-sans prose prose-sm leading-normal whitespace-pre-wrap">
                                            {item.details}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* type 4: registration / fees */}
                  {activeTab.type === "registration" && (
                    <div className="space-y-8">
                      {activeTab.content.deadline && (
                        <div className="p-4 border border-ink bg-brand-orange/15 text-ink flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-brand-orange animate-pulse" />
                          <div className="font-mono text-[10px] font-black uppercase tracking-wider">
                            Registration Threshold Gates:{" "}
                            <span className="bg-brand-orange text-white px-2 py-0.5 border border-ink ml-1.5 font-bold">
                              {activeTab.content.deadline}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] overflow-hidden">
                        <div className="border-b border-ink bg-brand-acid/40 px-6 py-4 font-mono text-[10px] font-black uppercase tracking-widest font-semibold">
                          Standard Registration Fee Schedules
                        </div>
                        <table className="w-full text-left font-mono text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-ink bg-paper/50">
                              <th className="p-4 uppercase font-black tracking-widest border-r border-ink text-[10px]">
                                Delegate Category
                              </th>
                              <th className="p-4 uppercase font-black tracking-widest text-[10px]">
                                Register Fee
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-ink">
                            {(activeTab.content.fees || []).map(
                              (fee: any, idx: number) => (
                                <tr key={idx} className="hover:bg-paper/50">
                                  <td className="p-4 border-r border-ink font-bold">
                                    {fee.category}
                                  </td>
                                  <td className="p-4 font-black text-brand-orange font-bold font-semibold">
                                    {fee.fee}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>

                      {activeTab.content.instructions && (
                        <div className="p-6 border border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                          <div className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/40 mb-4">
                            Compliance Protocols & RSVP Guidelines
                          </div>
                          <ul className="list-disc pl-5 font-mono text-xs text-ink/75 space-y-2.5 uppercase tracking-wide leading-relaxed">
                            {activeTab.content.instructions.map(
                              (ins: any, idx: number) => (
                                <li key={idx} className="font-semibold">
                                  {ins}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* type 5: lists / presenters cards layout */}
                  {activeTab.type === "list" && (
                    <div className="grid sm:grid-cols-2 gap-6">
                      {activeTab.content.map((pt: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-5 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] flex gap-4 items-start hover:bg-paper/30 transition-all text-left"
                        >
                          {resolvePersonImage(peopleList, pt.profileUrl || pt.name, pt.photoUrl || "") ? (
                            <img
                              src={resolvePersonImage(peopleList, pt.profileUrl || pt.name, pt.photoUrl || "")}
                              alt={pt.name}
                              className="w-16 h-16 object-cover border border-ink rounded-full shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-zinc-100"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full border border-ink bg-paper/50 flex items-center justify-center font-mono text-zinc-400 text-lg font-black shrink-0">
                              {pt.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {pt.profileUrl ? (
                              <a
                                href={pt.profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-serif text-lg font-black text-ink hover:text-brand-blue hover:underline leading-tight block mb-1"
                              >
                                {pt.name}
                              </a>
                            ) : (
                              <h4 className="font-serif text-lg font-black text-ink leading-tight mb-1">
                                {pt.name}
                              </h4>
                            )}
                            {pt.affiliation && (
                              <p className="font-mono text-[9px] text-zinc-500 uppercase font-black tracking-wider line-clamp-1 mb-2">
                                {pt.affiliation}
                              </p>
                            )}
                            {pt.role && (
                              <span className="inline-block px-2.5 py-0.5 bg-brand-orange/10 text-brand-orange font-mono text-[8px] font-black uppercase tracking-wider border border-brand-orange/20 rounded">
                                {pt.role}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* type 6: logistics */}
                  {activeTab.type === "logistics" && (
                    <div className="grid gap-6">
                      {Array.isArray(activeTab.content)
                        ? activeTab.content.map((log: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-6 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] text-left"
                            >
                              <div className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-brand-orange mb-3 flex items-center justify-between border-b border-ink/10 pb-2">
                                <span className="flex items-center gap-1.5 font-bold">
                                  <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                                  {log.key} Directives
                                </span>
                                {log.link && (
                                  <a
                                    href={log.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 bg-brand-blue text-white font-mono text-[9px] font-black uppercase tracking-widest border border-ink hover:bg-black hover:shadow-none transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] shrink-0 inline-flex items-center gap-1"
                                  >
                                    📍 Google Map Location
                                  </a>
                                )}
                              </div>
                              <div
                                className="prose prose-sm max-w-none text-ink/85 font-serif text-sm md:text-base leading-relaxed"
                                dangerouslySetInnerHTML={{
                                  __html: renderMarkdown(log.value || ""),
                                }}
                              />
                            </div>
                          ))
                        : Object.entries(activeTab.content).map(
                            ([key, value]: any) => (
                              <div
                                key={key}
                                className="p-6 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] text-left"
                              >
                                <div className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-brand-orange mb-3 flex items-center gap-1.5 border-b border-ink/10 pb-2">
                                  <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                                  {key} Directives
                                </div>
                                <div
                                  className="prose prose-sm max-w-none text-ink/85 font-serif text-sm md:text-base leading-relaxed"
                                  dangerouslySetInnerHTML={{
                                    __html: renderMarkdown(value || ""),
                                  }}
                                />
                              </div>
                            ),
                          )}
                    </div>
                  )}

                  {/* type 7: committees */}
                  {activeTab.type === "committees" && (
                    <div className="grid gap-8">
                      {activeTab.content.map((c: any, idx: number) => (
                        <div
                          key={idx}
                          className="border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] overflow-hidden animate-fade-in text-left"
                        >
                          <div className="text-xs font-mono font-black uppercase tracking-[0.2em] p-4 bg-ink text-paper flex items-center gap-2">
                            <Users className="w-4 h-4 text-brand-acid" />
                            {c.name}
                          </div>
                          <div className="p-6 grid sm:grid-cols-2 gap-6 bg-paper/10">
                            {(c.members || []).map(
                              (member: any, mIdx: number) => (
                                <div
                                  key={mIdx}
                                  className="p-4 border border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] flex gap-4 items-start hover:bg-paper/30 transition-all text-left"
                                >
                                  {resolvePersonImage(peopleList, member.profileUrl || member.name, member.photoUrl || "") ? (
                                    <img
                                      src={resolvePersonImage(peopleList, member.profileUrl || member.name, member.photoUrl || "")}
                                      alt={member.name}
                                      className="w-12 h-12 object-cover border border-ink rounded-full shrink-0 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] bg-zinc-100"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full border border-ink bg-zinc-50 flex items-center justify-center font-mono text-zinc-400 text-sm font-black shrink-0">
                                      {member.name.charAt(0)}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    {member.profileUrl ? (
                                      <a
                                        href={member.profileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-serif text-sm font-black text-ink hover:text-brand-blue hover:underline leading-tight block mb-0.5"
                                      >
                                        {member.name}
                                      </a>
                                    ) : (
                                      <h5 className="font-serif text-sm font-black text-ink leading-tight mb-0.5">
                                        {member.name}
                                      </h5>
                                    )}
                                    {member.affiliation && (
                                      <p className="font-mono text-[8px] text-zinc-500 uppercase tracking-wide line-clamp-1 mb-1.5">
                                        {member.affiliation}
                                      </p>
                                    )}
                                    <span className="inline-block bg-brand-acid/20 text-ink font-mono text-[8px] font-black uppercase border border-ink/20 px-2 py-0.2 rounded font-semibold">
                                      {member.role || "Member"}
                                    </span>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* type 8: contact */}
                  {activeTab.type === "contact" && (
                    <div className="grid sm:grid-cols-2 gap-6">
                      {activeTab.content.map((cont: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-6 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between group hover:bg-brand-acid/10 transition-all font-bold"
                        >
                          <div>
                            <div className="font-mono text-[10px] font-black uppercase text-brand-blue bg-brand-blue/10 px-2.5 py-1 inline-block border border-brand-blue/20 mb-4 font-bold">
                              {cont.designation}
                            </div>
                            <h4 className="font-serif text-xl font-black mb-1 text-ink font-bold">
                              {cont.name}
                            </h4>
                          </div>
                          <div className="mt-6 border-t border-ink/10 pt-4 space-y-2 font-mono text-[11px] font-semibold">
                            <div className="flex items-center gap-2">
                              <span className="text-ink/40">EMAIL:</span>
                              <a
                                href={`mailto:${cont.email}`}
                                className="text-brand-blue hover:underline text-xs"
                              >
                                {cont.email}
                              </a>
                            </div>
                            {cont.phone && (
                              <div className="flex items-center gap-2">
                                <span className="text-ink/40">PHONE:</span>
                                <span className="text-ink font-bold">
                                  {cont.phone}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* type 9: Courseware and Session materials player (Requirement 8) */}
                  {/*
                  {activeTab.type === 'custom_materials' && (
                    <div className="space-y-8 animate-fade-in">
                      <div className="p-4 border border-brand-blue bg-brand-blue/10 text-ink flex items-center gap-3">
                        <Award className="w-5 h-5 text-brand-blue shrink-0" strokeWidth={3} />
                        <div className="font-mono text-[10px] font-black uppercase tracking-wider leading-relaxed">
                          Participant Space secured successfully. Dive into interactive folders, reading matrices, research abstracts, and lecture streams.
                        </div>
                      </div>
                      */}
                  {/* Instructor Action: Module/Session Creator */}
                  {/*
                      {isOrganizer && (
                        <div className="p-6 border-2 border-dashed border-ink bg-paper shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                          <h4 className="font-mono text-[10px] font-black uppercase tracking-widest text-ink mb-4 flex items-center gap-1.5">
                            <Plus className="w-4 h-4 text-brand-orange" />
                            Instructor Panel: Incorporate New Module / Session Folder
                          </h4>
                          <div className="space-y-4">
                            <input 
                              type="text" 
                              placeholder="Session Title (e.g. Session 1: Ethical NLP Architectures)"
                              className="w-full p-3 border border-ink bg-white font-mono text-xs focus:outline-none"
                              value={newSessionTitle}
                              onChange={e => setNewSessionTitle(e.target.value)}
                            />
                            <textarea 
                              placeholder="Session Folder Description..."
                              rows={2}
                              className="w-full p-3 border border-ink bg-white font-mono text-xs focus:outline-none"
                              value={newSessionDesc}
                              onChange={e => setNewSessionDesc(e.target.value)}
                            />
                            <button
                              onClick={handleAddSession}
                              disabled={addingSession}
                              className="px-5 py-2.5 bg-ink text-paper font-mono text-[10px] uppercase font-black tracking-widest hover:bg-brand-blue cursor-pointer"
                            >
                              Add Session Folder +
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid lg:grid-cols-12 gap-8 items-start">
                      */}
                  {/* Modules Hierarchy */}
                  {/*
                        <div className="lg:col-span-12 space-y-6">
                          {(event.modulesList || []).length === 0 ? (
                            <div className="text-center py-12 bg-paper border border-ink/20 font-mono text-xs uppercase tracking-wider text-ink/40 font-bold">
                              No Session Files uploaded yet by organisers.
                            </div>
                          ) : (
                            <div className="space-y-8">
                              {(event.modulesList || []).map((mod: any, mIdx: number) => (
                                <div key={mod._id || mIdx} className="border border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden">
                                  <div className="p-6 bg-paper/50 border-b border-ink flex justify-between items-center text-left">
                                    <div>
                                      <h3 className="font-serif text-lg font-black leading-tight truncate font-bold text-ink mb-1">
                                        Session {mIdx+1}: {mod.title}
                                      </h3>
                                      <p className="font-mono text-[10px] text-ink/50 uppercase leading-snug">{mod.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isOrganizer && (
                                        <>
                                          <button 
                                            onClick={() => setActiveModuleForMaterial(mod._id)}
                                            className="px-3 py-1 bg-brand-blue text-white font-mono text-[9px] font-black uppercase tracking-widest border border-ink hover:bg-ink cursor-pointer flex items-center gap-1"
                                          >
                                            <Plus className="w-3 h-3" /> Upload Deliverable
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteModule(mod._id)}
                                            className="p-1 px-1.5 bg-brand-orange/20 text-brand-orange border border-ink/10 hover:bg-brand-orange hover:text-white cursor-pointer"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                */}
                  {/* Inline upload asset form */}
                  {/*
                                  {activeModuleForMaterial === mod._id && (
                                    <div className="p-6 bg-brand-acid/10 border-b border-ink space-y-4 font-mono text-xs">
                                      <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-[9px] font-black uppercase mb-1">Material Asset Title</label>
                                          <input type="text" placeholder="e.g. Fieldwork PDF Syllabus" className="w-full p-2 bg-white border border-ink font-mono text-xs focus:outline-none" value={matTitle} onChange={e => setMatTitle(e.target.value)} />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-black uppercase mb-1">Asset Category</label>
                                          <select className="w-full p-2 bg-white border border-ink font-mono text-xs focus:outline-none" value={matType} onChange={e => setMatType(e.target.value)}>
                                            <option value="pdf">Syllabus PDF</option>
                                            <option value="video">Lecture Stream (Vimeo / YouTube / GDrive)</option>
                                            <option value="link">Reference Material Hyperlink</option>
                                            <option value="text">Text Guidelines sheet</option>
                                          </select>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-black uppercase mb-1">Hyperlink URL</label>
                                        <input type="text" placeholder="https://drive.google.com/..." className="w-full p-2 bg-white border border-ink font-mono text-xs focus:outline-none" value={matUrl} onChange={e => setMatUrl(e.target.value)} />
                                      </div>
                                      {matType === 'text' && (
                                        <div>
                                          <label className="block text-[9px] font-black uppercase mb-1">Markdown / HTML text guidelines</label>
                                          <textarea rows={3} placeholder="Paste guidelines copy paste format..." className="w-full p-2 bg-white border border-ink font-mono text-xs focus:outline-none" value={matText} onChange={e => setMatText(e.target.value)} />
                                        </div>
                                      )}
                                      <div className="flex gap-2">
                                        <button onClick={() => handleAddMaterial(mod._id)} className="px-4 py-2 bg-ink text-paper font-bold uppercase text-[10px] cursor-pointer">Submit Asset</button>
                                        <button onClick={() => setActiveModuleForMaterial(null)} className="px-4 py-2 bg-white text-ink border border-ink font-bold uppercase text-[10px] cursor-pointer">Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                  */}
                  {/* Folder Materials list */}
                  {/*
                                  <div className="divide-y divide-ink/10">
                                    {(mod.materials || []).length === 0 ? (
                                      <div className="p-4 text-center font-mono text-[10px] uppercase text-ink/40 font-bold">This session folder is empty.</div>
                                    ) : (
                                      (mod.materials || []).map((mat: any, maIdx: number) => (
                                        <div key={mat._id || maIdx} className="p-4 px-6 flex justify-between items-center bg-white hover:bg-brand-acid/5 text-xs font-mono font-bold">
                                          <div className="flex items-center gap-4 antialiased">
                                            {mat.type === 'video' ? <Play className="w-4 h-4 text-brand-orange shrink-0" /> : <FileText className="w-4 h-4 text-brand-blue shrink-0" />}
                                            <div className="text-left">
                                              <span className="uppercase font-black text-ink">{mat.title}</span>
                                              <span className="mx-2 text-ink/30">|</span>
                                              <span className="text-[9px] text-ink/40 uppercase bg-paper border border-ink/20 px-2 py-0.5">{mat.type}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            {mat.url && mat.url !== '#' && (
                                              <a 
                                                href={mat.url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="px-3 py-1 bg-paper hover:bg-brand-blue hover:text-paper border border-ink text-[10px] uppercase font-black tracking-widest cursor-pointer hover:no-underline font-bold"
                                              >
                                                Launch File &rarr;
                                              </a>
                                            )}
                                            {isOrganizer && (
                                              <button 
                                                onClick={() => handleDeleteMaterial(mod._id, mat._id)}
                                                className="p-1 text-brand-orange hover:bg-brand-orange hover:text-white"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  */}
                  {/* type 10: Instructor Organizer Panel (Requirement 3, 5, 6) */}
                  {activeTab.type === "organizer_dashboard" && (
                    <div className="space-y-10 animate-fade-in text-left">
                      {/* STATS */}
                      <div className="grid sm:grid-cols-2 gap-8 mb-6">
                        <div className="p-6 border border-ink bg-brand-acid shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                          <label className="block font-mono text-[9px] font-black uppercase tracking-wider text-ink/50 mb-2">
                            Total Confirmed Cohorts
                          </label>
                          <div className="text-4xl font-serif font-black italic">
                            {
                              participantsList.filter(
                                (p) =>
                                  p.paymentStatus === "Confirmed" ||
                                  p.amountPaid > 0,
                              ).length
                            }{" "}
                            / {participantsList.length}
                          </div>
                        </div>
                        <div className="p-6 border border-ink bg-brand-blue text-white shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                          <label className="block font-mono text-[9px] font-black uppercase tracking-wider text-white/55 mb-2">
                            Total Funding Received
                          </label>
                          <div className="text-4xl font-serif font-black italic">
                            Rs. {totalReceived}
                          </div>
                        </div>
                      </div>

                      {/* PUBLICATION BLOCK */}
                      <div className="p-6 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                          <h4 className="font-serif text-lg font-black leading-tight font-bold">
                            Cohorts Public Placement Status
                          </h4>
                          <p className="font-mono text-[10px] text-ink/50 uppercase mt-1">
                            Reveal confirmed participants as an public dossier
                            tab of this Event/Course details page.
                          </p>
                        </div>
                        <div>
                          {isCohortPublished ? (
                            <button
                              onClick={() => handleCohortPublication(false)}
                              className="px-5 py-3 border border-brand-orange text-brand-orange bg-brand-orange/5 font-mono text-xs font-black uppercase tracking-wider hover:bg-brand-orange hover:text-white transition-all cursor-pointer"
                            >
                              Unpublish List
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCohortPublication(true)}
                              className="px-5 py-3 bg-ink text-paper font-mono text-xs font-black uppercase tracking-wider hover:bg-brand-acid hover:text-ink hover:-translate-y-0.5 transition-all cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,1)]"
                            >
                              Publish Cohort Publicly &rarr;
                            </button>
                          )}
                        </div>
                      </div>

                      {/* SPREADSHEET DROP LOADER (Requirement 3) */}
                      <div className="p-8 border-2 border-dashed border-ink bg-paper shadow-[6px_6px_0px_rgba(0,0,0,1)] text-center font-mono">
                        <Upload className="w-8 h-8 text-ink mx-auto mb-4 animate-bounce" />
                        <h4 className="text-sm font-black uppercase tracking-wide text-ink mb-1">
                          Accepted Candidates Excel Uploader
                        </h4>
                        <p className="text-[10px] text-ink/40 uppercase mb-6">
                          Drag & Drop or Click to select Spreadsheet (.xlsx,
                          .xls, .csv)
                        </p>

                        <div className="relative inline-block">
                          <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleExcelParser}
                          />
                          <button className="px-6 py-3 bg-brand-orange text-white text-xs font-black uppercase tracking-widest border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-white hover:text-ink active:translate-y-0 active:shadow-none transition-all cursor-pointer">
                            {uploadingExcel
                              ? "Analyzing stream..."
                              : "Choose File spreadsheet..."}
                          </button>
                        </div>
                        <p className="text-[10px] text-ink/30 uppercase mt-4">
                          Required Column headers: email, name, affiliation, fee
                        </p>
                      </div>

                      {/* MANUAL INSERT ADMIT */}
                      <div className="p-6 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)]">
                        <h4 className="font-serif text-lg font-black mb-4 font-bold border-b border-ink/10 pb-2 flex items-center gap-1">
                          Admit Single Candidate Manually
                        </h4>
                        <form
                          onSubmit={handleAddParticipantManually}
                          className="grid grid-cols-1 sm:grid-cols-5 gap-4 font-mono text-xs"
                        >
                          <div>
                            <label className="block text-[8px] font-black uppercase mb-1">
                              Email ID
                            </label>
                            <input
                              required
                              type="email"
                              placeholder="email@domain.com"
                              className="w-full p-2 border border-ink bg-paper/20 focus:outline-none"
                              value={manualEmail}
                              onChange={(e) => setManualEmail(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black uppercase mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              placeholder="Dr. John Smith"
                              className="w-full p-2 border border-ink bg-paper/20 focus:outline-none"
                              value={manualName}
                              onChange={(e) => setManualName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black uppercase mb-1">
                              Affiliation
                            </label>
                            <input
                              type="text"
                              placeholder="University of Madras"
                              className="w-full p-2 border border-ink bg-paper/20 focus:outline-none"
                              value={manualAffiliation}
                              onChange={(e) =>
                                setManualAffiliation(e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black uppercase mb-1">
                              Fee (Rs.)
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="1500"
                              className="w-full p-2 border border-ink bg-paper/20 focus:outline-none"
                              value={manualFee}
                              onChange={(e) =>
                                setManualFee(Number(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="submit"
                              disabled={addingParticipant}
                              className="w-full p-2.5 bg-brand-blue text-white uppercase text-[10px] font-black cursor-pointer border border-ink"
                            >
                              Admit Member +
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* ACTIVE REGISTRY TABULATION */}
                      <div className="border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] overflow-hidden font-mono text-xs">
                        <div className="bg-paper p-4 font-black uppercase tracking-wider text-[10px] border-b border-ink flex justify-between">
                          <span>Registry roster catalog</span>
                          <span className="text-brand-orange">
                            {participantsList.length} admitted records fetched
                          </span>
                        </div>

                        {/* BULK OPERATIONS BANNER */}
                        {selectedParticipantIds.length > 0 && (
                          <div className="bg-brand-orange/5 border-b border-ink p-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                            <div className="font-bold uppercase text-[10px] text-brand-orange flex items-center gap-2">
                              <span>
                                ● Selected {selectedParticipantIds.length}{" "}
                                candidate(s)
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedParticipantIds([])}
                                className="text-[9px] underline text-ink/65 hover:text-ink cursor-pointer font-bold"
                              >
                                [Deselect All]
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[9px] uppercase tracking-wider text-ink/50 mr-1">
                                Bulk Action:
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleBulkAction("markPaid", true)
                                }
                                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-emerald-500 cursor-pointer"
                              >
                                Mark Paid
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleBulkAction("markPaid", false)
                                }
                                className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-850 text-[10px] font-bold uppercase tracking-wider border border-orange-500 cursor-pointer"
                              >
                                Mark Unpaid
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleBulkAction("confirmAdmission", true)
                                }
                                className="px-3 py-1.5 bg-brand-acid hover:bg-brand-acid/80 text-ink text-[10px] font-bold uppercase tracking-wider border border-ink cursor-pointer"
                              >
                                Confirm Admitted
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleBulkAction("confirmAdmission", false)
                                }
                                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[10px] font-bold uppercase tracking-wider border border-zinc-400 cursor-pointer"
                              >
                                Set Pending
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBulkAction("delete")}
                                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-[10px] font-bold uppercase tracking-wider border border-red-500 cursor-pointer"
                              >
                                Bulk Delete
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="bg-brand-blue/5 border-b border-ink/15 px-4 py-2.5 text-brand-blue text-[9px] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                          <span className="bg-brand-blue w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"></span>
                          <span>
                            💡 Pro-tip: Double-click any candidate's details or
                            fee cell to instantly edit inline. Press{" "}
                            <kbd className="bg-white border border-ink/20 px-1 py-0.5 rounded shadow-sm text-[8px]">
                              Enter
                            </kbd>{" "}
                            to save,{" "}
                            <kbd className="bg-white border border-ink/20 px-1 py-0.5 rounded shadow-sm text-[8px]">
                              Esc
                            </kbd>{" "}
                            to cancel.
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-left">
                            <thead>
                              <tr className="bg-paper border-b border-ink font-bold text-[9px] uppercase tracking-wider text-ink/65">
                                <th className="p-3 border-r border-ink text-center w-10">
                                  <input
                                    type="checkbox"
                                    className="cursor-pointer"
                                    checked={
                                      participantsList.length > 0 &&
                                      selectedParticipantIds.length ===
                                        participantsList.length
                                    }
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedParticipantIds(
                                          participantsList.map((p) => p._id),
                                        );
                                      } else {
                                        setSelectedParticipantIds([]);
                                      }
                                    }}
                                  />
                                </th>
                                <th className="p-3 border-r border-ink">
                                  Candidate Details (Name, Email & Institution)
                                </th>
                                <th className="p-3 border-r border-ink text-center w-36">
                                  Registration Fee
                                </th>
                                <th className="p-3 border-r border-ink text-center w-44">
                                  Admission & Payment Status
                                </th>
                                <th className="p-3 text-center w-14">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-ink">
                              {participantsList.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={5}
                                    className="p-12 text-center text-ink/30 uppercase font-black text-[10px]"
                                  >
                                    No entrants uploaded. Import spreadsheet
                                    above to seed the cohort database.
                                  </td>
                                </tr>
                              ) : (
                                participantsList.map((p) => (
                                  <tr
                                    key={p._id}
                                    className={cn(
                                      "hover:bg-paper/30 transition-colors group",
                                      selectedParticipantIds.includes(p._id) &&
                                        "bg-brand-orange/5",
                                    )}
                                  >
                                    <td className="p-3 border-r border-ink text-center">
                                      <input
                                        type="checkbox"
                                        className="cursor-pointer"
                                        checked={selectedParticipantIds.includes(
                                          p._id,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedParticipantIds(
                                              (prev) => [...prev, p._id],
                                            );
                                          } else {
                                            setSelectedParticipantIds((prev) =>
                                              prev.filter((id) => id !== p._id),
                                            );
                                          }
                                        }}
                                      />
                                    </td>

                                    {/* Merged Candidate, Email & Affiliation info */}
                                    <td className="p-3 border-r border-ink">
                                      {editingParticipantId === p._id ? (
                                        <div className="space-y-1.5 py-1">
                                          <div className="flex items-center gap-1">
                                            <span className="text-[9px] text-ink/40 uppercase w-14">
                                              Name:
                                            </span>
                                            <input
                                              type="text"
                                              className="p-1 border border-ink w-full focus:outline-none focus:bg-white text-xs bg-white font-bold"
                                              value={editName}
                                              onChange={(e) =>
                                                setEditName(e.target.value)
                                              }
                                              onKeyDown={(e) =>
                                                handleKeyDown(e, p._id)
                                              }
                                              autoFocus
                                            />
                                          </div>
                                          <div className="text-[9px] text-ink/40 lowercase pl-15">
                                            {p.email}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-[9px] text-ink/40 uppercase w-14">
                                              Affil:
                                            </span>
                                            <input
                                              type="text"
                                              className="p-1 border border-ink w-full focus:outline-none focus:bg-white text-xs bg-white uppercase font-bold"
                                              value={editAffiliation}
                                              onChange={(e) =>
                                                setEditAffiliation(
                                                  e.target.value,
                                                )
                                              }
                                              onKeyDown={(e) =>
                                                handleKeyDown(e, p._id)
                                              }
                                              placeholder="Affiliation"
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          onDoubleClick={() =>
                                            startEditingParticipant(p)
                                          }
                                          className="cursor-pointer py-1"
                                          title="Double-click to edit candidate details"
                                        >
                                          <div className="font-bold text-ink hover:text-brand-blue flex items-center gap-1.5 transition-colors">
                                            <span>
                                              {p.name ||
                                                "Anonymous (Not Logged)"}
                                            </span>
                                            <span className="text-[8px] text-ink/30 opacity-0 group-hover:opacity-100 uppercase transition-opacity">
                                              ✎ dblclick
                                            </span>
                                          </div>
                                          <div className="text-[9px] text-ink/40 lowercase select-all">
                                            {p.email}
                                          </div>
                                          <div className="text-[10px] text-ink/65 mt-1">
                                            {p.affiliation ? (
                                              <span className="bg-paper/50 px-2 py-0.5 border border-ink/10 rounded uppercase text-[9px] font-bold">
                                                {p.affiliation}
                                              </span>
                                            ) : (
                                              <span className="text-ink/35 italic select-none text-[9px] uppercase tracking-wide">
                                                + Add affiliation (dbl-click)
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </td>

                                    {/* Merged registration fee columns */}
                                    <td
                                      className="p-3 border-r border-ink text-center"
                                      onDoubleClick={() =>
                                        startEditingParticipant(p)
                                      }
                                      title="Double-click to edit registration fee"
                                    >
                                      {editingParticipantId === p._id ? (
                                        <div className="flex flex-col items-center justify-center py-1">
                                          <span className="text-[9px] text-ink/40 uppercase mb-1">
                                            Fee Amount:
                                          </span>
                                          <div className="flex items-center gap-1 justify-center">
                                            <span className="text-xs text-ink/65">
                                              Rs.
                                            </span>
                                            <input
                                              type="number"
                                              min="0"
                                              className="p-1 border border-ink w-20 text-center focus:outline-none focus:bg-white text-xs bg-white font-bold"
                                              value={editFee}
                                              onChange={(e) =>
                                                setEditFee(
                                                  Number(e.target.value) || 0,
                                                )
                                              }
                                              onKeyDown={(e) =>
                                                handleKeyDown(e, p._id)
                                              }
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="cursor-pointer flex flex-col items-center justify-center py-1">
                                          <div className="font-bold text-ink hover:text-brand-blue flex items-center gap-1 transition-colors">
                                            <span>Rs. {p.fee}</span>
                                            <span className="text-[8px] text-ink/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                              ✎
                                            </span>
                                          </div>
                                          <div className="text-[9px] text-brand-orange mt-0.5 font-bold">
                                            Paid: Rs. {p.amountPaid || 0}
                                          </div>
                                        </div>
                                      )}
                                    </td>

                                    {/* Merged active clickable status badges */}
                                    <td className="p-3 border-r border-ink text-center">
                                      <div className="flex flex-col gap-1.5 items-center justify-center">
                                        {/* Transaction Status Badge */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleParticipantStatus(
                                              p._id,
                                              p.paymentStatus,
                                              p.fee,
                                            )
                                          }
                                          className={cn(
                                            "px-2 py-1 text-[9px] font-black uppercase tracking-wider border cursor-pointer font-bold w-36 text-center rounded transition-all",
                                            p.paymentStatus === "Confirmed"
                                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                              : "bg-amber-50 text-amber-850 border-amber-300 hover:bg-amber-100",
                                          )}
                                          title="Click to toggle payment status"
                                        >
                                          💳{" "}
                                          {p.paymentStatus === "Confirmed"
                                            ? "Paid ✓"
                                            : "Fee Pending ⌛"}
                                        </button>

                                        {/* Admission Status Badge */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleAdmissionStatus(
                                              p._id,
                                              p.admissionStatus,
                                            )
                                          }
                                          className={cn(
                                            "px-2 py-1 text-[9px] font-black uppercase tracking-wider border cursor-pointer font-bold w-36 text-center rounded transition-all",
                                            p.admissionStatus === "Confirmed"
                                              ? "bg-blue-50 text-blue-850 border-blue-300 hover:bg-blue-100"
                                              : "bg-slate-50 text-slate-500 border-slate-300 hover:bg-slate-100",
                                          )}
                                          title="Click to toggle admission status"
                                        >
                                          🎓{" "}
                                          {p.admissionStatus === "Confirmed"
                                            ? "Admitted ✓"
                                            : "Admission Temp ⌛"}
                                        </button>
                                      </div>
                                    </td>

                                    {/* Action Column */}
                                    <td className="p-3 text-center">
                                      {editingParticipantId === p._id ? (
                                        <div className="flex flex-col gap-1 inline-flex items-center justify-center">
                                          <button
                                            onClick={() =>
                                              saveParticipantInline(p._id)
                                            }
                                            className="p-1 bg-emerald-600 border border-ink hover:bg-emerald-700 text-white rounded cursor-pointer flex items-center justify-center"
                                            title="Save Changes (Enter)"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={cancelEditingParticipant}
                                            className="p-1 bg-neutral-100 border border-neutral-400 hover:bg-neutral-200 text-ink rounded cursor-pointer flex items-center justify-center"
                                            title="Cancel Edit (Esc)"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center">
                                          <button
                                            onClick={() =>
                                              deleteParticipantRow(p._id)
                                            }
                                            className="p-1.5 text-ink/40 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-all border border-transparent hover:border-red-200 opacity-50 group-hover:opacity-100"
                                            title="Delete Candidate Record"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reference GUID */}
              <div className="mt-12 flex flex-wrap justify-between items-center gap-6 border-t border-ink/15 pt-8 font-bold">
                <div className="font-mono text-[9px] font-bold text-ink/40 uppercase tracking-widest">
                  DOCUMENT REFERENCE // GUID: CO-DIN-{event.slug.toUpperCase()}
                </div>
                <Link
                  to="/events"
                  className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-blue hover:underline flex items-center gap-1 group"
                >
                  &larr; Return to Central Schedules
                </Link>
              </div>
            </div>

            {/* Sticky "Secure Your Spot" Widget Sidebar - 4 Cols */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-8 text-left">
              {/* Conditional Notification/Dashboard checkout card (Requirement 1, 3, 4) */}
              {effectiveMyStatus?.accepted &&
              effectiveMyStatus.participant?.admissionStatus === "Confirmed" ? (
                <div className="bg-ink text-paper p-10 border border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)] flex flex-col justify-between text-left brutalist-card">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-acid text-ink font-mono text-[9px] font-black uppercase tracking-widest border border-ink shadow-[2px_2px_0px_rgba(255,255,255,1)] mb-6 font-bold">
                      <ShieldCheck
                        className="w-4 h-4 text-ink"
                        strokeWidth={3}
                      />{" "}
                      LMS PORTAL: ACCESS GRANTED
                    </div>
                    <h3 className="text-2xl font-serif font-black italic mb-4 leading-tight text-white">
                      Course Materials Active
                    </h3>
                    <p className="text-[10px] opacity-75 mb-6 uppercase tracking-wider font-mono font-bold leading-relaxed border-b border-white/10 pb-4">
                      NAME:{" "}
                      <span className="font-semibold text-brand-acid">
                        {effectiveMyStatus.participant.name}
                      </span>{" "}
                      <br />
                      AFFILIATION:{" "}
                      <span className="font-semibold text-brand-acid">
                        {effectiveMyStatus.participant.affiliation}
                      </span>
                    </p>

                    <button
                      onClick={() => {
                        navigate(`/academy/online/${event.slug}`);
                      }}
                      className="w-full h-14 bg-brand-acid text-ink font-mono font-black uppercase tracking-widest text-xs hover:bg-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_rgba(255,255,255,0.25)] active:shadow-none active:translate-y-0 cursor-pointer font-bold border border-ink"
                    >
                      View Materials 📚
                    </button>
                  </div>
                </div>
              ) : effectiveMyStatus?.accepted ? (
                effectiveMyStatus.participant?.paymentStatus === "Confirmed" ? (
                  <div className="bg-ink text-paper p-10 border border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)] flex flex-col justify-between text-left brutalist-card animate-fade-in">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500 text-ink font-mono text-[9px] font-black uppercase tracking-widest border border-ink shadow-[2px_2px_0px_rgba(255,255,255,1)] mb-6 font-bold">
                        <Clock className="w-4 h-4 text-ink" strokeWidth={3} />{" "}
                        ROSTER: REGISTRATION RECEIVED
                      </div>
                      <h3 className="text-2xl font-serif font-black italic mb-4 leading-tight text-white font-bold">
                        Payment Received
                      </h3>
                      <p className="text-[10px] opacity-75 mb-6 uppercase tracking-wider font-mono font-bold leading-relaxed border-b border-white/10 pb-4">
                        NAME:{" "}
                        <span className="font-semibold text-brand-acid">
                          {effectiveMyStatus.participant.name}
                        </span>{" "}
                        <br />
                        AFFILIATION:{" "}
                        <span className="font-semibold text-brand-acid">
                          {effectiveMyStatus.participant.affiliation}
                        </span>
                      </p>

                      <div className="p-4 border border-brand-acid bg-brand-acid/10 text-brand-acid flex items-center gap-3 mb-6 font-bold">
                        <Check
                          className="w-5 h-5 text-brand-acid shrink-0"
                          strokeWidth={3}
                        />
                        <div className="font-mono text-[10px] font-black uppercase tracking-wide">
                          Fee Payment Received!
                        </div>
                      </div>

                      <div className="p-5 border border-white/20 bg-white/5 space-y-2 rounded-none">
                        <span className="block text-[10px] font-black uppercase text-brand-orange font-mono tracking-wider">
                          Admission Review Status
                        </span>
                        <p className="text-xs text-paper/85 leading-relaxed font-sans font-medium">
                          Please check back in a few days for accessing course
                          materials. Your registration status has been
                          successfully lodged on the roster, and academic
                          delegates are verifying final admissions.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-ink text-paper p-10 border border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)] flex flex-col justify-between text-left brutalist-card animate-fade-in">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-orange text-white font-mono text-[9px] font-black uppercase tracking-widest border border-ink shadow-[2px_2px_0px_rgba(255,255,255,1)] mb-6 font-bold">
                        <AlertCircle className="w-4 h-4" /> ROSTER: PAYMENT
                        AWAITING
                      </div>
                      <h3 className="text-2xl font-serif font-black italic mb-4 leading-tight text-white font-bold">
                        Fee Settlement
                      </h3>
                      <p className="text-[10px] opacity-75 mb-6 uppercase tracking-wider font-mono font-bold leading-relaxed border-b border-white/10 pb-4">
                        NAME:{" "}
                        <span className="font-semibold text-brand-acid">
                          {effectiveMyStatus.participant.name}
                        </span>{" "}
                        <br />
                        AFFILIATION:{" "}
                        <span className="font-semibold text-brand-acid">
                          {effectiveMyStatus.participant.affiliation}
                        </span>
                      </p>

                      <div className="space-y-6">
                        <div className="p-4 border border-white/20 bg-white/5 flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs font-mono font-bold">
                            <span className="opacity-60">AMOUNT DUE:</span>
                            <span className="font-bold text-white uppercase">
                              Rs. {effectiveMyStatus.participant.fee}
                            </span>
                          </div>
                          {effectiveMyStatus.participant.paymentDeadline && (
                            <div className="flex justify-between items-center text-[10px] font-mono text-brand-orange font-bold">
                              <span>THRESHOLD DEADLINE:</span>
                              <span className="font-black bg-brand-orange/20 px-2 py-0.5">
                                {effectiveMyStatus.participant.paymentDeadline}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Implement custom instructions message chosen from DB config */}
                        {event.registrationCard?.paymentMsgChoice === "link" &&
                        event.registrationCard?.paymentGatewayLink ? (
                          <div className="space-y-4">
                            <p className="text-xs text-paper/80 leading-relaxed font-sans">
                              Click below to open the external payment
                              interface. Remember to copy your application
                              details if required.
                            </p>
                            <a
                              href={event.registrationCard.paymentGatewayLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full h-14 bg-brand-acid text-ink font-mono font-black uppercase tracking-widest text-[10px] hover:bg-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_rgba(255,255,255,0.25)] active:shadow-none active:translate-y-0 cursor-pointer font-bold border border-ink flex items-center justify-center hover:no-underline"
                            >
                              Proceed to Payment Gateway ↗
                            </a>
                            <button
                              type="button"
                              onClick={handlePayFee}
                              disabled={payingFee}
                              className="w-full h-11 border border-brand-acid/40 text-brand-acid/70 hover:border-brand-acid hover:text-brand-acid font-mono text-[9px] uppercase font-bold tracking-wider transition-colors bg-brand-acid/5"
                            >
                              {payingFee
                                ? "Verifying..."
                                : "Simulate Sandbox Payment Receipt"}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {event.registrationCard?.paymentMarkdown ? (
                              <div className="p-4 border border-white/20 bg-white/5 text-xs text-white/90 font-sans leading-relaxed overflow-y-auto max-h-[220px]">
                                <span className="block text-[8px] font-mono font-black uppercase tracking-widest text-brand-acid mb-2">
                                  Instructions
                                </span>
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: renderMarkdown(
                                      event.registrationCard.paymentMarkdown,
                                      true,
                                    ),
                                  }}
                                />
                              </div>
                            ) : (
                              <p className="text-xs text-paper/80 leading-relaxed font-sans">
                                Transfer Rs. {effectiveMyStatus.participant.fee} to the
                                academy account, then click the manual
                                simulation button below to acknowledge
                                settlement.
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={handlePayFee}
                              disabled={payingFee}
                              className="w-full h-14 bg-brand-acid text-ink font-mono font-black uppercase tracking-widest text-xs hover:bg-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_rgba(255,255,255,0.25)] active:shadow-none active:translate-y-0 cursor-pointer font-bold border border-ink font-bold"
                            >
                              {payingFee
                                ? "Processing payment..."
                                : "Acknowledge Payment & Request Spot"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                /* DEFAULT Registration Card or Archived Materials self-enroll card (Requirement 4) */
                <div className="bg-ink text-paper p-10 border border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)] text-left brutalist-card animate-fade-in flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-serif font-black italic mb-4 font-bold uppercase tracking-tight text-white leading-none">
                      {isCompletedCourse
                        ? (event.registrationCard?.title || "Get Materials Access")
                        : event.registrationCard?.title ||
                          (event.type === "W2M Residential Course" ||
                          event.type === "Residential"
                            ? "Secure Your Spot"
                            : "Submit Abstract Paper")}
                    </h3>
                    <p className="text-xs opacity-65 mb-6 leading-relaxed font-mono uppercase tracking-wide text-white/70">
                      {isCompletedCourse
                        ? (event.registrationCard?.description || "Enroll to instantly access all files, reports, community datasets, and workshop recordings for this completed course.")
                        : event.registrationCard?.description ||
                          (event.type === "W2M Residential Course" ||
                          event.type === "Residential"
                            ? "Exclusive training cohort limited to 15 participants for deep fieldwork mentorship and hands-on peer coding."
                            : "Submit abstracts or session deliverables via the formal peer review system for inclusion in our published journals.")}
                    </p>

                    {/* Fee Area */}
                    <div className="text-3xl font-serif font-black italic mb-6 text-white leading-none">
                      {isCompletedCourse ? (
                        (event.completedFee !== undefined && event.completedFee > 0) ? (
                          <span className="font-sans font-bold">₹{event.completedFee}</span>
                        ) : "Free"
                      ) : (
                        (event.fee !== undefined && event.fee > 0) ? (
                          <span className="font-sans font-bold">₹{event.fee}</span>
                        ) : "Free"
                      )}
                    </div>
                  </div>

                  <div>
                    {event.registrationCard?.buttonLink &&
                    event.registrationCard?.buttonLink !== "#" ? (
                      <a
                        href={event.registrationCard?.buttonLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full h-16 bg-brand-acid text-ink font-mono font-black uppercase tracking-widest text-xs hover:bg-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_rgba(255,255,255,0.2)] flex items-center justify-center border border-ink font-bold hover:no-underline"
                      >
                        {event.registrationCard?.buttonText ||
                          "Link To Portal &rarr;"}
                      </a>
                    ) : isCompletedCourse ? (
                      event.completedFee !== undefined && event.completedFee > 0 ? (
                        <button
                          onClick={handleEnrollMaterials}
                          disabled={enrollingMaterials}
                          className="w-full h-16 bg-brand-acid text-ink flex items-center justify-center gap-3 font-mono font-black uppercase tracking-widest text-xs hover:bg-white hover:text-ink transition-all active:scale-95 shadow-[6px_6px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 cursor-pointer font-bold border border-ink font-bold"
                        >
                          <Shield className="w-4 h-4" />{" "}
                          {enrollingMaterials
                            ? "Processing Gateway..."
                            : `Pay ₹${event.completedFee} & Get Access`}
                        </button>
                      ) : (
                        <button
                          onClick={handleEnrollMaterials}
                          disabled={enrollingMaterials}
                          className="w-full h-16 bg-brand-acid text-ink flex items-center justify-center gap-3 font-mono font-black uppercase tracking-widest text-xs hover:bg-white hover:text-ink transition-all active:scale-95 shadow-[6px_6px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 cursor-pointer font-bold border border-ink font-bold"
                        >
                          <Shield className="w-4 h-4" />{" "}
                          {enrollingMaterials
                            ? "Enrolling..."
                            : "Enroll & Get Access (Free)"}
                        </button>
                      )
                    ) : event.status === "Upcoming" ||
                      event.status === "Ongoing" ? (
                      <button
                        onClick={() => {
                          const regTab = tabsList.find((t) => t.type === "registration");
                          if (regTab) {
                            setActiveTabSlug(regTab.slug);
                          }
                          const el =
                            document.getElementById("tabs-navigation") ||
                            document.querySelector(".tabs-navbar-parent");
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth" });
                          } else {
                            window.scrollTo({ top: 400, behavior: "smooth" });
                          }
                        }}
                        className="w-full h-16 bg-brand-acid text-ink flex items-center justify-center gap-3 font-mono font-black uppercase tracking-widest text-xs hover:bg-white hover:text-ink transition-all active:scale-95 shadow-[6px_6px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 cursor-pointer font-bold border border-ink font-bold"
                      >
                        <Lock className="w-4 h-4" />{" "}
                        {event.registrationCard?.buttonText ||
                          (event.type === "W2M Residential Course" ||
                          event.type === "Residential"
                            ? "Apply for Admission"
                            : "Go to submission portal")}
                      </button>
                    ) : (
                      <button className="w-full h-16 border border-white/20 text-white/30 font-mono font-black uppercase tracking-widest text-xs cursor-not-allowed font-bold">
                        Admissions closed
                      </button>
                    )}

                    <div className="mt-8 pt-8 border-t border-white/10">
                      <h5 className="font-mono text-[9px] font-black uppercase tracking-widest opacity-40 mb-4 text-white font-bold">
                        Includes
                      </h5>
                      <div className="flex flex-col gap-4">
                        {(isCompletedCourse
                          ? [
                              "Permanent video libraries",
                              "Downloadable slide-decks",
                              "Full access to exercises",
                              "Simulated offline credit",
                            ]
                          : event.registrationCard?.highlights ||
                            (event.type === "W2M Residential Course" ||
                            event.type === "Residential"
                              ? [
                                  "Exclusive 15-seat cohort",
                                  "Linguistic Fieldwork Mentorship",
                                  "Post-Grad Certification Credit",
                                ]
                              : [
                                  "Indexable publications",
                                  "Adherence guidelines compliant",
                                  "Presentation credentials",
                                ])
                        ).map((h: string) => (
                          <div
                            key={h}
                            className="flex items-center gap-2.5 text-[9px] font-mono font-bold uppercase tracking-widest text-white/85 flex"
                          >
                            <div className="w-1.5 h-1.5 bg-brand-acid shrink-0" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Syllabus inquiry help */}
              <div className="border border-ink p-10 bg-white shadow-[12px_12px_0px_rgba(0,0,0,1)] text-left font-bold font-mono">
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-ink/30 mb-6">
                  SUPPORT OFFICE // RSVP
                </div>
                <p className="text-xs text-ink/80 leading-relaxed mb-6">
                  Need logistical assistance, boarding passes, fee waivers, or
                  travel sponsorships?
                </p>
                <a
                  href="mailto:academy@diversity.org.in"
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-blue hover:underline whitespace-nowrap"
                >
                  <Mail className="w-4.5 h-4.5" /> INQUIRE RESPECTING COMPLIANCE
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Supporting Contexts: Host Bios & Projects Splicing (Full Width grids) */}
        <div className="grid lg:grid-cols-12 gap-16 mt-24 border-t border-ink pt-20">
          {/* Associated Projects (8 Columns) */}
          <div className="lg:col-span-8 space-y-8 text-left">
            {associatedProjects.length > 0 && (
              <div>
                <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-ink/30 mb-8 flex items-center gap-2">
                  <span className="w-12 h-[1px] bg-ink/20" />
                  Affiliated Experimental Projects
                </div>
                <div className="grid gap-6">
                  {associatedProjects.map((p) => (
                    <Link
                      key={p.slug}
                      to={`/projects/${p.slug}`}
                      className="p-8 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-ink hover:text-paper group transition-all duration-300 hover:no-underline"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="font-mono text-[9px] font-black border border-current px-2.5 py-0.5 font-bold">
                          {p.id}
                        </div>
                        <div className="font-mono text-[9px] font-bold uppercase tracking-widest bg-brand-acid text-ink px-2 py-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                          {p.tag}
                        </div>
                      </div>
                      <h3 className="font-serif text-3xl font-black mb-4 group-hover:text-brand-acid transition-colors font-bold">
                        {p.title}
                      </h3>
                      <p className="text-sm font-medium opacity-70 group-hover:opacity-100 mb-6 leading-relaxed">
                        {p.description}
                      </p>
                      <div className="flex items-center justify-between font-mono text-[10px] font-black uppercase tracking-wider">
                        <span>Status: {p.status}</span>
                        <span className="flex items-center gap-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                          Explore Project <ArrowUpRight className="w-4 h-4" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Organiser Bios / Cards (4 Columns) -> Replaced with Collaborators & Sponsors */}
          <div className="lg:col-span-4 space-y-12 text-left">
            {/* Collaborators section */}
            {event?.collaborators && event.collaborators.length > 0 && (
              <div className="space-y-6">
                <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-brand-blue font-bold">
                  Event Collaborators
                </div>
                <div className="grid gap-4 animate-fade-in animate-duration-500">
                  {event.collaborators.map((col: any, idx: number) => {
                    const CardComponent = col.website ? "a" : "div";
                    return (
                      <CardComponent
                        key={idx}
                        {...(col.website
                          ? {
                              href: col.website,
                              target: "_blank",
                              rel: "noopener noreferrer",
                            }
                          : {})}
                        className={`p-6 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all flex gap-4 items-center group text-ink font-bold ${
                          col.website
                            ? "hover:bg-brand-acid hover:-translate-y-1 hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] hover:no-underline"
                            : ""
                        }`}
                      >
                        {col.logo ? (
                          <img
                            src={col.logo}
                            alt={col.name}
                            className="w-16 h-16 object-contain border border-ink p-1 bg-white shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-16 h-16 flex items-center justify-center border border-ink bg-zinc-100 font-mono text-xs text-ink/40 font-bold shrink-0">
                            CO
                          </div>
                        )}
                        <div className="space-y-1 overflow-hidden">
                          <h4 className="font-serif text-lg font-black leading-tight truncate">
                            {col.name}
                          </h4>
                          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/50 leading-tight">
                            Collaborating Organisation
                          </p>
                          {col.website && (
                            <p className="font-mono text-[9px] text-brand-blue font-bold group-hover:underline">
                              Visit Website &rarr;
                            </p>
                          )}
                        </div>
                      </CardComponent>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sponsors section */}
            {event?.sponsors && event.sponsors.length > 0 && (
              <div className="space-y-6">
                <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-brand-orange font-bold">
                  Event Sponsors
                </div>
                <div className="grid gap-4 animate-fade-in animate-duration-500">
                  {event.sponsors.map((spo: any, idx: number) => {
                    const CardComponent = spo.website ? "a" : "div";
                    return (
                      <CardComponent
                        key={idx}
                        {...(spo.website
                          ? {
                              href: spo.website,
                              target: "_blank",
                              rel: "noopener noreferrer",
                            }
                          : {})}
                        className={`p-6 border border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all flex gap-4 items-center group text-ink font-bold ${
                          spo.website
                            ? "hover:bg-brand-acid hover:-translate-y-1 hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] hover:no-underline"
                            : ""
                        }`}
                      >
                        {spo.logo ? (
                          <img
                            src={spo.logo}
                            alt={spo.name}
                            className="w-16 h-16 object-contain border border-ink p-1 bg-white shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-16 h-16 flex items-center justify-center border border-ink bg-zinc-100 font-mono text-xs text-ink/40 font-bold shrink-0">
                            SP
                          </div>
                        )}
                        <div className="space-y-1 overflow-hidden">
                          <h4 className="font-serif text-lg font-black leading-tight truncate">
                            {spo.name}
                          </h4>
                          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/50 leading-tight">
                            Official Sponsor
                          </p>
                          {spo.website && (
                            <p className="font-mono text-[9px] text-brand-orange font-bold group-hover:underline">
                              Visit Website &rarr;
                            </p>
                          )}
                        </div>
                      </CardComponent>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUPERADMIN/ORGANIZER EDITING MODAL */}
      {/* EXQUISITE UNIFIED EDITOR (Same-source modular EventFormModal) */}
      {showEditModal && (
        <EventFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          eventToEdit={event}
          token={token}
          onSuccess={loadEventAndStatus}
        />
      )}

      {/* CUSTOM NON-BLOCKING CONFIRMATION DIALOG (Supports iframe/sandboxed environments) */}
      {confirmModal.isOpen && (
        <div
          id="custom-confirm-modal"
          className="fixed inset-0 z-[100] overflow-y-auto bg-ink/75 backdrop-blur-sm flex items-center justify-center p-6 bg-paper/90"
        >
          <div className="bg-white border-2 border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)] max-w-md w-full p-8 relative text-left">
            <h3 className="font-serif text-2xl font-black italic tracking-tight mb-2 text-ink">
              {confirmModal.title}
            </h3>
            <p className="font-sans text-sm text-ink/75 mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-4 py-2 border border-ink bg-paper hover:bg-ink/5 tracking-wider uppercase font-bold transition-all text-ink cursor-pointer"
              >
                {confirmModal.cancelText || "Cancel"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  await confirmModal.onConfirm();
                }}
                className={`px-4 py-2 border border-ink text-white font-bold tracking-wider uppercase shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer ${
                  confirmModal.isDangerous
                    ? "bg-red-650 hover:bg-red-700 bg-red-600"
                    : "bg-brand-blue hover:bg-ink"
                }`}
              >
                {confirmModal.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
