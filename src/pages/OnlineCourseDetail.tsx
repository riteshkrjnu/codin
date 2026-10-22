import ConnectedWriting from '../features/writing/ConnectedWriting';
import { eventParticipationActions } from '../site/eventParticipation';
import { registrationAvailability } from '../lib/participation';
import ParticipationActions from '../site/layout/ParticipationActions';
import { learningHref } from '../site/layout/learningAccess';
import { useLearningAccess } from '../site/useLearningAccess';
import { courseOverviewPages, isResidentialCourse } from '../site/coursePresentation';
import { useSiteData } from '../site/data';
import RecordContent from '../site/layout/RecordContent';
import RecordExperience from '../site/layout/RecordExperience';
import RecordGlance from '../site/layout/RecordGlance';
import { useLifecycleNow } from '../lib/lifecycleClock';
import RecordHeading from '../site/layout/RecordHeading';
import LearningNotes from '../site/LearningNotes';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { onlineCourses } from "../data/config";
import { getEffectiveStatus } from "../lib/courseStatus";
import {
  ArrowLeft,
  Play,
  FileText,
  CheckCircle,
  Clock,
  BookOpen,
  Download,
  Lock,
  CheckCircle2,
  Video,
  ClipboardList,
  Shield,
  Trash2,
  Edit,
  Plus,
  X,
  Search,
  Upload,
  ExternalLink,
  Calendar,
  Paperclip,
  FileCheck,
  Columns,
  Layers,
  AlertTriangle,
  Check,
  AlertCircle,
} from "lucide-react";
import { renderMarkdown } from "../lib/utils";

import { BrutalistLoader } from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import {
  getCachedToken,
  getCachedEmail,
  signInWithGoogle,
  disconnectGoogle,
} from "../lib/googleAuth";
import { createLiveClassSession, fetchCalendarEvents } from "../lib/googleMeetYoutubeApi";

import { StudentAssignmentView } from "../components/assignments/StudentAssignmentView";
import { InstructorAssignmentView } from "../components/assignments/InstructorAssignmentView";
import { AiSidekickPanel } from "../components/assignments/AiSidekickPanel";
import { Assignment } from "../types/assignments";

export default function OnlineCourseDetail() {
  const now=useLifecycleNow();
  const { slug } = useParams();
  const loc = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(loc.search);
  const {data:siteData}=useSiteData();
  const origin=searchParams.get("from");
  const eventContext=searchParams.get("context")==="event"||searchParams.get("context")!=="course"&&siteData.events.some(r=>!r.isCourse&&r.slug===slug);
  const contextQuery=`${eventContext?"&context=event":"&context=course"}${origin?`&from=${encodeURIComponent(origin)}`:""}`;
  const simulateParam = searchParams.get("simulate") === "true";
  const simulateUnenrolledParam = searchParams.get("simulate") === "unenrolled";

  const [course, setCourse] = useState<any>(null);
  const [fetchingCourse, setFetchingCourse] = useState(true);
  const { user, setShowModal } = useAuth();

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [myStatus, setMyStatus] = useState<any>(null);
  const learningAccess=useLearningAccess(slug,`${isEnrolled}:${myStatus?.participant?.admissionStatus||''}:${myStatus?.participant?.paymentStatus||''}`);
  const [payingFee, setPayingFee] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeVideo, setActiveVideo] = useState(
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1200",
  );
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editYoutubeChannel, setEditYoutubeChannel] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  // Advanced Course Materials and Modules Management States
  const [modulesList, setModulesList] = useState<any[]>([]);
  const [activeMaterial, setActiveMaterial] = useState<any>(null);

  // Assignments & Tasks states
  const [workMode, setWorkMode] = useState<"materials" | "assignments" | "sidekick">("materials");
  const [selectedAssignmentForAi, setSelectedAssignmentForAi] = useState<Assignment | null>(null);
  const [focusedQuestionForAiText, setFocusedQuestionForAiText] = useState<string>("");
  const [selectedModuleIdState, setSelectedModuleIdState] = useState<string>("");

  // Manage Materials Panel / Modal trigger
  const [showAddMaterialForMod, setShowAddMaterialForMod] = useState<
    string | null
  >(null);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);

  // Custom non-blocking dialog state variables to replace prompt, confirm, and alert
  const [isModCreateOpen, setIsModCreateOpen] = useState(false);
  const [newModTitleInput, setNewModTitleInput] = useState("");
  const [modToRename, setModToRename] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [modRenameTitle, setModRenameTitle] = useState("");
  const [modToDelete, setModToDelete] = useState<string | null>(null);
  const [matToDelete, setMatToDelete] = useState<{
    modId: string;
    matId: string;
  } | null>(null);
  const [matFormError, setMatFormError] = useState<string | null>(null);

  // Material Creation Form States
  const [newMatTitle, setNewMatTitle] = useState("");
  const [newMatType, setNewMatType] = useState("video"); // video, audio, live_lecture, pdf, image, text, document, link
  const [newMatGroup, setNewMatGroup] = useState("Readings"); // Readings, Class Recordings, Additional Materials, Custom
  const [customGroupText, setCustomGroupText] = useState("");
  const [newMatUrl, setNewMatUrl] = useState("");
  const [newMatDate, setNewMatDate] = useState("");
  const [newMatEndDate, setNewMatEndDate] = useState("");
  const [newMatText, setNewMatText] = useState("");
  const [newMatYoutubeVideoId, setNewMatYoutubeVideoId] = useState("");
  const [newMatStreamKey, setNewMatStreamKey] = useState("");
  const [newMatRtmpUrl, setNewMatRtmpUrl] = useState("");
  const [newMatStreamingMode, setNewMatStreamingMode] = useState<
    "gmeet" | "manual"
  >("gmeet");
  const [liveLectureYoutubeInput, setLiveLectureYoutubeInput] = useState("");
  const [selectedLectureVideo, setSelectedLectureVideo] = useState<File | null>(
    null,
  );
  const [uploadingLectureVideo, setUploadingLectureVideo] = useState(false);
  const [lectureUploadProgress, setLectureUploadProgress] = useState(0);

  // YouTube Upload Metadata Customization States
  const [ytUploadTitle, setYtUploadTitle] = useState("");
  const [ytUploadDescription, setYtUploadDescription] = useState("");
  const [ytUploadVisibility, setYtUploadVisibility] = useState<
    "public" | "unlisted" | "private"
  >("unlisted");

  // Sync the local input string when activeMaterial updates
  useEffect(() => {
    if (activeMaterial && activeMaterial.type === "live_lecture") {
      setLiveLectureYoutubeInput(
        activeMaterial.youtubeVideoId
          ? `https://www.youtube.com/watch?v=${activeMaterial.youtubeVideoId}`
          : "",
      );
      setSelectedLectureVideo(null);
      setLectureUploadProgress(0);
    }
  }, [activeMaterial]);

  // User workspace customization state (Layout & Size options)
  const [layoutMode, setLayoutMode] = useState<
    "split" | "fullscreen" | "minimized"
  >("split");
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(75);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [prevLayoutMode, setPrevLayoutMode] = useState<
    "split" | "fullscreen" | "minimized" | null
  >(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offset = e.clientX - rect.left;
      const percent = Math.min(80, Math.max(25, 100 - (offset / rect.width) * 100));
      setLeftWidthPercent(Math.round(percent));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || e.touches.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offset = e.touches[0].clientX - rect.left;
      const percent = Math.min(80, Math.max(25, 100 - (offset / rect.width) * 100));
      setLeftWidthPercent(Math.round(percent));
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging]);

  // Simulated Google Drive Selector Modal & Upload States
  const [isDriveSimOpen, setIsDriveSimOpen] = useState(false);
  const [driveSimSearch, setDriveSimSearch] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<string>("idle");
  const [uploadFileName, setUploadFileName] = useState("");

  const [googleEmailState, setGoogleEmailState] = useState<string | null>(null);
  const [selectedFileForUpload, setSelectedFileForUpload] =
    useState<File | null>(null);
  const [realDriveFiles, setRealDriveFiles] = useState<any[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);

  // Calendar Browsing & Bulk Importing States
  const [liveTab, setLiveTab] = useState<"schedule" | "browse">("schedule");
  const [selectedBrowseDate, setSelectedBrowseDate] = useState<string>("2026-06-10");
  const [browsedEvents, setBrowsedEvents] = useState<any[]>([]);
  const [isFetchingBrowseEvents, setIsFetchingBrowseEvents] = useState(false);
  const [selectedBrowseEventIds, setSelectedBrowseEventIds] = useState<string[]>([]);
  const [stagedReviewEvents, setStagedReviewEvents] = useState<any[]>([]);
  const [browseError, setBrowseError] = useState<string | null>(null);

  useEffect(() => {
    setGoogleEmailState(getCachedEmail());
  }, []);

  const driveFiles = [
    {
      id: "drv-doc-1",
      name: "Indic Linguistics Core Syllabus (Rev. 2026).docx",
      type: "document",
      size: "28 KB",
      url: "https://docs.google.com/document/d/1_demo_syllabus",
    },
    {
      id: "drv-pdf-2",
      name: "Required Readings Chapter 1 & 2.pdf",
      type: "pdf",
      size: "1.2 MB",
      url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    },
    {
      id: "drv-vid-3",
      name: "Recorded Classroom Phonetics Zoom Session.mp4",
      type: "video",
      size: "185 MB",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    {
      id: "drv-aud-4",
      name: "Phonology Pronunciation Audio - Accent Guide.mp3",
      type: "audio",
      size: "8.4 MB",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    }, // public mock url
    {
      id: "drv-slides-5",
      name: "Syntax_and_Semantics_Indic_LLMs.pptx",
      type: "document",
      size: "15.6 MB",
      url: "https://example.com/slides",
    },
  ];

  const displayedDriveFiles =
    googleEmailState ? realDriveFiles : driveFiles;

  const fetchRealDriveFiles = async (searchQuery?: string) => {
    const token = getCachedToken();
    if (!token) return;

    setLoadingDriveFiles(true);
    try {
      let qStr = "trashed = false";
      if (searchQuery && searchQuery.trim()) {
        const escaped = searchQuery.replace(/'/g, "\\'");
        qStr += ` and name contains '${escaped}'`;
      }

      const url = `https://www.googleapis.com/drive/v3/files?pageSize=100&q=${encodeURIComponent(qStr)}&fields=files(id,name,mimeType,size,webViewLink)`;

      const res = await fetch(
        `/api/google-proxy?url=${encodeURIComponent(url)}`,
        {
          headers: {
            "x-lms-google-auth": `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) {
        if (res.status === 401) {
          disconnectGoogle();
          setGoogleEmailState(null);
        }
        throw new Error("Failed to load files from Google Drive");
      }
      const data = await res.json();

      const mapped = (data.files || []).map((f: any) => {
        let type = "document";
        if (f.mimeType?.startsWith("video/")) type = "video";
        else if (f.mimeType?.startsWith("audio/")) type = "audio";
        else if (f.mimeType === "application/pdf") type = "pdf";
        else if (f.mimeType?.startsWith("image/")) type = "image";

        const byteSize = parseInt(f.size || "0");
        const formattedSize =
          byteSize > 0
            ? byteSize > 1024 * 1024
              ? `${(byteSize / (1024 * 1024)).toFixed(1)} MB`
              : `${(byteSize / 1024).toFixed(1)} KB`
            : "—";

        return {
          id: f.id,
          name: f.name,
          type,
          size: formattedSize,
          url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
        };
      });

      setRealDriveFiles(mapped);
    } catch (err) {
      console.error("Failed to fetch real Google Drive files:", err);
    } finally {
      setLoadingDriveFiles(false);
    }
  };

  useEffect(() => {
    if (isDriveSimOpen) {
      fetchRealDriveFiles();
    }
  }, [isDriveSimOpen]);

  // Helper to fallback to standard outlines if modulesList is empty in DB
  const getCourseModulesList = (c: any) => {
    if (c.modulesList && c.modulesList.length > 0) {
      return c.modulesList;
    }
    const outline = c.outline || [];
    const count = Math.max(c.modules || 0, outline.length, 1);
    return Array.from({ length: count }).map((_, i) => ({
      _id: `mod-fallback-${i}-${Date.now()}`,
      title: outline[i] || `Module ${i + 1}`,
      description: `Core concepts and methodologies for Module ${i + 1}`,
      materials: [],
    }));
  };

  useEffect(() => {
    if (course) {
      setEditTitle(course.title || "");
      setEditDesc(course.description || "");
      setEditYoutubeChannel(course.youtubeDesignatedChannel || "");

      // Load or fallback modules List
      const list =
        course.modulesList && course.modulesList.length > 0
          ? course.modulesList
          : getCourseModulesList(course);

      setModulesList(list);
    }
  }, [course]);

  // Handle active material auto-selection
  useEffect(() => {
    if (modulesList.length > 0 && !activeMaterial) {
      for (const m of modulesList) {
        if (m.materials && m.materials.length > 0) {
          setActiveMaterial(m.materials[0]);
          break;
        }
      }
    }
  }, [modulesList, activeMaterial]);

  // Helper to gather all course materials in sequence across all modules
  const getFlattenedMaterials = () => {
    const list: { material: any; moduleId: string; moduleTitle: string }[] = [];
    modulesList.forEach((mod) => {
      const mats = mod.materials || [];
      mats.forEach((mat: any) => {
        list.push({ material: mat, moduleId: mod._id, moduleTitle: mod.title });
      });
    });
    return list;
  };

  const getActiveModuleId = () => {
    if (selectedModuleIdState) {
      return selectedModuleIdState;
    }
    if (activeMaterial) {
      const parentMod = modulesList.find((m) =>
        (m.materials || []).some((mat: any) => mat._id === activeMaterial._id)
      );
      if (parentMod) return parentMod._id;
    }
    if (modulesList.length > 0) {
      return modulesList[0]._id;
    }
    return "";
  };

  const flattenedMats = getFlattenedMaterials();
  const currentIdx = activeMaterial
    ? flattenedMats.findIndex(
        (item) => item.material._id === activeMaterial._id,
      )
    : -1;

  const handleNextMaterial = () => {
    if (currentIdx !== -1 && currentIdx < flattenedMats.length - 1) {
      setActiveMaterial(flattenedMats[currentIdx + 1].material);
    }
  };

  const handlePrevMaterial = () => {
    if (currentIdx > 0) {
      setActiveMaterial(flattenedMats[currentIdx - 1].material);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if user is typing in forms, text inputs, textareas
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // 1. Layout View Switching Shortcuts: Alt + 1, Alt + 2, Alt + 3
      if (e.altKey && e.key === "1") {
        e.preventDefault();
        setLayoutMode("split");
        if (leftWidthPercent > 78)
          setLeftWidthPercent(100 - (100 - leftWidthPercent)); // Keep current width of left pane
      } else if (e.altKey && e.key === "2") {
        e.preventDefault();
        setLayoutMode("fullscreen");
      } else if (e.altKey && e.key === "3") {
        e.preventDefault();
        setLayoutMode("minimized");
      }

      // 2. Navigation through materials/videos:
      // Left Arrow or Alt + P
      else if (
        e.key === "ArrowLeft" ||
        (e.altKey && (e.key === "p" || e.key === "P"))
      ) {
        if (currentIdx > 0) {
          e.preventDefault();
          const targetMat = flattenedMats[currentIdx - 1].material;
          setActiveMaterial(targetMat);
          if (layoutMode === "minimized") {
            setLayoutMode("split");
          }
        }
      }
      // Right Arrow or Alt + N
      else if (
        e.key === "ArrowRight" ||
        (e.altKey && (e.key === "n" || e.key === "N"))
      ) {
        if (currentIdx !== -1 && currentIdx < flattenedMats.length - 1) {
          e.preventDefault();
          const targetMat = flattenedMats[currentIdx + 1].material;
          setActiveMaterial(targetMat);
          if (layoutMode === "minimized") {
            setLayoutMode("split");
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIdx, flattenedMats, layoutMode, leftWidthPercent]);

  // Calendar Browsing & Bulk Importing Handlers
  const handleFetchCalendarEvents = async () => {
    if (!selectedBrowseDate) {
      setBrowseError("Please select a date to browse events");
      return;
    }
    
    let token = getCachedToken();
    if (!token) {
      try {
        setIsFetchingBrowseEvents(true);
        setBrowseError(null);
        const authResult = await signInWithGoogle();
        token = authResult.accessToken;
        setGoogleEmailState(authResult.email);
      } catch (authErr: any) {
        setIsFetchingBrowseEvents(false);
        setBrowseError(authErr.message || "Google Authentication is required to browse your calendar.");
        return;
      }
    }
    
    if (!token) {
      setBrowseError("Google OAuth token is missing. Please connect your Google Account.");
      return;
    }
    
    try {
      setIsFetchingBrowseEvents(true);
      setBrowseError(null);
      const events = await fetchCalendarEvents(selectedBrowseDate, token);
      setBrowsedEvents(events);
      setSelectedBrowseEventIds([]);
      setStagedReviewEvents([]);
    } catch (err: any) {
      console.error("Failed to fetch calendar events", err);
      
      const isAuthError = err.message?.includes("expired") || 
                          err.message?.includes("401") || 
                          err.message?.includes("403") || 
                          err.message?.includes("UNAUTHENTICATED") ||
                          err.message?.includes("permissions");
                          
      if (isAuthError) {
        setGoogleEmailState(null);
        try {
          console.log("[LMS Calendar Browse] Token expired or invalid. Prompting user for re-authentication...");
          const authResult = await signInWithGoogle();
          const freshToken = authResult.accessToken;
          setGoogleEmailState(authResult.email);
          
          const events = await fetchCalendarEvents(selectedBrowseDate, freshToken);
          setBrowsedEvents(events);
          setSelectedBrowseEventIds([]);
          setStagedReviewEvents([]);
          return;
        } catch (authErr: any) {
          console.error("Re-authentication or retry failed:", authErr);
          setBrowseError(`Session expired. Re-authentication failed: ${authErr.message || authErr}`);
          return;
        }
      }
      
      setBrowseError(err.message || "Failed to retrieve calendar events. Please try again.");
    } finally {
      setIsFetchingBrowseEvents(false);
    }
  };

  const handleToggleEventSelection = (ev: any) => {
    if (selectedBrowseEventIds.includes(ev.id)) {
      setSelectedBrowseEventIds(selectedBrowseEventIds.filter(id => id !== ev.id));
      setStagedReviewEvents(stagedReviewEvents.filter(st => st.id !== ev.id));
    } else {
      setSelectedBrowseEventIds([...selectedBrowseEventIds, ev.id]);
      setStagedReviewEvents([...stagedReviewEvents, {
        id: ev.id,
        title: ev.summary,
        meetLink: ev.meetLink || "",
        localStart: ev.localStart || "",
        localEnd: ev.localEnd || "",
        description: ev.description || "",
        videoOverride: "",
        isStreamingMode: "manual"
      }]);
    }
  };

  const handleSelectAllEvents = () => {
    const allIds = browsedEvents.map(ev => ev.id);
    setSelectedBrowseEventIds(allIds);
    setStagedReviewEvents(browsedEvents.map(ev => ({
      id: ev.id,
      title: ev.summary,
      meetLink: ev.meetLink || "",
      localStart: ev.localStart || "",
      localEnd: ev.localEnd || "",
      description: ev.description || "",
      videoOverride: "",
      isStreamingMode: "manual"
    })));
  };

  const handleDeselectAllEvents = () => {
    setSelectedBrowseEventIds([]);
    setStagedReviewEvents([]);
  };

  const handleUpdateStagedEvent = (id: string, field: string, value: any) => {
    setStagedReviewEvents(stagedReviewEvents.map(st => {
      if (st.id === id) {
        return { ...st, [field]: value };
      }
      return st;
    }));
  };

  const handleImportCalendarEvents = async (modId: string) => {
    if (stagedReviewEvents.length === 0) {
      alert("No events are selected for review and saving.");
      return;
    }

    for (const staged of stagedReviewEvents) {
      if (!staged.title.trim()) {
        alert("Please ensure all selected events have a Title.");
        return;
      }
    }

    const groupName =
      newMatGroup === "Custom"
        ? customGroupText || "Additional Materials"
        : newMatGroup;

    const newMaterials = stagedReviewEvents.map((staged, idx) => {
      const textVal = staged.isStreamingMode === "gmeet"
        ? `### Google Meet Classroom\n- **Google Meet Space**: ${staged.meetLink}\n\n🎓 Calendar schedule synced successfully.`
        : `### Google Meet Classroom (Manual Mode)\n- **Google Meet**: ${staged.meetLink}\n\n🎓 Calendar schedule synced successfully.`;

      return {
        _id: `mat-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        title: staged.title.trim(),
        type: "live_lecture",
        group: groupName,
        url: staged.meetLink,
        date: staged.localStart,
        endDate: staged.localEnd,
        text: textVal,
        youtubeVideoId: staged.videoOverride || "",
        streamKey: "",
        rtmpUrl: "",
        streamingMode: staged.isStreamingMode,
      };
    });

    const updatedList = modulesList.map((mod) => {
      if (mod._id === modId) {
        return {
          ...mod,
          materials: [...(mod.materials || []), ...newMaterials],
        };
      }
      return mod;
    });

    setModulesList(updatedList);
    setSelectedBrowseEventIds([]);
    setStagedReviewEvents([]);
    setBrowsedEvents([]);
    setShowAddMaterialForMod(null);

    await saveModulesListToServer(updatedList);
    
    if (newMaterials.length > 0) {
      setActiveMaterial(newMaterials[0]);
    }
  };

  const saveModulesListToServer = async (updatedList: any[]) => {
    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/lms/courses/${course._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          __v: course.__v,
          modulesList: updatedList,
          modules: updatedList.length,
          outline: updatedList.map((m) => m.title),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCourse(data.course);
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdateLoading(false);
    }
    return false;
  };

  const handleCreateModule = () => {
    setNewModTitleInput(`Module ${modulesList.length + 1}`);
    setIsModCreateOpen(true);
  };

  const submitCreateModule = async () => {
    if (!newModTitleInput.trim()) return;
    const newModule = {
      _id: `mod-${Date.now()}`,
      title: newModTitleInput.trim(),
      description: "Module study materials and resources",
      materials: [],
    };
    const updatedList = [...modulesList, newModule];
    setModulesList(updatedList);
    setIsModCreateOpen(false);
    setNewModTitleInput("");
    await saveModulesListToServer(updatedList);
  };

  const handleEditModuleTitle = (modId: string, currentTitle: string) => {
    setModToRename({ id: modId, title: currentTitle });
    setModRenameTitle(currentTitle);
  };

  const submitRenameModule = async () => {
    if (!modToRename || !modRenameTitle.trim()) return;
    const updatedList = modulesList.map((mod) => {
      if (mod._id === modToRename.id) {
        return { ...mod, title: modRenameTitle.trim() };
      }
      return mod;
    });
    setModulesList(updatedList);
    setModToRename(null);
    setModRenameTitle("");
    await saveModulesListToServer(updatedList);
  };

  const handleDeleteModule = (modId: string) => {
    setModToDelete(modId);
  };

  const submitDeleteModule = async () => {
    if (!modToDelete) return;
    const updatedList = modulesList.filter((mod) => mod._id !== modToDelete);
    setModulesList(updatedList);
    setModToDelete(null);
    await saveModulesListToServer(updatedList);
  };

  const handleCancelAddEditMaterial = () => {
    setShowAddMaterialForMod(null);
    setUploadState("idle");
    setEditingMaterial(null);
    setNewMatTitle("");
    setNewMatType("video");
    setNewMatGroup("Readings");
    setCustomGroupText("");
    setNewMatUrl("");
    setNewMatDate("");
    setNewMatEndDate("");
    setNewMatText("");
    setNewMatYoutubeVideoId("");
    setNewMatStreamKey("");
    setNewMatRtmpUrl("");
    setNewMatStreamingMode("gmeet");
    setMatFormError(null);
  };

  const handleStartEditMaterial = (modId: string, mat: any) => {
    setEditingMaterial(mat);
    setNewMatTitle(mat.title || "");
    setNewMatType(mat.type || "video");

    const defaultGroups = [
      "Readings",
      "Class Recordings",
      "Additional Materials",
    ];
    if (defaultGroups.includes(mat.group)) {
      setNewMatGroup(mat.group);
      setCustomGroupText("");
    } else {
      setNewMatGroup("Custom");
      setCustomGroupText(mat.group || "");
    }

    setNewMatUrl(mat.url || "");
    setNewMatDate(mat.date || "");
    setNewMatEndDate(mat.endDate || "");
    setNewMatText(mat.text || "");
    setNewMatYoutubeVideoId(mat.youtubeVideoId || "");
    setNewMatStreamKey(mat.streamKey || "");
    setNewMatRtmpUrl(mat.rtmpUrl || "");
    setNewMatStreamingMode(mat.streamingMode || "gmeet");
    setShowAddMaterialForMod(modId);
    setUploadState("idle");
    setMatFormError(null);
  };

  const handleAddMaterial = async (modId: string) => {
    if (!newMatTitle.trim()) {
      setMatFormError("Please specify a material title");
      return;
    }
    setMatFormError(null);

    const groupName =
      newMatGroup === "Custom"
        ? customGroupText || "Additional Materials"
        : newMatGroup;

    let updatedList;
    let materialToSelect;

    if (editingMaterial) {
      const updatedMaterial = {
        ...editingMaterial,
        title: newMatTitle.trim(),
        type: newMatType,
        group: groupName,
        url: newMatUrl,
        date: newMatDate,
        endDate: newMatEndDate,
        text: newMatText,
        youtubeVideoId: newMatYoutubeVideoId,
        streamKey: newMatStreamKey,
        rtmpUrl: newMatRtmpUrl,
        streamingMode: newMatStreamingMode,
      };
      materialToSelect = updatedMaterial;

      updatedList = modulesList.map((mod) => {
        if (mod._id === modId) {
          return {
            ...mod,
            materials: (mod.materials || []).map((mat: any) =>
              mat._id === editingMaterial._id ? updatedMaterial : mat,
            ),
          };
        }
        return mod;
      });
    } else {
      const newMaterial = {
        _id: `mat-${Date.now()}`,
        title: newMatTitle.trim(),
        type: newMatType,
        group: groupName,
        url: newMatUrl,
        date: newMatDate,
        endDate: newMatEndDate,
        text: newMatText,
        youtubeVideoId: newMatYoutubeVideoId,
        streamKey: newMatStreamKey,
        rtmpUrl: newMatRtmpUrl,
        streamingMode: newMatStreamingMode,
      };
      materialToSelect = newMaterial;

      updatedList = modulesList.map((mod) => {
        if (mod._id === modId) {
          return {
            ...mod,
            materials: [...(mod.materials || []), newMaterial],
          };
        }
        return mod;
      });
    }

    setModulesList(updatedList);
    setNewMatTitle("");
    setNewMatType("video");
    setNewMatGroup("Readings");
    setCustomGroupText("");
    setNewMatUrl("");
    setNewMatDate("");
    setNewMatText("");
    setNewMatYoutubeVideoId("");
    setNewMatStreamKey("");
    setNewMatRtmpUrl("");
    setNewMatStreamingMode("gmeet");
    setShowAddMaterialForMod(null);
    setEditingMaterial(null);

    await saveModulesListToServer(updatedList);
    setActiveMaterial(materialToSelect);
  };

  const handleDeleteMaterial = (modId: string, matId: string) => {
    setMatToDelete({ modId, matId });
  };

  const submitDeleteMaterial = async () => {
    if (!matToDelete) return;
    const { modId, matId } = matToDelete;

    const updatedList = modulesList.map((mod) => {
      if (mod._id === modId) {
        return {
          ...mod,
          materials: (mod.materials || []).filter(
            (mat: any) => mat._id !== matId,
          ),
        };
      }
      return mod;
    });

    setModulesList(updatedList);
    setMatToDelete(null);
    await saveModulesListToServer(updatedList);
    if (activeMaterial?._id === matId) {
      setActiveMaterial(null);
    }
  };

  const handleSaveYoutubeLinkForLecture = async () => {
    if (!activeMaterial) return;
    const val = liveLectureYoutubeInput.trim();
    let finalId = val;
    try {
      if (val.includes("youtube.com") || val.includes("youtu.be")) {
        const urlObj = new URL(val);
        if (val.includes("youtu.be")) {
          finalId = urlObj.pathname.slice(1);
        } else {
          finalId =
            urlObj.searchParams.get("v") ||
            urlObj.pathname.split("/").pop() ||
            val;
        }
      }
    } catch (err) {}

    // Update activeMaterial in modulesList
    const updatedModulesList = modulesList.map((mod) => {
      return {
        ...mod,
        materials: (mod.materials || []).map((mat: any) => {
          if (mat._id === activeMaterial._id) {
            const updated = { ...mat, youtubeVideoId: finalId };
            // Keep activeMaterial inline updated
            setTimeout(() => setActiveMaterial(updated), 0);
            return updated;
          }
          return mat;
        }),
      };
    });

    setModulesList(updatedModulesList);
    await saveModulesListToServer(updatedModulesList);
    alert("YouTube Recording saved successfully!");
  };

  const handleLectureVideoFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedLectureVideo(file);
      setYtUploadTitle(file.name.substring(0, 100).replace(/\.[^/.]+$/, ""));
      setYtUploadDescription("");
      setYtUploadVisibility("unlisted");
    }
  };

  const handleUploadLectureVideoToYoutube = async () => {
    if (!selectedLectureVideo || !activeMaterial) return;

    let token = getCachedToken();
    if (!token) {
      try {
        const authResult = await signInWithGoogle();
        token = authResult.accessToken;
      } catch (err) {
        alert("Authorization required to upload to YouTube API.");
        return;
      }
    }

    if (!token) {
      alert("No valid Google token obtained. Please sign in with Google.");
      return;
    }

    setUploadingLectureVideo(true);
    setLectureUploadProgress(5);

    try {
      // Auto-generate description if empty
      let finalDescription = ytUploadDescription.trim();
      if (!finalDescription) {
        const parentMod = modulesList.find((m) =>
          (m.materials || []).some(
            (matType: any) => matType._id === activeMaterial?._id,
          ),
        );
        const moduleName = parentMod ? parentMod.title : "LMS Material";
        const courseName = course?.title || "Academic Course";
        const instructorName =
          user?.name || user?.email || "Academic Instructor";
        finalDescription = `Recorded Live Lecture Session for ${activeMaterial.title || "LMS Video"}.\n\nCourse: ${courseName} (${course?.courseCode || ""})\nModule: ${moduleName}\nInstructor: ${instructorName}\nDate: ${new Date().toLocaleDateString()}\nAutomatically uploaded via LMS YouTube API Integration.`;
      }

      // Ensure valid title max 100 chars and strip `<` or `>`
      let finalTitle = (ytUploadTitle.trim() || selectedLectureVideo.name)
        .substring(0, 100)
        .replace(/[<>]/g, "");

      // Step 1: Initialize resumable upload
      const metadata = {
        snippet: {
          title: finalTitle,
          description: finalDescription,
          categoryId: "27",
        },
        status: {
          privacyStatus: ytUploadVisibility,
          selfDeclaredMadeForKids: false,
        },
      };

      const targetUrl =
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
      const initResponse = await fetch(
        `/api/google-proxy?url=${encodeURIComponent(targetUrl)}`,
        {
          method: "POST",
          headers: {
            "x-lms-google-auth": `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": selectedLectureVideo.type || "video/mp4",
            "X-Upload-Content-Length": selectedLectureVideo.size.toString(),
          },
          body: JSON.stringify(metadata),
        },
      );

      if (!initResponse.ok) {
        const errTxt = await initResponse.text();
        if (initResponse.status === 401) {
          disconnectGoogle();
          setGoogleEmailState(null);
          alert(
            "Your Google Session has expired or is invalid. Please click upload again to sign in with Google.",
          );
        }
        throw new Error(
          `YouTube API Init Error: ${initResponse.statusText} (${errTxt})`,
        );
      }

      const uploadUrl = initResponse.headers.get("Location");
      if (!uploadUrl) {
        throw new Error(
          "YouTube API did not return resumable upload Location header.",
        );
      }

      setLectureUploadProgress(20);

      // Step 2: Upload content bytes
      const xhr = new XMLHttpRequest();
      xhr.open(
        "PUT",
        `/api/google-proxy?url=${encodeURIComponent(uploadUrl)}`,
        true,
      );
      xhr.setRequestHeader(
        "Content-Type",
        selectedLectureVideo.type || "video/mp4",
      );

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 70) + 20;
          setLectureUploadProgress(percent);
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const respData = JSON.parse(xhr.responseText);
            const videoId = respData.id;
            setLectureUploadProgress(100);

            if (videoId) {
              const updatedModulesList = modulesList.map((mod) => {
                return {
                  ...mod,
                  materials: (mod.materials || []).map((mat: any) => {
                    if (mat._id === activeMaterial._id) {
                      const updated = { ...mat, youtubeVideoId: videoId };
                      setTimeout(() => setActiveMaterial(updated), 0);
                      return updated;
                    }
                    return mat;
                  }),
                };
              });

              setModulesList(updatedModulesList);
              await saveModulesListToServer(updatedModulesList);
              alert(
                `Successfully uploaded recording to YouTube and linked to class!\n\nVideo ID: ${videoId}`,
              );
              setSelectedLectureVideo(null);
            } else {
              throw new Error(
                "Could not extract Video ID from YouTube upload response.",
              );
            }
          } catch (e: any) {
            alert("Error parsing YouTube response: " + e.message);
          } finally {
            setUploadingLectureVideo(false);
          }
        } else {
          alert(
            `YouTube upload chunk failed with status code ${xhr.status}: ${xhr.responseText}`,
          );
          setUploadingLectureVideo(false);
        }
      };

      xhr.onerror = () => {
        alert("Network error during YouTube recording upload.");
        setUploadingLectureVideo(false);
      };

      xhr.send(selectedLectureVideo);
    } catch (err: any) {
      console.error(err);
      alert("YouTube Video Upload Failed: " + (err.message || err));
      setUploadingLectureVideo(false);
    }
  };

  const handleLinkDriveFile = (file: any) => {
    setNewMatTitle(file.name);
    setNewMatUrl(file.url);

    // Autofill matching material type based on Drive file extension
    if (file.name.endsWith(".mp4") || file.name.endsWith(".mkv")) {
      setNewMatType("video");
    } else if (file.name.endsWith(".mp3") || file.name.endsWith(".wav")) {
      setNewMatType("audio");
    } else if (file.name.endsWith(".pdf")) {
      setNewMatType("pdf");
    } else if (
      file.name.endsWith(".png") ||
      file.name.endsWith(".jpg") ||
      file.name.endsWith(".jpeg")
    ) {
      setNewMatType("image");
    } else {
      setNewMatType("document");
    }

    setIsDriveSimOpen(false);
  };

  const handleLocalFileUploadSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMatFormError(null);
    e.target.value = ""; // Clear file input value to allow reselection

    let token = getCachedToken();
    if (!token) {
      try {
        setUploadState("authenticating");
        const res = await signInWithGoogle();
        token = res.accessToken;
        setGoogleEmailState(res.email);
      } catch (err: any) {
        setUploadState("idle");
        const msg =
          err.code === "auth/popup-closed-by-user" ||
          err.message?.includes("popup-closed-by-user")
            ? "Google Auth Popup blocked/closed. Please click 'Open in New Tab' at the top-right of your screen to authorize successfully outside the sandbox frame."
            : `Google authentication failed: ${err.message || err}`;
        setMatFormError(msg);
        return;
      }
    }

    // Process file
    if (file.type.startsWith("video/")) {
      setSelectedFileForUpload(file);
      setUploadState("pending_video_option");
    } else {
      await startGDriveUpload(file, token);
    }
  };

  const startGDriveUpload = async (file: File, token: string) => {
    setUploadFileName(file.name);
    setUploadState("uploading");
    setUploadProgress(10);

    try {
      const boundary = "lms_drive_upload_boundary_";
      const metadata = {
        name: file.name,
        mimeType: file.type || "application/octet-stream",
      };

      const metadataHeader =
        `\r\n--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${metadata.mimeType}\r\n\r\n`;

      const closingBoundary = `\r\n--${boundary}--`;

      const metadataBlob = new Blob([metadataHeader], { type: "text/plain" });
      const closingBlob = new Blob([closingBoundary], { type: "text/plain" });

      const multipartBlob = new Blob([metadataBlob, file, closingBlob], {
        type: `multipart/related; boundary=${boundary}`,
      });

      setUploadProgress(30);

      // 1. Upload the file to Drive
      const targetUrl =
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink";
      const response = await fetch(
        `/api/google-proxy?url=${encodeURIComponent(targetUrl)}`,
        {
          method: "POST",
          headers: {
            "x-lms-google-auth": `Bearer ${token}`,
          },
          body: multipartBlob,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          disconnectGoogle();
          setGoogleEmailState(null);
          alert(
            "Your Google Session has expired or is invalid. Please try uploading again to sign in with Google.",
          );
        }
        throw new Error(
          `Google Drive upload failed: ${response.statusText}. Details: ${errorText}`,
        );
      }

      setUploadProgress(75);
      const data = await response.json();
      const fileId = data.id;

      if (!fileId) {
        throw new Error("No file ID returned from Google Drive.");
      }

      // 2. Set permission: View anyone with the link
      const targetUrlPerm = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
      const permResponse = await fetch(
        `/api/google-proxy?url=${encodeURIComponent(targetUrlPerm)}`,
        {
          method: "POST",
          headers: {
            "x-lms-google-auth": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "reader",
            type: "anyone",
          }),
        },
      );

      if (!permResponse.ok) {
        console.warn("Failed to set file view permissions.");
      }

      setUploadProgress(100);
      setUploadState("completed");
      setNewMatTitle(file.name);
      setNewMatUrl(`https://drive.google.com/file/d/${fileId}/view`);

      // Autofill type
      if (file.type.startsWith("audio/")) setNewMatType("audio");
      else if (file.type === "application/pdf" || file.name.endsWith(".pdf"))
        setNewMatType("pdf");
      else if (file.type.startsWith("image/")) setNewMatType("image");
      else if (file.type.startsWith("video/")) setNewMatType("video");
      else setNewMatType("document");
    } catch (err: any) {
      console.error("GDrive Upload Error:", err);
      setUploadState("idle");
      setMatFormError(`Upload Failed: ${err.message || err}`);
    }
  };

  const startYoutubeUpload = async (file: File, token: string) => {
    setUploadFileName(file.name);
    setUploadState("uploading");
    setUploadProgress(10);

    try {
      // Auto-generate description if not provided
      let finalDescription = ytUploadDescription.trim();
      if (!finalDescription) {
        const activeModForUpload = modulesList.find(
          (m) => m._id === showAddMaterialForMod,
        );
        const moduleName = activeModForUpload
          ? activeModForUpload.title
          : "LMS Material";
        const courseName = course?.title || "Academic Course";
        const instructorName =
          user?.name || user?.email || "Academic Instructor";
        finalDescription = `Course Name: ${courseName} (${course?.courseCode || "LMS"})\nModule: ${moduleName}\nUploaded by Instructor: ${instructorName}\nUploaded on: ${new Date().toLocaleDateString()}\nDescription: Educational material video for reference.\nAutomatically uploaded via LMS YouTube API Integration.`;
      }

      // Ensure valid title max 100 characters and strip `<` or `>`
      let finalTitle = (ytUploadTitle.trim() || file.name)
        .substring(0, 100)
        .replace(/[<>]/g, "");

      const boundary = "lms_youtube_upload_boundary_";
      const metadata = {
        snippet: {
          title: finalTitle,
          description: finalDescription,
          categoryId: "27", // Education
        },
        status: {
          privacyStatus: ytUploadVisibility,
          selfDeclaredMadeForKids: false,
        },
      };

      const metadataHeader =
        `\r\n--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: video/*\r\n\r\n`;

      const closingBoundary = `\r\n--${boundary}--`;

      const metadataBlob = new Blob([metadataHeader], { type: "text/plain" });
      const closingBlob = new Blob([closingBoundary], { type: "text/plain" });

      const multipartBlob = new Blob([metadataBlob, file, closingBlob], {
        type: `multipart/related; boundary=${boundary}`,
      });

      setUploadProgress(40);

      const targetUrlRaw =
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status";
      const response = await fetch(
        `/api/google-proxy?url=${encodeURIComponent(targetUrlRaw)}`,
        {
          method: "POST",
          headers: {
            "x-lms-google-auth": `Bearer ${token}`,
          },
          body: multipartBlob,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          disconnectGoogle();
          setGoogleEmailState(null);
          alert(
            "Your Google Session has expired or is invalid. Please try uploading again to sign in with Google.",
          );
        }
        throw new Error(
          `YouTube upload failed: ${response.statusText}. Details: ${errorText}`,
        );
      }

      setUploadProgress(100);
      setUploadState("completed");

      const data = await response.json();
      const videoId = data.id;

      if (!videoId) {
        throw new Error("No video ID returned from YouTube API.");
      }

      setNewMatTitle(file.name);
      setNewMatUrl(`https://www.youtube.com/watch?v=${videoId}`);
      setNewMatType("video");
    } catch (err: any) {
      console.error("YouTube Upload Error:", err);
      setUploadState("idle");
      setMatFormError(`YouTube Upload Failed: ${err.message || err}`);
    }
  };

  const handleDisconnectGoogle = async () => {
    await disconnectGoogle();
    setGoogleEmailState(null);
  };

  const handleConnectGoogle = async () => {
    try {
      setUploadState("authenticating");
      const res = await signInWithGoogle();
      setGoogleEmailState(res.email);
      setUploadState("idle");
    } catch (err: any) {
      setUploadState("idle");
      const msg =
        err.code === "auth/popup-closed-by-user" ||
        err.message?.includes("popup-closed-by-user")
          ? "Google Auth Popup blocked/closed. Please click 'Open in New Tab' at the top-right of your screen to authorize successfully outside the sandbox frame."
          : `Google account connection failed: ${err.message || err}`;
      setMatFormError(msg);
    }
  };

  const handleUpdateCourse = async () => {
    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/lms/courses/${course._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          __v: course.__v,
          title: editTitle,
          description: editDesc,
          youtubeDesignatedChannel: editYoutubeChannel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCourse(data.course);
        setIsEditing(false);
      } else { setMatFormError(data.error || "Save failed"); }
    } catch (e) {
      console.error(e);
    }
    setUpdateLoading(false);
  };

  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [enrolledCourseSlugs, setEnrolledCourseSlugs] = useState<string[]>([]);
  const [activeDiscount, setActiveDiscount] = useState<{
    amount: number;
    msg: string;
  } | null>(null);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const headers = user?.token
          ? { Authorization: `Bearer ${user.token}` }
          : {};
        const [courseRes, allCoursesRes] = await Promise.all([
          fetch(`/api/lms/courses/${slug}`, { headers }),
          fetch(user?.token ? "/api/lms/admin/courses" : "/api/lms/courses", {
            headers,
          }),
        ]);
        if (courseRes.ok) {
          const courseText = await courseRes.text();
          if (courseText.trim().startsWith("{")) {
            const data = JSON.parse(courseText);
            if (data.course) {
              setCourse(data.course);
            }
          }
        }
        if (allCoursesRes.ok) {
          const allCoursesText = await allCoursesRes.text();
          if (allCoursesText.trim().startsWith("{")) {
            const allData = JSON.parse(allCoursesText);
            if (allData.courses) {
              setAllCourses(allData.courses);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetchingCourse(false);
      }
    };
    fetchCourseData();
  }, [slug, user?.token, isEnrolled]);

  useEffect(() => {
    if (user?.token && course && allCourses.length > 0) {
      checkEnrollment(user.token);
    } else if (!user) {
      setIsEnrolled(false);
      setMyStatus(null);
    }
    const refresh=()=>{if(user?.token&&course&&document.visibilityState!=='hidden')checkEnrollment(user.token);};
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return ()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  }, [slug, user, course, allCourses]);

  const checkEnrollment = async (uid: string) => {
    try {
      // Fetch user status from the unified Registration collection!
      const resStatus = await fetch(`/api/events/${slug}/my-status`, {
        headers: { Authorization: `Bearer ${uid}` },
      });
      if (resStatus.ok) {
        const dataStatus = await resStatus.json();
        if (dataStatus.accepted) {
          setMyStatus(dataStatus);
          // If admissionStatus is Confirmed, user gets full player coursework access!
          if (dataStatus.participant?.admissionStatus === "Confirmed") {
            setIsEnrolled(true);
          } else {
            setIsEnrolled(false);
          }
        } else {
          setMyStatus(null);
          setIsEnrolled(false);
        }
      }

      const res = await fetch(`/api/lms/enrollments/${uid}`);
      if (res.ok) {
        const resText = await res.text();
        if (resText.trim().startsWith("{")) {
          const data = JSON.parse(resText);
          if (data.enrolledCourses) {
            setEnrolledCourseSlugs(data.enrolledCourses);
            if (data.enrolledCourses.includes(slug)) {
              if (!myStatus) {
                setIsEnrolled(true);
              }
            } else {
              // Check for prerequisite discounts
              if (
                course.prerequisiteDiscounts &&
                course.prerequisiteDiscounts.length > 0
              ) {
                let bestDiscount = 0;
                let bestMsg = "";
                let finalFee = course.fee || 0;

                // Check each discount to see if user qualifies
                course.prerequisiteDiscounts.forEach((pd: any) => {
                  const priorCourseObj = allCourses.find(
                    (c) => c._id === pd.courseId,
                  );
                  if (
                    priorCourseObj &&
                    data.enrolledCourses.includes(priorCourseObj.slug)
                  ) {
                    // User is enrolled! Calculate discount
                    let amt = 0;
                    if (pd.discountType === "percentage") {
                      amt = finalFee * (pd.discountValue / 100);
                    } else {
                      amt = pd.discountValue;
                    }
                    if (amt > bestDiscount) {
                      bestDiscount = amt;
                      bestMsg = `Includes ${pd.discountType === "percentage" ? pd.discountValue + "% off" : "₹" + pd.discountValue + " off"} because you're enrolled in ${priorCourseObj.title}`;
                    }
                  }
                });

                if (bestDiscount > 0) {
                  // Keep it bounded by course fee
                  if (bestDiscount > finalFee) bestDiscount = finalFee;
                  setActiveDiscount({ amount: bestDiscount, msg: bestMsg });
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(
    null,
  );

  if (fetchingCourse) {
    return (
      <div className="min-h-screen pt-32 pb-24">
        <BrutalistLoader />
      </div>
    );
  }

  if (!course)
    return (
      <div className="min-h-screen pt-32 pb-24 text-center font-mono text-xl opacity-50">
        Course Not Found
      </div>
    );

  const isOwner = user && course.createdBy === user.id;
  const isAdmin = user && (user.role === "admin" || user.role === "superadmin");
  const userInstructorData = course.instructors?.find(
    (i: any) => i.user === user?.id,
  );
  const userTAData = course.tas?.find((t: any) => t.user === user?.id);

  const isInstructorOrTA =
    isOwner || isAdmin || !!userInstructorData || !!userTAData;

  const permissions = {
    add_materials:
      isOwner ||
      isAdmin ||
      userInstructorData?.permissions?.includes("materials_add") ||
      userTAData?.permissions?.includes("materials_add"),
    schedule_classes:
      isOwner ||
      isAdmin ||
      userInstructorData?.permissions?.includes("classes_add") ||
      userTAData?.permissions?.includes("classes_add"),
    edit_course_details:
      isOwner ||
      isAdmin ||
      userInstructorData?.permissions?.includes("edit_course_details"),
    grade_assignments:
      isOwner ||
      isAdmin ||
      userInstructorData?.permissions?.includes("grade_assignments"),
    grade_assignments_unvalidated:
      isOwner ||
      isAdmin ||
      userInstructorData?.permissions?.includes(
        "grade_assignments_unvalidated",
      ) ||
      userTAData?.permissions?.includes("grade_assignments_unvalidated"),
  };

  // Instructors and admins see the course even if they are not enrolled.
  const hasAccess = learningAccess.allowed && !(isInstructorOrTA && simulateUnenrolledParam);
  if(searchParams.get('learn')==='1'&&!learningAccess.checked)return <p className="loading-state" role="status">Opening learning materials…</p>;

  // Mock sessions for the demonstration
  const modules = Array.from({ length: Math.max(course.modules, 1) }).map(
    (_, i) => ({
      title: `Module ${i + 1}: ${course.outline?.[i % (course.outline?.length || 1)] || "Topic"}`,
      sessions: [
        {
          t: `Video Lecture: Foundations of ${course.outline?.[i % (course.outline?.length || 1)] || "Topic"}`,
          d: "45 min",
          type: "video",
          completed: i === 0,
        },
        {
          t: "Reading: Core Principles & Methodology",
          d: "15 min",
          type: "reading",
          completed: false,
        },
        {
          t: "Practical Assignment & Submission",
          d: "1 hr",
          type: "assignment",
          completed: false,
        },
      ],
    }),
  );

  const handleEnrollClick = async () => {
    const gate=registrationAvailability(course,myStatus?.accepted?myStatus.participant:undefined,Date.now());
    if(!gate.allowed){alert(gate.reason);return;}
    if (!user) {
      setShowModal(true);
      return;
    }
    // If course is paid (fee > 0), show confirmation payment modal. Otherwise, direct auto-enroll immediately!
    const isFree = !(course.fee > 0);
    if (isFree) {
      await handlePayment();
    } else {
      setShowPaymentModal(true);
    }
  };

  const handlePayment = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/lms/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.token, courseSlug: slug }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPaymentModal(false);
        alert("Registration / Enrollment request submitted successfully!");
        checkEnrollment(user.token);
      } else {
        alert("Error during enrollment: " + (data.error || "Request failed"));
      }
    } catch (e) {
      console.error(e);
      alert("Network exception occurred while trying to enroll.");
    }
    setLoading(false);
  };

  const handlePayFee = async () => {
    const gate=registrationAvailability(course,myStatus?.participant,Date.now());
    if(!gate.allowed){alert(gate.reason);return;}
    if (!user?.token) return;
    try {
      setPayingFee(true);
      const res = await fetch(`/api/events/${slug}/pay-fee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        alert(
          "Payment Simulated Successfully! Your enrollment is now Confirmed.",
        );
        checkEnrollment(user.token);
      } else {
        alert("Payment Error: " + data.error);
      }
    } catch (err) {
      alert("Checkout platform failed: " + String(err));
    } finally {
      setPayingFee(false);
    }
  };

  const publicOverview=courseOverviewPages(course).find(s=>s.type==='course_overview');
  const courseSections = [{slug:'overview',title:publicOverview?.title||'Course overview',type:'course_overview',content:publicOverview?.content,preview:course.description},{slug:'registration',title:'Registration',type:'registration'}, ...(course.subPages || []).filter((s: any) => s.type !== 'registration' && s.type !== 'course_overview').map((s: any) => ({...s, slug: s.slug === 'overview' ? 'course-overview' : s.slug}))];
const registrationWindow=registrationAvailability(course,myStatus?.accepted?myStatus.participant:undefined,now);
const participationActions=eventParticipationActions({record:course,status:getEffectiveStatus(course,now),registration:myStatus,materialsAccess:hasAccess,now,online:true,materialsLabel:eventContext?'Access Materials':'Open LMS'});
const renderParticipationActions=(inline=false)=>{
  const query=new URLSearchParams(searchParams);query.set('section','registration');if(query.has('tab'))query.set('tab','registration');
  return <ParticipationActions actions={participationActions} registrationHref={`?${query}`} materialsHref={learningHref(course.slug,eventContext?'event':'course',origin||undefined)} onRegister={inline&&!myStatus?.accepted?handleEnrollClick:undefined} enrolling={loading}/>;
};

const renderCourseSection = (section: any) => section.slug==='overview'&&!isEditing ? <RecordContent section={section}/> : section.slug !== 'overview' && section.slug !== 'registration' ? <RecordContent section={section}/> : section.slug === 'overview' ? (<div className="record-detail-main">
              <div className="flex items-center gap-4 mb-8">
                {course.hasMicrocert && (
                  <div className="font-mono text-[10px] font-black uppercase tracking-widest bg-brand-acid border border-ink px-3 py-1 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                    MICRO-CERTIFICATION
                  </div>
                )}
                <div className="font-mono text-[10px] font-black uppercase tracking-widest opacity-40">
                  {course.credits} Credits
                </div>
              </div>

              {isEditing &&
              permissions.edit_course_details &&
              !simulateUnenrolledParam ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-6xl md:text-8xl font-serif font-black italic bg-transparent border-b-2 border-ink focus:outline-none mb-8"
                />
              ) : (
                <div className="section-actions">


                  {permissions.edit_course_details &&
                    !simulateUnenrolledParam && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="ml-4 align-middle text-sm font-mono font-bold uppercase tracking-widest text-brand-blue hover:underline  transition-opacity"
                      >
                        Edit
                      </button>
                    )}
                </div>
              )}

              {isEditing &&
              permissions.edit_course_details &&
              !simulateUnenrolledParam ? (
                <div>
                  <div className="mb-6">
                    <label className="block text-[8px] font-mono font-bold uppercase tracking-wider mb-1 text-ink/60">
                      Course Description
                    </label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className="w-full font-serif text-2xl font-light italic leading-tight text-ink/80 bg-transparent border-b-2 border-ink focus:outline-none mb-6"
                    />
                  </div>
                  <div className="mb-12">
                    <label className="block text-[8px] font-mono font-bold uppercase tracking-wider mb-1 text-ink/60">
                      Designated YouTube Channel (URL or Handle)
                    </label>
                    <input
                      type="text"
                      value={editYoutubeChannel}
                      onChange={(e) => setEditYoutubeChannel(e.target.value)}
                      placeholder="e.g. https://www.youtube.com/@indicacademy"
                      className="w-full p-2 border border-ink bg-white font-mono text-[10px] focus:outline-none"
                    />
                    <p className="text-[7.5px] font-sans opacity-70 mt-1 uppercase tracking-wider font-bold text-brand-orange">
                      🎯 Instructors must log into the Google Account associated
                      with this channel to schedule broadcasts automatically.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="font-serif text-2xl font-light italic leading-tight text-ink/80 mb-12 group">
                  {course.description}
                  {permissions.edit_course_details &&
                    !simulateUnenrolledParam && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="ml-4 align-middle text-sm font-mono font-bold uppercase tracking-widest text-brand-blue hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Edit
                      </button>
                    )}
                </p>
              )}

              {permissions.edit_course_details &&
                isEditing &&
                !simulateUnenrolledParam && (
                  <div className="mb-12 p-4 border border-brand-orange bg-brand-orange/5 space-y-4">
                    <button
                      disabled={updateLoading}
                      onClick={handleUpdateCourse}
                      className="h-10 px-6 bg-brand-acid text-ink font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-acid/80 shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                    >
                      {updateLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}

              <div className="flex flex-wrap gap-8 mb-16 font-mono text-[10px] font-black uppercase tracking-widest text-ink/40">
                {course.startDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Starts:{" "}
                    {new Date(course.startDate).toLocaleDateString()}
                  </div>
                )}
                {course.endDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Ends:{" "}
                    {new Date(course.endDate).toLocaleDateString()}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" /> {course.duration}
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3 h-3" /> {course.modules} Modules
                </div>
                <div className="flex items-center gap-2 text-brand-blue">
                  <CheckCircle className="w-3 h-3" /> Industry Standard
                </div>
              </div>

              <div className="mb-12">
                <h3 className="font-mono text-[10px] font-black uppercase tracking-[0.3em] mb-8 opacity-40">
                  Course Modules Content
                </h3>
                <div className="space-y-4">
                  {modulesList.map((mod, midx) => (
                    <div
                      key={midx}
                      className="p-6 border border-ink flex items-start gap-6 bg-white"
                    >
                      <div className="font-mono text-3xl font-black opacity-20">
                        0{midx + 1}
                      </div>
                      <div>
                        <h4 className="font-serif font-black italic mb-2 text-xl">
                          {mod.title}
                        </h4>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60">
                          Contains {(mod.materials || []).length} interactive
                          study resource
                          {(mod.materials || []).length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>) : (<><RecordContent section={course.subPages?.find((s:any)=>s.type==='registration')||{slug:'fees',title:'Registration',type:'registration',content:course.registrationCard}}/><div className="lg:col-span-4">
              <div className="sticky top-32 space-y-8">
                {myStatus?.accepted && hasAccess ? null : myStatus?.accepted ? (
                  myStatus.participant?.paymentStatus === "Confirmed" ? (
                    <div className="bg-ink text-paper p-10 border border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)] flex flex-col justify-between text-left brutalist-card animate-fade-in animate-once">
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
                            {myStatus.participant.name}
                          </span>{" "}
                          <br />
                          EMAIL:{" "}
                          <span className="font-semibold text-brand-acid">
                            {myStatus.participant.email}
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
                    <div className="bg-ink text-paper p-10 border border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)] flex flex-col justify-between text-left brutalist-card animate-fade-in animate-once">
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
                            {myStatus.participant.name}
                          </span>{" "}
                          <br />
                          EMAIL:{" "}
                          <span className="font-semibold text-brand-acid">
                            {myStatus.participant.email}
                          </span>
                        </p>

                        <div className="space-y-6">
                          <div className="p-4 border border-white/20 bg-white/5 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs font-mono font-bold">
                              <span className="opacity-60">AMOUNT DUE:</span>
                              <span className="font-bold text-white uppercase">
                                Rs. {myStatus.participant.fee}
                              </span>
                            </div>
                            {myStatus.participant.paymentDeadline && (
                              <div className="flex justify-between items-center text-[10px] font-mono text-brand-orange font-bold">
                                <span>THRESHOLD DEADLINE:</span>
                                <span className="font-black bg-brand-orange/20 px-2 py-0.5 font-bold">
                                  {myStatus.participant.paymentDeadline}
                                </span>
                              </div>
                            )}
                          </div>

                          {!registrationWindow.allowed ? <p role="status">{registrationWindow.reason}</p> : course.registrationCard?.paymentMsgChoice ===
                            "link" &&
                          course.registrationCard?.paymentGatewayLink ? (
                            <div className="space-y-4">
                              <p className="text-xs text-paper/85 leading-relaxed font-sans">
                                Click below to open the external payment
                                interface.
                              </p>
                              <a
                                href={
                                  course.registrationCard.paymentGatewayLink
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-14 bg-brand-acid text-ink font-mono font-black uppercase tracking-widest text-[10px] hover:bg-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_rgba(255,255,255,0.25)] active:shadow-none active:translate-y-0 cursor-pointer font-bold border border-ink flex items-center justify-center hover:no-underline text-center"
                              >
                                Proceed to Payment Gateway ↗
                              </a>
                              <button
                                type="button"
                                onClick={handlePayFee}
                                disabled={payingFee}
                                className="w-full h-11 border border-brand-acid/40 text-brand-acid/70 hover:border-brand-acid hover:text-brand-acid font-mono text-[9px] uppercase font-bold tracking-wider transition-colors bg-brand-acid/5 cursor-pointer font-bold"
                              >
                                {payingFee
                                  ? "Verifying..."
                                  : "Simulate Sandbox Payment Receipt"}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {course.registrationCard?.paymentMarkdown ? (
                                <div className="p-4 border border-white/20 bg-white/5 text-xs text-white/90 font-sans leading-relaxed overflow-y-auto max-h-[220px]">
                                  <span className="block text-[8px] font-mono font-black uppercase tracking-widest text-brand-acid mb-2 font-bold">
                                    Instructions
                                  </span>
                                  <div
                                    dangerouslySetInnerHTML={{
                                      __html: renderMarkdown(
                                        course.registrationCard.paymentMarkdown,
                                        true,
                                      ),
                                    }}
                                  />
                                </div>
                              ) : (
                                <p className="text-xs text-paper/84 leading-relaxed font-sans">
                                  Transfer Rs. {myStatus.participant.fee} to the
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
                  <div className="bg-ink text-paper p-10 brutalist-card text-left border border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)]">
                    <h3 className="text-2xl font-serif font-black italic mb-4 font-bold uppercase tracking-tight text-white leading-none">
                      {course.registrationCard?.title || "Secure Your Spot"}
                    </h3>
                    <p className="text-xs opacity-65 mb-6 leading-relaxed font-mono uppercase tracking-wide">
                      {course.registrationCard?.description ||
                        "Enroll in this comprehensive syllabus to start, unlock learning pathways, exercises, and study archives."}
                    </p>

                    <div className="text-3xl font-serif font-black italic mb-6 text-white leading-none">
                      {course.fee > 0 ? (
                        activeDiscount ? (
                          <>
                            <span className="line-through text-white/40 text-xl mr-4 font-bold font-sans">
                              ₹{course.fee}
                            </span>
                            <span className="text-ink bg-brand-acid px-2 py-0.5 font-sans font-bold">
                              ₹{course.fee - activeDiscount.amount}
                            </span>
                          </>
                        ) : (
                          <span className="font-sans font-bold">
                            ₹{course.fee}
                          </span>
                        )
                      ) : (
                        "Free"
                      )}
                    </div>

                    {activeDiscount && (
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-brand-orange mb-8 bg-brand-orange/10 p-2 border border-brand-orange rounded-none">
                        {activeDiscount.msg}
                      </div>
                    )}

                    {renderParticipationActions(true)}

                    <div className="mt-8 pt-8 border-t border-white/10">
                      <h5 className="font-mono text-[9px] font-black uppercase tracking-widest opacity-40 mb-4 text-white">
                        Includes
                      </h5>
                      <div className="flex flex-col gap-4">
                        {(
                          course.registrationCard?.highlights || [
                            "Lifetime Access",
                            "Live Lecture Recordings",
                            "W2M Certified Badge",
                          ]
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
                )}
              </div>
            </div></>);
return (
    <div className="pt-32 pb-24 grid-structure min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        <Link
          to={eventContext?`/events/${slug}${origin?`?from=${encodeURIComponent(origin)}`:""}`:isResidentialCourse(course)?`/events/${slug}?isCourse=true&from=${origin||"academy"}`:"/academy/online"}
          className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.3em] mb-12 hover:text-brand-blue transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {eventContext?"Back to event":isResidentialCourse(course)?"Back to course":"Online Academy"}
        </Link>
        {isInstructorOrTA && !hasAccess && (
          <div className="mb-8 p-4 border border-brand-orange bg-brand-orange/10 text-brand-orange font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-4">
            <Shield className="w-4 h-4" />
            Admin / Instructor Preview Mode
            <button
              onClick={() =>
                navigate(`/academy/online/${course.slug}?simulate=true${contextQuery}`)
              }
              className="px-4 py-2 bg-brand-orange text-paper hover:bg-brand-orange/80 transition-colors ml-auto"
            >
              Simulate Enrolled View
            </button>
          </div>
        )}

        {isInstructorOrTA && hasAccess && simulateParam && (
          <div className="mb-8 p-4 border-2 border-brand-orange bg-brand-orange/5 text-ink font-mono text-xs flex flex-wrap items-center justify-between gap-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-orange animate-pulse" />
              <span className="font-bold uppercase tracking-widest text-[11px]">
                Instructor Simulation Active: Enrolled Courseware Player
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  navigate(`/academy/online/${course.slug}?simulate=unenrolled${contextQuery}`)
                }
                className="px-4 py-2 border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-paper font-bold uppercase text-[10px] tracking-wider transition-colors bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
              >
                Simulate Enrollment Page (Public)
              </button>
              <button
                onClick={() => navigate(`/academy/online/${course.slug}?${contextQuery.slice(1)}`)}
                className="px-4 py-2 bg-ink text-paper hover:bg-opacity-80 font-bold uppercase text-[10px] tracking-wider transition-colors"
              >
                Exit Simulation Mode
              </button>
            </div>
          </div>
        )}

        {hasAccess && (searchParams.get("learn") === "1" || simulateParam) ? (
          // Enrolled MOOC UI
          <div className="space-y-6">
            {/* Minimal Compact Premium Presets Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b-2 border-ink pb-4 font-mono">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] bg-brand-orange text-paper px-2 py-1 font-black uppercase rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  {course.courseCode || "LMS"}
                </span>
                <span className="font-serif font-black italic text-ink text-sm sm:text-base">
                  {course.title}
                </span>
              </div>

              <div className="flex flex-wrap items-center self-end sm:self-auto gap-1 bg-ink/5 p-1 rounded-sm border-2 border-ink">
                <span className="text-[8px] font-black uppercase tracking-widest text-ink/55 px-2 select-none">
                  Workspace Aspect:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLayoutMode("split");
                    if (leftWidthPercent > 78) setLeftWidthPercent(65);
                  }}
                  className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all rounded-xs ${
                    layoutMode === "split"
                      ? "bg-ink text-paper shadow-[2px_2px_0px_rgba(0,0,0,0.15)]"
                      : "bg-transparent text-ink hover:bg-ink/5"
                  }`}
                  title="Side-by-side split screen view with adjustable drag handle"
                >
                  <Columns className="w-3 h-3" /> Split
                  <span
                    className={`text-[7px] font-mono font-semibold px-1 py-0.1 border rounded-xs select-none ${layoutMode === "split" ? "bg-white/10 text-white border-white/20" : "bg-ink/5 text-ink/40 border-ink/10"}`}
                  >
                    Alt+1
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("fullscreen")}
                  className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all rounded-xs ${
                    layoutMode === "fullscreen"
                      ? "bg-ink text-paper shadow-[2px_2px_0px_rgba(0,0,0,0.15)]"
                      : "bg-transparent text-ink hover:bg-ink/5"
                  }`}
                  title="Maximize visual player to 100% width"
                >
                  <Video className="w-3 h-3" /> Full Video
                  <span
                    className={`text-[7px] font-mono font-semibold px-1 py-0.1 border rounded-xs select-none ${layoutMode === "fullscreen" ? "bg-white/10 text-white border-white/20" : "bg-ink/5 text-ink/40 border-ink/10"}`}
                  >
                    Alt+2
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("minimized")}
                  className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all rounded-xs ${
                    layoutMode === "minimized"
                      ? "bg-ink text-paper shadow-[2px_2px_0px_rgba(0,0,0,0.15)]"
                      : "bg-transparent text-ink hover:bg-ink/5"
                  }`}
                  title="spacious list of active lessons"
                >
                  <BookOpen className="w-3 h-3" /> Focus List
                  <span
                    className={`text-[7px] font-mono font-semibold px-1 py-0.1 border rounded-xs select-none ${layoutMode === "minimized" ? "bg-white/10 text-white border-white/20" : "bg-ink/5 text-ink/40 border-ink/10"}`}
                  >
                    Alt+3
                  </span>
                </button>
                <div
                  className="flex items-center text-[8px] font-mono bg-brand-acid text-ink px-1.5 py-0.5 rounded-xs ml-1 font-semibold select-none shadow-[1px_1px_0px_rgba(0,0,0,1)] border border-ink/40 cursor-help"
                  title="Keyboard Shortcuts: Alt+1 = Split View, Alt+2 = Full Video, Alt+3 = Focus List. Alt+P / ← = Prev, Alt+N / → = Next."
                >
                  Keyboard shortcuts
                </div>
              </div>
            </div>

            <div
              ref={containerRef}
              data-layout={layoutMode}
              className={`learning-split flex flex-col lg:flex-row w-full relative tracking-normal ${
                isLargeScreen && layoutMode === "split" ? "gap-0" : "gap-12"
              } items-start`}
            >
              {/* Left Panel - Viewer or Large Content Composer */}
              <div
                className="learning-viewer w-full flex-col space-y-8"
                style={{
                  display: layoutMode === "minimized" ? "none" : "flex",
                  width: isLargeScreen
                    ? layoutMode === "fullscreen"
                      ? "100%"
                      : `${leftWidthPercent}%`
                    : "100%",
                  maxWidth: isLargeScreen
                    ? layoutMode === "fullscreen"
                      ? "100%"
                      : `${leftWidthPercent}%`
                    : "100%",
                }}
              >
                {/* Visual Workspace Tab Mode Selector */}
                <div className="learning-mode-tabs flex border-2 border-stone-100 bg-stone-100 p-1 font-mono text-xs font-black">
                  <button
                    onClick={() => {
                      setWorkMode("materials");
                      handleCancelAddEditMaterial();
                    }}
                    className={`flex-1 py-3 text-center transition-all cursor-pointer ${
                      workMode === "materials"
                        ? "bg-stone-900 text-[#bef264]"
                        : "text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    Materials
                  </button>
                  <button
                    onClick={() => {
                      setWorkMode("assignments");
                      handleCancelAddEditMaterial();
                    }}
                    className={`flex-1 py-3 text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      workMode === "assignments"
                        ? "bg-stone-900 text-[#bef264]"
                        : "text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    Assignments
                  </button>
                  <button
                    onClick={() => {
                      setWorkMode("sidekick");
                      handleCancelAddEditMaterial();
                    }}
                    className={`flex-1 py-3 text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      workMode === "sidekick"
                        ? "bg-stone-900 text-[#bef264]"
                        : "text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    ⚡ GEMINI AI SIDEKICK
                  </button>
                </div>

                {/* Main Material Viewer Area or Content Composer */}
                <div
                  id="lms-workspace-content"
                  className="bg-paper min-h-[420px] border-2 border-ink shadow-[12px_12px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden"
                >
                  {workMode === "assignments" ? (
                    <div className="flex-1 p-6 bg-paper font-sans">
                      {isInstructorOrTA && !simulateUnenrolledParam ? (
                        <InstructorAssignmentView
                          user={user}
                          courseSlug={slug || ""}
                          moduleId={getActiveModuleId()}
                          courseModules={modulesList}
                        />
                      ) : (
                        <StudentAssignmentView
                          user={user}
                          courseSlug={slug || ""}
                          moduleId={getActiveModuleId()}
                          onSelectAssignmentForAi={(assignment, qText) => {
                            setSelectedAssignmentForAi(assignment);
                            setFocusedQuestionForAiText(qText);
                          }}
                        />
                      )}
                    </div>
                  ) : workMode === "sidekick" ? (
                    <div className="flex-1 p-6 bg-stone-900/95 font-sans text-stone-100 overflow-y-auto max-h-[85vh]">
                      <AiSidekickPanel
                        user={user}
                        courseSlug={slug}
                        courseModules={modulesList || []}
                        isInstructorOrTA={isInstructorOrTA}
                        activeMaterial={activeMaterial}
                        activeAssignment={selectedAssignmentForAi}
                        selectedQuestionText={focusedQuestionForAiText}
                      />
                    </div>
                  ) : showAddMaterialForMod ? (
                    // Large, spacious, beautiful Material Creator Form!
                    <div className="flex-1 flex flex-col justify-between bg-paper p-6 sm:p-8 space-y-6">
                      <div className="flex items-center justify-between border-b-2 border-ink/10 pb-4 font-mono">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-black uppercase tracking-widest text-brand-orange bg-brand-orange/10 px-2 py-1 border border-brand-orange/30 w-fit rounded-xs animate-pulse">
                            {editingMaterial
                              ? "✏️ Advanced Material Composer Active"
                              : "✨ Spacious Courseware drafting active"}
                          </span>
                          <h3 className="font-serif font-black italic text-xl sm:text-2xl text-ink leading-none">
                            {editingMaterial
                              ? `Repackaging: ${editingMaterial.title}`
                              : "Create Course Material"}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleCancelAddEditMaterial();
                            if (prevLayoutMode) {
                              setLayoutMode(prevLayoutMode);
                              setPrevLayoutMode(null);
                            }
                          }}
                          className="w-8 h-8 border-2 border-ink hover:bg-brand-orange/15 hover:text-brand-orange rounded-xs flex items-center justify-center transition-all cursor-pointer"
                          title="Minimize & Cancel Editor"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-6 font-mono text-xs text-ink/90 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                        {/* Title Input (Big Fonts!) */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-ink/75">
                            Lesson / Material Title *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Chapter 2: Phonology Readings, Homework recording..."
                            value={newMatTitle}
                            onChange={(e) => setNewMatTitle(e.target.value)}
                            className="w-full text-sm sm:text-base font-medium font-sans p-3 border-2 border-ink bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all placeholder:text-ink/30"
                          />
                        </div>

                        {/* Interactive Material Type Selection Cards! */}
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-ink/75">
                            Study Material Medium (Interactive Grid Selection)
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              {
                                id: "video",
                                label: "Video Lecture",
                                desc: "YouTube link or ID",
                                icon: Video,
                              },
                              {
                                id: "audio",
                                label: "Audio Track",
                                desc: "Accent/Phoneme guide",
                                icon: Play,
                              },
                              {
                                id: "live_lecture",
                                label: "Live Schedule",
                                desc: "Calendar Meet + YT stream",
                                icon: Calendar,
                              },
                              {
                                id: "pdf",
                                label: "PDF Document",
                                desc: "Digital Reader viewer",
                                icon: FileText,
                              },
                              {
                                id: "image",
                                label: "Image Reference",
                                desc: "Infographics & slides",
                                icon: FileText,
                              },
                              {
                                id: "text",
                                label: "Written Note",
                                desc: "Inline text/markdown",
                                icon: FileCheck,
                              },
                              {
                                id: "document",
                                label: "Office link",
                                desc: "Docx/XLSX link space",
                                icon: Paperclip,
                              },
                              {
                                id: "link",
                                label: "External URL",
                                desc: "Research paper website",
                                icon: ExternalLink,
                              },
                            ].map((opt) => {
                              const isSelected = newMatType === opt.id;
                              const IconComponent = opt.icon;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setNewMatType(opt.id)}
                                  className={`p-3 border-2 text-left transition-all flex flex-col justify-between h-20 ${
                                    isSelected
                                      ? "bg-ink border-ink text-paper shadow-[3px_3px_0px_rgba(0,0,0,0.15)] scale-[1.02]"
                                      : "bg-white border-ink/10 hover:border-ink hover:bg-ink/5"
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <IconComponent
                                      className={`w-4 h-4 ${isSelected ? "text-brand-acid animate-pulse" : "text-ink/60"}`}
                                    />
                                    {isSelected && (
                                      <div className="w-1.5 h-1.5 bg-brand-acid rounded-full"></div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-[9px] uppercase leading-tight">
                                      {opt.label}
                                    </div>
                                    <div
                                      className={`text-[8px] leading-tight mt-0.5 font-sans ${isSelected ? "text-paper/60" : "text-ink/55"}`}
                                    >
                                      {opt.desc}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Group Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-ink/75 mb-1.5">
                              Outline Group or Category
                            </label>
                            <select
                              value={newMatGroup}
                              onChange={(e) => setNewMatGroup(e.target.value)}
                              className="w-full p-2.5 border-2 border-ink bg-white font-mono text-[10px] sm:text-xs focus:outline-none cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,1)] font-bold text-ink"
                            >
                              <option value="Readings">Reading Lists</option>
                              <option value="Class Recordings">
                                Class Recordings
                              </option>
                              <option value="Additional Materials">
                                Additional Materials
                              </option>
                              <option value="Custom">
                                + Custom group category...
                              </option>
                            </select>
                          </div>

                          {newMatGroup === "Custom" && (
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-ink/75 mb-1.5">
                                Custom Category Title
                              </label>
                              <input
                                type="text"
                                placeholder="Enter custom group (e.g. Workbook)"
                                value={customGroupText}
                                onChange={(e) =>
                                  setCustomGroupText(e.target.value)
                                }
                                className="w-full p-2.5 border-2 border-ink bg-white font-sans text-xs focus:outline-none shadow-[3px_3px_0px_rgba(0,0,0,1)]"
                              />
                            </div>
                          )}
                        </div>

                        {/* Interactive conditional elements */}
                        {newMatType === "live_lecture" && (
                          <div className="bg-brand-orange/5 p-4 border-2 border-ink space-y-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-2 border-b border-ink/10 pb-2">
                              <Calendar className="w-4 h-4 text-brand-orange animate-pulse" />
                              <span className="font-bold uppercase tracking-widest text-[10px] text-ink">
                                Google Workspace Scheduling & Stream Broadcaster
                              </span>
                            </div>

                            {/* Dynamic Sub Tabs */}
                            <div className="flex border-2 border-ink bg-white font-mono text-[9px] uppercase font-black divide-x-2 divide-ink shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)] mb-1">
                              <button
                                type="button"
                                onClick={() => setLiveTab("schedule")}
                                className={`flex-1 py-1.5 text-center transition-all cursor-pointer ${
                                  liveTab === "schedule"
                                    ? "bg-ink text-paper"
                                    : "bg-white text-ink hover:bg-brand-orange/10"
                                }`}
                              >
                                📅 Create New Event
                              </button>
                              <button
                                type="button"
                                onClick={() => setLiveTab("browse")}
                                className={`flex-1 py-1.5 text-center transition-all cursor-pointer ${
                                  liveTab === "browse"
                                    ? "bg-ink text-paper"
                                    : "bg-white text-ink hover:bg-brand-orange/10"
                                }`}
                              >
                                🔍 Browse & Import Calendar
                              </button>
                            </div>

                            {/* TAB 1: SCHEDULE */}
                            {liveTab === "schedule" && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                      Start Date & Time *
                                    </label>
                                    <input
                                      type="datetime-local"
                                      value={newMatDate}
                                      onChange={(e) =>
                                        setNewMatDate(e.target.value)
                                      }
                                      className="w-full p-2.5 border-2 border-ink bg-white focus:outline-none text-[10px]"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                      End Date & Time [Optional]
                                    </label>
                                    <input
                                      type="datetime-local"
                                      value={newMatEndDate}
                                      onChange={(e) =>
                                        setNewMatEndDate(e.target.value)
                                      }
                                      className="w-full p-2.5 border-2 border-ink bg-white focus:outline-none text-[10px]"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                      Live Lecture Mode
                                    </label>
                                    <select
                                      value={newMatStreamingMode}
                                      onChange={(e) =>
                                        setNewMatStreamingMode(
                                          e.target.value as any,
                                        )
                                      }
                                      className="w-full p-2.5 border-2 border-ink bg-white focus:outline-none text-[10px] cursor-pointer font-bold"
                                    >
                                      <option value="gmeet">
                                        🔴 Gmeet Link + YouTube streaming
                                      </option>
                                      <option value="manual">
                                        🎓 Only Gmeet Link
                                      </option>
                                    </select>
                                  </div>
                                </div>

                                <p className="font-mono text-[8.5px] text-ink/70 leading-normal">
                                  {newMatStreamingMode === "gmeet"
                                    ? "💡 Custom integration generates a secure Google Meet space AND an unlisted YouTube Live stream for direct transmission via streaming clients (e.g. OBS/vMedia)."
                                    : "💡 Schedules a secure Google Meet conference room for the live lecture. No automated YouTube livestream keys are created, allowing manual OBS recordings or video uploads later."}
                                </p>

                                {/* Google Auth Status Dashboard */}
                                <div className="p-3 border-2 border-ink bg-white font-mono text-[9px] space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-ink flex items-center gap-1.5">
                                      {googleEmailState ? (
                                        <>
                                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                          <span className="text-emerald-600 font-extrabold uppercase">
                                            🟢 Google Associated
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                          <span className="text-rose-600 font-extrabold uppercase">
                                            ⚪ Google Logged Out
                                          </span>
                                        </>
                                      )}
                                    </span>
                                    {googleEmailState && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await disconnectGoogle();
                                          setGoogleEmailState(null);
                                        }}
                                        className="p-1 px-1.5 border border-ink bg-red-50 hover:bg-red-100 text-[8px] font-black uppercase text-red-700 cursor-pointer transition-colors"
                                      >
                                        Disconnect
                                      </button>
                                    )}
                                  </div>

                                  {googleEmailState ? (
                                    <div className="text-ink/80 text-[8.5px] leading-relaxed">
                                      Authorized Account:{" "}
                                      <strong className="underline text-brand-blue">
                                        {googleEmailState}
                                      </strong>
                                      <div className="mt-1">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              setUploadState("authenticating");
                                              const res = await signInWithGoogle();
                                              setGoogleEmailState(res.email);
                                              setUploadState("idle");
                                              setMatFormError(null);
                                            } catch (err: any) {
                                              setUploadState("idle");
                                              setMatFormError(
                                                err.message ||
                                                  "OAuth selection was closed.",
                                              );
                                            }
                                          }}
                                          className="p-1 px-1.5 border border-ink bg-brand-orange/10 hover:bg-brand-orange/20 text-[8px] font-black uppercase text-brand-orange cursor-pointer transition-colors"
                                        >
                                          Switch Account / Reconnect
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      <p className="text-[7.8px] text-ink/65 leading-relaxed">
                                        Authorize a real Google workspace account to
                                        schedule native Live Meets or use Sandbox
                                        mode to test with simulated keys.
                                      </p>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            setUploadState("authenticating");
                                            const res = await signInWithGoogle();
                                            setGoogleEmailState(res.email);
                                            setUploadState("idle");
                                            setMatFormError(null);
                                          } catch (err: any) {
                                            setUploadState("idle");
                                            setMatFormError(
                                              err.message ||
                                                "OAuth selection was closed.",
                                            );
                                          }
                                        }}
                                        className="w-full text-center py-1.5 border border-ink bg-brand-acid hover:opacity-90 transition-opacity text-ink font-black uppercase text-[8.5px] cursor-pointer shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]"
                                      >
                                        🔑 Connect Google Account / Sandbox Mode
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="p-2 border border-brand-orange/30 bg-white font-mono text-[8.5px] leading-snug rounded-xs">
                                  <span className="text-brand-orange font-bold">
                                    🏫 TARGET INSTRUCTOR CHANNEL:
                                  </span>{" "}
                                  {course?.youtubeDesignatedChannel ? (
                                    <span className="font-bold underline text-brand-blue">
                                      {course.youtubeDesignatedChannel}
                                    </span>
                                  ) : (
                                    <span className="italic text-ink/65">
                                      Not specified (defaults to active
                                      credentials).
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!newMatTitle.trim()) {
                                      setMatFormError(
                                        "Please enter a Material Title first, as the API uses it for naming the calendar event and stream.",
                                      );
                                      return;
                                    }
                                    if (!newMatDate) {
                                      setMatFormError(
                                        "Please select a Schedule Date and Time first.",
                                      );
                                      return;
                                    }
                                    try {
                                      setMatFormError(null);
                                      setUploadState("generating_stream");
                                      const startDateObj = new Date(newMatDate);
                                      const endDateObj = newMatEndDate
                                        ? new Date(newMatEndDate)
                                        : new Date(
                                            startDateObj.getTime() + 60 * 60 * 1000,
                                          );

                                      let result;
                                      try {
                                        result = await createLiveClassSession(
                                          startDateObj.toISOString(),
                                          endDateObj.toISOString(),
                                          newMatTitle.trim(),
                                          newMatStreamingMode,
                                        );
                                      } catch (streamErr: any) {
                                        console.error(
                                          "Calendar scheduling failed",
                                          streamErr,
                                        );
                                        alert(
                                          "Calendar/Meet scheduling failed: " +
                                            streamErr.message,
                                        );
                                        return; // Stop trying to schedule
                                      }

                                      setNewMatUrl(result.meetLink);
                                      setNewMatYoutubeVideoId(
                                        result.youtubeVideoId,
                                      );
                                      setNewMatStreamKey(result.streamKey);
                                      setNewMatRtmpUrl(result.rtmpUrl);

                                      const textVal = result.warning
                                        ? `### Google Meet Classroom\n- **Google Meet Space**: ${result.meetLink}\n\n⚠️ Meet room allocated successfully.`
                                        : newMatStreamingMode === "gmeet"
                                          ? `### Instructor RTMP Streaming Instructions\n\nConfigure OBS Studio or dynamic stream recorder with:\n- **RTMP Server**: \`${result.rtmpUrl}\`\n- **Stream Key**: \`${result.streamKey}\`\n\n### Access Links\n- **Google Meet**: ${result.meetLink}\n- **Unlisted Youtube Broadcast**: [Watch link](https://www.youtube.com/watch?v=${result.youtubeVideoId})`
                                          : `### Google Meet Classroom (Manual Mode)\n- **Google Meet**: ${result.meetLink}\n\n🎓 Instructors: Conduct class on Google Meet space, record using OBS Studio, then paste the file/YouTube URL.`;

                                      setNewMatText(textVal);

                                      if (editingMaterial) {
                                        const updatedMaterial = {
                                          ...editingMaterial,
                                          url: result.meetLink,
                                          youtubeVideoId: result.youtubeVideoId,
                                          streamKey: result.streamKey,
                                          rtmpUrl: result.rtmpUrl,
                                          text: textVal,
                                          date: newMatDate,
                                          endDate:
                                            newMatEndDate ||
                                            endDateObj.toISOString(),
                                          streamingMode: newMatStreamingMode,
                                        };
                                        setEditingMaterial(updatedMaterial);
                                        setActiveMaterial(updatedMaterial);

                                        const updatedList = modulesList.map(
                                          (mod) => {
                                            if (mod._id === showAddMaterialForMod) {
                                              return {
                                                ...mod,
                                                materials: (
                                                  mod.materials || []
                                                ).map((mat: any) =>
                                                  mat._id === editingMaterial._id
                                                    ? updatedMaterial
                                                    : mat,
                                                ),
                                              };
                                            }
                                            return mod;
                                          },
                                        );
                                        setModulesList(updatedList);
                                        await saveModulesListToServer(updatedList);
                                      }

                                      setUploadState("idle");
                                    } catch (err: any) {
                                      console.error(err);
                                      setGoogleEmailState(getCachedEmail()); // sync dynamic email state if re-authorized/disconnected
                                      setMatFormError(
                                        err.message ||
                                          "Failed to schedule live event.",
                                      );
                                      setUploadState("idle");
                                    }
                                  }}
                                  disabled={uploadState === "generating_stream"}
                                  className="w-full text-center font-mono text-[9px] font-black uppercase bg-ink text-paper py-2.5 hover:bg-brand-orange hover:text-paper transition-all border-2 border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none cursor-pointer"
                                >
                                  {uploadState === "generating_stream"
                                    ? "🔄 Orchestrating Event & Classroom Link..."
                                    : newMatStreamingMode === "gmeet"
                                      ? "📅 Get Meet Link + Set Up YouTube Stream"
                                      : "📅 Create Google Meet Event Only"}
                                </button>

                                {newMatYoutubeVideoId && (
                                  <div className="mt-2 space-y-1 bg-white p-2.5 border border-ink/40 text-[8.5px] text-ink/80 leading-relaxed rounded-xs">
                                    <div className="text-brand-orange font-bold uppercase text-[9px]">
                                      LINKED SUCCESSFULLY:
                                    </div>
                                    <div>
                                      • <strong>Meet Space link</strong>:{" "}
                                      <a
                                        href={newMatUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-brand-blue underline"
                                      >
                                        {newMatUrl}
                                      </a>
                                    </div>
                                    <div>
                                      • <strong>YouTube Broadcast ID</strong>:{" "}
                                      {newMatYoutubeVideoId}
                                    </div>
                                    {newMatRtmpUrl && (
                                      <div className="truncate text-brand-blue font-bold">
                                        •{" "}
                                        <strong>
                                          Secure Stream key loaded to encoder
                                        </strong>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="mt-2 border-t border-ink/10 pt-2 text-left">
                                  <label className="block text-[8px] font-black uppercase opacity-60 mb-0.5">
                                    Override / Paste Custom YouTube watch link
                                    manually
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. dQw4w9WgXcQ or https://www.youtube.com/watch?v=..."
                                    value={newMatYoutubeVideoId}
                                    onChange={(e) => {
                                      const val = e.target.value.trim();
                                      let finalId = val;
                                      try {
                                        if (
                                          val.includes("youtube.com") ||
                                          val.includes("youtu.be")
                                        ) {
                                          const urlObj = new URL(val);
                                          if (val.includes("youtu.be")) {
                                            finalId = urlObj.pathname.slice(1);
                                          } else {
                                            finalId =
                                              urlObj.searchParams.get("v") ||
                                              urlObj.pathname.split("/").pop() ||
                                              val;
                                          }
                                        }
                                      } catch (err) {}
                                      setNewMatYoutubeVideoId(finalId);
                                    }}
                                    className="w-full p-2 border border-ink bg-white focus:outline-none text-[9px]"
                                  />
                                </div>
                              </div>
                            )}

                            {/* TAB 2: BROWSE */}
                            {liveTab === "browse" && (
                              <div className="space-y-4">
                                {/* Google Auth Status Dashboard */}
                                <div className="p-3 border-2 border-ink bg-white font-mono text-[9px] space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-ink flex items-center gap-1.5">
                                      {googleEmailState ? (
                                        <>
                                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                          <span className="text-emerald-600 font-extrabold uppercase">
                                            🟢 Google Associated
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                          <span className="text-rose-600 font-extrabold uppercase">
                                            ⚪ Google Logged Out
                                          </span>
                                        </>
                                      )}
                                    </span>
                                    {googleEmailState && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await disconnectGoogle();
                                          setGoogleEmailState(null);
                                          setBrowsedEvents([]);
                                          setSelectedBrowseEventIds([]);
                                          setStagedReviewEvents([]);
                                        }}
                                        className="p-1 px-1.5 border border-ink bg-red-50 hover:bg-red-100 text-[8px] font-black uppercase text-red-700 cursor-pointer transition-colors"
                                      >
                                        Disconnect
                                      </button>
                                    )}
                                  </div>

                                  {googleEmailState ? (
                                    <div className="text-ink/80 text-[8.5px] leading-relaxed">
                                      Authorized Account:{" "}
                                      <strong className="underline text-brand-blue">
                                        {googleEmailState}
                                      </strong>
                                      <div className="mt-1">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              setUploadState("authenticating");
                                              const res = await signInWithGoogle();
                                              setGoogleEmailState(res.email);
                                              setUploadState("idle");
                                              setMatFormError(null);
                                            } catch (err: any) {
                                              setUploadState("idle");
                                              setMatFormError(
                                                err.message ||
                                                  "OAuth selection was closed.",
                                              );
                                            }
                                          }}
                                          className="p-1 px-1.5 border border-ink bg-brand-orange/10 hover:bg-brand-orange/20 text-[8px] font-black uppercase text-brand-orange cursor-pointer transition-colors"
                                        >
                                          Switch Account / Reconnect
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      <p className="text-[7.8px] text-ink/65 leading-relaxed">
                                        Connect a Google Calendar workspace to browse existing events.
                                      </p>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            setUploadState("authenticating");
                                            const res = await signInWithGoogle();
                                            setGoogleEmailState(res.email);
                                            setUploadState("idle");
                                            setMatFormError(null);
                                          } catch (err: any) {
                                            setUploadState("idle");
                                            setMatFormError(
                                              err.message ||
                                                "OAuth selection was closed.",
                                            );
                                          }
                                        }}
                                        className="w-full text-center py-1.5 border border-ink bg-brand-acid hover:opacity-90 transition-opacity text-ink font-black uppercase text-[8.5px] cursor-pointer shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]"
                                      >
                                        🔑 Connect Google Account
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {googleEmailState && (
                                  <div className="space-y-4">
                                    {/* Date Pick + Action Bar */}
                                    <div className="flex items-end gap-2 p-3 bg-white border-2 border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                                      <div className="flex-1">
                                        <label className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                          Pick Date to Retrieve Classes
                                        </label>
                                        <input
                                          type="date"
                                          value={selectedBrowseDate}
                                          onChange={(e) => setSelectedBrowseDate(e.target.value)}
                                          className="w-full p-2 border-2 border-ink bg-white font-sans text-xs focus:outline-none font-bold"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        disabled={isFetchingBrowseEvents}
                                        onClick={handleFetchCalendarEvents}
                                        className="p-2 px-3 border-2 border-ink bg-brand-acid text-ink hover:opacity-95 transition-opacity font-bold uppercase text-[9px] shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer disabled:opacity-55"
                                      >
                                        {isFetchingBrowseEvents ? "🔍 Fetching..." : "🔍 Search Date"}
                                      </button>
                                    </div>

                                    {browseError && (
                                      <div className="p-2 text-[9px] font-mono border-2 border-rose-500 bg-rose-50 text-rose-700 font-bold uppercase">
                                        ⚠️ {browseError}
                                      </div>
                                    )}

                                    {/* Calendar event list results */}
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between border-b border-ink/10 pb-1.5 font-mono text-[10px]">
                                        <span className="font-extrabold text-ink uppercase">
                                          📅 Available Calendar Events ({browsedEvents.length})
                                        </span>
                                        {browsedEvents.length > 0 && (
                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={handleSelectAllEvents}
                                              className="text-[8px] font-black uppercase underline text-brand-blue hover:text-ink/80"
                                            >
                                              Select All
                                            </button>
                                            <button
                                              type="button"
                                              onClick={handleDeselectAllEvents}
                                              className="text-[8px] font-black uppercase underline text-rose-600 hover:text-ink/80"
                                            >
                                              Clear
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {browsedEvents.length === 0 ? (
                                        <div className="p-4 border-2 border-dashed border-ink/20 text-center text-[10px] text-ink/50 italic bg-white/40">
                                          No calendar entries currently listed for {selectedBrowseDate}. Connect Google account, change the date, or select "Create New Event" above.
                                        </div>
                                      ) : (
                                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                          {browsedEvents.map((ev) => {
                                            const isSelected = selectedBrowseEventIds.includes(ev.id);
                                            const formattedTime = ev.start
                                              ? new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                              : "All day";
                                            return (
                                              <label
                                                key={ev.id}
                                                className={`flex items-start gap-2.5 p-2.5 border-2 transition-all cursor-pointer bg-white ${
                                                  isSelected
                                                    ? "border-ink bg-brand-orange/5 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                                                    : "border-ink/10 hover:border-ink/30"
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={() => handleToggleEventSelection(ev)}
                                                  className="mt-0.5 cursor-pointer accent-brand-orange"
                                                />
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-black text-[10.5px] text-ink truncate">
                                                    {ev.summary}
                                                  </div>
                                                  <div className="text-[8.5px] text-ink/60 mt-0.5 font-mono flex flex-wrap gap-x-2">
                                                    <span>⏰ {formattedTime}</span>
                                                    {ev.meetLink && (
                                                      <span className="text-emerald-600 font-extrabold underline">
                                                        🟢 Meet Link Attached
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>

                                    {/* Review Panel of selected items for edit/saving */}
                                    {stagedReviewEvents.length > 0 && (
                                      <div className="mt-4 p-3 bg-white border-2 border-ink space-y-4 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                                        <div className="border-b-2 border-ink pb-2.5">
                                          <div className="flex items-center justify-between">
                                            <span className="font-black uppercase tracking-wider text-[10px] text-brand-orange bg-brand-orange/10 px-2 py-0.5 border border-brand-orange/20 rounded-xs">
                                              Review & Edit Selection ({stagedReviewEvents.length})
                                            </span>
                                            <button
                                              type="button"
                                              onClick={handleDeselectAllEvents}
                                              className="text-[8px] font-mono uppercase bg-red-100 border border-red-300 text-red-700 px-1.5 py-0.5 hover:bg-red-200"
                                            >
                                              Cancel All
                                            </button>
                                          </div>
                                          <p className="font-sans text-[8.5px] text-ink/70 mt-1 leading-snug">
                                            Modify individual details such as titles, times, or video ingestion settings. Click Save below when ready to add these to your course.
                                          </p>
                                        </div>

                                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                          {stagedReviewEvents.map((staged, sIdx) => (
                                            <div key={staged.id} className="p-3 border-2 border-ink bg-slate-50 relative space-y-2.5">
                                              <div className="absolute top-2 right-2 text-[8px] font-bold font-mono text-ink/30">
                                                STAGED #{sIdx + 1}
                                              </div>

                                              {/* Title input */}
                                              <div>
                                                <label className="block text-[8px] font-black uppercase text-ink/60 mb-0.5">
                                                  Class/Video Title *
                                                </label>
                                                <input
                                                  type="text"
                                                  value={staged.title}
                                                  onChange={(e) => handleUpdateStagedEvent(staged.id, "title", e.target.value)}
                                                  className="w-full p-2 border border-ink bg-white font-sans text-xs font-bold focus:outline-none"
                                               />
                                              </div>

                                              {/* Datetime elements */}
                                              <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                  <label className="block text-[8px] font-black uppercase text-ink/60 mb-0.5">
                                                    Start local datetime
                                                  </label>
                                                  <input
                                                    type="datetime-local"
                                                    value={staged.localStart}
                                                    onChange={(e) => handleUpdateStagedEvent(staged.id, "localStart", e.target.value)}
                                                    className="w-full p-1 border border-ink bg-white focus:outline-none text-[9.5px]"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-[8px] font-black uppercase text-ink/60 mb-0.5">
                                                    End local datetime
                                                  </label>
                                                  <input
                                                    type="datetime-local"
                                                    value={staged.localEnd}
                                                    onChange={(e) => handleUpdateStagedEvent(staged.id, "localEnd", e.target.value)}
                                                    className="w-full p-1 border border-ink bg-white focus:outline-none text-[9.5px]"
                                                  />
                                                </div>
                                              </div>

                                              {/* Links & Stream switch */}
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div>
                                                  <label className="block text-[8px] font-black uppercase text-ink/60 mb-0.5">
                                                    GMeet Link / Host link
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={staged.meetLink}
                                                    onChange={(e) => handleUpdateStagedEvent(staged.id, "meetLink", e.target.value)}
                                                    className="w-full p-1 border border-ink bg-white font-mono text-[9.5px] text-brand-blue"
                                                    placeholder="e.g. https://meet.google.com/..."
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-[8px] font-black uppercase text-ink/60 mb-0.5">
                                                    Streaming Mode
                                                  </label>
                                                  <select
                                                    value={staged.isStreamingMode || "manual"}
                                                    onChange={(e) => handleUpdateStagedEvent(staged.id, "isStreamingMode", e.target.value)}
                                                    className="w-full p-1 border border-ink bg-white text-[9.5px] cursor-pointer"
                                                  >
                                                    <option value="manual">🎓 Gmeet Only (Manual OBS)</option>
                                                    <option value="gmeet">🔴 Gmeet + YouTube stream</option>
                                                  </select>
                                                </div>
                                              </div>

                                              {/* Pre-recorded/Broadcast watch Link overlay */}
                                              <div>
                                                <label className="block text-[8px] font-black uppercase text-ink/60 mb-0.5">
                                                  YouTube Video Watch URL (Optional)
                                                </label>
                                                <input
                                                  type="text"
                                                  placeholder="https://www.youtube.com/watch?v=..."
                                                  value={staged.videoOverride}
                                                  onChange={(e) => handleUpdateStagedEvent(staged.id, "videoOverride", e.target.value)}
                                                  className="w-full p-1 border border-ink bg-white text-[9px] focus:outline-none"
                                                />
                                              </div>
                                            </div>
                                          ))}
                                        </div>

                                        {/* Submit Save Button */}
                                        <button
                                          type="button"
                                          onClick={() => handleImportCalendarEvents(showAddMaterialForMod)}
                                          className="w-full text-center font-mono text-[9.5px] font-black uppercase bg-ink text-paper py-2.5 hover:bg-brand-orange hover:text-paper transition-all border-2 border-ink shadow-[2.5px_2.5px_rgba(0,0,0,1)] hover:shadow-none cursor-pointer"
                                        >
                                          💾 Save & Import All {stagedReviewEvents.length} reviewed event(s)
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {newMatType === "text" ? (
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-ink/75">
                              Written Note / Markdown guidelines
                            </label>
                            <textarea
                              rows={8}
                              value={newMatText}
                              onChange={(e) => setNewMatText(e.target.value)}
                              placeholder="# Class Guidelines\nWrite educational markdown, checklists, or core readings content here..."
                              className="w-full p-2.5 border border-ink bg-white font-mono text-xs focus:outline-none h-44 shadow-[3px_3px_0px_rgba(0,0,0,1)]"
                            />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-ink/75">
                                {newMatType === "live_lecture"
                                  ? "URL / Google Meet Link *"
                                  : "URL / Main Document Link *"}
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsDriveSimOpen(true)}
                                className="inline-flex items-center gap-1 font-mono text-[8.5px] font-black bg-brand-blue/10 border border-brand-blue text-brand-blue px-2.5 py-1 hover:bg-brand-blue hover:text-paper rounded-xs cursor-pointer"
                              >
                                🗂️ Browse Google Drive Files
                              </button>
                            </div>

                            <input
                              type="text"
                              placeholder={
                                newMatType === "live_lecture"
                                  ? "https://meet.google.com/abc-defg-hij"
                                  : "https://example.com/file or direct link..."
                              }
                              value={newMatUrl}
                              onChange={(e) => setNewMatUrl(e.target.value)}
                              className="w-full p-2.5 border-2 border-ink bg-white text-xs focus:outline-none shadow-[3px_3px_0px_rgba(0,0,0,1)]"
                            />

                            {newMatType === "live_lecture" && newMatUrl && (
                              <p className="text-[10px] text-brand-blue font-bold font-mono bg-brand-blue/10 p-2.5 border border-brand-blue/30 leading-snug">
                                ✅ Google Meet Scheduled & Linked: The created
                                Meet link has been included under URL above!
                                Ensure you click "Add Material" below to save
                                the lecture to the course.
                              </p>
                            )}

                            {/* Local Custom file Upload Drag Drop space */}
                            <div
                              className="border-2 border-dashed border-ink/20 p-8 text-center bg-ink/5 hover:border-brand-blue hover:bg-brand-blue/5 cursor-pointer transition-all duration-150 flex flex-col items-center justify-center space-y-2 group rounded-xs"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add(
                                  "border-brand-blue",
                                  "bg-brand-blue/5",
                                );
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove(
                                  "border-brand-blue",
                                  "bg-brand-blue/5",
                                );
                              }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove(
                                  "border-brand-blue",
                                  "bg-brand-blue/5",
                                );
                                const file = e.dataTransfer.files?.[0];
                                if (file) {
                                  setMatFormError(null);
                                  let token = getCachedToken();
                                  if (!token) {
                                    try {
                                      setUploadState("authenticating");
                                      const res = await signInWithGoogle();
                                      token = res.accessToken;
                                      setGoogleEmailState(res.email);
                                    } catch (err: any) {
                                      setUploadState("idle");
                                      setMatFormError(
                                        err.message || "Failed to authenticate",
                                      );
                                      return;
                                    }
                                  }
                                  if (file.type.startsWith("video/")) {
                                    setSelectedFileForUpload(file);
                                    setUploadState("pending_video_option");
                                  } else {
                                    await startGDriveUpload(file, token);
                                  }
                                }
                              }}
                            >
                              <input
                                type="file"
                                id="file-upload-main"
                                className="hidden"
                                onChange={handleLocalFileUploadSelected}
                              />
                              <label
                                htmlFor="file-upload-main"
                                className="cursor-pointer block"
                              >
                                <Upload className="w-10 h-10 mx-auto text-brand-orange animate-bounce group-hover:scale-110 duration-150 mb-2" />
                                <span className="font-mono text-[10px] font-black uppercase tracking-wider block text-ink">
                                  Drag & Drop study files or Click here to
                                  select
                                </span>
                                <span className="font-sans text-[8.5px] text-ink/60 mt-1 block">
                                  Videos are uploaded to unlisted YouTube.
                                  PDFs/Audio are synced to cloud Google Drive
                                  folders.
                                </span>
                              </label>
                            </div>
                          </div>
                        )}

                        {uploadState === "authenticating" && (
                          <div className="p-3 border border-brand-blue bg-brand-blue/5 text-[9px] font-mono text-brand-blue animate-pulse">
                            🔑 Launching Google Drive Linkage authorization
                            popup... Complete authentication to start syncing.
                          </div>
                        )}

                        {uploadState === "pending_video_option" && (
                          <div className="p-4 border-2 border-ink bg-brand-acid text-ink space-y-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                            <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1">
                              🎬 Video Selected:{" "}
                              <strong>{selectedFileForUpload?.name}</strong>
                            </p>

                            <div className="border border-ink/20 p-2.5 bg-white space-y-3 text-[10px]">
                              <span className="text-[8.5px] font-black uppercase text-brand-orange block tracking-wider">
                                CONFIGURE TARGET BROADCAST UPLOAD SETTINGS
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[8px] font-bold uppercase mb-1">
                                    Video Title
                                  </label>
                                  <input
                                    type="text"
                                    maxLength={100}
                                    value={ytUploadTitle}
                                    onChange={(e) =>
                                      setYtUploadTitle(e.target.value)
                                    }
                                    className="w-full p-2 border border-ink bg-white font-mono text-[11px]"
                                    placeholder="Lec 3 Metadata"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-bold uppercase mb-1">
                                    Privacy
                                  </label>
                                  <select
                                    value={ytUploadVisibility}
                                    onChange={(e) =>
                                      setYtUploadVisibility(
                                        e.target.value as any,
                                      )
                                    }
                                    className="w-full p-2 border border-ink bg-white font-mono text-[11px]"
                                  >
                                    <option value="unlisted">
                                      📂 Unlisted (Recommended for LMS)
                                    </option>
                                    <option value="public">
                                      🔴 Public (Searchable on YouTube)
                                    </option>
                                    <option value="private">
                                      🔒 Private (Only you can watch)
                                    </option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[8px] font-bold uppercase mb-1">
                                  Description
                                </label>
                                <textarea
                                  value={ytUploadDescription}
                                  onChange={(e) =>
                                    setYtUploadDescription(e.target.value)
                                  }
                                  className="w-full p-2 border border-ink bg-white font-mono text-[11px] h-14 resize-none"
                                  placeholder="Describe video..."
                                />
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={async () => {
                                  const token = getCachedToken();
                                  if (selectedFileForUpload && token) {
                                    await startYoutubeUpload(
                                      selectedFileForUpload,
                                      token,
                                    );
                                  }
                                }}
                                className="flex-grow py-2 border-2 border-ink bg-ink text-paper font-mono text-xs font-black uppercase text-center hover:bg-brand-orange hover:text-paper"
                              >
                                Upload to YouTube
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const token = getCachedToken();
                                  if (selectedFileForUpload && token) {
                                    await startGDriveUpload(
                                      selectedFileForUpload,
                                      token,
                                    );
                                  }
                                }}
                                className="flex-grow py-2 border-2 border-ink bg-white font-mono text-xs font-black uppercase text-center hover:bg-brand-blue hover:text-paper"
                              >
                                Save to Google Drive
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFileForUpload(null);
                                setUploadState("idle");
                              }}
                              className="w-full text-center font-mono text-[8.5px] font-bold text-ink/65 uppercase hover:underline"
                            >
                              Cancel Video Upload
                            </button>
                          </div>
                        )}

                        {uploadState === "uploading" && (
                          <div className="p-4 bg-brand-orange/5 border border-brand-orange/20 space-y-1.5 text-xs rounded-xs">
                            <div className="flex justify-between font-black font-mono">
                              <span className="truncate max-w-[200px] uppercase">
                                Processing Sync: {uploadFileName}
                              </span>
                              <span className="text-brand-orange">
                                {uploadProgress}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-ink/10 rounded-full overflow-hidden border border-ink/5">
                              <div
                                className="h-full bg-brand-orange transition-all duration-150"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {uploadState === "completed" && (
                          <div className="p-3 border-2 border-brand-acid bg-brand-acid/15 text-brand-blue font-bold text-xs uppercase flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-brand-blue animate-bounce" />
                            File synced successfully onto institutional Google
                            storage directories.
                          </div>
                        )}

                        {matFormError && (
                          <div className="p-3 border-2 border-red-500 bg-red-500/10 text-red-600 font-bold text-xs uppercase leading-snug space-y-2">
                            <div>⚠️ API Sync Failure: {matFormError}</div>
                            {(matFormError.toLowerCase().includes("auth") ||
                              matFormError.toLowerCase().includes("expired") ||
                              matFormError
                                .toLowerCase()
                                .includes("permission") ||
                              matFormError
                                .toLowerCase()
                                .includes("forbidden") ||
                              matFormError.toLowerCase().includes("403") ||
                              matFormError.toLowerCase().includes("401")) && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    setUploadState("authenticating");
                                    const res = await signInWithGoogle();
                                    setGoogleEmailState(res.email);
                                    setUploadState("idle");
                                    setMatFormError(null);
                                  } catch (err: any) {
                                    setUploadState("idle");
                                    setMatFormError(
                                      err.message ||
                                        "OAuth selection was closed.",
                                    );
                                  }
                                }}
                                className="inline-block mt-1 px-3 py-1.5 border-2 border-red-600 bg-red-600 text-white font-mono text-[9px] font-black uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:bg-red-700 transition-colors cursor-pointer"
                              >
                                🔑 Click Here to Securely Authorize Google /
                                Sandbox Account
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Spacious Bottom actions buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-ink/15">
                        <button
                          type="button"
                          onClick={() =>
                            handleAddMaterial(showAddMaterialForMod)
                          }
                          className="flex-grow h-12 bg-brand-orange text-paper font-black uppercase text-xs shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer border-2 border-ink"
                        >
                          {editingMaterial
                            ? "✏️ Save Material Changes"
                            : "✨ Publish and Add to Module list"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleCancelAddEditMaterial();
                            if (prevLayoutMode) {
                              setLayoutMode(prevLayoutMode);
                              setPrevLayoutMode(null);
                            }
                          }}
                          className="px-6 h-12 border-2 border-ink bg-white text-ink hover:bg-ink hover:text-paper font-bold uppercase text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Cancel / Back to Viewer
                        </button>
                      </div>
                    </div>
                  ) : // Regular Course Player View
                  activeMaterial ? (
                    <div className="flex-1 flex flex-col justify-between">
                      {/* Header banner */}
                      <div className="p-4 bg-ink text-paper border-b border-ink flex items-center justify-between font-mono text-[10px] font-semibold tracking-widest uppercase">
                        <span className="flex items-center gap-2 text-brand-acid">
                          {activeMaterial.type === "video" && (
                            <Video className="w-3.5 h-3.5" />
                          )}
                          {activeMaterial.type === "audio" && (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          {activeMaterial.type === "live_lecture" && (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          {activeMaterial.type === "pdf" && (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                          {activeMaterial.type === "text" && (
                            <BookOpen className="w-3.5 h-3.5" />
                          )}
                          {activeMaterial.type === "image" && (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          {activeMaterial.group || "Additional Materials"}
                        </span>
                        <span className="opacity-60">
                          {activeMaterial.type.replace("_", " ")}
                        </span>
                      </div>

                      {/* Core content rendering */}
                      <div className="flex-1 p-8 bg-paper text-ink flex flex-col items-center justify-center min-h-[340px]">
                        {activeMaterial.type === "video" ? (
                          // Video embedding (YouTube support)
                          activeMaterial.url &&
                          (activeMaterial.url.includes("youtube.com") ||
                            activeMaterial.url.includes("youtu.be")) ? (
                            <div className="w-full h-full min-h-[350px] relative">
                              <iframe
                                src={`https://www.youtube.com/embed/${activeMaterial.url.split("v=")[1]?.split("&")[0] || activeMaterial.url.split("/").pop()}`}
                                className="absolute inset-0 w-full h-full border-2 border-ink"
                                allowFullScreen
                                title={activeMaterial.title}
                              />
                            </div>
                          ) : (
                            <video
                              controls
                              className="w-full max-h-[450px]"
                              src={activeMaterial.url}
                            >
                              Your browser does not support HTML video playback.
                            </video>
                          )
                        ) : activeMaterial.type === "audio" ? (
                          <div className="w-full max-w-md p-6 border-2 border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-none text-center">
                            <div className="w-16 h-16 bg-brand-acid text-ink rounded-full flex items-center justify-center mx-auto mb-4 border border-ink">
                              <Play className="w-6 h-6 ml-1" />
                            </div>
                            <div className="font-serif font-black italic text-lg mb-2">
                              {activeMaterial.title}
                            </div>
                            <audio
                              controls
                              className="w-full mt-4"
                              src={activeMaterial.url}
                            />
                          </div>
                        ) : activeMaterial.type === "live_lecture" ? (
                          <div className="w-full max-w-lg p-8 border-2 border-ink bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-none">
                            <div className="flex items-center gap-3 mb-6 bg-brand-orange/10 p-3 border border-brand-orange">
                              <Video className="w-5 h-5 text-brand-orange animate-pulse" />
                              <span className="font-mono text-xs font-black uppercase tracking-widest text-brand-orange">
                                SCHEDULED LIVE LECTURE
                              </span>
                            </div>
                            <h3 className="font-serif font-black italic text-2xl mb-4">
                              {activeMaterial.title}
                            </h3>

                            {activeMaterial.youtubeVideoId ? (
                              <div className="mb-6 aspect-video border-2 border-ink bg-black shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                                <iframe
                                  className="w-full h-full"
                                  src={`https://www.youtube.com/embed/${activeMaterial.youtubeVideoId}`}
                                  title={activeMaterial.title}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                ></iframe>
                              </div>
                            ) : null}

                            <div className="space-y-3 font-mono text-xs mb-8 text-ink text-left">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-ink/60" />
                                <strong>Scheduled Time:</strong>{" "}
                                {new Date(
                                  activeMaterial.date || Date.now(),
                                ).toLocaleDateString(undefined, {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-ink/60" />
                                <strong>Attendance Grade:</strong> Required,
                                counts for credits.
                              </div>
                              {activeMaterial.streamingMode === "manual" && (
                                <div className="p-2 border border-brand-blue bg-brand-blue/5 text-[10px] leading-snug">
                                  ℹ️ <strong>Manual Streaming via OBS</strong>:
                                  Instructors record or stream this lecture via
                                  OBS. Replay links could be uploaded/updated
                                  directly below after concluding.
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-4 mb-6">
                              <a
                                href={activeMaterial.url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-4 bg-ink text-paper font-mono text-xs font-black uppercase tracking-widest hover:bg-brand-orange hover:text-paper transition-colors shadow-[4px_4px_0px_rgba(37,99,235,1)]"
                              >
                                Join Live Lecture{" "}
                                <ArrowLeft className="w-4 h-4 rotate-180" />
                              </a>
                            </div>

                            {isInstructorOrTA && (
                              <div className="mt-8 border-t-2 border-dashed border-ink/30 pt-6 text-left font-mono">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-orange mb-1 flex items-center gap-1">
                                  <span>🛠️ Instructor Recording Controls</span>
                                </h4>
                                <p className="text-[8px] text-ink/75 mb-4 leading-relaxed font-semibold uppercase tracking-wider">
                                  PROVIDE A NEW OR REPLACEMENT YOUTUBE RECORDING
                                  LINK, OR DIRECTLY UPLOAD A LOCAL RECORDED
                                  VIDEO FILE USING THE INTEGRATED YOUTUBE API
                                  V3.
                                </p>

                                <div className="space-y-4">
                                  {/* Option 1: Paste YouTube link */}
                                  <div className="p-3 border border-ink bg-brand-orange/5">
                                    <span className="text-[8px] font-black uppercase text-brand-orange">
                                      OPTION 1: PASTE REPLAY VIDEO LINK / REPLAY
                                      ID
                                    </span>
                                    <div className="flex gap-2 mt-1.5">
                                      <input
                                        type="text"
                                        placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                        value={liveLectureYoutubeInput}
                                        onChange={(e) =>
                                          setLiveLectureYoutubeInput(
                                            e.target.value,
                                          )
                                        }
                                        className="flex-1 p-1.5 border border-ink text-[10px] font-sans focus:outline-none bg-white font-medium text-ink"
                                      />
                                      <button
                                        onClick={
                                          handleSaveYoutubeLinkForLecture
                                        }
                                        className="px-3 py-1.5 bg-ink text-paper text-[9px] font-black uppercase hover:bg-brand-blue transition-colors duration-150"
                                      >
                                        Save Link
                                      </button>
                                    </div>
                                  </div>

                                  {/* Option 2: Upload recorded file */}
                                  <div className="p-3 border border-ink bg-brand-blue/5">
                                    <span className="text-[8px] font-black uppercase text-brand-blue">
                                      OPTION 2: UPLOAD RECORDING TO TARGET
                                      CHANNEL (API V3)
                                    </span>
                                    <p className="text-[7.5px] font-sans opacity-70 mt-1 uppercase tracking-wider font-bold text-ink">
                                      🎯 TARGET CHANNEL:{" "}
                                      <span className="underline font-bold text-brand-blue">
                                        {course?.youtubeDesignatedChannel ||
                                          "Authorized Account's Channel"}
                                      </span>
                                    </p>
                                    <div className="mt-2.5 flex flex-col gap-1.5">
                                      <input
                                        id="lecture-video-file-student-view"
                                        type="file"
                                        accept="video/*"
                                        onChange={handleLectureVideoFileChange}
                                        className="hidden"
                                      />
                                      <div className="flex gap-2">
                                        <label
                                          htmlFor="lecture-video-file-student-view"
                                          className="cursor-pointer px-3 py-2 border border-ink bg-white text-[9px] font-black uppercase text-center flex-1 hover:bg-ink/5"
                                        >
                                          {selectedLectureVideo
                                            ? `Selected: ${selectedLectureVideo.name}`
                                            : "📂 Choose recorded file..."}
                                        </label>
                                        {selectedLectureVideo && (
                                          <button
                                            onClick={
                                              handleUploadLectureVideoToYoutube
                                            }
                                            disabled={uploadingLectureVideo}
                                            className="px-4 py-2 bg-brand-blue text-paper text-[9px] font-black uppercase hover:bg-ink transition-colors disabled:opacity-50"
                                          >
                                            {uploadingLectureVideo
                                              ? "Uploading..."
                                              : "🚀 Upload"}
                                          </button>
                                        )}
                                      </div>

                                      {selectedLectureVideo && (
                                        <div className="border border-ink/20 p-2.5 bg-white space-y-2 mt-1.5 text-left text-xs text-ink/90">
                                          <span className="text-[8px] font-black uppercase text-brand-orange block">
                                            Configure Recording Video Upload
                                            Settings
                                          </span>

                                          <div>
                                            <label className="block text-[8px] font-mono font-bold uppercase tracking-wider mb-0.5 text-ink/65">
                                              Video Title
                                            </label>
                                            <input
                                              type="text"
                                              maxLength={100}
                                              value={ytUploadTitle}
                                              onChange={(e) =>
                                                setYtUploadTitle(e.target.value)
                                              }
                                              className="w-full p-1.5 border border-ink bg-white font-mono text-[9px] focus:outline-none text-ink font-medium"
                                              placeholder="Enter recording title (Max 100)"
                                            />
                                          </div>

                                          <div>
                                            <label className="block text-[8px] font-mono font-bold uppercase tracking-wider mb-0.5 text-ink/65">
                                              Description (Optional - Auto
                                              generated if left blank)
                                            </label>
                                            <textarea
                                              value={ytUploadDescription}
                                              onChange={(e) =>
                                                setYtUploadDescription(
                                                  e.target.value,
                                                )
                                              }
                                              className="w-full p-1.5 border border-ink bg-white font-mono text-[9px] focus:outline-none h-14 resize-none text-ink font-medium"
                                              placeholder="Describe this lecture recording..."
                                            />
                                          </div>

                                          <div>
                                            <label className="block text-[8px] font-mono font-bold uppercase tracking-wider mb-0.5 text-ink/65">
                                              Visibility (Privacy Status)
                                            </label>
                                            <select
                                              value={ytUploadVisibility}
                                              onChange={(e) =>
                                                setYtUploadVisibility(
                                                  e.target.value as any,
                                                )
                                              }
                                              className="w-full p-1.5 border border-ink bg-white font-mono text-[9px] focus:outline-none text-ink font-medium select-none"
                                            >
                                              <option value="unlisted">
                                                📂 Unlisted (Recommended for
                                                LMS)
                                              </option>
                                              <option value="public">
                                                🔴 Public (Searchable on
                                                YouTube)
                                              </option>
                                              <option value="private">
                                                🔒 Private (Only your authorized
                                                account can view)
                                              </option>
                                            </select>
                                          </div>
                                        </div>
                                      )}
                                      {uploadingLectureVideo && (
                                        <div className="w-full bg-ink/10 h-3 mt-1 border border-ink overflow-hidden relative">
                                          <div
                                            className="bg-brand-blue h-full transition-all duration-150"
                                            style={{
                                              width: `${lectureUploadProgress}%`,
                                            }}
                                          ></div>
                                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase tracking-widest text-ink">
                                            {lectureUploadProgress}%
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : activeMaterial.type === "pdf" ? (
                          <div className="w-full flex-1 flex flex-col items-center justify-center text-center py-6">
                            <FileText className="w-16 h-16 text-brand-blue mb-4" />
                            <h3 className="font-serif font-bold text-xl mb-2">
                              {activeMaterial.title}
                            </h3>
                            <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-6 font-semibold">
                              PDF Document
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center">
                              <a
                                href={activeMaterial.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-6 py-3 border-2 border-ink bg-white text-ink font-mono text-xs font-black uppercase tracking-widest hover:bg-brand-acid transition-colors shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                              >
                                Open PDF In New Tab
                              </a>
                              <a
                                href={activeMaterial.url}
                                download
                                className="px-6 py-3 bg-ink text-paper font-mono text-xs font-black uppercase tracking-widest hover:bg-brand-orange transition-colors shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                              >
                                Download PDF
                              </a>
                            </div>
                          </div>
                        ) : activeMaterial.type === "image" ? (
                          <div className="text-center">
                            <img
                              src={activeMaterial.url}
                              alt={activeMaterial.title}
                              className="max-w-full max-h-[350px] border-2 border-ink shadow-md object-contain mb-4 bg-white p-2"
                            />
                            <div className="font-serif font-black italic text-lg">
                              {activeMaterial.title}
                            </div>
                          </div>
                        ) : activeMaterial.type === "text" ? (
                          <div className="w-full max-w-2xl bg-white p-8 border-2 border-ink shadow-md font-serif text-ink leading-relaxed">
                            <h3 className="text-2xl font-black italic mb-4 pb-2 border-b border-ink/10">
                              {activeMaterial.title}
                            </h3>
                            <div className="whitespace-pre-wrap text-sm">
                              {activeMaterial.text || "No text content loaded."}
                            </div>
                          </div>
                        ) : (
                          // links, docx, documents
                          <div className="w-full flex-1 flex flex-col items-center justify-center text-center py-6">
                            <Download className="w-16 h-16 text-brand-orange mb-4 animate-bounce" />
                            <h3 className="font-serif font-bold text-xl mb-2">
                              {activeMaterial.title}
                            </h3>
                            <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-6">
                              LMS Resource Link ({activeMaterial.type})
                            </p>
                            <a
                              href={activeMaterial.url || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="px-8 py-4 bg-ink text-paper font-mono text-xs font-black uppercase tracking-widest hover:bg-brand-blue transition-all border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                            >
                              Get Resource Document
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Footer strip / Live Interaction Lesson Switcher Controls */}
                      <div className="p-4 bg-ink text-paper border-t border-ink flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[9px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrevMaterial();
                          }}
                          disabled={currentIdx <= 0}
                          className={`px-3 py-1.5 flex items-center gap-1.5 font-bold uppercase transition-all duration-150 border-2 ${
                            currentIdx > 0
                              ? "border-white/40 text-paper hover:bg-brand-acid hover:text-ink hover:border-brand-acid shadow-[2px_2px_0px_rgba(255,255,255,0.15)] active:translate-y-0.5 cursor-pointer"
                              : "border-white/10 text-paper/30 cursor-not-allowed"
                          }`}
                          title="Previous Lesson (Alt + P or Left arrow)"
                        >
                          ◀ Prev{" "}
                          <span className="opacity-65 scale-90 font-light">
                            [Alt+P/←]
                          </span>
                        </button>

                        <div className="flex flex-col items-center justify-center font-mono leading-none">
                          <span className="text-[10px] uppercase font-black tracking-widest text-brand-acid mb-1 animate-pulse">
                            Lesson {currentIdx + 1} of {flattenedMats.length}
                          </span>
                          <span className="text-[8px] text-paper/60 uppercase truncate max-w-[200px]">
                            {activeMaterial.title}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNextMaterial();
                          }}
                          disabled={currentIdx >= flattenedMats.length - 1}
                          className={`px-3 py-1.5 flex items-center gap-1.5 font-bold uppercase transition-all duration-150 border-2 ${
                            currentIdx < flattenedMats.length - 1
                              ? "border-white/40 text-paper hover:bg-brand-acid hover:text-ink hover:border-brand-acid shadow-[2px_2px_0px_rgba(255,255,255,0.15)] active:translate-y-0.5 cursor-pointer"
                              : "border-white/10 text-paper/30 cursor-not-allowed"
                          }`}
                          title="Next Lesson (Alt + N or Right arrow)"
                        >
                          <span className="opacity-65 scale-90 font-light">
                            [Alt+N/→]
                          </span>{" "}
                          Next ▶
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 p-12 text-center text-ink/40 font-mono text-sm leading-relaxed flex flex-col items-center justify-center min-h-[350px]">
                      <BookOpen className="w-12 h-12 opacity-30 mb-4 text-brand-blue" />
                      Choose a module or course material in the outline to begin.
                    </div>
                  )}
                </div>

                {activeMaterial && workMode === "materials" && !showAddMaterialForMod && <LearningNotes courseSlug={course.slug} materialId={String(activeMaterial._id)} total={flattenedMats.length} materialIds={flattenedMats.map(x=>String(x.material._id))} />}
                <div>
                  {isEditing && permissions.edit_course_details ? (
                    <div className="mb-4">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-4xl font-serif font-black italic bg-transparent border-b-2 border-ink focus:outline-none mb-2"
                      />
                    </div>
                  ) : (
                    <h2 className="text-4xl font-serif font-black italic mb-4">
                      {course.courseCode ? `[${course.courseCode}] ` : ""}
                      {course.title}
                      {isInstructorOrTA && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="ml-4 text-xs font-mono font-bold uppercase tracking-widest text-brand-blue hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </h2>
                  )}
                  <div className="flex gap-4 font-mono text-[10px] font-black uppercase tracking-widest text-ink/40 mb-8 border-b border-ink/10 pb-8">
                    <span className="text-brand-orange">
                      {course.credits} Credits
                    </span>
                    <span>•</span>
                    <span>Learning workspace</span>
                  </div>
                </div>
              </div>

              {/* Real-time Interactive Column Resizing Splitter Bar */}
              {isLargeScreen && layoutMode === "split" && (
                <div
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  className={`w-6 h-full min-h-[450px] cursor-col-resize flex items-center justify-center group relative select-none shrink-0 self-stretch duration-150 ${isDragging ? "bg-brand-acid/20" : "hover:bg-ink/5"}`}
                  title="Drag Left/Right to dynamically resize columns"
                >
                  <div
                    className={`w-1 h-32 rounded-full transition-all duration-150 ${isDragging ? "bg-brand-orange h-44 shadow-lg scale-x-125" : "bg-ink/20 group-hover:bg-ink/50"}`}
                  ></div>
                </div>
              )}

              {/* Right Panel - Module / Materials list */}
              <div
                className="learning-module-list w-full lg:sticky lg:top-36 shrink-0 transition-all duration-300"
                style={{
                  display: layoutMode === "fullscreen" ? "none" : "block",
                  width: isLargeScreen
                    ? layoutMode === "minimized"
                      ? "100%"
                      : `${100 - leftWidthPercent}%`
                    : "100%",
                  maxWidth: isLargeScreen
                    ? layoutMode === "minimized"
                      ? "100%"
                      : `${100 - leftWidthPercent}%`
                    : "100%",
                }}
              >
                <div
                  className="bg-paper border-2 border-ink p-6 mb-8 shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col"
                  style={{
                    maxHeight:
                      isLargeScreen && layoutMode === "split"
                        ? "calc(100vh - 180px)"
                        : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-mono text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                      Course Modules
                    </h4>
                    {isInstructorOrTA && !simulateUnenrolledParam && (
                      <button
                        onClick={handleCreateModule}
                        className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase bg-brand-acid text-ink border border-ink px-2 py-1 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-0.5"
                      >
                        <Plus className="w-3 h-3" /> New Module
                      </button>
                    )}
                  </div>

                  <div className="space-y-6 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                    {modulesList.map((mod, midx) => {
                      // Group materials for this module
                      const groupedMats = {};
                      const currentMaterials = mod.materials || [];
                      currentMaterials.forEach((mat: any) => {
                        const groupName = mat.group || "Additional Materials";
                        // @ts-ignore
                        if (!groupedMats[groupName])
                          groupedMats[groupName] = [];
                        // @ts-ignore
                        groupedMats[groupName].push(mat);
                      });

                      return (
                        <div
                          key={mod._id || midx}
                          className="border border-ink bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                        >
                          <div className="p-4 bg-ink/5 font-serif font-black italic text-md border-b border-ink flex items-center justify-between">
                            <span
                              className="truncate max-w-[200px]"
                              title={mod.title}
                            >
                              {mod.title}
                            </span>
                            {isInstructorOrTA && !simulateUnenrolledParam && (
                              <div className="flex items-center gap-2 ml-2">
                                <button
                                  title="Add Course Material"
                                  onClick={() => {
                                    if (showAddMaterialForMod === mod._id) {
                                      handleCancelAddEditMaterial();
                                      if (prevLayoutMode) {
                                        setLayoutMode(prevLayoutMode);
                                        setPrevLayoutMode(null);
                                      }
                                    } else {
                                      handleCancelAddEditMaterial();
                                      if (layoutMode === "minimized") {
                                        setPrevLayoutMode("minimized");
                                        setLayoutMode("split");
                                      } else {
                                        setPrevLayoutMode(layoutMode);
                                      }
                                      setLeftWidthPercent(70);
                                      setShowAddMaterialForMod(mod._id);
                                      setTimeout(() => {
                                        const el = document.getElementById(
                                          "lms-workspace-content",
                                        );
                                        if (el)
                                          el.scrollIntoView({
                                            behavior: "smooth",
                                          });
                                      }, 50);
                                    }
                                  }}
                                  className="p-1 hover:bg-brand-orange/20 text-brand-orange transition-colors border border-brand-orange/30 rounded-sm"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Edit Module Title"
                                  onClick={() =>
                                    handleEditModuleTitle(
                                      mod._id || `mod-fallback-${midx}`,
                                      mod.title,
                                    )
                                  }
                                  className="p-1 hover:bg-brand-blue/20 text-brand-blue transition-colors border border-brand-blue/30 rounded-sm"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Delete Module"
                                  onClick={() =>
                                    handleDeleteModule(
                                      mod._id || `mod-fallback-${midx}`,
                                    )
                                  }
                                  className="p-1 hover:bg-brand-orange/20 text-brand-orange transition-colors border border-brand-orange/30 rounded-sm"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Material Input form inside modules window list - bypassed to use spacious Main Workspace Left Panel */}
                          {false && showAddMaterialForMod === mod._id && (
                            <div className="p-4 border-b border-ink/20 bg-brand-orange/5 space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] font-black uppercase tracking-wider text-brand-orange">
                                  {editingMaterial
                                    ? "Edit / Replace Material"
                                    : "Add Material under this Module"}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleCancelAddEditMaterial}
                                  className="text-ink hover:text-brand-orange"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="space-y-4 font-mono text-xs">
                                <div>
                                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                    Title *
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Phonetics Reading Chapter, Lecture Video..."
                                    value={newMatTitle}
                                    onChange={(e) =>
                                      setNewMatTitle(e.target.value)
                                    }
                                    className="w-full p-2 border border-ink bg-white focus:outline-none"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                      Type
                                    </label>
                                    <select
                                      value={newMatType}
                                      onChange={(e) =>
                                        setNewMatType(e.target.value)
                                      }
                                      className="w-full p-2 border border-ink bg-white focus:outline-none text-[10px]"
                                    >
                                      <option value="video">
                                        Video Lecture (YouTube)
                                      </option>
                                      <option value="audio">
                                        Audio (Public Link)
                                      </option>
                                      <option value="live_lecture">
                                        Live Schedule Class
                                      </option>
                                      <option value="pdf">
                                        PDF Document Reader
                                      </option>
                                      <option value="image">
                                        Image Display
                                      </option>
                                      <option value="text">
                                        Written Guideline / Text
                                      </option>
                                      <option value="document">
                                        Docx/XLSX/Slides Link
                                      </option>
                                      <option value="link">
                                        Other External URL
                                      </option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                      Group Category
                                    </label>
                                    <select
                                      value={newMatGroup}
                                      onChange={(e) =>
                                        setNewMatGroup(e.target.value)
                                      }
                                      className="w-full p-2 border border-ink bg-white focus:outline-none text-[10px]"
                                    >
                                      <option value="Readings">
                                        Reading Lists
                                      </option>
                                      <option value="Class Recordings">
                                        Class Recordings
                                      </option>
                                      <option value="Additional Materials">
                                        Additional Materials
                                      </option>
                                      <option value="Custom">
                                        + Custom group...
                                      </option>
                                    </select>
                                  </div>
                                </div>

                                {newMatGroup === "Custom" && (
                                  <div>
                                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                      Custom Category Name *
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Enter group (e.g., Lab Manuals)"
                                      value={customGroupText}
                                      onChange={(e) =>
                                        setCustomGroupText(e.target.value)
                                      }
                                      className="w-full p-2 border border-ink bg-white focus:outline-none"
                                    />
                                  </div>
                                )}

                                {newMatType === "live_lecture" && (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                        Start Date & Time *
                                      </label>
                                      <input
                                        type="datetime-local"
                                        value={newMatDate}
                                        onChange={(e) =>
                                          setNewMatDate(e.target.value)
                                        }
                                        className="w-full p-2 border border-ink bg-white focus:outline-none text-[10px]"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                        End Date & Time [Optional]
                                      </label>
                                      <input
                                        type="datetime-local"
                                        value={newMatEndDate}
                                        onChange={(e) =>
                                          setNewMatEndDate(e.target.value)
                                        }
                                        className="w-full p-2 border border-ink bg-white focus:outline-none text-[10px]"
                                      />
                                    </div>

                                    {/* Google Meet & YouTube Stream Auto Generator Button */}
                                    <div className="bg-brand-orange/5 p-3 border-2 border-ink mt-2">
                                      <div className="font-mono text-[9px] font-black uppercase mb-1 text-ink flex items-center gap-1">
                                        <Video className="w-3.5 h-3.5 text-brand-orange animate-pulse" />
                                        Google Workspace Stream Automation
                                      </div>
                                      <p className="text-[8px] leading-relaxed text-ink/70 mb-2">
                                        Creates a Google Calendar event,
                                        allocates a Google Meet room, registers
                                        an unlisted YouTube Live broadcast on
                                        your channel to prevent public search
                                        indexers, and displays custom RTMP
                                        server credentials.
                                      </p>
                                      <div className="mb-2 p-1.5 border border-brand-orange bg-white font-mono text-[8px] leading-snug">
                                        <span className="text-brand-orange font-bold">
                                          🎯 TARGET CHANNEL:
                                        </span>{" "}
                                        {course?.youtubeDesignatedChannel ? (
                                          <span className="font-bold underline text-brand-blue">
                                            {course.youtubeDesignatedChannel}
                                          </span>
                                        ) : (
                                          <span className="italic text-ink/60">
                                            Not specified (defaults to
                                            authorized account's channel). You
                                            can specify a designated channel in
                                            the "Edit" panel at the top.
                                          </span>
                                        )}
                                      </div>

                                      <div className="mb-3 text-left">
                                        <label className="block text-[8px] font-mono font-bold uppercase tracking-wider mb-1 text-ink/65">
                                          Live Lecture Mode
                                        </label>
                                        <select
                                          value={newMatStreamingMode}
                                          onChange={(e) =>
                                            setNewMatStreamingMode(
                                              e.target.value as any,
                                            )
                                          }
                                          className="w-full p-1.5 border border-ink bg-white font-mono text-[10px] focus:outline-none font-bold"
                                        >
                                          <option value="gmeet">
                                            🔴 Gmeet Link + YouTube streaming
                                          </option>
                                          <option value="manual">
                                            🎓 Only Gmeet Link
                                          </option>
                                        </select>
                                        <p className="text-[7.5px] font-sans opacity-70 mt-1 uppercase tracking-wider font-bold text-ink leading-normal">
                                          {newMatStreamingMode === "gmeet"
                                            ? "🎯 Automatically creates a Calendar event with Google Meet + unlisted YouTube broadcast room for real-time OBS streaming."
                                            : "💻 Creates a Google Calendar event & Meet room for conducting lectures natively on Google Meet, allowing video uploads or record-and-paste replays later."}
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!newMatTitle.trim()) {
                                            setMatFormError(
                                              "Please enter a Material Title first, as the API uses it for naming the calendar event and stream.",
                                            );
                                            return;
                                          }
                                          if (!newMatDate) {
                                            setMatFormError(
                                              "Please select a Schedule Date and Time first.",
                                            );
                                            return;
                                          }
                                          try {
                                            setMatFormError(null);
                                            setUploadState("generating_stream");
                                            // Use configured end date or fallback to +1 hour
                                            const startDateObj = new Date(
                                              newMatDate,
                                            );
                                            const endDateObj = newMatEndDate
                                              ? new Date(newMatEndDate)
                                              : new Date(
                                                  startDateObj.getTime() +
                                                    60 * 60 * 1000,
                                                );

                                            let result;
                                            try {
                                              result =
                                                await createLiveClassSession(
                                                  startDateObj.toISOString(),
                                                  endDateObj.toISOString(),
                                                  newMatTitle.trim(),
                                                  newMatStreamingMode,
                                                );
                                            } catch (streamErr: any) {
                                              console.error(
                                                "Calendar scheduling failed",
                                                streamErr,
                                              );
                                              alert(
                                                "Calendar/Meet scheduling failed: " +
                                                  (streamErr.message ||
                                                    streamErr),
                                              );
                                              return; // Stop trying to schedule
                                            }

                                            setNewMatUrl(result.meetLink);
                                            setNewMatYoutubeVideoId(
                                              result.youtubeVideoId,
                                            );
                                            setNewMatStreamKey(
                                              result.streamKey,
                                            );
                                            setNewMatRtmpUrl(result.rtmpUrl);

                                            if (result.warning) {
                                              setNewMatStreamingMode("manual");
                                              setNewMatText(
                                                `### Google Meet Classroom\n- **Google Meet Space**: ${result.meetLink}\n\n⚠️ *Note*: YouTube Live Broadcaster was unavailable during scheduling. You can conduct your lecture on Google Meet and optionally upload or paste a replay link anyway.`,
                                              );
                                              setMatFormError(result.warning);
                                              alert(
                                                result.warning +
                                                  "\n\nYour Google Meet room was created successfully: " +
                                                  result.meetLink,
                                              );
                                            } else {
                                              if (
                                                newMatStreamingMode === "gmeet"
                                              ) {
                                                setNewMatText(
                                                  `### Instructor RTMP Streaming Instructions\n\nTo broadcast live from third-party streaming clients (like OBS Studio or vMedia), configure your stream with:\n- **RTMP Server Ingest Address**: \`${result.rtmpUrl}\`\n- **Stream Key**: \`${result.streamKey}\`\n\n### Student Links\n- **Google Meet Space**: ${result.meetLink}\n- **Unlisted Recorded Watch stream**: [YouTube Broadcast](https://www.youtube.com/watch?v=${result.youtubeVideoId})\n\nThis text block will be visible to instructions and students.`,
                                                );
                                                alert(
                                                  "Successfully created Google Meet conference and unlisted YouTube Live stream!\n\nMeet URL: " +
                                                    result.meetLink +
                                                    "\nYouTube Video ID: " +
                                                    result.youtubeVideoId,
                                                );
                                              } else {
                                                setNewMatText(
                                                  `### Google Meet Classroom (Manual Mode)\n- **Google Meet Space**: ${result.meetLink}\n\n🎓 Instructors: Conduct class on Google Meet. You can record using OBS Studio, then upload or paste the recording/custom YouTube URL anytime after class Starts/Ends.`,
                                                );
                                                alert(
                                                  "Successfully scheduled Google Meet space in manual mode!\n\nMeet URL: " +
                                                    result.meetLink,
                                                );
                                              }
                                            }

                                            setUploadState("idle");
                                          } catch (err: any) {
                                            console.error(err);
                                            setMatFormError(
                                              err.message ||
                                                "Failed to establish live session integration.",
                                            );
                                            setUploadState("idle");
                                          }
                                        }}
                                        disabled={
                                          uploadState === "generating_stream"
                                        }
                                        className="w-full text-center font-mono text-[9px] font-black uppercase bg-ink text-paper py-2 hover:bg-brand-orange hover:text-paper transition-colors duration-200"
                                      >
                                        {uploadState === "generating_stream"
                                          ? "🔄 Engineering Conference Room..."
                                          : newMatStreamingMode === "gmeet"
                                            ? "📅 Get Meet Link + Set Up YouTube Stream"
                                            : "📅 Create Google Meet Event Only"}
                                      </button>

                                      {newMatYoutubeVideoId && (
                                        <div className="mt-2 space-y-1 bg-white p-2 border border-ink/40 font-mono text-[8.5px] text-ink/80">
                                          <div className="text-brand-orange font-bold uppercase text-[9px]">
                                            SUCCESSFULLY LINKED:
                                          </div>
                                          <div>
                                            • <strong>Meet link</strong>:{" "}
                                            {newMatUrl}
                                          </div>
                                          <div>
                                            •{" "}
                                            <strong>
                                              YouTube Broadcast ID
                                            </strong>
                                            : {newMatYoutubeVideoId}
                                          </div>
                                          <div className="truncate">
                                            • <strong>Server Ingest</strong>:{" "}
                                            {newMatRtmpUrl}
                                          </div>
                                          <div className="text-brand-blue font-bold">
                                            •{" "}
                                            <strong>
                                              Secure Stream Key Loaded
                                            </strong>
                                          </div>
                                        </div>
                                      )}

                                      {/* Manual Override YouTube Field for Live Lectures */}
                                      <div className="mt-3 border-t border-ink/10 pt-2 text-left">
                                        <label className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                          YouTube Recording URL or Video ID
                                          (Optional / Add Later)
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="e.g. dQw4w9WgXcQ or https://www.youtube.com/watch?v=..."
                                          value={newMatYoutubeVideoId}
                                          onChange={(e) => {
                                            const val = e.target.value.trim();
                                            let finalId = val;
                                            try {
                                              if (
                                                val.includes("youtube.com") ||
                                                val.includes("youtu.be")
                                              ) {
                                                const urlObj = new URL(val);
                                                if (val.includes("youtu.be")) {
                                                  finalId =
                                                    urlObj.pathname.slice(1);
                                                } else {
                                                  finalId =
                                                    urlObj.searchParams.get(
                                                      "v",
                                                    ) ||
                                                    urlObj.pathname
                                                      .split("/")
                                                      .pop() ||
                                                    val;
                                                }
                                              }
                                            } catch (err) {}
                                            setNewMatYoutubeVideoId(finalId);
                                          }}
                                          className="w-full p-2 border border-ink bg-white focus:outline-none text-[9.5px]"
                                        />
                                        <p className="text-[7.4px] leading-snug text-ink/70 mt-1 font-sans">
                                          Provide a YouTube link if you want to
                                          bypass automated streaming or update
                                          the lesson with a recording after
                                          Google Meet concludes.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {newMatType === "text" ? (
                                  <div>
                                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                      Body Text Content *
                                    </label>
                                    <textarea
                                      rows={3}
                                      value={newMatText}
                                      onChange={(e) =>
                                        setNewMatText(e.target.value)
                                      }
                                      placeholder="Write core guidelines or textual lectures here..."
                                      className="w-full p-2 border border-ink bg-white focus:outline-none text-[10px]"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="block text-[8px] font-black uppercase tracking-widest opacity-60">
                                        {newMatType === "live_lecture"
                                          ? "URL / Google Meet Link *"
                                          : "URL / Link *"}
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => setIsDriveSimOpen(true)}
                                        className="inline-flex items-center gap-1 font-mono text-[8px] font-black bg-brand-blue/10 border border-brand-blue text-brand-blue px-1.5 py-0.5 hover:bg-brand-blue hover:text-paper"
                                      >
                                        Browse Drive
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      placeholder={
                                        newMatType === "live_lecture"
                                          ? "https://meet.google.com/abc-defg-hij"
                                          : "https://youtube.com/... or public url"
                                      }
                                      value={newMatUrl}
                                      onChange={(e) =>
                                        setNewMatUrl(e.target.value)
                                      }
                                      className="w-full p-2 border border-ink bg-white focus:outline-none text-[10px]"
                                    />

                                    {newMatType === "live_lecture" &&
                                      newMatUrl && (
                                        <p className="text-[9px] text-brand-blue font-bold font-mono bg-brand-blue/10 p-2 border border-brand-blue/30 leading-snug mt-1.5">
                                          ✅ Google Meet Scheduled & Linked: The
                                          created Meet link has been included
                                          under URL above! Ensure you click
                                          "Update Material" (or Save) to keep
                                          the classroom link active.
                                        </p>
                                      )}

                                    {/* Local upload fallback file drag droppers */}
                                    <div className="border border-dashed border-ink/30 p-2 mt-2 text-center bg-white hover:border-ink cursor-pointer">
                                      <input
                                        type="file"
                                        id={`file-upload-nested-${mod._id}`}
                                        className="hidden"
                                        onChange={handleLocalFileUploadSelected}
                                      />
                                      <label
                                        htmlFor={`file-upload-nested-${mod._id}`}
                                        className="cursor-pointer block text-[8px] font-bold text-ink/70"
                                      >
                                        <Upload className="w-4 h-4 mx-auto mb-0.5 text-brand-orange" />
                                        {newMatType === "video"
                                          ? "Upload Video (YouTube/Drive choice)"
                                          : "Upload and auto-sync file to Google Drive"}
                                      </label>
                                    </div>
                                  </div>
                                )}

                                {uploadState === "authenticating" && (
                                  <div className="p-2 border border-brand-blue bg-brand-blue/5 text-[8px] font-mono text-brand-blue animate-pulse rounded-none mb-2">
                                    🔑 Authenticating with Google... Please
                                    complete the login popup.
                                  </div>
                                )}

                                {uploadState === "pending_video_option" && (
                                  <div className="p-3 border border-ink bg-brand-acid text-ink space-y-2.5 mb-2 text-left">
                                    <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink">
                                      🎬 Video loaded:{" "}
                                      <strong className="font-sans block text-[10px] text-brand-blue mt-0.5">
                                        {selectedFileForUpload?.name}
                                      </strong>
                                    </p>

                                    <div className="border border-ink/20 p-2 bg-white space-y-2 text-xs">
                                      <span className="text-[8px] font-black uppercase text-brand-orange block">
                                        Optional: Configure YouTube Upload
                                        Settings
                                      </span>

                                      <div>
                                        <label className="block text-[8px] font-mono font-bold uppercase tracking-wider mb-0.5 text-ink/65">
                                          Video Title
                                        </label>
                                        <input
                                          type="text"
                                          maxLength={100}
                                          value={ytUploadTitle}
                                          onChange={(e) =>
                                            setYtUploadTitle(e.target.value)
                                          }
                                          className="w-full p-1 border border-ink bg-white font-mono text-[9px] focus:outline-none text-ink"
                                          placeholder="Enter video title (Max 100)"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[8px] font-mono font-bold uppercase tracking-wider mb-0.5 text-ink/65">
                                          Description (Optional - Auto generated
                                          if empty)
                                        </label>
                                        <textarea
                                          value={ytUploadDescription}
                                          onChange={(e) =>
                                            setYtUploadDescription(
                                              e.target.value,
                                            )
                                          }
                                          className="w-full p-1 border border-ink bg-white font-mono text-[9px] focus:outline-none h-12 resize-none text-ink"
                                          placeholder="Describe your video..."
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[8px] font-mono font-bold uppercase tracking-wider mb-0.5 text-ink/65">
                                          Visibility (Privacy Status)
                                        </label>
                                        <select
                                          value={ytUploadVisibility}
                                          onChange={(e) =>
                                            setYtUploadVisibility(
                                              e.target.value as any,
                                            )
                                          }
                                          className="w-full p-1 border border-ink bg-white font-mono text-[9px] focus:outline-none text-ink select-none"
                                        >
                                          <option value="unlisted">
                                            📂 Unlisted (Recommended for LMS)
                                          </option>
                                          <option value="public">
                                            🔴 Public (Searchable on YouTube)
                                          </option>
                                          <option value="private">
                                            🔒 Private (Only you can watch)
                                          </option>
                                        </select>
                                      </div>
                                    </div>

                                    <p className="text-[8px] opacity-75 font-sans leading-relaxed">
                                      Choose destination for this study video
                                      file:
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const token = getCachedToken();
                                          if (selectedFileForUpload && token) {
                                            await startYoutubeUpload(
                                              selectedFileForUpload,
                                              token,
                                            );
                                          }
                                        }}
                                        className="p-1 px-2 border border-ink bg-ink text-paper font-mono text-[8px] font-black uppercase text-center hover:bg-brand-orange hover:text-paper"
                                      >
                                        Upload to YouTube
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const token = getCachedToken();
                                          if (selectedFileForUpload && token) {
                                            await startGDriveUpload(
                                              selectedFileForUpload,
                                              token,
                                            );
                                          }
                                        }}
                                        className="p-1 px-2 border border-ink bg-white font-mono text-[8px] font-black uppercase text-center hover:bg-brand-blue hover:text-paper"
                                      >
                                        Save to Drive
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedFileForUpload(null);
                                        setUploadState("idle");
                                      }}
                                      className="w-full text-center font-mono text-[8px] font-bold text-ink/60 uppercase hover:underline pt-1 block"
                                    >
                                      Cancel upload
                                    </button>
                                  </div>
                                )}

                                {uploadState === "uploading" && (
                                  <div className="p-2 bg-brand-orange/5 border border-brand-orange/10 space-y-1 text-[8px] font-sans">
                                    <div className="flex justify-between font-bold">
                                      <span className="truncate max-w-[120px]">
                                        {uploadFileName}
                                      </span>
                                      <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-ink/10 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-brand-orange transition-all"
                                        style={{ width: `${uploadProgress}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )}

                                {uploadState === "completed" && (
                                  <div className="p-1.5 border border-brand-acid bg-brand-acid/15 text-brand-blue font-bold text-[8px] uppercase flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-brand-blue" />{" "}
                                    {newMatUrl.includes("youtube.com") ||
                                    newMatUrl.includes("youtu.be")
                                      ? "Uploaded successfully on YouTube as Unlisted!"
                                      : "Synced & Shared View Anyone link on Google Drive!"}
                                  </div>
                                )}

                                {matFormError && (
                                  <div className="p-1.5 border border-red-500 bg-red-500/10 text-red-600 font-bold text-[9px] uppercase">
                                    ⚠️ {matFormError}
                                  </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleAddMaterial(mod._id)}
                                    className="flex-grow h-8 bg-brand-orange text-paper font-bold uppercase text-[9px]"
                                  >
                                    {editingMaterial
                                      ? "Save Changes"
                                      : "Add Material"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelAddEditMaterial}
                                    className="px-3 h-8 border border-ink hover:bg-ink hover:text-paper font-bold uppercase text-[9px]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-paper p-2 space-y-3">
                            {Object.keys(groupedMats).length > 0 ? (
                              Object.keys(groupedMats).map((groupName) => (
                                <div key={groupName} className="space-y-1">
                                  <div className="px-2 font-mono text-[8px] font-black uppercase text-ink/40 tracking-wider">
                                    {groupName}
                                  </div>
                                  {/* @ts-ignore */}
                                  {groupedMats[groupName].map((mat: any) => {
                                    const isActive =
                                      activeMaterial?._id === mat._id;
                                    return (
                                      <div
                                        key={mat._id}
                                        className={`group/item w-full flex items-center justify-between border border-ink/5 hover:border-ink hover:bg-brand-acid duration-150 p-2 text-left cursor-pointer ${isActive ? "bg-brand-acid border-ink border-l-4 border-l-brand-blue font-medium" : ""}`}
                                        onClick={() => {
                                          setActiveMaterial(mat);
                                          if (layoutMode === "minimized") {
                                            setLayoutMode("split");
                                          }
                                          window.scrollTo({
                                            top: 120,
                                            behavior: "smooth",
                                          });
                                        }}
                                      >
                                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                                          {mat.type === "video" ? (
                                            <Video className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                                          ) : mat.type === "audio" ? (
                                            <Play className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                                          ) : mat.type === "live_lecture" ? (
                                            <Calendar className="w-3.5 h-3.5 text-brand-orange shrink-0 animate-pulse" />
                                          ) : mat.type === "pdf" ? (
                                            <FileText className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                                          ) : (
                                            <Paperclip className="w-3.5 h-3.5 text-ink/40 shrink-0" />
                                          )}

                                          <div className="truncate text-[10px] font-mono font-bold leading-tight uppercase tracking-tight text-ink">
                                            {mat.title}
                                          </div>
                                        </div>

                                        {isInstructorOrTA &&
                                          !simulateUnenrolledParam && (
                                            <div className="flex items-center gap-1">
                                              <button
                                                title="Edit/Replace material"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleStartEditMaterial(
                                                    mod._id,
                                                    mat,
                                                  );
                                                  if (
                                                    layoutMode === "minimized"
                                                  ) {
                                                    setPrevLayoutMode(
                                                      "minimized",
                                                    );
                                                    setLayoutMode("split");
                                                  } else {
                                                    setPrevLayoutMode(
                                                      layoutMode,
                                                    );
                                                  }
                                                  setLeftWidthPercent(70);
                                                  setTimeout(() => {
                                                    const el =
                                                      document.getElementById(
                                                        "lms-workspace-content",
                                                      );
                                                    if (el)
                                                      el.scrollIntoView({
                                                        behavior: "smooth",
                                                      });
                                                  }, 50);
                                                }}
                                                className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-brand-blue/20 text-brand-blue transition-opacity border border-brand-blue/30 rounded-sm shrink-0"
                                              >
                                                <Edit className="w-2.5 h-2.5" />
                                              </button>
                                              <button
                                                title="Delete content"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteMaterial(
                                                    mod._id,
                                                    mat._id,
                                                  );
                                                }}
                                                className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-brand-orange/20 text-brand-orange transition-opacity border border-brand-orange/30 rounded-sm shrink-0"
                                              >
                                                <Trash2 className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-[10px] font-mono text-ink/30 italic">
                                No materials uploaded.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {modulesList.length === 0 && (
                      <div className="p-8 border border-dashed border-ink/30 text-center font-mono text-xs text-ink/40">
                        No course content modules added yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          // Public layout; learning and editor state remain owned by this controller.
          <div className="course-public-detail"><RecordHeading kind={eventContext?"event":"course"} record={course} actions={renderParticipationActions()}/><RecordExperience key={course.slug} title={course.title} sections={[...courseSections,{slug:'writing-media',title:'Writing & media',type:'writing'}]} renderSection={section=>section.type==='writing'?<ConnectedWriting type="course" slug={course.slug}/>: renderCourseSection(section)} glance={<RecordGlance record={course} kind={eventContext?"event":"course"} actions={renderParticipationActions()}/>}/>
          </div>
        )}
      </div>

      {/* Login Modal */}
      {/* Payment Modal */}
      <AnimatePresence>
        {selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-paper border border-ink p-12 max-w-2xl w-full shadow-[20px_20px_0px_rgba(0,0,0,1)] relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedAssignment(null)}
                className="absolute top-6 right-6 font-mono text-[10px] uppercase font-bold hover:text-brand-orange"
              >
                Close
              </button>
              <h3 className="text-3xl font-serif font-black italic mb-8">
                {selectedAssignment}
              </h3>

              {isInstructorOrTA &&
              (permissions.grade_assignments ||
                permissions.grade_assignments_unvalidated) &&
              !simulateUnenrolledParam ? (
                <div className="space-y-6">
                  <div className="p-4 border border-brand-blue bg-brand-blue/10 text-brand-blue font-mono text-xs font-bold uppercase tracking-widest mb-6">
                    Instructor Grading View
                  </div>
                  <div className="space-y-4">
                    {["Amanda Smith", "John Doe"].map((student, i) => (
                      <div
                        key={i}
                        className="p-4 border border-ink flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="font-bold">{student}</div>
                          <div className="font-mono text-xs opacity-60">
                            Submitted 2 hours ago
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Score /100"
                            className="w-24 p-2 border border-ink font-mono text-xs"
                          />
                          <button className="h-8 px-4 bg-brand-orange text-paper font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-orange/80">
                            Grade
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 border border-ink mb-6">
                    <div className="font-bold mb-2">Assignment Prompt</div>
                    <p className="text-sm opacity-80 leading-relaxed">
                      Please review the principles from Module 1 and submit a
                      500-word analysis on data governance challenges.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50">
                      Your Submission
                    </label>
                    <textarea
                      rows={8}
                      className="w-full p-4 border border-ink font-mono text-xs focus:outline-none"
                      placeholder="Write or paste your submission here..."
                    ></textarea>
                  </div>
                  <button className="h-12 w-full bg-brand-blue text-paper font-mono font-black text-xs uppercase tracking-widest hover:bg-ink transition-colors">
                    Submit Assignment
                  </button>
                  <p className="font-mono text-[9px] text-center opacity-60">
                    You can edit your submission until the deadline.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-paper border border-ink p-12 max-w-xl w-full shadow-[20px_20px_0px_rgba(0,0,0,1)] relative"
            >
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-6 right-6 font-mono text-[10px] uppercase font-bold hover:text-brand-orange"
              >
                Cancel
              </button>
              <h3 className="text-3xl font-serif font-black italic mb-8">
                Secure Checkout
              </h3>

              {loading ? (
                <div className="py-8">
                  <BrutalistLoader />
                </div>
              ) : (
                <>
                  <div className="bg-ink/5 p-6 border border-ink/20 mb-8 flex flex-col gap-2 font-mono text-xs font-bold uppercase tracking-widest">
                    <div className="flex justify-between items-center">
                      <span>
                        {course.courseCode ? `[${course.courseCode}] ` : ""}
                        {course.title}
                      </span>
                      {activeDiscount ? (
                        <span className="line-through text-ink/40">
                          ₹{course.fee}
                        </span>
                      ) : (
                        <span>
                          {course.fee > 0 ? `₹${course.fee}` : "Free"}
                        </span>
                      )}
                    </div>
                    {activeDiscount && (
                      <div className="flex justify-between items-center text-brand-orange">
                        <span>Prerequisite Discount</span>
                        <span>- ₹{activeDiscount.amount}</span>
                      </div>
                    )}
                    {activeDiscount && (
                      <div className="flex justify-between items-center border-t border-ink/20 pt-2 mt-2">
                        <span>Total</span>
                        <span>₹{course.fee - activeDiscount.amount}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 font-mono text-xs mb-8">
                    <input
                      type="text"
                      placeholder="Card Number"
                      className="w-full p-4 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue"
                    />
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-1/2 p-4 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue"
                      />
                      <input
                        type="text"
                        placeholder="CVC"
                        className="w-1/2 p-4 border border-ink bg-white/50 focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="w-full h-16 bg-brand-acid text-ink font-mono font-black uppercase tracking-[0.2em] text-xs hover:bg-ink hover:text-brand-acid transition-colors shadow-[6px_6px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1 disabled:opacity-50"
                  >
                    Pay & Enroll Now
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Simulated Google Drive Explorer Modal */}
      <AnimatePresence>
        {isDriveSimOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/80 backdrop-blur-sm px-4 text-ink">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-paper border-2 border-ink p-8 max-w-2xl w-full shadow-[16px_16px_0px_rgba(0,0,0,1)] relative"
            >
              <button
                type="button"
                onClick={() => setIsDriveSimOpen(false)}
                className="absolute top-4 right-4 bg-ink/5 hover:bg-ink/10 p-2 text-ink"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-6">
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
                    Connected Account: {user?.email || "instructor@academy.org"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink/40" />
                  <input
                    type="text"
                    placeholder="Global deep search (e.g. syllabus, readings, lecture, slides)..."
                    value={driveSimSearch}
                    onChange={(e) => setDriveSimSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        fetchRealDriveFiles(driveSimSearch);
                      }
                    }}
                    className="w-full pl-12 pr-4 h-12 bg-white border border-ink focus:outline-none focus:border-brand-blue font-mono text-xs text-ink"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchRealDriveFiles(driveSimSearch)}
                  className="px-6 h-12 border border-ink bg-brand-blue text-paper font-mono text-xs font-black uppercase tracking-widest hover:bg-ink transition-all shrink-0"
                >
                  Search Drive
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
                💡 <strong>Press Enter</strong> or click{" "}
                <strong>Search Drive</strong> to globally query your entire
                Google Drive instantly.
              </p>

              <div className="border border-ink max-h-[250px] overflow-y-auto mb-6 bg-white">
                {loadingDriveFiles && (
                  <div className="p-6 text-center font-mono text-[10px] text-brand-blue animate-pulse">
                    ⏳ Retrieving live documents and files from Google Drive...
                  </div>
                )}
                {(googleEmailState
                  ? realDriveFiles
                  : driveFiles.filter((f) =>
                      f.name
                        .toLowerCase()
                        .includes(driveSimSearch.toLowerCase()),
                    )
                ).map((file) => (
                  <div
                    key={file.id}
                    onClick={() => handleLinkDriveFile(file)}
                    className="p-4 border-b border-ink/5 last:border-none flex items-center justify-between hover:bg-brand-acid cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {file.type === "video" ? (
                        <Video className="w-4 h-4 text-brand-orange shrink-0" />
                      ) : file.type === "audio" ? (
                        <Play className="w-4 h-4 text-brand-blue shrink-0" />
                      ) : file.type === "pdf" ? (
                        <FileText className="w-4 h-4 text-brand-blue shrink-0" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-ink/60 shrink-0" />
                      )}
                      <span className="font-mono text-xs font-bold text-ink truncate max-w-[340px]">
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-right font-mono text-[10px] shrink-0 ml-2">
                      <span className="opacity-50">{file.size}</span>
                      <span className="bg-ink text-paper px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                        SELECT
                      </span>
                    </div>
                  </div>
                ))}
                {(googleEmailState
                  ? realDriveFiles
                  : driveFiles.filter((f) =>
                      f.name
                        .toLowerCase()
                        .includes(driveSimSearch.toLowerCase()),
                    )
                ).length === 0 && (
                  <div className="p-8 text-center font-mono text-xs text-ink/40">
                    No matching files found in your drive folder.
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="font-mono text-[9px] uppercase tracking-wider text-brand-blue font-bold flex items-center gap-1.5 bg-brand-blue/5 px-2 py-1 rounded-sm border border-brand-blue/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Workspace API
                  verified
                </span>
                <button
                  type="button"
                  onClick={() => setIsDriveSimOpen(false)}
                  className="px-6 h-10 border border-ink bg-white font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-paper shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Module Modal */}
      <AnimatePresence>
        {isModCreateOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/80 backdrop-blur-sm px-4 text-ink">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-paper border-2 border-ink p-8 max-w-md w-full shadow-[16px_16px_0px_rgba(0,0,0,1)] relative"
            >
              <button
                type="button"
                onClick={() => setIsModCreateOpen(false)}
                className="absolute top-4 right-4 bg-ink/5 hover:bg-ink/10 p-2 text-ink"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-serif font-black italic text-2xl text-ink mb-2">
                Create New Module
              </h3>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60 mb-6 font-semibold">
                Course Modules Content Builder
              </p>

              <div className="space-y-4 mb-6">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-black uppercase tracking-wider opacity-60">
                    Module Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Introduction to Sanskrit Grammar"
                    value={newModTitleInput}
                    onChange={(e) => setNewModTitleInput(e.target.value)}
                    className="w-full px-4 h-11 bg-white border-2 border-ink focus:outline-none focus:border-brand-orange font-mono text-xs text-ink"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModCreateOpen(false)}
                  className="px-4 h-10 border border-ink bg-white font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-paper transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitCreateModule}
                  disabled={!newModTitleInput.trim() || updateLoading}
                  className="px-6 h-10 bg-brand-acid text-ink border-2 border-ink font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-acid/80 disabled:opacity-50 transition-colors"
                >
                  {updateLoading ? "Saving..." : "Create"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Module Modal */}
      <AnimatePresence>
        {modToRename && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/80 backdrop-blur-sm px-4 text-ink">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-paper border-2 border-ink p-8 max-w-md w-full shadow-[16px_16px_0px_rgba(0,0,0,1)] relative"
            >
              <button
                type="button"
                onClick={() => setModToRename(null)}
                className="absolute top-4 right-4 bg-ink/5 hover:bg-ink/10 p-2 text-ink"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-serif font-black italic text-2xl text-ink mb-2">
                Rename Module
              </h3>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60 mb-6 font-semibold">
                Updates Module Identification Title
              </p>

              <div className="space-y-4 mb-6">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-black uppercase tracking-wider opacity-60">
                    Module Title
                  </label>
                  <input
                    type="text"
                    value={modRenameTitle}
                    onChange={(e) => setModRenameTitle(e.target.value)}
                    className="w-full px-4 h-11 bg-white border-2 border-ink focus:outline-none focus:border-brand-blue font-mono text-xs text-ink"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setModToRename(null)}
                  className="px-4 h-10 border border-ink bg-white font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-paper transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitRenameModule}
                  disabled={!modRenameTitle.trim() || updateLoading}
                  className="px-6 h-10 bg-brand-blue text-paper border-2 border-ink font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-blue/80 disabled:opacity-50 transition-colors"
                >
                  {updateLoading ? "Saving..." : "Rename"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Module Confirm Modal */}
      <AnimatePresence>
        {modToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/80 backdrop-blur-sm px-4 text-ink">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-paper border-2 border-red-500 p-8 max-w-md w-full shadow-[16px_16px_0px_rgba(239,68,68,1)] relative"
            >
              <div className="flex items-center gap-3 mb-4 text-red-600">
                <AlertTriangle className="w-8 h-8 shrink-0" />
                <h3 className="font-serif font-black italic text-xl">
                  Delete Course Module?
                </h3>
              </div>
              <p className="font-sans text-xs text-ink/70 leading-relaxed mb-6">
                Are you sure you want to delete this module and{" "}
                <strong>ALL of its linked course materials</strong>? This action
                is permanent and cannot be undone.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setModToDelete(null)}
                  className="px-4 h-10 border border-ink bg-white font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-paper"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitDeleteModule}
                  disabled={updateLoading}
                  className="px-6 h-10 bg-red-600 text-paper border border-red-700 font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {updateLoading ? "Deleting..." : "Yes, Delete ALL"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Material Confirm Modal */}
      <AnimatePresence>
        {matToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/80 backdrop-blur-sm px-4 text-ink">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-paper border-2 border-ink p-8 max-w-md w-full shadow-[16px_16px_0px_rgba(0,0,0,1)] relative"
            >
              <div className="flex items-center gap-3 mb-4 text-brand-orange">
                <Trash2 className="w-8 h-8 shrink-0" />
                <h3 className="font-serif font-black italic text-xl">
                  Delete Material?
                </h3>
              </div>
              <p className="font-sans text-xs text-ink/70 leading-relaxed mb-6">
                Are you sure you want to remove this course material content
                item?
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setMatToDelete(null)}
                  className="px-4 h-10 border border-ink bg-white font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-paper"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitDeleteMaterial}
                  disabled={updateLoading}
                  className="px-6 h-10 bg-brand-orange text-paper border border-ink font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-orange/80 disabled:opacity-50 transition-colors"
                >
                  {updateLoading ? "Removing..." : "Delete Content"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
