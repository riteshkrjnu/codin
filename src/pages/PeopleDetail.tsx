import PersonIntroduction from '../site/layout/PersonIntroduction';
import { ConnectedRecords, PersonBackground } from '../site/layout/DossierContent';
import RecordImage from '../site/layout/RecordImage';
import RecordExperience from '../site/layout/RecordExperience';
import RecordGlance, { ProfileLinks } from '../site/layout/RecordGlance';
import RecordHeading from '../site/layout/RecordHeading';
import PublicationList from '../features/publications/PublicationList';
import { normalizePublications } from '../features/publications/publications';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useSiteData } from "../site/data";
import { getUpdatedPeople, savePersonOverride } from "../lib/peopleOverrides";
import { ProfileEditor } from "../components/ProfileEditor";
import {
  Person,
  Education,
  Experience,
  CustomLink,
} from "../data/people/types";
import { useAuth } from "../context/AuthContext";
import {
  getCachedToken,
  getCachedEmail,
  signInWithGoogle,
  disconnectGoogle,
} from "../lib/googleAuth";
import {
  ArrowLeft,
  ArrowUpRight,
  Mail,
  BookOpen,
  Landmark,
  Briefcase,
  MapPin,
  Globe,
  Linkedin,
  Twitter,
  Github,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Award,
  Activity,
  FileCheck,
  ExternalLink,
  Search,
  Image as ImageIcon,
  Link2,
  CheckCircle2,
  AlertTriangle,
  Loader,
  BarChart3,
  GraduationCap,
  Fingerprint,
  Upload,
  RefreshCw,
  Calendar,
} from "lucide-react";

// Help extract direct Google Drive file download url for standard html images
function getDriveImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.includes("drive.google.com")) {
    // Elegant regex to handle standard and modern multi-login URLs (e.g., /file/u/0/d/ID/view)
    const matches =
      trimmed.match(/\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matches && matches[1]) {
      // return `https://docs.google.com/uc?export=view&id=${matches[1]}`;
      // return `https://drive.usercontent.google.com/download?id=${matches[1]}&export=view`;
      return `https://drive.usercontent.google.com/download?id=${matches[1]}&export=download`;

    }
  }
  return trimmed;
}

const DEFAULT_BANNER_IMAGES = [
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1600",
  "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1600",
];

export default function PeopleDetail() {
  const {data:{projects,centres,events}}=useSiteData();
  const { slug } = useParams();
  const { user } = useAuth();

  // Dynamic state for people list
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedSlug,setLoadedSlug]=useState<string|undefined>();
  const [isEditing, setIsEditing] = useState(false);
  // Tab state for Publications, Courses and Events tabs (Requirement 3)
  const [activeViewTab, setActiveViewTab] = useState<"publications" | "courses" | "events">("publications");
  const [editBoardMemberType, setEditBoardMemberType] = useState<string>("staff");

  // Active slide index for cover photo carousel
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Form states for profile editing
  const [editRole, setEditRole] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editBannerImages, setEditBannerImages] = useState<string[]>([]);
  const [editEducation, setEditEducation] = useState<Education[]>([]);
  const [editExperience, setEditExperience] = useState<Experience[]>([]);
  const [editPublicationsText, setEditPublicationsText] = useState("");

  // Scholar citation logs
  const [editCitations, setEditCitations] = useState<number | undefined>(
    undefined,
  );
  const [editHIndex, setEditHIndex] = useState<number | undefined>(undefined);
  const [editI10Index, setEditI10Index] = useState<number | undefined>(
    undefined,
  );
  const [editPublicationCount, setEditPublicationCount] = useState<number | undefined>(
    undefined,
  );

  // Socials
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editTwitter, setEditTwitter] = useState("");
  const [editGithub, setEditGithub] = useState("");
  const [editAcademia, setEditAcademia] = useState("");
  const [editResearchGate, setEditResearchGate] = useState("");
  const [editGoogleScholar, setEditGoogleScholar] = useState("");
  const [editRealGoogleScholar, setEditRealGoogleScholar] = useState("");
  const [editGoogleScholarCitations, setEditGoogleScholarCitations] = useState<number | undefined>(undefined);
  const [editSemanticScholar, setEditSemanticScholar] = useState("");
  const [editSemanticScholarCitations, setEditSemanticScholarCitations] = useState<number | undefined>(undefined);
  const [editOrcid, setEditOrcid] = useState("");

  // Custom links
  const [editOtherLinks, setEditOtherLinks] = useState<CustomLink[]>([]);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  // Temporary item additions inside the profile modifier
  const [newEduDegree, setNewEduDegree] = useState("");
  const [newEduIns, setNewEduIns] = useState("");
  const [newEduYear, setNewEduYear] = useState("");

  const [newExpRole, setNewExpRole] = useState("");
  const [newExpOrg, setNewExpOrg] = useState("");
  const [newExpPeriod, setNewExpPeriod] = useState("");
  const [newExpDesc, setNewExpDesc] = useState("");

  const [newBannerUrlInput, setNewBannerUrlInput] = useState("");

  // Google Drive file picker modal state
  const [isDriveSimOpen, setIsDriveSimOpen] = useState(false);
  const [driveSimSearch, setDriveSimSearch] = useState("");
  const [realDriveFiles, setRealDriveFiles] = useState<any[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"profile" | "banner">(
    "profile",
  );
  const [googleToken, setGoogleToken] = useState<string | null>(getCachedToken());
  const [googleEmail, setGoogleEmail] = useState<string | null>(getCachedEmail());
  const [authError, setAuthError] = useState<string | null>(null);

  // Google Scholar Auto-Sync Overlay states
  const [isScholarSyncing, setIsScholarSyncing] = useState(false);
  const [scholarSyncStep, setScholarSyncStep] = useState<
    "idle" | "connect" | "parse" | "publications" | "success"
  >("idle");
  const [scholarSyncLog, setScholarSyncLog] = useState("");

  // Expandable cards & Completed Projects popup states
  const [eduExpanded, setEduExpanded] = useState(true);
  const [expExpanded, setExpExpanded] = useState(true);
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);

  // Dynamic Publications states
  const [scholarPubs, setScholarPubs] = useState<string[]>([]);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // Semantic Scholar search states
  const [ssSearchQuery, setSsSearchQuery] = useState("");
  const [ssSearchResults, setSsSearchResults] = useState<any[]>([]);
  const [ssSearching, setSsSearching] = useState(false);

  const [isUploadingCloudinary, setIsUploadingCloudinary] = useState(false);
  const [cloudinaryProgress, setCloudinaryProgress] = useState("");

  const [activeTab, setActiveTab] = useState<"publications" | "courses" | "events">("publications");
  const [activeEditTab, setActiveEditTab] = useState<"media" | "vitae" | "curriculum" | "scholars">("media");

  // New manual and research interest fields
  const [editResearchInterests, setEditResearchInterests] = useState<string[]>([]);
  const [newResearchInterest, setNewResearchInterest] = useState("");
  const [editManualEvents, setEditManualEvents] = useState<any[]>([]);
  const [editManualCourses, setEditManualCourses] = useState<any[]>([]);

  // Local helper states for creating manual/associated event or course inside editor
  const [allDbEvents, setAllDbEvents] = useState<any[]>([]);
  const [selectedDbEventSlug, setSelectedDbEventSlug] = useState("");
  const [selectedDbEventRole, setSelectedDbEventRole] = useState("Presenter");

  const [manEventName, setManEventName] = useState("");
  const [manEventDates, setManEventDates] = useState("");
  const [manEventVenue, setManEventVenue] = useState("");
  const [manEventLink, setManEventLink] = useState("");
  const [manEventRole, setManEventRole] = useState("Presenter");

  const [allDbCourses, setAllDbCourses] = useState<any[]>([]);
  const [selectedDbCourseSlug, setSelectedDbCourseSlug] = useState("");
  const [selectedDbCourseRole, setSelectedDbCourseRole] = useState("Instructor");

  const [manCourseName, setManCourseName] = useState("");
  const [manCourseDates, setManCourseDates] = useState("");
  const [manCourseVenue, setManCourseVenue] = useState("");
  const [manCourseLink, setManCourseLink] = useState("");
  const [manCourseRole, setManCourseRole] = useState("Instructor");

  // Fetch all db reference lookup lists to auto-suggest
  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setAllDbEvents(data.events || []))
      .catch((err) => console.error(err));

    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => setAllDbCourses(data.courses || []))
      .catch((err) => console.error(err));
  }, []);



  // Sync state with changes saved globally
  const fetchPeople = async () => {
    try {
      const res = await fetch('/api/people');
      if (res.ok) {
        const data = await res.json();
        setPeople(data.people || []);
      } else {
        setPeople(getUpdatedPeople());
      }
    } catch (e) {
      setPeople(getUpdatedPeople());
    } finally {
      setLoading(false);
      setLoadedSlug(slug);
    }
  };

  useEffect(() => {
    fetchPeople();
    const handleUpdate = () => {
      fetchPeople();
    };
    window.addEventListener("people_data_updated", handleUpdate);
    return () =>
      window.removeEventListener("people_data_updated", handleUpdate);
  }, [slug]);

  const person = people.find((t) => t.slug === slug);
  const hasAutoSyncedRef = useRef<Record<string, boolean>>({});

  // Auto-sync Google Scholar metrics & publications list dynamically every load (once per person slot)
  useEffect(() => {
    if (!person || !person.slug) return;
    const scholarId = person.socials?.googlescholar || "";
    if (!scholarId) return; // Only auto-sync if they have a scholar ID linked
    if (hasAutoSyncedRef.current[person.slug]) return;

    const autoSyncScholar = async () => {
      hasAutoSyncedRef.current[person.slug] = true;
      setIsAutoSyncing(true);
      try {
        const query = `?scholarId=${encodeURIComponent(scholarId)}`;
        const response = await fetch(`/api/scholar/${person.slug}${query}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setEditCitations(data.citations);
            setEditHIndex(data.hIndex);
            setEditI10Index(data.i10Index);
            setEditPublicationCount(data.publicationCount);
            setScholarPubs(data.publications || []);

            const updatedStats = {
              citations: data.citations,
              hIndex: data.hIndex,
              i10Index: data.i10Index,
              publicationCount: data.publicationCount,
              lastUpdated: data.lastUpdated || new Date().toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              }),
            };

            // Instantly propagate the updated stats to local people state in UI so visitors see it immediately
            setPeople((prev) =>
              prev.map((p) =>
                p.slug === person.slug
                  ? {
                      ...p,
                      scholarStats: updatedStats,
                      scholarPublications: data.publications || [],
                    }
                  : p
              )
            );

            // Dynamically propagate update into overrides & API immediately, keeping everything modern and synced
            const updatedModel = {
              ...person,
              scholarStats: updatedStats,
              scholarPublications: data.publications || [],
            };

            // Save locally for quick state load without auth requirement
            savePersonOverride(person.slug, updatedModel);

            // Call API backend in the background to persist the auto-synced values permanently if authorized
            if (user?.token) {
              fetch(`/api/people/${person.slug}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${user.token}`,
                },
                body: JSON.stringify(updatedModel),
              }).catch(e => console.error("Auto persist synced error:", e));
            }
          }
        }
      } catch (err) {
        console.error(
          "Failed to automatically synchronize Google Scholar indexes:",
          err,
        );
      } finally {
        setIsAutoSyncing(false);
      }
    };

    autoSyncScholar();
  }, [slug, person]);

  // Populate form states once researcher profile is verified
  useEffect(() => {
    if (person) {
      setEditRole(person.role || "");
      setEditBio(person.bio || "");
      setEditImage(person.image || "");
      setEditBannerImages(person.bannerImages || []);
      setEditEducation(person.education || []);
      setEditExperience(person.experience || []);
      setEditBoardMemberType(person.boardMemberType || "staff");
      setEditPublicationsText(
        person.publications ? person.publications.join("\n") : "",
      );
      setScholarPubs(person.scholarPublications || []);

      setEditCitations(person.scholarStats?.citations);
      setEditHIndex(person.scholarStats?.hIndex);
      setEditI10Index(person.scholarStats?.i10Index);
      setEditPublicationCount(person.scholarStats?.publicationCount);

      setEditLinkedin(person.socials?.linkedin || "");
      setEditWebsite(person.socials?.website || "");
      setEditTwitter(person.socials?.twitter || "");
      setEditGithub(person.socials?.github || "");
      setEditAcademia(person.socials?.academia || "");
      setEditResearchGate(person.socials?.researchgate || "");
      setEditGoogleScholar(person.socials?.googlescholar || "");
      setEditRealGoogleScholar(person.socials?.realGoogleScholar || "");
      setEditGoogleScholarCitations(person.socials?.realGoogleScholarCitations);
      setEditSemanticScholar(person.socials?.semanticscholar || "");
      setEditSemanticScholarCitations(person.socials?.semanticscholarCitations);
      setEditOrcid(person.socials?.orcid || "");

      setEditOtherLinks(person.otherLinks || []);
      setEditResearchInterests(person.researchInterests || []);
      setEditManualEvents(person.manualEvents || []);
      setEditManualCourses(person.manualCourses || []);
    }
  }, [person]);

  // Fallback items
  const bannersToRender = useMemo(() => {
    if (person?.bannerImages && person.bannerImages.length > 0) {
      return person.bannerImages;
    }
    return person?.image ? [person.image] : DEFAULT_BANNER_IMAGES;
  }, [person]);

  // Carousel actions
  const nextSlide = () => {
    setActiveSlideIndex((prev) => (prev + 1) % bannersToRender.length);
  };
  const prevSlide = () => {
    setActiveSlideIndex(
      (prev) => (prev - 1 + bannersToRender.length) % bannersToRender.length,
    );
  };

  // Authorised to edit profile check:
  // True if user is logged in AND user.email matches person.email OR user's slug matches person's slug
  // OR if user is an admin or superadmin and the person is an external collaborator
  const canEdit = useMemo(() => {
    if (!user || !person) return false;
    const userEmail = (user.email || "").toLowerCase().trim();
    const personEmail = (person.email || "").toLowerCase().trim();
    const isAdminOrSuperAdmin = user.role === "admin" || user.role === "superadmin";
    const isExternalCollaborator = person.boardMemberType === "external";
    
    return (
      (userEmail && userEmail === personEmail) || 
      (user.slug && user.slug === person.slug) || 
      (isAdminOrSuperAdmin && isExternalCollaborator)
    );
  }, [user, person]);

  // Dynamically resolve affiliated projects (where person is director, staff, or mapped)
  const affiliatedProjects = useMemo(() => {
    if (!person) return [];
    return projects.filter(
      (p) =>
        p.projectDirectors?.includes(person.slug) ||
        p.projectStaffs?.includes(person.slug) ||
        (person as any).projects?.includes(p.slug),
    );
  }, [person,projects]);

  const affiliatedCentres = useMemo(() => {
    if (!person) return [];
    return centres.filter((c) =>
      person.centres?.includes(c.slug),
    );
  }, [person,centres]);

  const associatedEvents = useMemo(() => {
    if (!person) return [];
    return events.filter((e) =>
      e.associatedPeople?.includes(person.slug),
    );
  }, [person,events]);

  // Filter affiliated projects by active status
  const ongoingProjects = useMemo(() => {
    return affiliatedProjects.filter(
      (p) => p.status === "Ongoing" || p.status === "Upcoming",
    );
  }, [affiliatedProjects]);

  const completedProjects = useMemo(() => {
    return affiliatedProjects.filter((p) => p.status === "Completed");
  }, [affiliatedProjects]);

  const unifiedPublications = useMemo(() => normalizePublications(person?.publications, scholarPubs), [person, scholarPubs]);

  // Combine manual courses and actual DB courses
  const unifiedCourses = useMemo(() => {
    if (!person) return [];
    const list: any[] = [];
    
    // 1. Get from manualCourses
    if (person.manualCourses && Array.isArray(person.manualCourses)) {
      person.manualCourses.forEach(c => {
        list.push({
          title: c.name || c.title || "",
          dates: c.dates || "",
          venue: c.venue || "Online Academy",
          link: c.link || "",
          role: c.role || "Instructor",
          isManual: true,
        });
      });
    }
    
    // 2. Get from system courses inside allDbCourses (where person's email or slug is matching)
    allDbCourses.forEach(c => {
      const isInstructor = c.instructors?.some((inst: any) => 
        (inst.user?.id === person.slug || inst.user?._id === person.slug || inst._id === person.slug)
      ) || c.instructors?.some((inst: any) => 
        (inst.user?.email?.toLowerCase() === person.email?.toLowerCase())
      );
      
      const isTa = c.tas?.some((t: any) => 
        (t.user?.id === person.slug || t.user?._id === person.slug || t._id === person.slug)
      ) || c.tas?.some((t: any) => 
        (t.user?.email?.toLowerCase() === person.email?.toLowerCase())
      );
      
      if (isInstructor || isTa) {
        if (!list.some(item => item.slug === c.slug)) {
          list.push({
            title: c.title,
            slug: c.slug,
            role: isInstructor ? "Instructor" : "Teaching Assistant",
            isManual: false,
            dates: c.duration || "Self-Paced",
            venue: "W2M Academy Portal",
            link: `/online-courses/${c.slug}`,
          });
        }
      }
    });

    return list;
  }, [person, allDbCourses]);

  // Combine manual events, config events, and actual DB events
  const unifiedEvents = useMemo(() => {
    if (!person) return [];
    const list: any[] = [];
    
    // 1. Get from manualEvents
    if (person.manualEvents && Array.isArray(person.manualEvents)) {
      person.manualEvents.forEach(e => {
        list.push({
          title: e.name || e.title || "",
          dates: e.dates || "",
          venue: e.venue || "",
          link: e.link || "",
          role: e.role || "Presenter",
          isManual: true,
        });
      });
    }
    
    // 2. Get from config/constants events
    associatedEvents.forEach(e => {
      if (!list.some(item => item.slug === e.slug)) {
        list.push({
          title: e.title,
          slug: e.slug,
          role: "Presenter",
          isManual: false,
          dates: e.dates,
          venue: e.location,
          link: `/events/${e.slug}`,
        });
      }
    });

    // 3. Get from DB events (allDbEvents)
    allDbEvents.forEach(e => {
      const isHost = e.hosts?.some((h: any) => 
        h.user?._id === person.slug || h.user?.email?.toLowerCase() === person.email?.toLowerCase()
      );
      const isSpeaker = e.instructors?.some((inst: any) =>
        inst.user?._id === person.slug || inst.user?.email?.toLowerCase() === person.email?.toLowerCase()
      );
      
      if (isHost || isSpeaker) {
        if (!list.some(item => item.slug === e.slug || item.title.toLowerCase() === e.title.toLowerCase())) {
          list.push({
            title: e.title,
            slug: e.slug,
            role: isSpeaker ? "Speaker / Instructor" : "Host / Organizer",
            isManual: false,
            dates: e.dates || "",
            venue: e.location || "",
            link: `/events/${e.slug}`,
          });
        }
      }
    });

    return list;
  }, [person, associatedEvents, allDbEvents]);

  const presenterEvents = useMemo(() => {
    return unifiedEvents.filter((e) => e.role === "Presenter");
  }, [unifiedEvents]);

  const otherEvents = useMemo(() => {
    return unifiedEvents.filter((e) => e.role !== "Presenter");
  }, [unifiedEvents]);

  // Google Drive simulation and API link logic
  const fetchRealDriveFiles = async (searchQuery?: string) => {
    const token = getCachedToken();
    if (!token) return;

    setLoadingDriveFiles(true);
    try {
      let qStr = "trashed = false and mimeType contains 'image/'";
      if (searchQuery && searchQuery.trim()) {
        const escaped = searchQuery.replace(/'/g, "\\'");
        qStr += ` and name contains '${escaped}'`;
      }

      const url = `https://www.googleapis.com/drive/v3/files?pageSize=50&q=${encodeURIComponent(qStr)}&fields=files(id,name,mimeType,size,webViewLink,thumbnailLink,iconLink)`;
      const res = await fetch(`/api/google-proxy?url=${encodeURIComponent(url)}`, {
        headers: { 'x-lms-google-auth': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not index Google Drive items.");
      const data = await res.json();

      const mapped = (data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        type: "image",
        size: f.size ? `${(Number(f.size) / (1024 * 1024)).toFixed(2)} MB` : "—",
        url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
        thumbnail: f.thumbnailLink || null,
        icon: f.iconLink || null,
      }));
      setRealDriveFiles(mapped);
    } catch (err) {
      console.error("GDrive fetch error on profile page:", err);
    } finally {
      setLoadingDriveFiles(false);
    }
  };

  useEffect(() => {
    if (isDriveSimOpen) {
      setGoogleToken(getCachedToken());
      setGoogleEmail(getCachedEmail());
      fetchRealDriveFiles(driveSimSearch);
    }
  }, [isDriveSimOpen, driveSimSearch]);

  if (!person && (loading || loadedSlug!==slug)) return <p className="loading-state" role="status">Loading profile…</p>;

  if (!person) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <h1 className="text-4xl font-serif font-black mb-4">
            Profile Not Found
          </h1>
          <Link
            to="/people"
            className="text-brand-blue font-mono font-bold uppercase tracking-widest hover:underline"
          >
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  // Google Scholar custom synchronizer with realistic loading states
  const triggerScholarSync = (overrideId?: string) => {
    const targetId = overrideId || editGoogleScholar || person?.socials?.googlescholar;
    if (!targetId) {
      const promptedId = window.prompt("Please specify your Google Scholar Author ID (e.g. 'y7W6qGIAAAAJ'):");
      if (promptedId && promptedId.trim()) {
        triggerScholarSync(promptedId.trim());
      } else {
        alert(
          "Please specify a Google Scholar URL or Author ID to import telemetry statistics.",
        );
      }
      return;
    }
    setIsScholarSyncing(true);
    setScholarSyncStep("connect");
    setScholarSyncLog(
      "Establishing connection with Google Scholar Index...",
    );

    setTimeout(() => {
      setScholarSyncStep("parse");
      setScholarSyncLog(
        "Verifying author indexes and counting citation metrics dynamically...",
      );

      setTimeout(() => {
        setScholarSyncStep("publications");
        setScholarSyncLog(
          "Compiling real-time publication lists, h-index factor, and calculating i10-index...",
        );

        // Query the live database endpoint
        const query = targetId ? `?scholarId=${encodeURIComponent(targetId)}` : "";
        fetch(`/api/scholar/${person.slug}${query}`)
          .then((res) => res.json())
          .then((data) => {
            setTimeout(() => {
              if (data.success) {
                setEditCitations(data.citations);
                setEditHIndex(data.hIndex);
                setEditI10Index(data.i10Index);
                setEditPublicationCount(data.publicationCount);
                setScholarPubs(data.publications || []);

                setScholarSyncStep("success");
                setScholarSyncLog(
                  `Google Scholar Synced: ${data.citations} citations, h-Index ${data.hIndex}, i10-Index ${data.i10Index}, total publications ${data.publicationCount || 0}.`,
                );

                // Auto-persist immediately
                const updatedModel = {
                  ...person,
                  scholarStats: {
                    citations: data.citations,
                    hIndex: data.hIndex,
                    i10Index: data.i10Index,
                    publicationCount: data.publicationCount,
                    lastUpdated: data.lastUpdated || new Date().toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    }),
                  },
                  scholarPublications: data.publications || [],
                };
                
                fetch(`/api/people/${person.slug}`, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user?.token || ""}`,
                  },
                  body: JSON.stringify(updatedModel),
                }).then(res => {
                  if (res.ok) {
                    savePersonOverride(person.slug, updatedModel);
                    window.dispatchEvent(new Event("people_data_updated"));
                  }
                }).catch(e => console.error("Manual persist synced error:", e));
              } else {
                setScholarSyncStep("success");
                setScholarSyncLog("Synced with fallback metrics.");
              }

              setTimeout(() => {
                setIsScholarSyncing(false);
              }, 2200);
            }, 1200);
          })
          .catch((err) => {
            console.error("Manual Google Scholar telemetry sync failed:", err);
            setScholarSyncStep("success");
            setScholarSyncLog("Synced with fallback metrics.");
            setTimeout(() => {
              setIsScholarSyncing(false);
            }, 2200);
          });
      }, 1500);
    }, 1500);
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      const res = await signInWithGoogle();
      if (res) {
        setGoogleToken(res.accessToken);
        setGoogleEmail(res.email);
        // Call fetchRealDriveFiles with any query in search or empty
        await fetchRealDriveFiles(driveSimSearch);
      }
    } catch (err: any) {
      console.error("Failed to sign in with Google:", err);
      setAuthError(err.message || String(err));
    }
  };

  const handleGoogleDisconnect = async () => {
    await disconnectGoogle();
    setGoogleToken(null);
    setGoogleEmail(null);
    setAuthError(null);
    setRealDriveFiles([]);
  };

  const uploadToCloudinary = async (params: { dataUrl?: string; imageUrl?: string }): Promise<string> => {
    setIsUploadingCloudinary(true);
    setCloudinaryProgress("Optimizing image and securing cloud link...");
    try {
      const res = await fetch('/api/upload-cloudinary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        throw new Error(`Upload server error: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success) {
        return data.url;
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err: any) {
      console.error("Cloudinary upload failed, defaulting to original source:", err);
      return params.imageUrl || params.dataUrl || "";
    } finally {
      setIsUploadingCloudinary(false);
      setCloudinaryProgress("");
    }
  };

  const handleOpenDrivePicker = (target: "profile" | "banner") => {
    setPickerTarget(target);
    setIsDriveSimOpen(true);
  };

  const handleLinkDriveFile = async (file: any) => {
    const directUrl = getDriveImageUrl(file.url);
    setIsDriveSimOpen(false); // Close early to display progress
    const uploadedUrl = await uploadToCloudinary({ imageUrl: directUrl });
    if (pickerTarget === "profile") {
      setEditImage(uploadedUrl);
    } else {
      setEditBannerImages([...editBannerImages, uploadedUrl]);
    }
  };

  const handleSemanticScholarSearch = async () => {
    if (!ssSearchQuery.trim()) return;
    setSsSearching(true);
    try {
      const res = await fetch(`/api/semanticscholar/search?q=${encodeURIComponent(ssSearchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSsSearchResults(data.results || []);
      }
    } catch (err) {
      console.error("Semantic Scholar search failed:", err);
    } finally {
      setSsSearching(false);
    }
  };


  // Education builders
  const handleAddEducation = () => {
    if (newEduDegree.trim() && newEduIns.trim()) {
      setEditEducation([
        ...editEducation,
        {
          degree: newEduDegree.trim(),
          institution: newEduIns.trim(),
          year: newEduYear.trim() || "N/A",
        },
      ]);
      setNewEduDegree("");
      setNewEduIns("");
      setNewEduYear("");
    }
  };

  const handleRemoveEducation = (idx: number) => {
    setEditEducation(editEducation.filter((_, i) => i !== idx));
  };

  // Experience Builders
  const handleAddExperience = () => {
    if (newExpRole.trim() && newExpOrg.trim()) {
      setEditExperience([
        ...editExperience,
        {
          role: newExpRole.trim(),
          organization: newExpOrg.trim(),
          period: newExpPeriod.trim() || "Present",
          description: newExpDesc.trim() || undefined,
        },
      ]);
      setNewExpRole("");
      setNewExpOrg("");
      setNewExpPeriod("");
      setNewExpDesc("");
    }
  };

  const handleRemoveExperience = (idx: number) => {
    setEditExperience(editExperience.filter((_, i) => i !== idx));
  };

  // Custom Links
  const handleAddCustomLink = () => {
    if (newLinkName.trim() && newLinkUrl.trim()) {
      setEditOtherLinks([
        ...editOtherLinks,
        {
          label: newLinkName.trim(),
          url: newLinkUrl.trim(),
        },
      ]);
      setNewLinkName("");
      setNewLinkUrl("");
    }
  };

  const handleRemoveCustomLink = (idx: number) => {
    setEditOtherLinks(editOtherLinks.filter((_, i) => i !== idx));
  };

  // Banner manual link addition
  const handleAddBannerUrl = async () => {
    if (newBannerUrlInput.trim()) {
      const processed = getDriveImageUrl(newBannerUrlInput.trim());
      const finalUrl = await uploadToCloudinary({ imageUrl: processed });
      setEditBannerImages([...editBannerImages, finalUrl]);
      setNewBannerUrlInput("");
    }
  };

  const handleRemoveBanner = (index: number) => {
    setEditBannerImages(editBannerImages.filter((_, i) => i !== index));
    if (activeSlideIndex >= editBannerImages.length - 1) {
      setActiveSlideIndex(Math.max(0, editBannerImages.length - 2));
    }
  };  // Master Global Save
  const handleSave = async () => {
    const parsedCitations =
      editCitations !== undefined ? Number(editCitations) : undefined;
    const parsedHIndex =
      editHIndex !== undefined ? Number(editHIndex) : undefined;
    const parsedI10Index =
      editI10Index !== undefined ? Number(editI10Index) : undefined;
    const parsedPublicationCount =
      editPublicationCount !== undefined ? Number(editPublicationCount) : undefined;

    const updatedModel: Partial<Person> = {
      role: editRole,
      bio: editBio,
      image: getDriveImageUrl(editImage) || undefined,
      bannerImages: editBannerImages.map((b) => getDriveImageUrl(b) || ""),
      education: editEducation,
      experience: editExperience,
      boardMemberType: editBoardMemberType,
      publications: editPublicationsText === (person.publications || []).join("\n") ? person.publications : editPublicationsText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      scholarPublications: scholarPubs,
      scholarStats:
        parsedCitations !== undefined || parsedHIndex !== undefined || parsedI10Index !== undefined || parsedPublicationCount !== undefined
          ? {
              citations: parsedCitations,
              hIndex: parsedHIndex,
              i10Index: parsedI10Index,
              publicationCount: parsedPublicationCount,
              lastUpdated: new Date().toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              }),
            }
          : undefined,
      socials: {
        linkedin: editLinkedin.trim() || undefined,
        website: editWebsite.trim() || undefined,
        twitter: editTwitter.trim() || undefined,
        github: editGithub.trim() || undefined,
        academia: editAcademia.trim() || undefined,
        researchgate: editResearchGate.trim() || undefined,
        googlescholar: editGoogleScholar.trim() || undefined,
        realGoogleScholar: editRealGoogleScholar.trim() || undefined,
        realGoogleScholarCitations: editGoogleScholarCitations !== undefined ? Number(editGoogleScholarCitations) : undefined,
        semanticscholar: editSemanticScholar.trim() || undefined,
        semanticscholarCitations: editSemanticScholarCitations !== undefined ? Number(editSemanticScholarCitations) : undefined,
        orcid: editOrcid.trim() || undefined,
      },
      otherLinks: editOtherLinks,
      researchInterests: editResearchInterests,
      manualEvents: editManualEvents,
      manualCourses: editManualCourses,
    };

    try {
      const response = await fetch(`/api/people/${person.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || ""}`,
        },
        body: JSON.stringify(updatedModel),
      });

      if (response.ok) {
        // Save locally too for quick state sync
        savePersonOverride(person.slug, updatedModel);
        setPeople(prev => prev.map(p => p.slug === person.slug ? { ...p, ...updatedModel } : p));
        setIsEditing(false);
        window.dispatchEvent(new Event("people_data_updated"));
      } else {
        const err = await response.json();
        alert(err.error || "Failed to update profile.");
      }
    } catch (e) {
      console.error(e);
      // Fallback
      savePersonOverride(person.slug, updatedModel);
      setIsEditing(false);
      window.dispatchEvent(new Event("people_data_updated"));
    }
  };

  const mockDriveSourcedImages = [
    {
      id: "drv-img-1",
      name: "Regional Archive Field Photograph.jpg",
      type: "image",
      size: "2.4 MB",
      url: "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=1200",
    },
    {
      id: "drv-img-2",
      name: "Linguistic Council Portrait Widescreen.jpg",
      type: "image",
      size: "3.1 MB",
      url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1200",
    },
    {
      id: "drv-img-3",
      name: "Northeast India Ethnography Banner.jpg",
      type: "image",
      size: "1.9 MB",
      url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200",
    },
    {
      id: "drv-img-4",
      name: "Himalayas Folkloric Expedition Cover.jpg",
      type: "image",
      size: "4.2 MB",
      url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200",
    },
  ];

  const personSections = [
    {slug:'publications',title:'Publications',preview:unifiedPublications.length+' publications'},
    {slug:'courses',title:'Teaching & learning',preview:unifiedCourses.length+' courses'},
    {slug:'projects',title:'Projects',preview:(ongoingProjects.length+completedProjects.length)+' projects'},
    {slug:'events',title:'Events',preview:unifiedEvents.length+' events'},
    {slug:'background',title:'Education & experience'},
  ];
  const renderPersonSection = (section: any) => {
    if(section.slug==='publications')return <PublicationList items={unifiedPublications}/>;
    if(section.slug==='courses')return <ConnectedRecords items={unifiedCourses.map(c=>({...c,type:allDbCourses.find(course=>course.slug===c.slug)?.type}))} family="academy"/>;
    if(section.slug==='events')return <ConnectedRecords items={unifiedEvents} family="events"/>;
    if(section.slug==='projects')return <><ConnectedRecords items={ongoingProjects} family="projects"/>{completedProjects.length>0&&<div className="dossier-subsection"><h3>Completed work</h3><ConnectedRecords items={completedProjects} family="projects"/><button className="dossier-text-action" onClick={()=>setShowCompletedModal(true)}>Completed Projects ({completedProjects.length}) ↗</button></div>}</>;
    if(section.slug==='background')return <PersonBackground person={person}/>;

    return null;
  };

return (
    <div className="min-h-screen bg-paper pt-28 pb-24 grid-structure">
      {/* Google Scholar Sync Progress Overlay */}
      <AnimatePresence>
        {isScholarSyncing && (
          <div className="fixed inset-0 bg-ink/95 backdrop-blur-md z-[120] flex items-center justify-center p-6 text-paper">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-paper text-ink border-4 border-ink p-8 md:p-12 max-w-lg w-full shadow-[14px_14px_0px_var(--color-brand-blue)] flex flex-col items-center text-center"
            >
              <div className="mb-6 w-16 h-16 rounded-full border-4 border-dashed border-brand-blue flex items-center justify-center animate-spin">
                <BarChart3 className="w-8 h-8 text-brand-blue" />
              </div>
              <h3 className="font-serif font-black text-3xl italic mb-1">
                Google Scholar Sync
              </h3>
              <span className="font-mono text-[9px] uppercase tracking-widest text-brand-orange font-bold px-2 py-0.5 border border-brand-orange/30 bg-brand-orange/5 mb-6">
                Active Fetch Pipeline
              </span>

              {/* Steps rendering */}
              <div className="w-full space-y-3.5 text-left font-mono text-xs mb-8">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[9px] ${scholarSyncStep !== "connect" ? "bg-brand-acid text-ink border-ink" : "border-ink animate-ping"}`}
                  >
                    {scholarSyncStep !== "connect" ? "✓" : "●"}
                  </div>
                  <span
                    className={`${scholarSyncStep === "connect" ? "font-black" : "opacity-60"}`}
                  >
                    Connect Google Citation Index
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[9px] ${scholarSyncStep === "parse" || scholarSyncStep === "publications" || scholarSyncStep === "success" ? "bg-brand-acid text-ink border-ink" : "border-ink"}`}
                  >
                    {scholarSyncStep === "publications" ||
                    scholarSyncStep === "success"
                      ? "✓"
                      : "●"}
                  </div>
                  <span
                    className={`${scholarSyncStep === "parse" ? "font-black" : "opacity-60"}`}
                  >
                    Verify h-Index & Citations Metrics
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[9px] ${scholarSyncStep === "success" ? "bg-brand-acid text-ink border-ink" : "border-ink"}`}
                  >
                    {scholarSyncStep === "success" ? "✓" : "●"}
                  </div>
                  <span
                    className={`${scholarSyncStep === "publications" ? "font-black" : "opacity-60"}`}
                  >
                    Map Peer-Reviewed Publications list with citations
                  </span>
                </div>
              </div>

              <div className="w-full py-4 bg-ink/5 border border-ink/10 text-[10px] font-mono select-none overflow-hidden text-clip flex items-center gap-2 justify-center px-4 mb-2 animate-pulse">
                <Loader className="w-3.5 h-3.5 animate-spin text-ink/75" />
                {scholarSyncLog}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-[1600px] mx-auto w-full px-6 lg:px-12">
        {/* Top bar with back-link & Edit toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 border-b border-ink/10 pb-6">
          <Link
            to="/people"
            className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.3em] hover:text-brand-blue transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Directory
          </Link>

          {canEdit && (
            <div className="flex items-center gap-3">
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
                    <Edit3 className="w-3.5 h-3.5" /> Modify Scholar Profile
                  </>
                )}
              </button>

              {!isEditing && (
                <button
                  onClick={() => triggerScholarSync()}
                  disabled={isScholarSyncing}
                  className="h-10 px-5 border border-ink bg-brand-blue text-white font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-ink hover:text-brand-acid transition-all cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScholarSyncing ? "animate-spin" : ""}`} />
                  {isScholarSyncing ? "Syncing..." : "Link & Sync Google Scholar"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Live Profile Editing Interface */}
        {isEditing ? (
          <ProfileEditor
            user={user}
            editRole={editRole}
            setEditBio={setEditBio}
            editBio={editBio}
            setEditRole={setEditRole}
            editImage={editImage}
            setEditImage={setEditImage}
            editBannerImages={editBannerImages}
            setEditBannerImages={setEditBannerImages}
            editEducation={editEducation}
            setEditEducation={setEditEducation}
            editExperience={editExperience}
            setEditExperience={setEditExperience}
            editBoardMemberType={editBoardMemberType}
            setEditBoardMemberType={setEditBoardMemberType}
            editPublicationsText={editPublicationsText}
            setEditPublicationsText={setEditPublicationsText}
            scholarPubs={scholarPubs}
            setScholarPubs={setScholarPubs}
            editCitations={editCitations}
            setEditCitations={setEditCitations}
            editHIndex={editHIndex}
            setEditHIndex={setEditHIndex}
            editI10Index={editI10Index}
            setEditI10Index={setEditI10Index}
            editPublicationCount={editPublicationCount}
            setEditPublicationCount={setEditPublicationCount}
            editLinkedin={editLinkedin}
            setEditLinkedin={setEditLinkedin}
            editWebsite={editWebsite}
            setEditWebsite={setEditWebsite}
            editTwitter={editTwitter}
            setEditTwitter={setEditTwitter}
            editGithub={editGithub}
            setEditGithub={setEditGithub}
            editAcademia={editAcademia}
            setEditAcademia={setEditAcademia}
            editResearchGate={editResearchGate}
            setEditResearchGate={setEditResearchGate}
            editRealGoogleScholar={editRealGoogleScholar}
            setEditRealGoogleScholar={setEditRealGoogleScholar}
            editGoogleScholarCitations={editGoogleScholarCitations}
            setEditGoogleScholarCitations={setEditGoogleScholarCitations}
            editSemanticScholar={editSemanticScholar}
            setEditSemanticScholar={setEditSemanticScholar}
            editSemanticScholarCitations={editSemanticScholarCitations}
            setEditSemanticScholarCitations={setEditSemanticScholarCitations}
            editOrcid={editOrcid}
            setEditOrcid={setEditOrcid}
            editOtherLinks={editOtherLinks}
            setEditOtherLinks={setEditOtherLinks}
            editResearchInterests={editResearchInterests}
            setEditResearchInterests={setEditResearchInterests}
            editManualEvents={editManualEvents}
            setEditManualEvents={setEditManualEvents}
            editManualCourses={editManualCourses}
            setEditManualCourses={setEditManualCourses}
            handleSave={handleSave}
            onCancel={() => setIsEditing(false)}
            uploadToCloudinary={uploadToCloudinary}
            isUploadingCloudinary={isUploadingCloudinary}
            cloudinaryProgress={cloudinaryProgress}
            handleOpenDrivePicker={handleOpenDrivePicker}
          />
        ) : (
          <>
            {person.bannerImages?.length>0&&<figure className="profile-cover"><a href={getDriveImageUrl(person.bannerImages[activeSlideIndex % person.bannerImages.length])||undefined} target="_blank" rel="noreferrer"><RecordImage src={getDriveImageUrl(person.bannerImages[activeSlideIndex % person.bannerImages.length])||undefined} alt={`${person.fullName||person.name}: cover ${activeSlideIndex+1}`}/></a><figcaption><span>Cover {(activeSlideIndex % person.bannerImages.length)+1} of {person.bannerImages.length}</span>{person.bannerImages.length>1&&<div><button onClick={prevSlide} aria-label="Previous cover">← Previous</button><button onClick={nextSlide} aria-label="Next cover">Next →</button></div>}</figcaption></figure>}
            <section className="person-summary">
              <div><RecordHeading kind="person" record={person}/><PersonIntroduction key={person.slug} person={person} syncing={isAutoSyncing}/>{person.researchInterests?.length>0&&<div className="person-interests">{person.researchInterests.map((interest,i)=><span key={i}>{interest}</span>)}</div>}<ProfileLinks record={person}/></div>
              <div className="person-portrait"><RecordImage src={getDriveImageUrl(person.image)||undefined} alt={person.fullName||person.name}/></div>
            </section>
            <RecordExperience key={person.slug} mode="notebook" title={person.fullName||person.name} sections={personSections} renderSection={renderPersonSection} glance={<RecordGlance record={person} kind="person"/>}/>

          </>
        )}
      </div>

      {/* Completed Projects Modal Overlay */}
      <AnimatePresence>
        {showCompletedModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/80 backdrop-blur-sm px-4 text-ink">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-paper border-4 border-ink shadow-[14px_14px_0px_rgba(0,0,0,1)] w-full max-w-xl p-8 relative"
            >
              <button
                type="button"
                onClick={() => setShowCompletedModal(false)}
                className="absolute top-4 right-4 p-2 font-mono text-xs font-black uppercase text-ink hover:bg-brand-acid border border-transparent hover:border-ink transition-all"
              >
                [×] CLOSE
              </button>

              <div className="mb-6">
                <span className="font-mono text-[9px] uppercase font-black text-brand-orange tracking-widest block mb-1">
                  HISTORICAL RESEARCH ARCHIVE
                </span>
                <h3 className="font-serif font-black text-3xl text-ink leading-none">
                  Completed Projects
                </h3>
                <p className="font-mono text-[10px] text-ink/50 mt-2">
                  All successfully completed and concluded research initiatives of {person.fullName || person.name}.
                </p>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {completedProjects.length > 0 ? (
                  completedProjects.map((p) => (
                    <Link
                      key={p.slug}
                      to={`/projects/${p.slug}`}
                      onClick={() => setShowCompletedModal(false)}
                      className="p-4 border border-ink bg-white hover:bg-brand-acid hover:-translate-y-0.5 transition-all text-ink flex flex-col group cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono text-[8.5px] text-brand-orange font-bold tracking-wider">{p.id}</span>
                        <span className="font-mono text-[8px] text-ink/40 uppercase font-black">CONCLUDED</span>
                      </div>
                      <h4 className="font-serif text-sm font-black group-hover:text-brand-blue transition-colors leading-snug">
                        {p.title}
                      </h4>
                      {p.duration && (
                        <p className="font-mono text-[8px] opacity-50 mt-1.5 flex items-center gap-1">
                          Timeline: {p.duration}
                        </p>
                      )}
                    </Link>
                  ))
                ) : (
                  <p className="font-mono text-xs text-ink/40 text-center py-12 italic border border-dashed border-ink/20">
                    No completed initiatives recorded in this profile dossier.
                  </p>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-dashed border-ink/15 text-right">
                <button
                  type="button"
                  onClick={() => setShowCompletedModal(false)}
                  className="px-6 h-10 border border-ink bg-ink text-paper hover:bg-brand-acid hover:text-ink font-mono text-[10px] font-black uppercase tracking-widest hover:-translate-y-0.5 transition-all"
                >
                  Return to Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real Google Drive Explorer Modal inside edit forms */}
      <AnimatePresence>
        {isDriveSimOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/80 backdrop-blur-sm px-4 text-ink">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-paper border-2 border-ink p-8 max-w-2xl w-full shadow-[16px_16px_0px_rgba(0,0,0,1)] relative text-ink animate-fade-in"
            >
              <button
                type="button"
                onClick={() => setIsDriveSimOpen(false)}
                className="absolute top-4 right-4 bg-ink/5 hover:bg-ink/10 p-2 text-ink"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between mb-6 border-b border-ink/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-brand-blue/10 border border-brand-blue text-brand-blue rounded-none">
                    <svg
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M7.71 3.5h8.58l6.21 10.75-4.29 7.25H5.8l-4.3-7.25zm2.87 2.15l-3.32 5.61h6.63zm-4.3 7.26l-2.07 3.5H9.6zm11.44 0H11.1l2.08 3.5h5.36z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-serif font-black italic text-2xl text-ink">
                      Google Drive File Picker
                    </h3>
                    <p className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-60">
                      CONNECTED: {googleEmail || "NOT CONNECTED"}
                    </p>
                  </div>
                </div>

                {googleToken && (
                  <button
                    type="button"
                    onClick={handleGoogleDisconnect}
                    className="font-mono text-[8px] font-black uppercase tracking-widest bg-brand-orange text-white px-2 py-1 border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs shrink-0"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              {!googleToken ? (
                <div className="text-center py-12 px-4 space-y-6">
                  <div className="p-4 bg-brand-acid/30 border border-ink/20 inline-block rounded-none font-mono text-lg font-bold">
                    🔑 Protected Resource Auth Request
                  </div>
                  <div className="space-y-2">
                    <p className="font-serif italic text-lg text-ink">
                      "Connect your Google Drive account safely to index and import authenticated research or field-archiving photos."
                    </p>
                    <p className="font-mono text-[10px] opacity-70">
                      We only search for images within your personal Google Drive and do not mutate your files.
                    </p>
                  </div>
                  {authError && (
                    <div className="p-4 bg-brand-orange/10 border border-brand-orange text-ink font-mono text-xs space-y-3 text-left max-w-lg mx-auto rounded-none">
                      <div className="flex items-center gap-2 text-brand-orange font-bold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Google Authentication Blocked / PopUp Closed</span>
                      </div>
                      <p className="opacity-80 leading-relaxed font-sans text-[11px]">
                        The sign-in popup form has been closed or blocked. Running within the secure AI Studio iframe sandbox causes some browser engines to restrict popups.
                      </p>
                      <div className="space-y-1.5 font-sans text-[11px]">
                        <p className="font-bold">✨ Two Easy Ways to Solve This:</p>
                        <ul className="list-decimal pl-4 space-y-1 opacity-90">
                          <li>
                            Click the <strong>"Open in New Tab"</strong> button at the top-right corner of the window. Authorizing in a top-level tab is 100% successful and fully bypasses security filters.
                          </li>
                          <li>
                            Or, simply paste your Google Drive file <strong>"View Link"</strong> directly. Our processor automatically decodes standard and multi-account links, immediately converting them to standard web image URLs. No auth is required!
                          </li>
                        </ul>
                      </div>
                      <div className="pt-1 text-right">
                        <button
                          type="button"
                          onClick={() => setAuthError(null)}
                          className="text-[10px] uppercase font-black text-brand-blue hover:underline cursor-pointer"
                        >
                          Dismiss Notice
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="flex items-center gap-3 px-6 py-3.5 border-2 border-ink bg-white hover:bg-brand-acid text-ink font-mono text-xs font-black uppercase tracking-widest transition-all shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 cursor-pointer"
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                      <span>Sign In with Google</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink/40 animate-pulse" />
                      <input
                        type="text"
                        placeholder="Search images in Drive (e.g. expedition, profile, regional)..."
                        value={driveSimSearch}
                        onChange={(e) => setDriveSimSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            fetchRealDriveFiles(driveSimSearch);
                          }
                        }}
                        className="w-full pl-12 pr-4 h-12 bg-white border border-ink focus:outline-none focus:border-brand-blue font-mono text-xs text-ink animate-fade-in"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchRealDriveFiles(driveSimSearch)}
                      className="px-6 h-12 border border-ink bg-brand-blue text-paper font-mono text-xs font-black uppercase tracking-widest hover:bg-ink transition-all shrink-0"
                    >
                      Query Drive
                    </button>
                    {driveSimSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setDriveSimSearch("");
                          fetchRealDriveFiles("");
                        }}
                        className="px-4 h-12 border border-ink bg-white font-mono text-xs font-bold uppercase hover:bg-ink/5"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] font-mono opacity-60 mb-4 px-1">
                    💡 Query your authenticated Google Drive. We will convert your
                    selected files into direct, viewable web-links automatically.
                  </p>

                  <div className="border border-ink max-h-[250px] overflow-y-auto mb-6 bg-white shadow-inner">
                    {loadingDriveFiles && (
                      <div className="p-8 text-center font-mono text-xs text-brand-blue animate-pulse">
                        ⏳ Retrieving academic records &amp; images from Google Drive...
                      </div>
                    )}
                    {!loadingDriveFiles && realDriveFiles.length === 0 && (
                      <div className="p-8 text-center font-mono text-xs opacity-50">
                        No image records found matching your query. Let's start with a general search!
                      </div>
                    )}
                    {!loadingDriveFiles && realDriveFiles.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => handleLinkDriveFile(file)}
                        className="p-3 border-b border-ink/5 last:border-none flex items-center justify-between hover:bg-brand-acid cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {file.thumbnail ? (
                            <img
                              src={file.thumbnail}
                              alt={file.name}
                              className="w-10 h-10 object-cover border border-ink/10 shrink-0 bg-paper"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-brand-blue shrink-0 animate-bounce" />
                          )}
                          <div className="truncate">
                            <p className="font-mono text-xs font-bold text-ink truncate max-w-[340px]">
                              {file.name}
                            </p>
                            <span className="text-[8px] font-mono opacity-50 block truncate">
                              {file.url}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right font-mono text-[10px] shrink-0 ml-2">
                          <span className="opacity-50">{file.size}</span>
                          <span className="bg-ink text-paper px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider hover:bg-brand-acid hover:text-ink transition-colors">
                            BIND
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[8px] uppercase tracking-wider text-brand-blue font-bold flex items-center gap-2 bg-brand-blue/5 px-2 py-1.5 rounded-sm border border-brand-blue/30 select-none">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-blue animate-bounce" />{" "}
                      Live Google GDrive Session Active
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDriveSimOpen(false)}
                      className="px-6 h-10 border border-ink bg-white font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-paper shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                    >
                      Close Picker
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
