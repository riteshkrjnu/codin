/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from './types.ts';

export const kailash: Project = {
  slug: "kailash",
  id: "PROJ-001",
  title: "Project Kailash",
  tag: "Flagship AI Initiative",
  description: "Collecting large-scale training data across minoritised and tribal languages. Our mission is to reduce AI's bias by building fundamental benchmarking and training datasets for excluded cultures.",
  longDescription: "Project Kailash is CDI's ambitious response to the digital language divide. Currently, AI models suffer from profound data bias, often failing to recognize the nuances of minoritised or tribal languages. This project focuses on the large-scale acquisition of high-quality training and benchmarking datasets specifically for these excluded communities. By creating structural parity in the digital landscape, we ensure that the next generation of AI is inclusive from the ground up.",
  methodology: "We employ a hybrid approach combining field linguistics with automated quality-assurance pipelines. Our W2M certified annotators work directly with community native speakers to ensure cultural authenticity and linguistic precision.",
  impact: [
    "Targeting 10+ minoritised languages in phase one.",
    "Developing baseline transformers for low-resource varieties.",
    "Reducing AI bias in speech-to-text accuracy by 40%."
  ],
  aims: ["Bias Mitigation", "Training Datasets", "Minoritised Focus"],
  color: "bg-brand-acid",
  status: "Ongoing",
  image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=1200",
  relatedLinks: [
    { name: "Language Documentation Portal", url: "https://kailash-portal.diversity.org.in" },
    { name: "CDI AI Research Abstract", url: "https://research.diversity.org.in/kailash-bias-study" }
  ],
  associatedCentres: ["diversity-ai-nlp"],
  projectDirectors: ["bornini", "ritesh"],
  projectStaffs: [
    "Kavitadevi M. (Senior Annotator & Field Liaison)",
    "Anand Kumar (Lead Machine Learning Engineer)",
    "Siddharth S. (Linguistic Data Pipeline Administrator)"
  ],
  fundingAgency: "CoDIN Foundation & Corporate Philanthropy",
  year: "2024",
  startDate: "2024-02-01",
  endDate: "2028-12-31",
  keywords: ["AI", "NLP", "Minoritised", "Tribal", "Large Datasets", "Speech"],
  subPages: [
    {
      slug: "acoustic-stations",
      title: "Forest Ingestion Nodes",
      icon: "MapPin",
      type: "list",
      content: [
        { name: "Station Toda Alpha", role: "Active Capturing", affiliation: "Ooty Highland forest zone" },
        { name: "Station Kota Beta", role: "Acoustic Calibrating", affiliation: "Kothagiri settlement cluster" },
        { name: "Station Badaga Gamma", role: "Setup Stage", affiliation: "Coonoor local library hub" }
      ]
    },
    {
      slug: "licensing-protocols",
      title: "Royalties & Copyright",
      icon: "ShieldCheck",
      type: "markdown",
      content: {
        teaser: "We operate a 'Sovereign Language Data' royalty framework.",
        markdown: "Every spoken contribution captured for Project Kailash is cryptographically mapped to the speaker's guild. Direct micro-royalties are governed through community co-ops to prevent algorithmic exploitation or uncompensated digital enclosure of indigenous oral resources. Commercial adapters must pay a local linguist equity premium."
      }
    }
  ]
};
