/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Compass, Target, Sparkles, BookOpen, ShieldCheck, HeartHandshake, Eye, ArrowUpRight } from 'lucide-react';
import { visionMissionData } from '../data/visionMission';

// Icon Map helper to resolve dynamic icon IDs from the data file
const iconMap = {
  compass: Compass,
  heartHandshake: HeartHandshake,
  shieldCheck: ShieldCheck,
  bookOpen: BookOpen,
};

export default function VisionMission() {
  const [activePillar, setActivePillar] = useState<number>(0);

  const pillars = visionMissionData.pillarsSection.items;

  return (
    <div className="min-h-screen bg-paper pt-32 pb-24 px-6 lg:px-12 grid-structure">
      <div className="max-w-[1600px] mx-auto w-full">
        {/* Page Header */}
        <div className="border-b border-ink/20 pb-12 mb-16">
          <div className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-brand-orange mb-4">
            {visionMissionData.metaLabel}
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-black tracking-tight leading-none mb-6">
            {visionMissionData.title} <span className="text-outline">{visionMissionData.titleAccent}</span>
          </h1>
          <p className="font-serif text-xl md:text-2xl text-ink/80 italic font-light max-w-4xl leading-relaxed">
            {visionMissionData.tagline}
          </p>
        </div>

        {/* Hero Narrative Block */}
        <div id="manifesto-hero" className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          <div className="p-8 md:p-12 border border-ink bg-white shadow-[12px_12px_0_rgba(0,0,0,1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-acid/10 rounded-bl-full transition-all group-hover:scale-110 pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6">
              <Eye className="w-5 h-5 text-brand-blue" />
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">
                {visionMissionData.vision.label}
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-serif font-black leading-tight mb-6">
              {visionMissionData.vision.heading}
            </h2>
            
            {visionMissionData.vision.paragraphs.map((p, idx) => (
              <p key={idx} className="font-serif text-base text-ink/75 leading-relaxed mb-6 last:mb-0">
                {p}
              </p>
            ))}
          </div>

          <div className="p-8 md:p-12 border border-ink bg-brand-acid/20 shadow-[12px_12px_0_rgba(0,0,0,1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/10 rounded-bl-full transition-all group-hover:scale-110 pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-5 h-5 text-brand-orange" />
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-brand-orange">
                {visionMissionData.mission.label}
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-serif font-black leading-tight mb-6">
              {visionMissionData.mission.heading}
            </h2>
            
            {visionMissionData.mission.paragraphs.map((p, idx) => (
              <p key={idx} className="font-serif text-base text-ink/75 leading-relaxed mb-6 last:mb-0">
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* Pillars Layout and Interactive Segment */}
        <div id="pillars-segment" className="grid lg:grid-cols-12 gap-12 pt-12 border-t border-dashed border-ink/20">
          <div className="lg:col-span-5 space-y-6">
            <div className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-brand-blue">
              {visionMissionData.pillarsSection.label}
            </div>
            <h3 className="text-3xl md:text-4xl font-serif font-black leading-tight">
              {visionMissionData.pillarsSection.title}
            </h3>
            <p className="font-serif text-base text-ink/70 leading-relaxed">
              {visionMissionData.pillarsSection.description}
            </p>

            <div className="grid gap-3 pt-6">
              {pillars.map((p, idx) => {
                const Icon = iconMap[p.iconId] || Compass;
                const isSelected = activePillar === idx;
                return (
                  <button
                    id={`pillar-btn-${idx}`}
                    key={idx}
                    onClick={() => setActivePillar(idx)}
                    className={`flex items-center gap-4 p-4 text-left border transition-all ${
                      isSelected
                        ? "bg-ink text-paper border-ink shadow-[4px_4px_0px_var(--color-brand-acid)]"
                        : "bg-white border-ink/20 text-ink hover:border-ink hover:bg-paper"
                    }`}
                  >
                    <div className={`p-2 border rounded-none {
                      isSelected ? "bg-brand-acid text-ink border-brand-acid" : "bg-paper/50 border-ink/10 text-ink"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-grow">
                      <div className="font-mono text-xs font-black uppercase tracking-wider">{p.title}</div>
                      <div className={`font-mono text-[9px] font-bold uppercase tracking-widest ${
                        isSelected ? "text-brand-acid" : "text-ink/40"
                      }`}>{p.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-1" />

          {/* Detailed Content Window */}
          <div className="lg:col-span-6">
            <div className="h-full border border-ink bg-white p-8 md:p-12 shadow-[16px_16px_0_rgba(0,0,0,1)] flex flex-col justify-between min-h-[460px]">
              <div>
                <div className="flex items-center justify-between border-b border-ink/10 pb-6 mb-8">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-brand-orange animate-spin-slow" />
                    <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-ink/50">
                      Interactive Strategic Blueprint
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black px-2 py-0.5 bg-brand-acid text-ink shadow-[1px_1px_0_rgba(0,0,0,1)] border border-ink">
                    0{activePillar + 1}
                  </span>
                </div>

                <motion.div
                  key={activePillar}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h4 className="text-3xl font-serif font-black leading-tight text-ink">
                    {pillars[activePillar].title}
                  </h4>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-brand-blue">
                    {pillars[activePillar].subtitle}
                  </p>
                  <p className="font-serif text-lg text-ink/80 leading-relaxed">
                    {pillars[activePillar].description}
                  </p>
                </motion.div>
              </div>

              <motion.div
                key={`footer-${activePillar}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-12 pt-6 border-t border-dashed border-ink/10 grid md:grid-cols-2 gap-6"
              >
                <div>
                  <span className="block font-mono text-[9px] uppercase font-black text-ink/40 tracking-widest mb-1.5">Key Performance Indicator</span>
                  <span className="font-mono text-[11px] font-bold uppercase bg-brand-blue/10 text-brand-blue py-1 px-2 border border-brand-blue/20">
                    {pillars[activePillar].metrics}
                  </span>
                </div>
                <div>
                  <span className="block font-mono text-[9px] uppercase font-black text-ink/40 tracking-widest mb-1.5">Action Plan / Execution Route</span>
                  <span className="font-serif text-[11px] text-ink/65 leading-tight block">
                    {pillars[activePillar].blueprint}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Global Operational Targets Info Box */}
        <div id="targets" className="mt-28 p-8 md:p-12 bg-ink text-paper border border-ink relative overflow-hidden">
          <div className="absolute top-[-50px] right-[-50px] font-serif text-[18vw] font-black opacity-5 pointer-events-none leading-none select-none">
            {visionMissionData.guaranteesSection.year}
          </div>
          <div className="max-w-4xl relative z-10">
            <span className="font-mono text-[10px] uppercase font-black tracking-[0.3em] text-brand-acid block mb-4">
              {visionMissionData.guaranteesSection.label}
            </span>
            <h3 className="text-4xl md:text-5xl font-serif font-bold italic mb-6">
              {visionMissionData.guaranteesSection.title}
            </h3>
            <p className="font-serif text-base text-paper/85 leading-relaxed mb-6">
              {visionMissionData.guaranteesSection.description}
            </p>
            <div className="flex flex-wrap gap-x-12 gap-y-4">
              {visionMissionData.guaranteesSection.badges.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-brand-acid rounded-full" />
                  <span className="font-mono text-xs font-black uppercase tracking-wider text-brand-acid">
                    {b}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
