import { coursePath } from '../site/data';
import { Catalogue } from '../site/PublicPages';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Calendar,
  ArrowRight,
  BookOpen,
  Info,
  Search,
} from "lucide-react";
import { getEffectiveStatus } from "../lib/courseStatus";
import { useAuth } from "../context/AuthContext";

export default function ResidentialCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const { user } = useAuth();
  const [courseStatuses, setCourseStatuses] = useState<{ [slug: string]: any }>(
    {},
  );

  useEffect(() => {
    async function loadDynamicResidential() {
      try {
        const res = await fetch("/api/courses");
        if (res.ok) {
          const text = await res.text();
          if (text.trim().startsWith("{")) {
            const data = JSON.parse(text);
            if (data.courses && Array.isArray(data.courses)) {
              // Filter courses of type 'W2M Residential Course' or 'Residential'
              const resCourses = data.courses.filter(
                (c: any) =>
                  c.type === "W2M Residential Course" ||
                  c.type === "Residential",
              );
              setCourses(resCourses);
            }
          }
        }
      } catch (err) {
        console.error("Error loading dynamic residential courses:", err);
      }
    }
    loadDynamicResidential();
  }, []);

  useEffect(() => {
    if (!user?.token || courses.length === 0) return;
    async function fetchAllStatuses() {
      const statuses: { [slug: string]: any } = {};
      await Promise.all(
        courses.map(async (c) => {
          try {
            const headers = { Authorization: `Bearer ${user.token}` };
            const statusRes = await fetch(
              `/api/events/${c.slug}/my-status?isCourse=true`,
              { headers },
            );
            if (statusRes.ok) {
              const data = await statusRes.json();
              statuses[c.slug] = data;
            }
          } catch (e) {
            console.error("Error loaded status for " + c.slug, e);
          }
        }),
      );
      setCourseStatuses(statuses);
    }
    fetchAllStatuses();
  }, [user, courses]);

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      searchTerm === "" ||
      (c.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.iteration || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(searchTerm.toLowerCase());

    const effectiveStatus = getEffectiveStatus(c);
    const matchesStatus =
      activeStatus === "all" || effectiveStatus === activeStatus;

    return matchesSearch && matchesStatus;
  });

  return <Catalogue kind="residential" controls={{records:courses,
    toolbar: user && ['admin','superadmin'].includes(user.role) ? <div className="section-actions"><Link className="action" to="/admin?tab=courses&new=1">Add Course</Link><Link to="/admin?tab=courses">Manage programmes →</Link></div> : undefined,
    actions: course => <Link to={coursePath(course)}>{courseStatuses[course.slug]?.registration?'View registration & learning':'Programme details & registration'} →</Link>,
  }}/>;
}
