import ParticipationPhaseEditor from '../components/ParticipationPhaseEditor';
import { validateParticipationPhases } from '../lib/participation';
import { courseOverviewPages } from '../site/coursePresentation';
import CourseOverviewEditor from '../components/CourseOverviewEditor';
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { BrutalistLoader } from "../components/Loader";
import {
  Shield,
  Users as UsersIcon,
  BookOpen,
  Search,
  Check,
} from "lucide-react";
import { motion } from "motion/react";
import { getEffectiveStatus } from "../lib/courseStatus";

const UserMultiSelect = ({
  selectedUsers,
  onChange,
  availableUsers,
}: {
  selectedUsers: string[];
  onChange: (users: string[]) => void;
  availableUsers: any[];
}) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = availableUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative flex-1">
      {isOpen && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
      <div
        className="border border-ink p-1 flex flex-wrap gap-1 items-center bg-paper min-h-[40px] cursor-text relative z-[10]"
        onClick={() => setIsOpen(true)}
      >
        {selectedUsers.map((uid) => {
          const u = availableUsers.find((x) => x._id === uid);
          return (
            <span
              key={uid}
              className="bg-ink/10 px-2 py-1 text-[10px] font-mono flex items-center gap-1 border border-ink/20"
            >
              {u ? u.name : uid}
              <button
                type="button"
                className="hover:text-brand-orange ml-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(selectedUsers.filter((x) => x !== uid));
                }}
              >
                ×
              </button>
            </span>
          );
        })}
        <input
          type="text"
          className="outline-none text-xs font-mono bg-transparent flex-1 min-w-[100px] p-1"
          placeholder={selectedUsers.length === 0 ? "Search users..." : ""}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 max-h-48 overflow-y-auto border border-ink bg-paper z-[20] shadow-[4px_4px_0px_rgba(0,0,0,1)] mt-1">
          {filtered.map((u) => (
            <div
              key={u._id}
              className="p-2 text-xs font-mono hover:bg-brand-acid cursor-pointer flex items-center gap-2 border-b border-ink/10 transition-colors"
              onClick={() => {
                if (selectedUsers.includes(u._id)) {
                  onChange(selectedUsers.filter((x) => x !== u._id));
                } else {
                  onChange([...selectedUsers, u._id]);
                }
              }}
            >
              <input
                type="checkbox"
                checked={selectedUsers.includes(u._id)}
                readOnly
                className="accent-brand-blue"
              />
              {u.name} <span className="opacity-50">({u.email})</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-4 text-xs font-mono opacity-50 text-center">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const groupUsersByPermissions = (roleArray: any[]) => {
  const groups: any[] = [];
  for (const item of roleArray || []) {
    const permsStr = [...(item.permissions || [])].sort().join(",");
    const existingGroup = groups.find(
      (g) => [...(g.permissions || [])].sort().join(",") === permsStr,
    );
    if (existingGroup) {
      existingGroup.users.push(item.user);
    } else {
      groups.push({ users: [item.user], permissions: item.permissions || [] });
    }
  }
  return groups;
};

const handlePermissionChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  group: any,
  perm: string,
  setGroupPermissions: (perms: string[]) => void,
) => {
  const perms = new Set(group.permissions || []);
  const isChecked = e.target.checked;
  const typeParts = perm.split("_");
  const type = typeParts[0]; // materials, classes, assignments
  const action = typeParts.length > 1 ? typeParts.slice(1).join("_") : "";

  if (isChecked) {
    perms.add(perm);
    if (
      ["materials", "classes", "assignments"].includes(type) &&
      ["view", "edit", "add", "delete"].includes(action)
    ) {
      if (action === "edit") perms.add(`${type}_view`);
      if (action === "add") {
        perms.add(`${type}_view`);
        perms.add(`${type}_edit`);
      }
      if (action === "delete") {
        perms.add(`${type}_view`);
        perms.add(`${type}_edit`);
        perms.add(`${type}_add`);
      }
    }
  } else {
    perms.delete(perm);
    if (
      ["materials", "classes", "assignments"].includes(type) &&
      ["view", "edit", "add", "delete"].includes(action)
    ) {
      if (action === "view") {
        perms.delete(`${type}_edit`);
        perms.delete(`${type}_add`);
        perms.delete(`${type}_delete`);
      }
      if (action === "edit") {
        perms.delete(`${type}_add`);
        perms.delete(`${type}_delete`);
      }
      if (action === "add") {
        perms.delete(`${type}_delete`);
      }
    }
  }
  setGroupPermissions(Array.from(perms) as string[]);
};

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "users" | "courses" | "certifications"
  >(()=>query.get("tab")==="courses"?"courses":"users");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseStatusTab, setCourseStatusTab] = useState<
    "Draft" | "Upcoming" | "Ongoing" | "Completed" | "Archived" | "Trash"
  >("Draft");
  const [certifications, setCertifications] = useState<any[]>([]);
  const [certLoading, setCertLoading] = useState(false);
  const [enrolledCertIds, setEnrolledCertIds] = useState<string[]>([]);
  const [enrolledCourseSlugs, setEnrolledCourseSlugs] = useState<string[]>([]);
  const [showCourseForm, setShowCourseForm] = useState(()=>query.get("new")==="1");
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseFormData, setCourseFormData] = useState<any>({
    title: "",
    courseCode: "",
    description: "",
    type: "Online Course",
    fee: 0,
    completedFee: 0,
    credits: 0,
    duration: "",
    status: "Draft",
    startDate: "",
    endDate: "",
    modules: 1,
    outline: [],
    subPages: [],
    linkedCerts: [],
    hasMicrocert: false,
    microcertFee: 0,
    prerequisiteDiscounts: [],
    prerequisites: [],
    instructorGroups: [],
    taGroups: [],
    iteration: "",
    tagline: "",
    dates: "",
    location: "",
    highlights: "",
    curriculum: "",
    materials: "",
    regTitle: "",
    regDesc: "",
    regBtnText: "",
    regBtnLink: "",
    regHighlights: "",
    regPaymentMsgChoice: "markdown",
    regPaymentMarkdown: "",
    regPaymentGatewayLink: "",
    regPaymentDeadline: "",
    youtubeDesignatedChannel: "",
  });
  const [showCertForm, setShowCertForm] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [certFormData, setCertFormData] = useState<any>({
    title: "",
    description: "",
    level: "Certificate",
    fee: 0,
    requiredCredits: 0,
    requiredCoursesCount: 0,
    bulkDiscountType: "none",
    bulkDiscountValue: 0,
    courses: [],
    status: "Draft",
    startDate: "",
    endDate: "",
  });

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
    title: "",
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    if (
      user.role !== "superadmin" &&
      user.role !== "admin" &&
      activeTab === "users"
    ) {
      setActiveTab("courses");
    }

    const fetchEnrollments = async () => {
      try {
        const res = await fetch(`/api/lms/enrollments/${user.token}`);
        const data = await res.json();
        if (data.enrolledCertifications) {
          setEnrolledCertIds(data.enrolledCertifications);
        }
        if (data.enrolledCourses) {
          setEnrolledCourseSlugs(data.enrolledCourses);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchUsers();
    fetchCourses();
    fetchCertifications();
    fetchEnrollments();
  }, [user, navigate]);

  const fetchCertifications = async () => {
    setCertLoading(true);
    try {
      const res = await fetch("/api/lms/admin/certifications", {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      const data = await res.json();
      if (data.certifications) setCertifications(data.certifications);
    } catch (e) {
      console.error(e);
    }
    setCertLoading(false);
  };

  const handleCreateCert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCertId
        ? `/api/lms/certifications/${editingCertId}`
        : "/api/lms/certifications";
      const method = editingCertId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify(certFormData),
      });
      const data = await res.json();
      if (data.success) {
        setShowCertForm(false);
        setEditingCertId(null);
        setCertFormData({
          title: "",
          description: "",
          level: "Certificate",
          fee: 0,
          requiredCredits: 0,
          requiredCoursesCount: 0,
          bulkDiscountType: "none",
          bulkDiscountValue: 0,
          courses: [],
        });
        fetchCertifications();
      } else {
        alert(data.error || "Failed to save certification");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startSavingCert = () => {
    setEditingCertId(null);
    setCertFormData({
      title: "",
      description: "",
      level: "Certificate",
      fee: 0,
      courses: [],
      requiredCredits: 0,
      requiredCoursesCount: 0,
      bulkDiscountType: "none",
      bulkDiscountValue: 0,
      status: "Draft",
      startDate: "",
      endDate: "",
    });
    setShowCertForm(!showCertForm);
  };

  const quickUpdateCertStatus = async (
    certId: string,
    currentStatus: string,
  ) => {
    let newStatus = "Enrollment Open";
    if (currentStatus === "Draft") newStatus = "Enrollment Open";
    else if (currentStatus === "Enrollment Open") newStatus = "Published";
    else if (currentStatus === "Published") newStatus = "Closed";
    else if (currentStatus === "Closed") newStatus = "Published";

    try {
      const res = await fetch(`/api/lms/certifications/${certId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCertifications();
      } else {
        alert(data.error || "Failed to update certification status");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditingCert = (cert: any) => {
    setEditingCertId(cert._id);
    setCertFormData({
      title: cert.title || "",
      description: cert.description || "",
      level: cert.level || "Certificate",
      fee: cert.fee || 0,
      courses: cert.courses || [],
      requiredCredits: cert.requiredCredits || 0,
      requiredCoursesCount: cert.requiredCoursesCount || 0,
      bulkDiscountType: cert.bulkDiscountType || "none",
      bulkDiscountValue: cert.bulkDiscountValue || 0,
      status: cert.status || "Draft",
      startDate: cert.startDate || "",
      endDate: cert.endDate || "",
    });
    setShowCertForm(true);
  };

  const fetchCourses = async () => {
    setCourseLoading(true);
    try {
      const res = await fetch("/api/lms/admin/courses", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json();
      if (data.courses) setCourses(data.courses);
    } catch (e) {
      console.error(e);
    }
    setCourseLoading(false);
  };

  const handleTrashCourse = (courseId: string, courseTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Move Course to Trash",
      message: `Are you sure you want to send "${courseTitle}" to the trash?`,
      confirmText: "Move to Trash",
      cancelText: "Cancel",
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/lms/courses/${courseId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${user?.token}` },
          });
          if (!res.ok) {
            throw new Error(`Failed with status: ${res.status}`);
          }
          const data = await res.json();
          if (data.success) {
            alert("Success! Sent to Trash.");
            fetchCourses();
          } else {
            alert(
              "Error: " + (data.error || "Failed to soft-delete the course."),
            );
          }
        } catch (err) {
          console.error(err);
          alert("Error: " + String(err));
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleRetrieveCourse = async (
    courseId: string,
    courseTitle: string,
  ) => {
    try {
      const courseObj = courses.find((c) => c._id === courseId);
      if (!courseObj) {
        alert("Course object not found locally.");
        return;
      }
      const payload = {
        ...courseObj,
        deleted: false,
      };
      const res = await fetch(`/api/lms/courses/${courseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Failed with status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        alert("Success! Restored from Trash.");
        fetchCourses();
      } else {
        alert("Error: " + (data.error || "Failed to restore course."));
      }
    } catch (err) {
      console.error(err);
      alert("Error: " + String(err));
    }
  };

  const handlePermanentDeleteCourse = (
    courseId: string,
    courseTitle: string,
  ) => {
    setConfirmModal({
      isOpen: true,
      title: "CRITICAL WARNING: Permanent Purge",
      message: `Are you absolutely sure you want to PERMANENTLY and IRREVERSIBLY delete "${courseTitle}"? This will purge the course and its dependencies. This action cannot be undone!`,
      confirmText: "Permanently Purge",
      cancelText: "Cancel",
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/lms/courses/${courseId}?permanent=true`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${user?.token}` },
            },
          );
          if (!res.ok) {
            throw new Error(`Failed with status: ${res.status}`);
          }
          const data = await res.json();
          if (data.success) {
            alert("Success! The course was permanently purged from database.");
            fetchCourses();
          } else {
            alert(
              "Error: " +
                (data.error ||
                  "Failed to permanently delete course. Check your superadmin role credentials."),
            );
          }
        } catch (err) {
          console.error(err);
          alert("Error: " + String(err));
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCourseId
        ? `/api/lms/courses/${editingCourseId}`
        : "/api/lms/courses";
      const method = editingCourseId ? "PUT" : "POST";

      const payload = { ...courseFormData };
      payload.subPages=courseOverviewPages(payload);

      // Format textareas for DB storage
      if (typeof payload.highlights === "string") {
        payload.highlights = payload.highlights
          .split("\n")
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
      }
      if (typeof payload.curriculum === "string") {
        payload.curriculum = payload.curriculum
          .split("\n")
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
        payload.outline = payload.curriculum;
      }
      if (typeof payload.materials === "string") {
        payload.materials = payload.materials
          .split("\n")
          .map((line: string) => {
            const parts = line.split(":");
            const name = parts[0]?.trim();
            const url = parts.slice(1).join(":")?.trim();
            if (name) {
              return { name, url: url || "#" };
            }
            return null;
          })
          .filter(Boolean);
      }

      payload.instructors = [];
      for (const group of payload.instructorGroups || []) {
        for (const u of group.users || []) {
          payload.instructors.push({ user: u, permissions: group.permissions });
        }
      }
      payload.tas = [];
      for (const group of payload.taGroups || []) {
        for (const u of group.users || []) {
          payload.tas.push({ user: u, permissions: group.permissions });
        }
      }

      payload.registrationCard = {
        ...(payload.registrationCard||{}),
        actionPhases:payload.actionPhases||[],
        title: payload.regTitle || "",
        description: payload.regDesc || "",
        buttonText: payload.regBtnText || "",
        buttonLink: payload.regBtnLink || "",
        fee: payload.fee || 0,
        highlights: typeof payload.regHighlights === "string"
          ? payload.regHighlights.split("\n").map((s: string) => s.trim()).filter((s: string) => s.length > 0)
          : [],
        paymentMsgChoice: payload.regPaymentMsgChoice || "markdown",
        paymentMarkdown: payload.regPaymentMarkdown || "",
        paymentGatewayLink: payload.regPaymentGatewayLink || "",
        paymentDeadline: payload.regPaymentDeadline || "",
      };

      const phaseError=validateParticipationPhases(payload.registrationCard.actionPhases);
      if(phaseError){alert(phaseError);return;}
      delete payload.actionPhases;
      delete payload.instructorGroups;
      delete payload.taGroups;
      delete payload.regTitle;
      delete payload.regDesc;
      delete payload.regBtnText;
      delete payload.regBtnLink;
      delete payload.regHighlights;
      delete payload.regPaymentMsgChoice;
      delete payload.regPaymentMarkdown;
      delete payload.regPaymentGatewayLink;
      delete payload.regPaymentDeadline;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowCourseForm(false);
        setEditingCourseId(null);
        fetchCourses();
      } else {
        alert(data.error || "Failed to save course");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startSavingCourse = () => {
    setEditingCourseId(null);
    setCourseFormData({
      title: "",
      courseCode: "",
      description: "",
      type: "Online Course",
      fee: 0,
      credits: 0,
      duration: "",
      status: "Draft",
      startDate: "",
      endDate: "",
      modules: 1,
      outline: [],
    subPages: [],
      linkedCerts: [],
      hasMicrocert: false,
      microcertFee: 0,
      prerequisiteDiscounts: [],
      prerequisites: [],
      instructorGroups: [],
      taGroups: [],
      iteration: "",
      tagline: "",
      dates: "",
      location: "",
      highlights: "",
      curriculum: "",
      materials: "",
      regTitle: "",
      regDesc: "",
      regBtnText: "",
      regBtnLink: "",
      regHighlights: "",
      regPaymentMsgChoice: "markdown",
      regPaymentMarkdown: "",
      regPaymentGatewayLink: "",
      regPaymentDeadline: "",
      youtubeDesignatedChannel: "",
    });
    setShowCourseForm(!showCourseForm);
  };

  const quickUpdateCourseStatus = async (
    courseId: string,
    currentStatus: string,
  ) => {
    const transitions: Record<string,string> = { Draft: 'Upcoming', Upcoming: 'Ongoing', Ongoing: 'Completed', Completed: 'Archived', Archived: 'Upcoming', 'Enrollment Open': 'Upcoming', Published: 'Ongoing', Closed: 'Upcoming' };
    const newStatus = transitions[currentStatus] || 'Upcoming';

    try {
      const res = await fetch(`/api/lms/courses/${courseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCourses();
      } else {
        alert(data.error || "Failed to update course status");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditingCourse = (course: any) => {
    setEditingCourseId(course._id);
    setCourseFormData({
      __v: course.__v,
      subPages: course.subPages || [],
      registrationState: course.registrationState || (course.storedStatus === "Enrollment Open" ? "open" : "closed"),
      title: course.title || "",
      courseCode: course.courseCode || "",
      description: course.description || "",
      type: course.type || "Online Course",
      fee: course.fee || 0,
      completedFee: course.completedFee || 0,
      credits: course.credits || 0,
      duration: course.duration || "",
      status: course.status || "Draft",
      startDate: course.startDate || "",
      endDate: course.endDate || "",
      modules: course.modules || 1,
      outline: course.outline || [],
      hasMicrocert: course.hasMicrocert || false,
      microcertFee: course.microcertFee || 0,
      linkedCerts: course.linkedCerts || [],
      prerequisiteDiscounts: course.prerequisiteDiscounts || [],
      prerequisites: course.prerequisites || [],
      instructorGroups: groupUsersByPermissions(course.instructors || []),
      taGroups: groupUsersByPermissions(course.tas || []),
      iteration: course.iteration || "",
      tagline: course.tagline || "",
      dates: course.dates || "",
      location: course.location || "",
      highlights: Array.isArray(course.highlights)
        ? course.highlights.join("\n")
        : course.highlights || "",
      curriculum: Array.isArray(course.curriculum)
        ? course.curriculum.join("\n")
        : Array.isArray(course.outline)
          ? course.outline.join("\n")
          : "",
      materials: Array.isArray(course.materials)
        ? course.materials.map((m: any) => `${m.name}:${m.url}`).join("\n")
        : course.materials || "",
      registrationCard:course.registrationCard||{},
      actionPhases:course.registrationCard?.actionPhases||[],
      regTitle: course.registrationCard?.title || "",
      regDesc: course.registrationCard?.description || "",
      regBtnText: course.registrationCard?.buttonText || "",
      regBtnLink: course.registrationCard?.buttonLink || "",
      regHighlights: Array.isArray(course.registrationCard?.highlights)
        ? course.registrationCard.highlights.join("\n")
        : course.registrationCard?.highlights || "",
      regPaymentMsgChoice: course.registrationCard?.paymentMsgChoice || "markdown",
      regPaymentMarkdown: course.registrationCard?.paymentMarkdown || "",
      regPaymentGatewayLink: course.registrationCard?.paymentGatewayLink || "",
      regPaymentDeadline: course.registrationCard?.paymentDeadline || "",
      youtubeDesignatedChannel: course.youtubeDesignatedChannel || "",
    });
    setShowCourseForm(true);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lms/users", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, targetRole: string) => {
    if (user?.role !== "superadmin") {
      alert("Only superadmins can change roles.");
      return;
    }

    try {
      const res = await fetch(`/api/lms/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ role: targetRole }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers(); // Refresh
      } else {
        alert(data.error || "Failed to update role");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto min-h-screen">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-black italic tracking-tighter mb-4">
          Admin Panel
        </h1>
          <a href="/admin/editorial" className="inline-block underline my-3">Publishing dashboard & revision recovery →</a>
        <p className="font-mono text-xs opacity-60">
          Manage users, courses, and platform settings.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 flex flex-col gap-2">
          {(user.role === "superadmin" || user.role === "admin") && (
            <button
              onClick={() => setActiveTab("users")}
              className={`p-4 flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-widest text-left transition-colors border ${activeTab === "users" ? "border-brand-blue bg-brand-blue/10 text-brand-blue shadow-[4px_4px_0px_rgba(37,99,235,1)]" : "border-ink bg-paper hover:bg-ink/5"}`}
            >
              <UsersIcon className="w-4 h-4" /> Users
            </button>
          )}
          <button
            onClick={() => setActiveTab("courses")}
            className={`p-4 flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-widest text-left transition-colors border ${activeTab === "courses" ? "border-brand-blue bg-brand-blue/10 text-brand-blue shadow-[4px_4px_0px_rgba(37,99,235,1)]" : "border-ink bg-paper hover:bg-ink/5"}`}
          >
            <BookOpen className="w-4 h-4" /> Courses
          </button>
          {(user.role === "superadmin" || user.role === "admin") && (
            <button
              onClick={() => setActiveTab("certifications")}
              className={`p-4 flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-widest text-left transition-colors border ${activeTab === "certifications" ? "border-brand-blue bg-brand-blue/10 text-brand-blue shadow-[4px_4px_0px_rgba(37,99,235,1)]" : "border-ink bg-paper hover:bg-ink/5"}`}
            >
              <Shield className="w-4 h-4" /> Certifications
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-grow border border-ink bg-paper p-6 md:p-8 shadow-[10px_10px_0px_rgba(0,0,0,1)]">
          {activeTab === "users" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-2xl font-serif font-black mb-6">
                User Management
              </h2>

              {loading ? (
                <div className="py-12">
                  <BrutalistLoader />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-ink/20 font-mono text-[10px] uppercase tracking-widest text-ink/50">
                        <th className="pb-4 px-2">Name / Email</th>
                        <th className="pb-4 px-2">ID</th>
                        <th className="pb-4 px-2">Role</th>
                        <th className="pb-4 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {users.map((u) => (
                        <tr
                          key={u._id}
                          className="border-b border-ink/10 hover:bg-brand-acid/20 transition-colors"
                        >
                          <td className="py-4 px-2">
                            <div className="font-bold">
                              {u.name || "No Name"}
                            </div>
                            <div className="text-[10px] opacity-60">
                              {u.email}
                            </div>
                          </td>
                          <td className="py-4 px-2 text-[10px] opacity-50 truncate max-w-[100px]">
                            {u._id}
                          </td>
                          <td className="py-4 px-2">
                            <span
                              className={`px-2 py-1 text-[9px] uppercase tracking-widest font-bold ${
                                u.role === "superadmin"
                                  ? "bg-brand-orange/20 text-brand-orange border border-brand-orange/50"
                                  : u.role === "admin"
                                    ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/50"
                                    : "bg-ink/10 text-ink/70 border border-ink/20"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-4 px-2">
                            {user?.role === "superadmin" &&
                            u._id !== user?.id ? (
                              <select
                                className="p-1 border border-ink bg-paper text-[10px] uppercase font-bold focus:outline-none"
                                value={u.role}
                                onChange={(e) =>
                                  handleRoleChange(u._id, e.target.value)
                                }
                              >
                                <option value="student">Student</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Superadmin</option>
                              </select>
                            ) : (
                              <span className="text-[10px] opacity-30">
                                N/A
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "courses" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif font-black">
                  Courses & Classes
                </h2>
                <button
                  onClick={startSavingCourse}
                  style={{
                    display:
                      user?.role === "superadmin" || user?.role === "admin"
                        ? "inline-block"
                        : "none",
                  }}
                  className="h-10 px-4 bg-brand-blue text-paper font-mono text-[10px] font-black uppercase tracking-widest hover:bg-ink transition-colors"
                >
                  {showCourseForm ? "Cancel" : "+ New Course"}
                </button>
              </div>

              {showCourseForm ? (
                <form
                  onSubmit={handleCreateCourse}
                  className="mb-12 border border-ink p-6 grid gap-4 bg-ink/5"
                >
                  {(courseFormData.type === "Residential" ||
                    courseFormData.type === "W2M Residential Course") && (
                    <div className="border border-ink p-4 mb-4 bg-ink/5 grid gap-4">
                      <p className="font-mono text-[9px] opacity-60">
                        Fill this parameter block to configure the dynamic pages
                        at{" "}
                        <code className="bg-ink/5 px-1 font-bold">
                          /academy/residential
                        </code>
                        .
                      </p>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-mono text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">
                            Iteration (e.g. June 2026)
                          </label>
                          <input
                            type="text"
                            className="w-full p-3 border border-ink bg-paper font-sans text-xs focus:outline-none font-bold"
                            placeholder="e.g. June 2026"
                            value={courseFormData.iteration || ""}
                            onChange={(e) =>
                              setCourseFormData({
                                ...courseFormData,
                                iteration: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">
                            Tagline (e.g. Building Speech Tech for Sadri)
                          </label>
                          <input
                            type="text"
                            className="w-full p-3 border border-ink bg-paper font-sans text-xs focus:outline-none italic"
                            placeholder="Catchy descriptive tag for course"
                            value={courseFormData.tagline || ""}
                            onChange={(e) =>
                              setCourseFormData({
                                ...courseFormData,
                                tagline: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block font-mono text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">
                          Designated YouTube Channel (URL or Handle)
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 border border-ink bg-paper font-sans text-xs focus:outline-none"
                          placeholder="e.g. https://www.youtube.com/@indicacademy"
                          value={courseFormData.youtubeDesignatedChannel || ""}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              youtubeDesignatedChannel: e.target.value,
                            })
                          }
                        />
                        <p className="text-[7.5px] font-sans opacity-70 mt-1 uppercase tracking-wider font-bold text-brand-orange">
                          🎯 Instructors must log into the Google Account associated with this channel to schedule broadcasts automatically.
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-mono text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">
                            Dates Display (e.g. June 18 - June 23, 2026)
                          </label>
                          <input
                            type="text"
                            className="w-full p-3 border border-ink bg-paper font-sans text-xs focus:outline-none"
                            placeholder="e.g. June 18 - June 23, 2026"
                            value={courseFormData.dates || ""}
                            onChange={(e) =>
                              setCourseFormData({
                                ...courseFormData,
                                dates: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">
                            Location Campus Address
                          </label>
                          <input
                            type="text"
                            className="w-full p-3 border border-ink bg-paper font-sans text-xs focus:outline-none"
                            placeholder="e.g. Keystone Campus, Kotagiri, Tamil Nadu"
                            value={courseFormData.location || ""}
                            onChange={(e) =>
                              setCourseFormData({
                                ...courseFormData,
                                location: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-mono text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">
                          Highlights (One core highlight per line)
                        </label>
                        <textarea
                          rows={3}
                          className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                          placeholder="Collaborating with community&#10;24/7 Expert Mentorship&#10;Field-visit study"
                          value={courseFormData.highlights || ""}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              highlights: e.target.value,
                            })
                          }
                        />
                      </div>

                      <p className="text-sm">Edit module titles and details in Course overview below.</p>

                      <div>
                        <label className="block font-mono text-[9px] font-black uppercase tracking-[0.1em] opacity-50 mb-1">
                          Course Materials (New line as `Name: URL`, e.g.
                          `Syllabus 2026: https://...` or `#` if none)
                        </label>
                        <textarea
                          rows={3}
                          className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                          placeholder="Syllabus 2026: #&#10;Field Guide Handbook: https://diversity.org.in"
                          value={courseFormData.materials || ""}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              materials: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Course Title
                      </label>
                      <input
                        required
                        type="text"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={courseFormData.title}
                        onChange={(e) =>
                          setCourseFormData({
                            ...courseFormData,
                            title: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Course Code (e.g. LING-101)
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        placeholder="e.g. LING-101"
                        value={courseFormData.courseCode || ""}
                        onChange={(e) =>
                          setCourseFormData({
                            ...courseFormData,
                            courseCode: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Type
                      </label>
                      <select
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={courseFormData.type}
                        onChange={(e) =>
                          setCourseFormData({
                            ...courseFormData,
                            type: e.target.value,
                          })
                        }
                      >
                        <option value="Online Course">Online Course</option>
                        <option value="Residential">Residential</option>
                        <option value="W2M Residential Course">
                          W2M Residential Course
                        </option>
                        <option value="Custom">Custom / Enterprise</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Description
                      </label>
                      <textarea
                        required
                        rows={3}
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={courseFormData.description}
                        onChange={(e) =>
                          setCourseFormData({
                            ...courseFormData,
                            description: e.target.value,
                          })
                        }
                      ></textarea>
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Duration (e.g. 12 Weeks)
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={courseFormData.duration}
                        onChange={(e) =>
                          setCourseFormData({
                            ...courseFormData,
                            duration: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Status
                      </label>
                      <select
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={courseFormData.status}
                        onChange={(e) =>
                          setCourseFormData({
                            ...courseFormData,
                            status: e.target.value,
                          })
                        }
                      >
                        <option value="Draft">Draft</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                        <option value="Archived">Archived</option>
                      </select>
                      <label className="block mt-3 text-xs">Registration availability<select className="block w-full border p-3" value={courseFormData.registrationState || 'closed'} onChange={e=>setCourseFormData({...courseFormData,registrationState:e.target.value})}><option value="closed">Closed</option><option value="open">Open</option></select></label>
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Start Date (Optional)
                      </label>
                      <input
                        type="date"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={courseFormData.startDate || ""}
                        onChange={(e) =>
                          setCourseFormData({
                            ...courseFormData,
                            startDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={courseFormData.endDate || ""}
                        onChange={(e) =>
                          setCourseFormData({
                            ...courseFormData,
                            endDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Credits
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={courseFormData.credits}
                        onChange={(e) =>
                          setCourseFormData({
                            ...courseFormData,
                            credits: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Course Fee (₹)
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={courseFormData.fee}
                        onChange={(e) =>
                          setCourseFormData({
                            ...courseFormData,
                            fee: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Completed Course Fee (₹)
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={courseFormData.completedFee || 0}
                        onChange={(e) =>
                          setCourseFormData({
                            ...courseFormData,
                            completedFee: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1 flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="accent-brand-blue"
                          checked={courseFormData.hasMicrocert}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              hasMicrocert: e.target.checked,
                            })
                          }
                        />
                        Enable Microcertification Option
                      </label>
                      {courseFormData.hasMicrocert && (
                        <input
                          type="number"
                          placeholder="Microcert Fee (₹)"
                          className="w-full mt-2 p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                          value={courseFormData.microcertFee}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              microcertFee: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Linked Certifications
                      </label>
                      <div className="max-h-48 overflow-y-auto border border-ink p-2 bg-paper grid gap-2">
                        {certifications.map((c) => {
                          const isLinked = courseFormData.linkedCerts?.some(
                            (lc: any) => lc.certId === c._id,
                          );
                          const linkData = courseFormData.linkedCerts?.find(
                            (lc: any) => lc.certId === c._id,
                          );
                          return (
                            <div
                              key={c._id}
                              className="flex items-center justify-between border-b border-ink/10 pb-2"
                            >
                              <label className="flex items-center gap-2 font-mono text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="accent-brand-blue"
                                  checked={isLinked}
                                  onChange={(e) => {
                                    if (e.target.checked)
                                      setCourseFormData({
                                        ...courseFormData,
                                        linkedCerts: [
                                          ...(courseFormData.linkedCerts || []),
                                          { certId: c._id, isOptional: false },
                                        ],
                                      });
                                    else
                                      setCourseFormData({
                                        ...courseFormData,
                                        linkedCerts: (
                                          courseFormData.linkedCerts || []
                                        ).filter(
                                          (lc: any) => lc.certId !== c._id,
                                        ),
                                      });
                                  }}
                                />
                                {c.title} ({c.level})
                              </label>
                              {isLinked && (
                                <select
                                  className="p-1 text-xs font-mono border border-ink bg-paper"
                                  value={
                                    linkData.isOptional
                                      ? "optional"
                                      : "compulsory"
                                  }
                                  onChange={(e) => {
                                    const updated =
                                      courseFormData.linkedCerts.map(
                                        (lc: any) =>
                                          lc.certId === c._id
                                            ? {
                                                ...lc,
                                                isOptional:
                                                  e.target.value === "optional",
                                              }
                                            : lc,
                                      );
                                    setCourseFormData({
                                      ...courseFormData,
                                      linkedCerts: updated,
                                    });
                                  }}
                                >
                                  <option value="compulsory">Compulsory</option>
                                  <option value="optional">Optional</option>
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Total Modules
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={courseFormData.modules}
                        onChange={(e) =>
                          setCourseFormData({
                            ...courseFormData,
                            modules: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <ParticipationPhaseEditor value={courseFormData.actionPhases||[]} onChange={phases=>setCourseFormData({...courseFormData,actionPhases:phases})}/>
                    <CourseOverviewEditor record={courseFormData} onChange={pages=>setCourseFormData({...courseFormData,subPages:pages})}/>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1 mt-4">
                      Prerequisites
                    </label>
                    <p className="font-mono text-[9px] opacity-60 mb-2">
                      Select courses that users should complete before taking
                      this one.
                    </p>
                    <div className="max-h-48 overflow-y-auto border border-ink p-2 bg-paper grid gap-2">
                      {courses
                        .filter((c) => c._id !== editingCourseId)
                        .map((c) => {
                          const isLinked =
                            courseFormData.prerequisites?.includes(c._id);
                          return (
                            <div
                              key={`pre-${c._id}`}
                              className="flex items-center justify-between border-b border-ink/10 pb-2"
                            >
                              <label className="flex items-center gap-2 font-mono text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="accent-brand-blue"
                                  checked={isLinked}
                                  onChange={(e) => {
                                    if (e.target.checked)
                                      setCourseFormData({
                                        ...courseFormData,
                                        prerequisites: [
                                          ...(courseFormData.prerequisites ||
                                            []),
                                          c._id,
                                        ],
                                      });
                                    else
                                      setCourseFormData({
                                        ...courseFormData,
                                        prerequisites: (
                                          courseFormData.prerequisites || []
                                        ).filter((id: string) => id !== c._id),
                                      });
                                  }}
                                />
                                {c.title}
                              </label>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1 mt-4">
                      Prerequisite Discounts
                    </label>
                    <p className="font-mono text-[9px] opacity-60 mb-2">
                      Offer discounts to users who have enrolled in prior
                      courses.
                    </p>
                    <div className="flex flex-col gap-2 border border-ink p-4 bg-ink/5">
                      {(courseFormData.prerequisiteDiscounts || []).map(
                        (pd: any, idx: number) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <select
                              className="p-2 text-xs font-mono border border-ink focus:outline-none bg-paper flex-1"
                              value={pd.courseId || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(courseFormData.prerequisiteDiscounts ||
                                    []),
                                ];
                                updated[idx].courseId = e.target.value;
                                setCourseFormData({
                                  ...courseFormData,
                                  prerequisiteDiscounts: updated,
                                });
                              }}
                            >
                              <option value="" disabled>
                                Select Prior Course
                              </option>
                              {courses
                                .filter(
                                  (c) => c._id !== (editingCourseId || "new"),
                                )
                                .map((c) => (
                                  <option key={c._id} value={c._id}>
                                    {c.title}
                                  </option>
                                ))}
                            </select>
                            <select
                              className="w-32 p-2 text-xs font-mono border border-ink focus:outline-none bg-paper"
                              value={pd.discountType || "fixed"}
                              onChange={(e) => {
                                const updated = [
                                  ...(courseFormData.prerequisiteDiscounts ||
                                    []),
                                ];
                                updated[idx].discountType = e.target.value;
                                setCourseFormData({
                                  ...courseFormData,
                                  prerequisiteDiscounts: updated,
                                });
                              }}
                            >
                              <option value="percentage">% off</option>
                              <option value="fixed">Fixed ₹</option>
                            </select>
                            <input
                              type="number"
                              placeholder="Value"
                              className="w-24 p-2 text-xs font-mono border border-ink focus:outline-none bg-paper"
                              value={pd.discountValue}
                              onChange={(e) => {
                                const updated = [
                                  ...(courseFormData.prerequisiteDiscounts ||
                                    []),
                                ];
                                updated[idx].discountValue =
                                  parseInt(e.target.value) || 0;
                                setCourseFormData({
                                  ...courseFormData,
                                  prerequisiteDiscounts: updated,
                                });
                              }}
                            />
                            <button
                              type="button"
                              className="p-2 bg-brand-orange text-paper text-xs font-bold font-mono border border-ink"
                              onClick={() => {
                                const updated = [
                                  ...(courseFormData.prerequisiteDiscounts ||
                                    []),
                                ];
                                updated.splice(idx, 1);
                                setCourseFormData({
                                  ...courseFormData,
                                  prerequisiteDiscounts: updated,
                                });
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ),
                      )}
                      <button
                        type="button"
                        className="text-xs font-mono font-bold uppercase border border-ink bg-paper py-2 hover:bg-brand-acid mt-2"
                        onClick={() =>
                          setCourseFormData({
                            ...courseFormData,
                            prerequisiteDiscounts: [
                              ...(courseFormData.prerequisiteDiscounts || []),
                              {
                                courseId: "",
                                discountType: "fixed",
                                discountValue: 0,
                              },
                            ],
                          })
                        }
                      >
                        + Add Prerequisite Discount
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1 mt-4">
                      Manage Access Control
                    </label>
                    <p className="font-mono text-[9px] opacity-60 mb-2">
                      Assign Instructors and TAs. Set granular permissions for
                      each.
                    </p>
                    <div className="flex flex-col gap-2 border border-ink p-4 bg-ink/5">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-widest mb-2 mt-2">
                        Instructors
                      </div>
                      {courseFormData.instructorGroups?.map(
                        (group: any, idx: number) => (
                          <div
                            key={`inst-group-${idx}`}
                            className="flex flex-col gap-2 p-2 border border-ink/20 bg-paper"
                          >
                            <div className="flex gap-2">
                              <UserMultiSelect
                                availableUsers={users}
                                selectedUsers={group.users || []}
                                onChange={(newUsers) => {
                                  const oldUsers = group.users || [];
                                  const added = newUsers.filter((u: string) => !oldUsers.includes(u));
                                  const removed = oldUsers.filter((u: string) => !newUsers.includes(u));

                                  if (editingCourseId) {
                                    added.forEach((uId: string) => {
                                      fetch('/api/lms/sync/course-member', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${user?.token}`,
                                        },
                                        body: JSON.stringify({
                                          courseId: editingCourseId,
                                          userId: uId,
                                          role: 'Instructor',
                                          action: 'add'
                                        })
                                      }).catch(e => console.error(e));
                                    });

                                    removed.forEach((uId: string) => {
                                      fetch('/api/lms/sync/course-member', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${user?.token}`,
                                        },
                                        body: JSON.stringify({
                                          courseId: editingCourseId,
                                          userId: uId,
                                          role: 'Instructor',
                                          action: 'remove'
                                        })
                                      }).catch(e => console.error(e));
                                    });
                                  }

                                  const updated = [
                                    ...courseFormData.instructorGroups,
                                  ];
                                  updated[idx].users = newUsers;
                                  setCourseFormData({
                                    ...courseFormData,
                                    instructorGroups: updated,
                                  });
                                }}
                              />
                              <button
                                type="button"
                                className="p-2 bg-brand-orange text-paper text-xs font-bold font-mono border border-ink self-start"
                                onClick={() => {
                                  if (editingCourseId) {
                                    (group.users || []).forEach((uId: string) => {
                                      fetch('/api/lms/sync/course-member', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${user?.token}`,
                                        },
                                        body: JSON.stringify({
                                          courseId: editingCourseId,
                                          userId: uId,
                                          role: 'Instructor',
                                          action: 'remove'
                                        })
                                      }).catch(e => console.error(e));
                                    });
                                  }

                                  const updated = [
                                    ...courseFormData.instructorGroups,
                                  ];
                                  updated.splice(idx, 1);
                                  setCourseFormData({
                                    ...courseFormData,
                                    instructorGroups: updated,
                                  });
                                }}
                              >
                                Remove
                              </button>
                            </div>
                            <div className="flex flex-col gap-4 mt-4">
                              {[
                                {
                                  group: "Course Materials",
                                  permissions: [
                                    "materials_view",
                                    "materials_edit",
                                    "materials_add",
                                    "materials_delete",
                                  ],
                                },
                                {
                                  group: "Live Classes",
                                  permissions: [
                                    "classes_view",
                                    "classes_edit",
                                    "classes_add",
                                    "classes_delete",
                                  ],
                                },
                                {
                                  group: "Assignments",
                                  permissions: [
                                    "assignments_view",
                                    "assignments_edit",
                                    "assignments_add",
                                    "assignments_delete",
                                    "grade_assignments",
                                    "grade_assignments_unvalidated",
                                  ],
                                },
                                {
                                  group: "Settings & Personnel",
                                  permissions: [
                                    "edit_course_details",
                                    "edit_course_fee",
                                    "manage_users",
                                  ],
                                },
                              ].map((pg) => (
                                <div
                                  key={pg.group}
                                  className="border border-ink/10 p-2"
                                >
                                  <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/60 mb-2">
                                    {pg.group}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {pg.permissions.map((perm) => {
                                      const isChecked =
                                        group.permissions?.includes(perm);
                                      return (
                                        <label
                                          key={perm}
                                          className="flex items-center gap-2 font-mono text-[9px] cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              const updatedPerms = e.target
                                                .checked
                                                ? [
                                                    ...(group.permissions ||
                                                      []),
                                                    perm,
                                                  ]
                                                : (
                                                    group.permissions || []
                                                  ).filter(
                                                    (p: string) => p !== perm,
                                                  );
                                              const updatedGroups =
                                                courseFormData.instructorGroups.map(
                                                  (tg: any, gIdx: number) =>
                                                    gIdx === idx
                                                      ? {
                                                          ...tg,
                                                          permissions:
                                                            updatedPerms,
                                                        }
                                                      : tg,
                                                );
                                              setCourseFormData({
                                                ...courseFormData,
                                                instructorGroups: updatedGroups,
                                              });
                                            }}
                                          />
                                          {perm}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                      <button
                        type="button"
                        className="text-xs font-mono font-bold uppercase border border-ink bg-paper py-2 hover:bg-brand-acid mt-2"
                        onClick={() =>
                          setCourseFormData({
                            ...courseFormData,
                            instructorGroups: [
                              ...(courseFormData.instructorGroups || []),
                              { users: [], permissions: [] },
                            ],
                          })
                        }
                      >
                        + Add Instructor Group
                      </button>

                      <div className="font-mono text-[10px] font-bold uppercase tracking-widest mb-2 mt-4">
                        TAs
                      </div>
                      {courseFormData.taGroups?.map(
                        (group: any, idx: number) => (
                          <div
                            key={`ta-group-${idx}`}
                            className="flex flex-col gap-2 p-2 border border-ink/20 bg-paper"
                          >
                            <div className="flex gap-2">
                              <UserMultiSelect
                                availableUsers={users}
                                selectedUsers={group.users || []}
                                onChange={(newUsers) => {
                                  const oldUsers = group.users || [];
                                  const added = newUsers.filter((u: string) => !oldUsers.includes(u));
                                  const removed = oldUsers.filter((u: string) => !newUsers.includes(u));

                                  if (editingCourseId) {
                                    added.forEach((uId: string) => {
                                      fetch('/api/lms/sync/course-member', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${user?.token}`,
                                        },
                                        body: JSON.stringify({
                                          courseId: editingCourseId,
                                          userId: uId,
                                          role: 'Teaching Assistant',
                                          action: 'add'
                                        })
                                      }).catch(e => console.error(e));
                                    });

                                    removed.forEach((uId: string) => {
                                      fetch('/api/lms/sync/course-member', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${user?.token}`,
                                        },
                                        body: JSON.stringify({
                                          courseId: editingCourseId,
                                          userId: uId,
                                          role: 'Teaching Assistant',
                                          action: 'remove'
                                        })
                                      }).catch(e => console.error(e));
                                    });
                                  }

                                  const updated = [...courseFormData.taGroups];
                                  updated[idx].users = newUsers;
                                  setCourseFormData({
                                    ...courseFormData,
                                    taGroups: updated,
                                  });
                                }}
                              />
                              <button
                                type="button"
                                className="p-2 bg-brand-orange text-paper text-xs font-bold font-mono border border-ink self-start"
                                onClick={() => {
                                  if (editingCourseId) {
                                    (group.users || []).forEach((uId: string) => {
                                      fetch('/api/lms/sync/course-member', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${user?.token}`,
                                        },
                                        body: JSON.stringify({
                                          courseId: editingCourseId,
                                          userId: uId,
                                          role: 'Teaching Assistant',
                                          action: 'remove'
                                        })
                                      }).catch(e => console.error(e));
                                    });
                                  }

                                  const updated = [...courseFormData.taGroups];
                                  updated.splice(idx, 1);
                                  setCourseFormData({
                                    ...courseFormData,
                                    taGroups: updated,
                                  });
                                }}
                              >
                                Remove
                              </button>
                            </div>
                            <div className="flex flex-col gap-4 mt-4">
                              {[
                                {
                                  group: "Course Materials",
                                  permissions: [
                                    "materials_view",
                                    "materials_edit",
                                    "materials_add",
                                    "materials_delete",
                                  ],
                                },
                                {
                                  group: "Live Classes",
                                  permissions: [
                                    "classes_view",
                                    "classes_edit",
                                    "classes_add",
                                    "classes_delete",
                                  ],
                                },
                                {
                                  group: "Assignments",
                                  permissions: [
                                    "assignments_view",
                                    "assignments_edit",
                                    "assignments_add",
                                    "assignments_delete",
                                    "grade_assignments",
                                    "grade_assignments_unvalidated",
                                  ],
                                },
                                {
                                  group: "Settings & Personnel",
                                  permissions: [
                                    "edit_course_details",
                                    "edit_course_fee",
                                    "manage_users",
                                  ],
                                },
                              ].map((pg) => (
                                <div
                                  key={pg.group}
                                  className="border border-ink/10 p-2"
                                >
                                  <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/60 mb-2">
                                    {pg.group}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {pg.permissions.map((perm) => {
                                      const isChecked =
                                        group.permissions?.includes(perm);
                                      return (
                                        <label
                                          key={perm}
                                          className="flex items-center gap-2 font-mono text-[9px] cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              const updatedPerms = e.target
                                                .checked
                                                ? [
                                                    ...(group.permissions ||
                                                      []),
                                                    perm,
                                                  ]
                                                : (
                                                    group.permissions || []
                                                  ).filter(
                                                    (p: string) => p !== perm,
                                                  );
                                              const updatedGroups =
                                                courseFormData.taGroups.map(
                                                  (tg: any, gIdx: number) =>
                                                    gIdx === idx
                                                      ? {
                                                          ...tg,
                                                          permissions:
                                                            updatedPerms,
                                                        }
                                                      : tg,
                                                );
                                              setCourseFormData({
                                                ...courseFormData,
                                                taGroups: updatedGroups,
                                              });
                                            }}
                                          />
                                          {perm}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                      <div className="flex gap-2 mt-4">
                        <button
                          type="button"
                          className="text-xs font-mono font-bold uppercase border border-ink bg-paper py-2 px-4 hover:bg-brand-acid"
                          onClick={() =>
                            setCourseFormData({
                              ...courseFormData,
                              taGroups: [
                                ...(courseFormData.taGroups || []),
                                { users: [], permissions: [] },
                              ],
                            })
                          }
                        >
                          + Add TA Group
                        </button>
                        <button
                          type="button"
                          className="text-xs font-mono font-bold uppercase border border-ink bg-paper py-2 px-4 hover:bg-brand-blue hover:text-paper"
                          onClick={() => {
                            if (
                              courseFormData.taGroups?.some((g: any) =>
                                g.users?.includes(user?.token),
                              )
                            )
                              return;
                            setCourseFormData({
                              ...courseFormData,
                              taGroups: [
                                ...(courseFormData.taGroups || []),
                                {
                                  users: [user?.token],
                                  permissions: [
                                    "materials_view",
                                    "assignments_view",
                                    "grade_assignments",
                                    "classes_view",
                                  ],
                                },
                              ],
                            });
                          }}
                        >
                          + Add Me as TA
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Registration Card Options */}
                  <div className="border-t-2 border-ink/10 pt-6 mt-6">
                    <h4 className="font-serif font-bold italic text-md mb-4 text-ink uppercase">Registration Card Configuration</h4>
                    <p className="font-mono text-[9px] opacity-60 mb-4">
                      Configure the checkout / onboarding card shown on the course registration page. This regulates payment, deadlines, and seat locks.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                          Registration Card Title
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                          placeholder="e.g. Secure Your Spot"
                          value={courseFormData.regTitle || ""}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              regTitle: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                          Action Button Text
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                          placeholder="e.g. Apply for Admission"
                          value={courseFormData.regBtnText || ""}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              regBtnText: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                          Card Short Description
                        </label>
                        <textarea
                          rows={2}
                          className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                          placeholder="Exclusive cohort limited to 15 participants for deep fieldwork mentorship & peer coding."
                          value={courseFormData.regDesc || ""}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              regDesc: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                          Payment Gateway / External Portal Link
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                          placeholder="e.g. https://rzp.io/l/..."
                          value={courseFormData.regBtnLink || ""}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              regBtnLink: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                          Payment / Application Deadline (e.g. June 15, 2026)
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                          placeholder="e.g. 15th June 2026"
                          value={courseFormData.regPaymentDeadline || ""}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              regPaymentDeadline: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                          Key Course Highlights / Perks (One bullet point per line)
                        </label>
                        <textarea
                          rows={3}
                          className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                          placeholder="Exclusive 15-seat cohort&#10;Linguistic Fieldwork Mentorship&#10;Post-Grad Certification Credit"
                          value={courseFormData.regHighlights || ""}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              regHighlights: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                          Payment Instruction Type
                        </label>
                        <select
                          className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none font-bold"
                          value={courseFormData.regPaymentMsgChoice || "markdown"}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              regPaymentMsgChoice: e.target.value,
                            })
                          }
                        >
                          <option value="markdown">Bank Transfer / QR Instructions (Markdown)</option>
                          <option value="link">Interactive Direct Checkout Button / Gateway Link</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                          Interactive Direct Gate Link (if 'Interactive Direct Checkout Button' chosen above)
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                          placeholder="e.g. https://checkout.example.com/pay"
                          value={courseFormData.regPaymentGatewayLink || ""}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              regPaymentGatewayLink: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                          Custom QR / Bank Transfer Markdown Instructions (if 'Bank Transfer / QR' chosen above)
                        </label>
                        <textarea
                          rows={4}
                          className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                          placeholder="Please transfer the enrollment fee here:&#10;&#10;**Bank Account:** HDFC Bank, Kothagiri&#10;**IFSC:** HDFC0001234&#10;**A/C:** 9876543210&#10;&#10;Or scan UPI: `upi@w2m`"
                          value={courseFormData.regPaymentMarkdown || ""}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              regPaymentMarkdown: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="h-12 w-full mt-4 bg-brand-blue text-paper font-mono font-black text-xs uppercase tracking-widest hover:bg-ink transition-colors"
                  >
                    {editingCourseId ? "Update Course" : "Create Course"}
                  </button>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6 overflow-x-auto pb-2">
                    <div className="flex items-center gap-2 md:gap-4 whitespace-nowrap">
                      {[
                        { id: "Draft", label: "Draft" },
                        { id: "Upcoming", label: "Upcoming" },
                        { id: "Ongoing", label: "Ongoing" },
                        { id: "Completed", label: "Completed" },
                        { id: "Archived", label: "Archived" },
                        ...(user?.role === "superadmin" ||
                        user?.role === "admin"
                          ? [{ id: "Trash", label: "Trash Can" }]
                          : []),
                      ].map((tab: any) => {
                        const count = courses.filter((c) => {
                          if (tab.id === "Trash") {
                            if (
                              user?.role !== "superadmin" &&
                              user?.role !== "admin"
                            )
                              return false;
                            return c.deleted === true;
                          }
                          if (c.deleted) return false;
                          const status = getEffectiveStatus(c);
                          if (tab.id === "Draft") {
                            if (status !== "Draft") return false;
                            if (
                              user?.role === "superadmin" ||
                              user?.role === "admin"
                            )
                              return true;
                            return (
                              c.instructors?.some(
                                (i: any) => i.user === user?.id,
                              ) ||
                              c.tas?.some((t: any) => t.user === user?.id)
                            );
                          }
                          return status === tab.id;
                        }).length;

                        return (
                          <button
                            key={tab.id}
                            onClick={() => setCourseStatusTab(tab.id as any)}
                            className={`px-4 py-2 font-mono text-xs uppercase tracking-widest border transition-all ${courseStatusTab === tab.id ? "bg-ink text-paper border-ink font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]" : "border-ink/20 hover:border-ink bg-paper"}`}
                          >
                            {tab.label} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {courseLoading ? (
                    <div className="py-12">
                      <BrutalistLoader />
                    </div>
                  ) : courses.filter((c) => {
                      if (courseStatusTab === "Trash") {
                        if (
                          user?.role !== "superadmin" &&
                          user?.role !== "admin"
                        )
                          return false;
                        return c.deleted === true;
                      }
                      if (c.deleted) return false;
                      const status = getEffectiveStatus(c);
                      if (courseStatusTab === "Draft") {
                        if (status !== "Draft") return false;
                        if (
                          user?.role === "superadmin" ||
                          user?.role === "admin"
                        )
                          return true;
                        return (
                          c.instructors?.some(
                            (i: any) => i.user === user?.id,
                          ) || c.tas?.some((t: any) => t.user === user?.id)
                        );
                      }
                      return status === courseStatusTab;
                    }).length > 0 ? (
                    <div className="grid gap-4">
                      {courses
                        .filter((c) => {
                          if (courseStatusTab === "Trash") {
                            if (
                              user?.role !== "superadmin" &&
                              user?.role !== "admin"
                            )
                              return false;
                            return c.deleted === true;
                          }
                          if (c.deleted) return false;
                          const status = getEffectiveStatus(c);
                          if (courseStatusTab === "Draft") {
                            if (status !== "Draft") return false;
                            if (
                              user?.role === "superadmin" ||
                              user?.role === "admin"
                            )
                              return true;
                            return (
                              c.instructors?.some(
                                (i: any) => i.user === user?.id,
                              ) ||
                              c.tas?.some((t: any) => t.user === user?.id)
                            );
                          }
                          return status === courseStatusTab;
                        })
                        .map((course) => {
                          const hasEditAccess =
                            user?.role === "superadmin" ||
                            user?.role === "admin" ||
                            course.createdBy === user?.id ||
                            course.instructors?.some(
                              (i: any) => i.user === user?.id,
                            ) ||
                            course.tas?.some(
                              (t: any) => t.user === user?.id,
                            );
                          const hasDeleteAccess =
                            user?.role === "superadmin" ||
                            user?.role === "admin" ||
                            course.createdBy === user?.id;

                          const getStatusBtnLabel = (status: string) => {
                            if (status === "Draft") return "Open Enrollment";
                            if (status === "Enrollment Open")
                              return "Publish Course";
                            if (status === "Published") return "Close Course";
                            return "Publish Course";
                          };

                          return (
                            <div
                              key={course._id}
                              className="p-6 border border-ink bg-paper hover:shadow-[8px_8px_0px_rgba(0,0,0,1)] transition-shadow"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-serif font-black text-xl italic">
                                  {course.courseCode
                                    ? `[${course.courseCode}] `
                                    : ""}
                                  {course.title}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-1 text-[9px] uppercase tracking-widest font-bold border ${getEffectiveStatus(course) === "Draft" ? "bg-ink/10 border-ink/20" : "bg-brand-acid text-ink border-ink"}`}
                                  >
                                    {getEffectiveStatus(course)}
                                  </span>
                                  {!course.deleted && hasEditAccess && (
                                    <button
                                      onClick={() =>
                                        quickUpdateCourseStatus(
                                          course._id,
                                          course.status,
                                        )
                                      }
                                      className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold border border-ink bg-ink text-paper hover:bg-brand-blue transition-colors"
                                    >
                                      {getStatusBtnLabel(course.status)}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="font-mono text-xs opacity-70 mb-4">
                                {course.tagline || course.description}
                              </p>
                              <div className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40 mb-4">
                                {course.type} | Fee: ₹{course.fee || 0}
                                {course.hasMicrocert &&
                                  ` | Microcert: ₹${course.microcertFee}`}
                              </div>
                              {course.deleted ? (
                                <div className="flex flex-wrap gap-2">
                                  {hasDeleteAccess && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRetrieveCourse(
                                            course._id,
                                            course.title,
                                          )
                                        }
                                        className="h-8 px-4 border border-green-600 bg-paper text-green-700 font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-green-600 hover:text-paper transition-colors"
                                      >
                                        Retrieve / Un-delete
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handlePermanentDeleteCourse(
                                            course._id,
                                            course.title,
                                          )
                                        }
                                        className="h-8 px-4 border border-red-800 bg-red-800 text-paper font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors"
                                      >
                                        PERMANENT DELETE
                                      </button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {hasEditAccess && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          startEditingCourse(course)
                                        }
                                        className="h-8 px-4 border border-ink bg-paper font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-acid transition-colors"
                                      >
                                        Edit / Manage
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          navigate(
                                            `/academy/online/${course.slug}?simulate=true`,
                                          )
                                        }
                                        className="h-8 px-4 border border-brand-blue bg-brand-blue text-paper font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-ink transition-colors"
                                      >
                                        Preview Course Content
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          navigate(
                                            course.type?.includes(
                                              "Residential",
                                            ) ||
                                              course.type ===
                                                "W2M Residential Course"
                                              ? `/events/${course.slug}?isCourse=true&simulate=unenrolled`
                                              : `/academy/online/${course.slug}?simulate=unenrolled`,
                                          )
                                        }
                                        className="h-8 px-4 border border-brand-orange bg-paper text-brand-orange font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-orange hover:text-paper transition-colors"
                                      >
                                        Preview Enrollment Page
                                      </button>
                                    </>
                                  )}
                                  <Link
                                    to={
                                      course.type?.includes("Residential") ||
                                      course.type === "W2M Residential Course"
                                        ? `/events/${course.slug}?isCourse=true`
                                        : `/academy/online/${course.slug}`
                                    }
                                    className="h-8 px-4 flex items-center justify-center border border-ink bg-ink text-paper font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-blue hover:border-brand-blue transition-colors"
                                  >
                                    {course.type?.includes("Residential") ||
                                    course.type === "W2M Residential Course"
                                      ? "View Event / Register"
                                      : enrolledCourseSlugs.includes(
                                            course.slug,
                                          )
                                        ? "Enrolled / View"
                                        : "View / Enroll"}
                                  </Link>
                                  {hasDeleteAccess && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleTrashCourse(
                                          course._id,
                                          course.title,
                                        )
                                      }
                                      className="h-8 px-4 border border-red-600 bg-paper text-red-600 font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-paper transition-colors"
                                    >
                                      Trash / Delete
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="border border-ink border-dashed p-12 text-center">
                      <div className="opacity-50 font-mono text-xs mb-4">
                        {courseStatusTab === "Trash"
                          ? "No trashed courses"
                          : `No ${courseStatusTab.toLowerCase()} courses yet`}
                      </div>
                      <p className="opacity-40 text-sm">
                        {courseStatusTab === "Trash"
                          ? "Courses you delete will show up in the trash can."
                          : `There are currently no courses in the "${courseStatusTab}" state.`}
                      </p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* CUSTOM NON-BLOCKING CONFIRMATION DIALOG (Supports iframe/sandboxed environments) */}
          {confirmModal.isOpen && (
            <div
              id="custom-confirm-modal"
              className="fixed inset-0 z-[100] overflow-y-auto bg-ink/75 backdrop-blur-sm flex items-center justify-center p-6 bg-paper/90"
            >
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
                    onClick={() =>
                      setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                    }
                    className="px-4 py-2 border border-ink bg-paper hover:bg-ink/5 tracking-wider uppercase font-bold transition-all"
                  >
                    {confirmModal.cancelText || "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      confirmModal.onConfirm();
                    }}
                    className={`px-4 py-2 border border-ink text-white font-bold tracking-wider uppercase shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all ${
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

          {activeTab === "certifications" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif font-black">
                  Certifications
                </h2>
                <button
                  onClick={startSavingCert}
                  className="h-10 px-4 bg-brand-blue text-paper font-mono text-[10px] font-black uppercase tracking-widest hover:bg-ink transition-colors"
                >
                  {showCertForm ? "Cancel" : "+ New Cert"}
                </button>
              </div>

              {showCertForm ? (
                <form
                  onSubmit={handleCreateCert}
                  className="mb-12 border border-ink p-6 grid gap-4 bg-ink/5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Title
                      </label>
                      <input
                        required
                        type="text"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={certFormData.title}
                        onChange={(e) =>
                          setCertFormData({
                            ...certFormData,
                            title: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Level
                      </label>
                      <select
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={certFormData.level}
                        onChange={(e) =>
                          setCertFormData({
                            ...certFormData,
                            level: e.target.value,
                          })
                        }
                      >
                        <option value="Certificate">Certificate</option>
                        <option value="Diploma">Diploma</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Description
                      </label>
                      <textarea
                        required
                        rows={3}
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={certFormData.description}
                        onChange={(e) =>
                          setCertFormData({
                            ...certFormData,
                            description: e.target.value,
                          })
                        }
                      ></textarea>
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Status
                      </label>
                      <select
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={certFormData.status}
                        onChange={(e) =>
                          setCertFormData({
                            ...certFormData,
                            status: e.target.value,
                          })
                        }
                      >
                        <option value="Draft">Draft</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Start Date (Optional)
                      </label>
                      <input
                        type="date"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={certFormData.startDate || ""}
                        onChange={(e) =>
                          setCertFormData({
                            ...certFormData,
                            startDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={certFormData.endDate || ""}
                        onChange={(e) =>
                          setCertFormData({
                            ...certFormData,
                            endDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Certification Fee (₹)
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={certFormData.fee}
                        onChange={(e) =>
                          setCertFormData({
                            ...certFormData,
                            fee: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Req. Credits for Cert.
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={certFormData.requiredCredits}
                        onChange={(e) =>
                          setCertFormData({
                            ...certFormData,
                            requiredCredits: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Req. Courses Count
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={certFormData.requiredCoursesCount}
                        onChange={(e) =>
                          setCertFormData({
                            ...certFormData,
                            requiredCoursesCount: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Bulk Discount Type
                      </label>
                      <select
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        value={certFormData.bulkDiscountType}
                        onChange={(e) =>
                          setCertFormData({
                            ...certFormData,
                            bulkDiscountType: e.target.value,
                          })
                        }
                      >
                        <option value="none">None</option>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Bulk Discount Value
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 border border-ink bg-paper font-mono text-xs focus:outline-none"
                        disabled={certFormData.bulkDiscountType === "none"}
                        value={certFormData.bulkDiscountValue}
                        onChange={(e) =>
                          setCertFormData({
                            ...certFormData,
                            bulkDiscountValue: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">
                        Linked Courses
                      </label>
                      <div className="max-h-48 overflow-y-auto border border-ink p-2 bg-paper grid gap-2">
                        {courses.map((c) => {
                          const isLinked = certFormData.courses?.some(
                            (lc: any) => lc.courseId === c._id,
                          );
                          const linkData = certFormData.courses?.find(
                            (lc: any) => lc.courseId === c._id,
                          );
                          return (
                            <div
                              key={c._id}
                              className="flex items-center justify-between border-b border-ink/10 pb-2"
                            >
                              <label className="flex items-center gap-2 font-mono text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="accent-brand-blue"
                                  checked={isLinked}
                                  onChange={(e) => {
                                    if (e.target.checked)
                                      setCertFormData({
                                        ...certFormData,
                                        courses: [
                                          ...(certFormData.courses || []),
                                          {
                                            courseId: c._id,
                                            isOptional: false,
                                          },
                                        ],
                                      });
                                    else
                                      setCertFormData({
                                        ...certFormData,
                                        courses: (
                                          certFormData.courses || []
                                        ).filter(
                                          (lc: any) => lc.courseId !== c._id,
                                        ),
                                      });
                                  }}
                                />
                                {c.title}
                              </label>
                              {isLinked && (
                                <select
                                  className="p-1 text-xs font-mono border border-ink bg-paper"
                                  value={
                                    linkData.isOptional
                                      ? "optional"
                                      : "compulsory"
                                  }
                                  onChange={(e) => {
                                    const updated = certFormData.courses.map(
                                      (lc: any) =>
                                        lc.courseId === c._id
                                          ? {
                                              ...lc,
                                              isOptional:
                                                e.target.value === "optional",
                                            }
                                          : lc,
                                    );
                                    setCertFormData({
                                      ...certFormData,
                                      courses: updated,
                                    });
                                  }}
                                >
                                  <option value="compulsory">Compulsory</option>
                                  <option value="optional">Optional</option>
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="h-12 w-full mt-4 bg-brand-blue text-paper font-mono font-black text-xs uppercase tracking-widest hover:bg-ink transition-colors"
                  >
                    {editingCertId
                      ? "Update Certification"
                      : "Create Certification"}
                  </button>
                </form>
              ) : (
                <>
                  {certLoading ? (
                    <div className="py-12">
                      <BrutalistLoader />
                    </div>
                  ) : certifications.length > 0 ? (
                    <div className="grid gap-4">
                      {certifications.map((cert) => {
                        const hasEditAccess = cert.createdBy === user?.id;

                        const getStatusBtnLabel = (status: string) => {
                          if (status === "Draft") return "Open Enrollment";
                          if (status === "Enrollment Open") return "Publish";
                          if (status === "Published") return "Close";
                          return "Publish";
                        };

                        return (
                          <div
                            key={cert._id}
                            className="p-6 border border-ink bg-paper hover:shadow-[8px_8px_0px_rgba(0,0,0,1)] transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-serif font-black text-xl italic">
                                {cert.title}
                              </h3>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-1 text-[9px] uppercase tracking-widest font-bold border ${cert.status === "Draft" ? "bg-ink/10 border-ink/20" : "bg-brand-acid text-ink border-ink"}`}
                                >
                                  {cert.status || "Draft"}
                                </span>
                                {hasEditAccess && (
                                  <button
                                    onClick={() =>
                                      quickUpdateCertStatus(
                                        cert._id,
                                        cert.status || "Draft",
                                      )
                                    }
                                    className="px-2 py-1 text-[9px] uppercase tracking-widest font-bold border border-ink bg-ink text-paper hover:bg-brand-blue transition-colors"
                                  >
                                    {getStatusBtnLabel(cert.status || "Draft")}
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="font-mono text-xs opacity-70 mb-4">
                              {cert.description}
                            </p>
                            <div className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40 mb-4">
                              Fee: ₹{cert.fee || 0} | Level: {cert.level}
                            </div>
                            <div className="flex gap-2">
                              {hasEditAccess && (
                                <button
                                  onClick={() => startEditingCert(cert)}
                                  className="h-8 px-4 border border-ink bg-paper font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-acid transition-colors"
                                >
                                  Edit
                                </button>
                              )}
                              <Link
                                to={`/academy/certifications/${cert._id}`}
                                className="h-8 px-4 flex items-center justify-center border border-ink bg-ink text-paper font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-blue hover:border-brand-blue transition-colors"
                              >
                                {enrolledCertIds.includes(cert._id)
                                  ? "Enrolled / View"
                                  : "View / Enroll"}
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="border border-ink border-dashed p-12 text-center">
                      <div className="opacity-50 font-mono text-xs mb-4">
                        No certifications yet
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
