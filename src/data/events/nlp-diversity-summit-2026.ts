/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from './types.ts';

export const nlpDiversitySummit2026: Event = {
  slug: "nlp-diversity-summit-2026",
  title: "National Summit on Language Variety & Digital Inclusivity",
  type: "Conference",
  dates: "July 12 - July 14, 2026",
  location: "Informatics Hall, Bengaluru & Online",
  description: "Bridging tech enterprises and field researchers to standardise bias-free corpus collection models.",
  longDescription: "The National Summit brings together leading computational linguists, tribal representation boards, AI engineers, and state policy makers under one roof. Focused heavily on high-fidelity benchmarking standards, the summit establishes the core requirements for South Asia's digital language readiness in the era of foundation models.",
  image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200",
  status: "Upcoming",
  associatedCentres: ["diversity-ai-nlp"],
  associatedPeople: ["bornini", "ritesh"],
  associatedProjects: ["kailash"],
  schedule: [
    { time: "Day 1, 09:30 AM", topic: "Opening Address: The Middle Mile of Cultural Data", speaker: "Dr. Bornini Lahiri" },
    { time: "Day 1, 11:30 AM", topic: "Benchmarking Foundation Models on Low-Resource Phonetics", speaker: "Ritesh Kumar" },
    { time: "Day 2, 02:00 PM", topic: "Ethical Royalties Panel: Cooperative Data Ownership" }
  ],
  subPages: [
    {
      slug: "announcement",
      title: "Announcement & Call for Papers",
      icon: "Megaphone",
      type: "markdown",
      content: {
        teaser: "We invite submissions addressing grammatical diversity, corpus standardisation, bio-phonetics, and digital equity in South Asian languages.",
        markdown: `### Core Tracks
- **Track 1: Low-Resource Speech & Language Modeling** 
  Methods for training automated models on under-represented phonetics, low-resource syntax, and code-mixed formats.
- **Track 2: Ethical Corpus Collection & Royalties** 
  Legal frameworks, policy, and mechanisms for rewarding minoritised communities for language contributions.
- **Track 3: Digital Heritage & Semantic Archiving** 
  Technological pathways to index, classify, and host historic field recordings under fair semantic access schemas.

### Submission Guidelines
Abstracts should not exceed 2 pages including references. Please format using the standard [CoDIN ACL-Style Paper Template](https://aclweb.org) or refer to the [Author Guidelines & Kit](https://github.com). All submissions must be anonymous for double-blind review. Accepted papers will be indexed in the [South Asian Digital Language Library](https://codin.org.in). For questions regarding track alignment, review our [Call for Papers Portal](https://codin.org.in) or email <summit2026@codin.org.in>.`
      }
    },
    {
      slug: "important-dates",
      title: "Important Dates",
      icon: "Calendar",
      type: "dates",
      content: [
        { label: "Abstract Submission Deadline", date: "April 15, 2026", highlighted: true },
        { label: "Notification of Acceptance", date: "May 20, 2026" },
        { label: "Camera-Ready Papers Due", date: "June 10, 2026" },
        { label: "Main Summit Sessions", date: "July 12 - July 14, 2026", Footnote: " Bengaluru & Hybrid Broadcast Options" }
      ]
    },
    {
      slug: "schedule-details",
      title: "Program Schedule",
      icon: "Clock",
      type: "schedule",
      content: [
        { time: "09:00 AM - 10:30 AM", topic: "Registration & Morning Tea // Assembly", speaker: "Executive Secretariat" },
        { time: "10:30 AM - 12:00 PM", topic: "Keynote Lecture: Linguistic Diversity as AI Strategy", speaker: "Dr. Bornini Lahiri" },
        { time: "01:30 PM - 03:00 PM", topic: "Technical Session: Phoneme Annotation Pipeline", speaker: "Ritesh Kumar" },
        { time: "03:30 PM - 05:00 PM", topic: "Panel: Governance & Sovereign Localised LLMs", speaker: "Panelists" }
      ]
    },
    {
      slug: "registration",
      title: "Registration Details",
      icon: "CreditCard",
      type: "registration",
      content: {
        deadline: "July 01, 2026",
        buttonText: "Register for Summit 2026",
        buttonLink: "mailto:registration@codin.org.in?subject=Registration: NLP Diversity Summit 2026",
        fees: [
          { category: "Indian Academic Authors & Researchers", fee: "INR 2,500" },
          { category: "International Academic Scholars", fee: "USD $100" },
          { category: "Tech Enterprises / Industry Professionals", fee: "INR 12,000" },
          { category: "Community Field Delegates & Students", fee: "Complimentary (RSVP Required)" }
        ],
        instructions: [
          "Registration fee includes absolute access to all paper presentations, lunch, summit kits, and printed proceeding dockets.",
          "W2M certified data annotators and field team leaders can claim complimentary delegates' passes through their sponsor links.",
          "Online-only passes are free but prior registration is mandatory."
        ]
      }
    },
    {
      slug: "accepted-papers",
      title: "Accepted Papers",
      icon: "BookOpen",
      type: "list",
      content: [
        {
          title: "Aligning Low-Resource Accents in Chhotanagpur Dialects through Acoustic Anchors",
          authors: "Subhadra Oraon, Ritesh Kumar",
          abstract: "We introduce a novel self-supervised alignment algorithm tailored for non-standardized phonetic dialects, reducing relative word-error-rate under zero-shot setups."
        },
        {
          title: "A Contractual Framework for Community Language Asset Co-Ownership",
          authors: "Adv. Meera Sen, Dr. Bornini Lahiri",
          abstract: "Proposes an atomic operational guidelines template mapping physical collective consent to automated smart license metadata tags in sovereign linguistic archives."
        }
      ]
    },
    {
      slug: "logistics",
      title: "Logistic Information",
      icon: "MapPin",
      type: "logistics",
      content: {
        venue: "Informatics Hall, IISc Campus Extension, Bengaluru, India",
        accommodation: "Registered participants can reserve discounted rooms at the Centenary Visitors House (CVH), IISc. Email reservations@codin.org.in before June 1.",
        travel: "Bengaluru (Kempegowda International Airport) is connected globally. Cabs to CVH or IISc take around 45-60 minutes.",
        visa: "International travelers are advised to apply for an e-Conference Visa using the invitation letter issued by CoDIN Secretariat upon successful registration."
      }
    },
    {
      slug: "committees",
      title: "Organising Committees",
      icon: "Users",
      type: "committees",
      content: [
        {
          name: "Program Committee",
          members: [
            { name: "Dr. Bornini Lahiri", role: "General Co-Chair", affiliation: "CoDIN" },
            { name: "Ritesh Kumar", role: "Technical Program Chair", affiliation: "Centre for Diversity in AI & NLP" }
          ]
        },
        {
          name: "Local Organizing Committee",
          members: [
            { name: "Karthick Ramanathan", role: "Logistics Coordinator", affiliation: "CoDIN Bengaluru Desk" },
            { name: "Siddharth Hegde", role: "Sponsorship & Outreach Manager", affiliation: "Informatics Labs" }
          ]
        }
      ]
    },
    {
      slug: "contact",
      title: "Contact Desk",
      icon: "Mail",
      type: "contact",
      content: [
        { name: "NLP Summit Secretariate", designation: "General Queries & Logistics", email: "summit2026@codin.org.in", phone: "+91 80 2360 0122" },
        { name: "Technical Desk", designation: "Paper Submissions Helper", email: "tech-secretariat@codin.org.in" }
      ]
    }
  ]
};
