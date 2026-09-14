/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PillarData {
  title: string;
  subtitle: string;
  iconId: 'compass' | 'heartHandshake' | 'shieldCheck' | 'bookOpen';
  description: string;
  metrics: string;
  blueprint: string;
}

export interface StatementData {
  label: string;
  heading: string;
  paragraphs: string[];
}

export interface VisionMissionContent {
  metaLabel: string;
  title: string;
  titleAccent: string;
  tagline: string;
  
  vision: StatementData;
  mission: StatementData;
  
  pillarsSection: {
    label: string;
    title: string;
    description: string;
    items: PillarData[];
  };
  
  guaranteesSection: {
    year: string;
    label: string;
    title: string;
    description: string;
    badges: string[];
  };
}

export const visionMissionData: VisionMissionContent = {
  metaLabel: "CoDIN Core Manifestos",
  title: "Vision &",
  titleAccent: "Mission",
  tagline: "Redesigning technological infrastructure to guarantee linguistic justice, organic community governance, and cross-cultural cognitive models.",
  
  vision: {
    label: "Core Vision Statement",
    heading: "A World Where No Language Is Too Small for AI or Too Forgotten for Digital Life.",
    paragraphs: [
      "Our vision is to build an inclusive community-led commons where all varieties and languages are granted first-class citizenship in the AI world.",
      "We leverage methods of cmmunity-led fieldwork and technology development to secure digital presence and representation for all."
    ]
  },
  
  mission: {
    label: "Strategic Mission Statement",
    heading: "Cataloging the Gaps, Empowering the Voices, Building the Pipelines.",
    paragraphs: [
      "CoDIN's mission is to proactively correct demographic skew in major technology platforms. We work with indigenous communities to conduct training programs, curate datasets and archives and build self-owned, decentralised AI models for all languages and varieties",
      "By designing full-stack open-source pipelines, we bridge the gap between offline community storytellers and world-class AI systems."
    ]
  },
  
  pillarsSection: {
    label: "Our Core Pillars",
    title: "Four Pillars of Digital and Cultural Inclusion and Ownership",
    description: "Click on each structural pillar to examine our architectural goals, targets, and strategic pipelines in detail.",
    items: [
      {
        title: "Linguistic Equity and Sovereignty",
        subtitle: "Representation and Ownership in the AI Age",
        iconId: "compass",
        description: "Empowering communities to buld fundamental datasets and training models specifically engineered to understand non-standard varieties, minoritised vernaculars, and tribal languages of South Asia, reducing technology exclusion.",
        metrics: "Target: 50+ undocumented languages and varieties by 2028",
        blueprint: "Community Training, Direct Fieldwork, and Self-supervised model calibration on speech datasets."
      },
      {
        title: "Community-led Initiatives",
        subtitle: "Community-First Research Protocols",
        iconId: "heartHandshake",
        description: "Rejecting extractive data harvesting. We train community members and work with them to ensure community ownership and control of the data and model, while establishing long-term economic structures that return value directly to community members.",
        metrics: "100% development and maintennce by community",
        blueprint: "Localized workshops, and standardized cultural heritage ownership contracts."
      },
      {
        title: "Bias Mitigation in LLMs",
        subtitle: "Systemic Neutralisation of Bias",
        iconId: "shieldCheck",
        description: "Remediating the monolithic demographic skew in modern language models. We co-create diverse speech datasets and evaluation checklists that measure the limits of cross-lingual zero-shot generalization.",
        metrics: "Accurate and Bias-free Representation in LLM Output",
        blueprint: "Linguistic and Cultural Appropriateness Evaluation"
      },
      {
        title: "Open Digital Archiving",
        subtitle: "Decentralized Heritage Crypts",
        iconId: "bookOpen",
        description: "Empowering communities with high-fidelity records of their folklore, spoken-word treasures, and oral registers, compiled using robust international descriptive standards.",
        metrics: "Archives of all data co-created with communities",
        blueprint: "Dublin Core schema maps, 3D scans, and offline-first edge storage synchronization."
      }
    ]
  },
  
  guaranteesSection: {
    year: "2028",
    label: "Operational Roadmap & Guarantees",
    title: "Our 100% Commitment to Community-owned, ethical and robust Datasets and AI Models",
    description: "Every recording compiled by the community under the flag of the Council for Diversity and Innovation undergoes robust vetting and validation by the community to ensure their appropriateness, diverse representation and accuracy. We also ensure appropriate speaker compensation, privacy protection protocols, and metadata standardization under community-approved licensing modes or localized sovereign knowledge systems.",
    badges: [
      "Community-owned",
      "Community-decided Access Protocols",
      "Sovereign Data Storage Ready",
      "Double Vetted Field Metrics"
    ]
  }
};
