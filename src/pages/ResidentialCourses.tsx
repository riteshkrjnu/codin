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

  return (
    <div className="pt-32 pb-24 grid-structure min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
          <div className="max-w-2xl">
            <div className="inline-block px-4 py-1 border border-ink text-[10px] font-mono font-bold uppercase tracking-[0.3em] mb-4 bg-paper">
              Course Stream: Residential
            </div>
            <h1 className="text-6xl md:text-8xl font-serif font-black leading-none mb-6 italic">
              Field <span className="text-outline">Methods</span> Residency
            </h1>
            <p className="font-serif text-2xl font-light italic leading-tight text-ink/60">
              Immersive, in-field training environments bridging the gap between
              field linguistics and speech technology for community members,
              linguists and AI researchers.
            </p>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="bg-white border border-ink p-6 mb-12 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 border border-ink font-mono text-xs focus:ring-0 focus:outline-none focus:bg-paper"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
            {[
              "all",
              "Upcoming",
              "Ongoing",
              "Completed",
              "Archived",
              "Draft",
            ].map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`px-4 py-2 border border-ink font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                  activeStatus === status
                    ? "bg-ink text-paper shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    : "bg-paper hover:bg-brand-acid text-ink"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-12">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course, idx) => (
              <motion.div
                key={course.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="bg-paper border border-ink overflow-hidden flex flex-col lg:flex-row group"
              >
                <div className="lg:w-1/3 p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-ink bg-brand-acid group-hover:bg-ink group-hover:text-paper transition-colors duration-500">
                  <div>
                    <div className="font-mono text-[10px] font-black uppercase tracking-[0.4em] mb-8 opacity-40 group-hover:opacity-100 transition-opacity">
                      {course.code || "W2M-RES"}
                    </div>
                    <h2 className="text-4xl font-serif font-black italic leading-[0.9] mb-4">
                      {course.iteration || "Current Residency"} <br />
                      <span className="text-2xl opacity-60 font-bold">
                        {course.title}
                      </span>
                    </h2>
                  </div>

                  <div
                    className={`inline-block self-start px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-widest border border-current mt-12 ${getEffectiveStatus(course) === "Upcoming" ? "bg-white text-ink animate-pulse" : "opacity-40"}`}
                  >
                    {getEffectiveStatus(course)}
                  </div>
                </div>

                <div className="lg:w-2/3 p-12 flex flex-col">
                  <div className="grid md:grid-cols-2 gap-12 mb-12">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 font-mono text-[10px] font-black uppercase tracking-widest text-ink/40">
                        <Calendar className="w-3.5 h-3.5 text-brand-orange" />
                        Dates: {course.dates}
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[10px] font-black uppercase tracking-widest text-ink/40">
                        <MapPin className="w-3.5 h-3.5 text-brand-blue" />
                        Loc: {course.location}
                      </div>
                    </div>
                    <p className="text-sm font-medium leading-relaxed italic opacity-80 text-left">
                      {course.description}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-4 pt-8 border-t border-ink/5">
                    <Link
                      to={`/events/${course.slug}?isCourse=true`}
                      className="h-14 px-8 bg-brand-blue text-white flex items-center gap-3 font-mono font-bold uppercase tracking-widest text-xs hover:bg-ink hover:text-white transition-all group/btn shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] border border-ink"
                    >
                      <Info
                        className="w-4 h-4 text-brand-acid"
                        strokeWidth={3}
                      />
                      View Details
                    </Link>

                    <Link
                      to={`/academy/residential/${course.slug}`}
                      className="h-14 px-8 bg-ink text-paper flex items-center gap-3 font-mono font-bold uppercase tracking-widest text-xs hover:bg-brand-blue transition-all group/btn border border-ink"
                    >
                      View Course Outline
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                      to={
                        courseStatuses[course.slug]?.accepted &&
                        courseStatuses[course.slug]?.participant?.admissionStatus === "Confirmed"
                          ? `/academy/online/${course.slug}`
                          : `/events/${course.slug}?isCourse=true&alertMsg=Please enroll and get your admission confirmed before accessing course materials.`
                      }
                      className="h-14 px-8 border border-ink flex items-center gap-3 font-mono font-bold uppercase tracking-widest text-xs hover:bg-brand-acid transition-all"
                    >
                      <BookOpen className="w-4 h-4" />
                      Materials
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-16 text-center border border-ink bg-brand-acid/5 font-mono text-ink/60 font-bold uppercase text-xs shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              No residential courses matches your filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
