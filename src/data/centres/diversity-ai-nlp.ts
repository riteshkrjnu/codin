/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Centre } from './types.ts';

export const diversityAiNlp: Centre = {
  slug: "diversity-ai-nlp",
  name: "Centre for Diversity in AI and NLP",
  shortName: "CD-AINLP",
  tagline: "Building high-performance language technologies that understand every voice and dialect.",
  description: "The Centre for Diversity in AI and NLP is dedicated to mitigating algorithmic bias in modern speech and language systems. We conduct cutting-edge research to develop speech recognition, translation, and understanding models that work reliably for South Asia's minoritised dialects and low-resource tribal languages.",
  image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1200",
  aims: [
    "Reduce phoneme-level error rates in automated speech systems for non-standard varieties.",
    "Launch specialized benchmarking suites testing systems under extreme dialectal variance.",
    "Design open-access neural language resources preserving syntactic diversity."
  ],
  projects: ["kailash"],
  people: ["bornini", "ritesh"],
  courses: ["ai-bias-mitigation", "ethic-ai-governance"],
  publications: [
    {
      title: "Adapting Speech Foundations for Highly Low-Resource Tribal Dialects",
      authors: "Dr. Bornini Lahiri, Ritesh Kumar",
      journal: "CoDIN Computational Speech Review",
      year: "2025"
    },
    {
      title: "Quantifying Social and Dialectal Bias in Commercial Automatic Speech Recognition",
      authors: "Ritesh Kumar, Dr. Bornini Lahiri",
      journal: "Journal of Language Equity and AI Foundations",
      year: "2024"
    }
  ],
  relevantCards: [
    {
      title: "Dynamic Evaluation Rig",
      description: "A specialized local hardware system simulating field dialects with noise environments to stress-test API endpoints."
    },
    {
      title: "Ethical Incentive Frameworks",
      description: "Co-operatively designed compensation blueprints for verbal asset contributors, ensuring standard royalties."
    }
  ],
  subPages: [
    {
      slug: "benchmarking-standards",
      title: "CD-AINLP Baselines",
      icon: "Code",
      type: "markdown",
      content: {
        teaser: "Standardized evaluation rules for inclusive acoustic systems.",
        markdown: "Our lab operates the first dedicated diversity benchmark dataset evaluating dialectal phonetic drift. We publish standard test sets for five under-represented dialect profiles under CC-BY-NC license to challenge global tech benchmarks."
      }
    }
  ]
};
