/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const siteConfig = {
  name: "Council for Diversity and Innovation",
  shortName: "CoDIN",
  tagline: "Working with Indigenous Communities for building self-owned, sovereign, local AI models, datasets, archives and more",
  contactEmail: "contact@diversity.org.in",
  logoUrl: "https://res.cloudinary.com/duarehqqp/image/upload/v1779696459/CDI01-14-NoBG-red_zut1fu.png",
};

export interface NavItem {
  label: string;
  href?: string;
  className?: string;
  isMegaMenu?: boolean;
  children?: { label: string; href: string; description?: string }[];
}

export const navigation: NavItem[] = [
  {
    label: "W2M Academy",
    children: [
      { label: "Overview", href: "/academy", description: "Linguistics, Tech, and Data Annotation training." },
      { label: "Residential Courses", href: "/academy/residential", description: "Unique offline field methods for speech tech." },
      { label: "Online Courses", href: "/academy/online", description: "Upcoming live online specialized courses." },
      { label: "Custom Courses", href: "/academy/custom", description: "Bespoke workshops and curated training programs." },
    ],
  },
  {
    label: "Centres",
    children: [
      { label: "Centre for Diversity in AI and NLP", href: "/centres/diversity-ai-nlp", description: "Building AI that understands every voice." },
      { label: "Centre for Digital Preservation of Linguistic and Cultural Heritage", href: "/centres/digital-preservation", description: "Preserving languages and cultures through digital archiving." },
      { label: "Centre for Linguistic and Cultural Diversity", href: "/centres/linguistic-cultural-diversity", description: "Understanding linguistics and cultural diversity" },
    ],
  },
  {
    label: "Events",
    href: "/events",
  },
  {
    label: "Projects",
    isMegaMenu: true,
  },
  {
    label: "About",
    children: [
      { label: "Vision and Mission", href: "/about/vision-mission", description: "Our philosophy, goals, and core values for linguistic equity." },
      { label: "The Board & Leadership", href: "/about/board", description: "Our governing council and executive team." },
      { label: "Research Advisory Board", href: "/about/rab", description: "Global scholars steering our scientific roadmap." },
      { label: "People", href: "/people", description: "Meet our council members, researchers, and field specialists." },
      { label: "Impact", href: "/#impact", description: "Key stats and societal impact metrics." },
    ],
  },
];

export * from './projects/index.ts';

export const impactStats = [
  { label: "Languages Targeted", value: "45+" },
  { label: "Data Samples", value: "2.4M" },
  { label: "Certified Stakeholders", value: "850+" },
  { label: "Govt Partnerships", value: "02" },
];

export const academyInfo = {
  title: "Words, Worlds and Models (W2M)",
  tagline: "Bridging the gap between linguistic fieldwork and AI development.",
  description: "W2M is CoDIN's flagship educational program designed to train the next generation of data specialists, field linguists, and AI project leads from the indigenous communities. We focus on the 'middle mile' of data—ensuring that collection from the ground is ethical, accurate, and high-utility for building speech and language technologies. At the same time, we ensure that both datasets and AI models reamin of the community, by the community and for the community, instead of getting centralised in a few big tech organisations.",
  philosophy: "The quality is in the classroom. We believe that better AI starts with better-trained people. Our curriculum is built on decades of field experience documenting minoritised and tribal languages and building technologies with the community members.",
};

export const residentialCourses = [
  {
    slug: "field-methods-june-2026",
    code: "W2M-204",
    title: "Field Methods for Speech Technologies (Multilingual)",
    iteration: "June 2026",
    dates: "June 18 - June 23, 2026",
    location: "Prism-NB (Uttaran), Madarihat, Alipurduar, West Bengal",
    status: "Upcoming",
    tagline: "Building Speech Technologies for Kurux and Sadri",
    description: "A 6-day intensive residential course focusing on training community members, linguists and AI developers in data collection and model training pipelines for building ASR systems in Kurux and Sadri.",
    curriculum: [
      "Questionnaire Design, Data Collection (for technology building), Field Methods",
      "Ethics of Field Methods and Community Engagement",
      "An Introduction to Kurux and Sadri Communities and Languages",
      "Language Technologies, Model Building and Transfer Learning",
      "Designing and Localising an Elicitation Tool (Questionnaire)",
      "Metadata, Data Collection and Validation",
      "Phonology and Morphology of Dravidian and Indo-Aryan Languages",
      "Transcription and Glossing (using UD framework and Leipzig conventions)",
      "Building Lexicons, Working Orthography and Primers",
      "Training ASR Models: The Science and the Art",
      "Hands-on Workshop on Questionnaire Development with the Community",
      "Hands-on Workshop on Speaker Interview and Stories Reordings",
      "Field-based Workshop on Data Collection and Validation",
      "Hands-on Workshop on Data Processing, Glossing and Transcription",
      "Field-based Workshop on Building Lexicons, Working Orthography and Primers",
      "Hands-on Workshop and Model Training Experiments"
    ],
    materials: [
      { name: "Syllabus 2026", url: "#" },
      { name: "Field Guide (Draft)", url: "#" }
    ],
    highlights: ["Training with and by Community Members", "24/7 Expert Mentorship", "Field Visit", "Development of dataset and ASR models for Kurux and Sadri", "W2M Certification"]
  },
  {
    slug: "field-methods-june-2025",
    code: "W2M-201",
    title: "Field Methods for Speech Tech (Dravidian)",
    iteration: "June 2025",
    dates: "June 23 - June 28, 2025",
    location: "Keystone Campus, Kotagiri, Tamil Nadu",
    status: "Completed",
    tagline: "Building Speech Tech for Irula",
    description: "The Summer 2025 cohort focused on Irula language, producing over 5 hours of speech data and over 50 hours of cultural and community radio recordings.",
    curriculum: [
      "Questionnaire Design, Data Collection (for technology building), Field Methods",
      "Ethics of Field Methods and Community Engagement",
      "Irula Worldview",
      "Language Technologies, Model Building and Transfer Learning",
      "Designing and Localising an Elicitation Tool (Questionnaire)",
      "Metadata, Data Collection and Validation",
      "Phonology and Morphology of Dravidian Languages",
      "Transcription and Glossing (using UD framework and Leipzig conventions)",
      "Building Lexicons, Working Orthography and Primers",
      "Training ASR Models: The Science and the Art",
      "Hands-on Workshop on Questionnaire Development with the Community",
      "Hands-on Workshop on Speaker Interview and Stories Reordings",
      "Field-based Workshop on Data Collection and Validation",
      "Hands-on Workshop on Data Processing, Glossing and Transcription",
      "Field-based Workshop on Building Lexicons, Working Orthography and Primers",
      "Hands-on Workshop and Model Training Experiments"
    ],
    materials: [
      { name: "Syllabus 2025", url: "#" },
      { name: "Final Report", url: "#" },
      { name: "Dataset Summary", url: "#" },
      { name: "Workshop Recordings", url: "#" }
    ],
    highlights: ["Collaboration with Irula Community Members", "Training of Irula Community Members in Field Methods and Speech Tech Dev", "Development of Irula ASR System"]
  }
];

export const certifications = [
  { id: "CERT-AI", name: "AI Practitioner Certification", desc: "For engineers building inclusive LLMs." },
  { id: "CERT-FIELD", name: "Field Research Mastery", desc: "For linguists and ethnographers." },
  { id: "CERT-DATA", name: "Data Governance Specialist", desc: "For policy makers and archivist." }
];

export const onlineCourses = [
  {
    slug: "ai-bias-mitigation",
    title: "AI Bias Mitigation",
    type: "Webinar Series",
    status: "Coming Soon",
    certId: "CERT-AI",
    credits: 4,
    duration: "4 Weeks",
    description: "A micro-certification for ML engineers focused on identifying and correcting cultural bias in training datasets.",
    outline: ["Detection of Bias", "Mitigation Strategies", "Fairness Metrics", "Case Studies"],
    modules: 4
  },
  {
    slug: "data-annotation-mastery",
    title: "Data Annotation Mastery",
    type: "Self-Paced",
    status: "Enrolling Soon",
    certId: "CERT-DATA",
    credits: 3,
    duration: "6 Weeks",
    description: "Learn the W2M standard for linguistic annotation across 5 South Asian language families.",
    outline: ["Annotation Formats", "Quality Control", "Tool Proficiency", "Ethic & Privacy"],
    modules: 6
  },
  {
    slug: "field-linguistics-101",
    title: "Field Linguistics 101",
    type: "Cohort Based",
    status: "Announced",
    certId: "CERT-FIELD",
    credits: 5,
    duration: "8 Weeks",
    description: "Foundational training in documenting oral traditions using high-fidelity digital methods.",
    outline: ["Phonetic Notation", "Recording Gear", "Interviewing Techniques", "Archival Standards"],
    modules: 8
  },
  {
    slug: "ethic-ai-governance",
    title: "Ethics in AI Governance",
    type: "Webinar Series",
    status: "Upcoming",
    certId: "CERT-AI",
    credits: 2,
    duration: "2 Weeks",
    description: "Examine the policy frameworks required to manage diverse and inclusive AI implementations.",
    outline: ["Global Policy Review", "Identity Protection", "Community Consent", "Algorithmic Accountability"],
    modules: 2
  }
];

export const customCourses = [
  {
    slug: "tech-corp-data-ethics",
    title: "Localization & Field-Data Strategy",
    client: "Global Tech Corp",
    year: "2023",
    description: "A 2-day intensive sprint for engineering teams focusing on mitigating bias in multi-lingual large models.",
    highlights: ["Addressed 5 Indian languages", "Bias documentation framework"],
  },
  {
    slug: "policy-unit-gov",
    title: "Digital Transformation & Archiving",
    client: "State Policy Unit",
    year: "2024",
    description: "Curated multi-week curriculum on adopting inclusive data standards for digitizing cultural archives.",
    highlights: ["Created standard metadata schema", "Trained 20+ state archivists"],
  }
];

export * from './people/index.ts';

export * from './centres/index.ts';

export * from './events/index.ts';

export interface Announcement {
  id: string;
  title: string;
  date: string;
  category: "Upcoming Event" | "General" | "Milestone" | "Policy" | "Archived";
  description: string;
  link?: string;
  highlighted?: boolean;
}

export interface W2MNotification {
  id: string;
  title: string;
  date: string;
  type: "Recruitment" | "Grant" | "Certification" | "Field Call" | "General";
  description: string;
  actionText?: string;
  actionLink?: string;
  badge?: string;
}

// User-added static config entries
const customAnnouncements: Announcement[] = [
  {
    id: "ann-1",
    title: "Call for Papers Launched: National Summit on Language Variety & Digital Inclusivity 2026",
    date: "May 20, 2026",
    category: "Upcoming Event",
    description: "Submit your abstracts (maximum 2 pages, double-blind ACL format) to our primary tracks on low-resource speech modeling, community language royalties, and semantic registries.",
    link: "/events/nlp-diversity-summit-2026",
    highlighted: true
  },
  {
    id: "ann-2",
    title: "Sovereign Language Data Licensing Standards Ratified with Regional Stakeholders",
    date: "April 18, 2026",
    category: "Milestone",
    description: "The Council has completed round-table sessions at Bengaluru, aligning community copyright rules with automated smart metadata systems, protecting oral folk traditions.",
    link: "/projects/tholkudi"
  },
  {
    id: "ann-arch-1",
    title: "Seed Grants Q1 2025 Closed",
    date: "Jan 10, 2025",
    category: "Archived",
    description: "The call for early-stage localization and minoritised language grants for 2025 has concluded.",
  },
  {
    id: "ann-arch-2",
    title: "Data Audit Protocol v2 Released",
    date: "Nov 05, 2024",
    category: "Archived",
    description: "Version 2 of our foundational ethical data compliance checks successfully published.",
  }
];

const customW2mNotifications: W2MNotification[] = [
  {
    id: "w2m-not-1",
    title: "Applications Open for W2M Field Methods Fellowship (Autumn Cohort 2026)",
    date: "May 15, 2026",
    type: "Recruitment",
    description: "Seeking 15 fully-funded graduate research fellows for our upcoming immersive highland phonetic cataloging school at Western Ghats Field Station.",
    actionText: "Apply Now",
    actionLink: "/academy/residential",
    badge: "Urgent"
  },
  {
    id: "w2m-not-3",
    title: "CoDIN Announces Seed Archival Grants for Indigenous Folk Lore Preservation",
    date: "April 12, 2026",
    type: "Grant",
    description: "Providing funding and acoustic scanner kits up to INR 2 Lakhs to community-managed libraries and local youth societies.",
    actionText: "Read Guidelines",
    actionLink: "/academy"
  }
];

// Computed live-updating feeds
import { events } from './events/index.ts';

function getLiveFeeds() {
  const announcementsList = [...customAnnouncements];
  const w2mNotificationsList = [...customW2mNotifications];

  // 1. Resolve online courses dynamic notifications & announcements
  onlineCourses.forEach((oc) => {
    if (oc.status !== 'Draft' && oc.status !== 'Closed') {
      // Course Status Update Announcement
      announcementsList.push({
        id: `ann-course-${oc.slug}`,
        category: 'Milestone',
        title: `Enrollment Update: ${oc.title} is now "${oc.status}"`,
        date: 'Active',
        description: `${oc.description} Course credits: ${oc.credits || 0}, duration: ${oc.duration || 'Flexible'}.`,
        link: `/academy/online/${oc.slug}`,
        highlighted: oc.status === 'Active' || oc.status === 'Enrolling Soon'
      });

      // Course Notification in W2M Notifications
      w2mNotificationsList.push({
        id: `not-course-${oc.slug}`,
        type: 'Certification',
        title: `W2M Academy: ${oc.title} registration is ${oc.status}`,
        date: 'Enrolling',
        description: `Micro-certification path. Credits: ${oc.credits}. Duration: ${oc.duration}. ${oc.description}`,
        actionText: 'Review Syllabus',
        actionLink: `/academy/online/${oc.slug}`,
        badge: oc.status === 'Coming Soon' ? 'Coming' : 'Open'
      });
    }
  });

  // 2. Resolve events dynamic notifications & announcements
  events.forEach((ev) => {
    if (ev.status !== 'Archived') {
      announcementsList.push({
        id: `ann-event-${ev.slug}`,
        category: 'Upcoming Event',
        title: `Call for Papers / Participation: ${ev.title}`,
        date: ev.dates,
        description: `${ev.description} Venue scheduled: ${ev.location}. Status: ${ev.status}. Submit registration before the specified gates.`,
        link: `/events/${ev.slug}`,
        highlighted: ev.status === 'Upcoming' || ev.status === 'Ongoing'
      });
    }
  });

  // 3. Resolve residential courses (on-site) dynamic notifications
  residentialCourses.forEach((rc) => {
    if (rc.status !== 'Closed' && rc.status !== 'Completed') {
      w2mNotificationsList.push({
        id: `not-res-${rc.slug}`,
        type: 'Field Call',
        title: `Seats Active: ${rc.title} - ${rc.location}`,
        date: rc.dates,
        description: `Apply for specialized immersive 7-day field methods cohort at ${rc.location}. ${rc.tagline || ''}`,
        actionText: 'Apply for Seats',
        actionLink: `/academy/residential/${rc.slug}`,
        badge: 'On-Site Only'
      });
    }
  });

  return { announcementsList, w2mNotificationsList };
}

const { announcementsList, w2mNotificationsList } = getLiveFeeds();

export const announcements = announcementsList;
export const w2mNotifications = w2mNotificationsList;



