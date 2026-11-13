/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person } from './types.ts';

export const Ritesh_Kumar: Person = {
  slug: "ritesh",
  name: "Ritesh Kumar",
  fullName: "Ritesh Kumar",
  role: "Co-founder and Lead - Centre for Diversity in AI and NLP",
  email: "riteshkr.kmi@gmail.com",
  image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400",
  bio: "Ritesh Kumar leads the technological exploration and system designs for diversity pipelines. With deep expertise in natural language processing (NLP), cloud-scale speech interfaces, and ethical model benchmarking, he designs the systems that power Project Kailash. Dedicated to breaking down resource disparity in algorithmic platforms, he works at the interface of software engineering and deep learning models.",
  education: [
    {
      degree: "M.S. in Computer Science (NLP & AI)",
      institution: "Indian Institute of Technology",
      year: "2019"
    },
    {
      degree: "B.Tech in Computer Science and Engineering",
      institution: "National Institute of Technology",
      year: "2017"
    }
  ],
  experience: [
    {
      role: "Lead Technology Strategist & Systems Architect",
      organization: "Council for Diversity and Innovation",
      period: "2021 - Present",
      description: "Designing end-to-end cloud processing clusters, custom acoustic datasets loaders, and multi-lingual inference frameworks for tribal dialects."
    },
    {
      role: "AI & Speech Engineer",
      organization: "Computational Linguistics Lab",
      period: "2019 - 2021",
      description: "Built scalable models for machine translation and low-density automatic speech recognition (ASR)."
    }
  ],
  publications: [
    "Quantifying Social and Dialectal Bias in Commercial Automatic Speech Recognition (2024)",
    "Adapting Speech Foundations for Highly Low-Resource Tribal Dialects (2025)"
  ],
  researchInterests: ["Natural Language Processing", "Automatic Speech Recognition", "Model Bias", "AI Ethics"],
  centres: ["diversity-ai-nlp"],
  socials: {
    linkedin: "https://linkedin.com/in/ritesh-kumar-mock",
    website: "https://ritesh.diversity.org.in"
  },
  otherSections: [
    {
      title: "Core Framework Competencies",
      content: [
        "Architecting deep learning speech modeling pipelines utilizing PyTorch, ESPnet, and Hugging Face Ecosystems.",
        "Engineering high-efficiency mobile datasets recorders and secure client-side alignment tooling with offline caching."
      ]
    }
  ]
};
