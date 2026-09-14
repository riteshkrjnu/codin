import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Languages, FileText, HelpCircle, BookOpen, Loader2, ArrowRight, Plus, Search, ChevronRight, GraduationCap } from "lucide-react";
import { Assignment } from "../../types/assignments";

interface AiSidekickPanelProps {
  user: any;
  courseSlug?: string;
  courseModules?: any[];
  isInstructorOrTA?: boolean;
  activeMaterial?: any;
  activeAssignment?: Assignment | null;
  selectedQuestionText?: string;
  onApplyExplanation?: (text: string) => void;
}

const SCHEDULED_LANGUAGES = [
  { name: "Hindi", label: "Hindi / हिन्दी" },
  { name: "Assamese", label: "Assamese / অসমীয়া" },
  { name: "Bengali", label: "Bengali / বাংলা" },
  { name: "Bodo", label: "Bodo / बर'" },
  { name: "Dogri", label: "Dogri / डोगरी" },
  { name: "Gujarati", label: "Gujarati / ગુજરાતી" },
  { name: "Kannada", label: "Kannada / ಕನ್ನಡ" },
  { name: "Kashmiri", label: "Kashmiri / कॉशुर" },
  { name: "Konkani", label: "Konkani / कोंकणी" },
  { name: "Maithili", label: "Maithili / मैथिली" },
  { name: "Malayalam", label: "Malayalam / മലയാളം" },
  { name: "Manipuri", label: "Manipuri / মণিপুরী" },
  { name: "Marathi", label: "Marathi / मराठी" },
  { name: "Nepali", label: "Nepali / नेपाली" },
  { name: "Odia", label: "Odia / ଓଡ଼ିଆ" },
  { name: "Punjabi", label: "Punjabi / ਪੰਜਾਬੀ" },
  { name: "Sanskrit", label: "Sanskrit / संस्कृतम्" },
  { name: "Santali", label: "Santali / संताली" },
  { name: "Sindhi", label: "Sindhi / सिन्धी" },
  { name: "Tamil", label: "Tamil / தமிழ்" },
  { name: "Telugu", label: "Telugu / తెలుగు" },
  { name: "Urdu", label: "Urdu / اردو" }
];

export const AiSidekickPanel: React.FC<AiSidekickPanelProps> = ({
  user,
  courseSlug,
  courseModules = [],
  isInstructorOrTA = false,
  activeMaterial,
  activeAssignment,
  selectedQuestionText,
}) => {
  const [inputText, setInputText] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("Hindi");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSidekickTab, setActiveSidekickTab] = useState<"summarize" | "translate" | "glossary" | "hint" | "practice">("summarize");
  const [errorMsg, setErrorMsg] = useState("");

  // Summarize multiple selections
  const [selectedSummaryModules, setSelectedSummaryModules] = useState<string[]>([]);
  const [selectedSummaryMaterials, setSelectedSummaryMaterials] = useState<string[]>([]);

  // Translate specific triggers
  const [translateSourceType, setTranslateSourceType] = useState<"material" | "summary" | "custom">("custom");
  const [selectedTranslateMaterial, setSelectedTranslateMaterial] = useState("");

  // Glossary states
  const [glossary, setGlossary] = useState<any[]>([]);
  const [glossaryLoading, setGlossaryLoading] = useState(false);
  const [glossaryScope, setGlossaryScope] = useState<"course" | "module" | "material">("course");
  const [selectedGlossaryModule, setSelectedGlossaryModule] = useState("");
  const [selectedGlossaryMaterial, setSelectedGlossaryMaterial] = useState("");
  // Add Term Form
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [newTermName, setNewTermName] = useState("");
  const [newTermDesc, setNewTermDesc] = useState("");

  // Student specific explain lookups
  const [explainPhrase, setExplainPhrase] = useState("");
  const [explainingResult, setExplainingResult] = useState("");
  const [explainingLoading, setExplainingLoading] = useState(false);

  // Practice session states
  const [selectedPracticeModules, setSelectedPracticeModules] = useState<string[]>([]);
  const [selectedPracticeMaterials, setSelectedPracticeMaterials] = useState<string[]>([]);
  const [selectedPracticeFormats, setSelectedPracticeFormats] = useState<string[]>(["quizzes", "flashcards"]);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceData, setPracticeData] = useState<any>(null);
  const [practiceActiveFormatTab, setPracticeActiveFormatTab] = useState<string>("quizzes");

  // User interactive play states
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});
  const [flashcardFlipped, setFlashcardFlipped] = useState<Record<number, boolean>>({});
  const [jeopardyRevealed, setJeopardyRevealed] = useState<Record<number, boolean>>({});
  const [problemSetsRevealed, setProblemSetsRevealed] = useState<Record<number, boolean>>({});
  const [spacedRepetitionSelfGraded, setSpacedRepetitionSelfGraded] = useState<Record<number, string>>({});

  // Initialize summary & practice selections
  useEffect(() => {
    if (courseModules.length > 0) {
      if (selectedSummaryModules.length === 0) {
        setSelectedSummaryModules([courseModules[0]._id]);
      }
      if (selectedPracticeModules.length === 0) {
        setSelectedPracticeModules([courseModules[0]._id]);
      }
    }
    if (courseModules.length > 0 && !selectedGlossaryModule) {
      setSelectedGlossaryModule(courseModules[0]._id);
      if (courseModules[0].materials?.length > 0) {
        setSelectedGlossaryMaterial(courseModules[0].materials[0]._id);
      }
    }
  }, [courseModules]);

  const handleTogglePracticeModule = (mId: string) => {
    setSelectedPracticeModules((prev) => {
      const isChecked = prev.includes(mId);
      let next;
      if (isChecked) {
        next = prev.filter((id) => id !== mId);
      } else {
        next = [...prev, mId];
      }
      // Clean materials that belong to still-selected modules only
      setSelectedPracticeMaterials((prevMats) => {
        return prevMats.filter((matId) => {
          let belongs = false;
          courseModules.forEach((m) => {
            if (next.includes(m._id)) {
              if ((m.materials || []).some((x: any) => x._id === matId)) {
                belongs = true;
              }
            }
          });
          return belongs;
        });
      });
      return next;
    });
  };

  const handleTogglePracticeMaterial = (matId: string) => {
    setSelectedPracticeMaterials((prev) => {
      if (prev.includes(matId)) {
        return prev.filter((id) => id !== matId);
      } else {
        return [...prev, matId];
      }
    });
  };

  const handleTogglePracticeFormat = (fmt: string) => {
    setSelectedPracticeFormats((prev) => {
      if (prev.includes(fmt)) {
        return prev.filter((f) => f !== fmt);
      } else {
        return [...prev, fmt];
      }
    });
  };

  const handleGeneratePracticePack = async () => {
    if (selectedPracticeModules.length === 0) {
      setErrorMsg("Please select at least one syllabus module for practice.");
      return;
    }
    if (selectedPracticeFormats.length === 0) {
      setErrorMsg("Please select at least one practice format (e.g., Quizzes, Flashcards).");
      return;
    }

    setPracticeLoading(true);
    setErrorMsg("");
    setPracticeData(null);
    setQuizAnswers({});
    setQuizSubmitted({});
    setFlashcardFlipped({});
    setJeopardyRevealed({});
    setProblemSetsRevealed({});
    setSpacedRepetitionSelfGraded({});

    try {
      const res = await fetch("/api/gemini/practice-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          courseSlug,
          moduleIds: selectedPracticeModules,
          materialIds: selectedPracticeMaterials,
          formats: selectedPracticeFormats
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate practice pack.");
      }

      setPracticeData(data.practice || {});
      const formatsWithData = Object.keys(data.practice || {}).filter(
        k => Array.isArray(data.practice[k]) && data.practice[k].length > 0
      );
      if (formatsWithData.length > 0) {
        setPracticeActiveFormatTab(formatsWithData[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while generating diagnostic practice elements.");
    } finally {
      setPracticeLoading(false);
    }
  };

  // Fetch glossary when scope/filters change
  const fetchGlossary = async () => {
    if (!courseSlug) return;
    setGlossaryLoading(true);
    try {
      let url = `/api/courses/${courseSlug}/glossary`;
      const params = [];
      if (glossaryScope === "module" && selectedGlossaryModule) {
        params.push(`moduleId=${selectedGlossaryModule}`);
      } else if (glossaryScope === "material" && selectedGlossaryMaterial) {
        params.push(`materialId=${selectedGlossaryMaterial}`);
      }
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setGlossary(data.glossary || []);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setGlossaryLoading(false);
    }
  };

  useEffect(() => {
    if (activeSidekickTab === "glossary") {
      fetchGlossary();
    }
  }, [activeSidekickTab, glossaryScope, selectedGlossaryModule, selectedGlossaryMaterial, courseSlug]);

  const handleAddGlossaryTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTermName.trim() || !newTermDesc.trim() || !courseSlug) return;

    try {
      const res = await fetch(`/api/courses/${courseSlug}/glossary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          term: newTermName.trim(),
          description: newTermDesc.trim(),
          moduleId: glossaryScope === "module" ? selectedGlossaryModule : (glossaryScope === "material" ? selectedGlossaryModule : ""),
          materialId: glossaryScope === "material" ? selectedGlossaryMaterial : ""
        }),
      });

      if (res.ok) {
        setNewTermName("");
        setNewTermDesc("");
        setIsAddingTerm(false);
        fetchGlossary();
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleExplainConcept = async () => {
    if (!explainPhrase.trim() || !courseSlug) return;
    setExplainingLoading(true);
    setExplainingResult("");
    try {
      let contextText = "";
      if (activeMaterial) {
        contextText = activeMaterial.text || "";
      } else if (courseModules.length > 0) {
        // join texts of first module's documents as grounding layout
        contextText = (courseModules[0].materials || []).map((m: any) => `${m.title}: ${m.text || ""}`).join("\n\n");
      }

      const res = await fetch(`/api/courses/${courseSlug}/glossary/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          phrase: explainPhrase,
          contextText
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setExplainingResult(data.result || "No custom terminology guide found.");
      } else {
        setExplainingResult("Failed to retrieve custom explanation.");
      }
    } catch(err) {
      setExplainingResult("Check your connection to W2M academic agent services.");
    } finally {
      setExplainingLoading(false);
    }
  };

  const handleToggleSummaryModule = (mId: string) => {
    setSelectedSummaryModules((prev) => {
      const isChecked = prev.includes(mId);
      let next;
      if (isChecked) {
        next = prev.filter((id) => id !== mId);
      } else {
        next = [...prev, mId];
      }
      // Keep only materials that belong to still-selected modules
      setSelectedSummaryMaterials((prevMats) => {
        return prevMats.filter((matId) => {
          let belongs = false;
          courseModules.forEach((m) => {
            if (next.includes(m._id)) {
              if ((m.materials || []).some((x: any) => x._id === matId)) {
                belongs = true;
              }
            }
          });
          return belongs;
        });
      });
      return next;
    });
  };

  const handleToggleSummaryMaterial = (matId: string) => {
    setSelectedSummaryMaterials((prev) => {
      if (prev.includes(matId)) {
        return prev.filter((id) => id !== matId);
      } else {
        return [...prev, matId];
      }
    });
  };

  const handleAssist = async (actionOverride?: "summarize" | "translate" | "hint") => {
    const action = actionOverride || (activeSidekickTab === "glossary" ? "summarize" : activeSidekickTab);
    setErrorMsg("");
    setResult("");
    setLoading(true);

    let contentToProcess = inputText.trim();

    // Context content assembly based on multi-choice selections
    if (!contentToProcess) {
      if (action === "summarize") {
        let combinedText = "";
        if (selectedSummaryModules.length > 0) {
          selectedSummaryModules.forEach((mId) => {
            const mod = courseModules.find((m) => m._id === mId);
            if (mod) {
              combinedText += `=== MODULE: ${mod.title} ===\n`;
              const mats = mod.materials || [];
              mats.forEach((mat: any) => {
                if (selectedSummaryMaterials.length === 0 || selectedSummaryMaterials.includes(mat._id)) {
                  combinedText += `Document: ${mat.title}\nContent:\n${mat.text || ""}\n\n`;
                }
              });
            }
          });
        }
        if (!combinedText && activeMaterial) {
          combinedText = activeMaterial.text || `Document Title: ${activeMaterial.title}`;
        }
        contentToProcess = combinedText;
      } else if (action === "translate") {
        if (translateSourceType === "material" && selectedTranslateMaterial) {
          let foundMat: any = null;
          courseModules.forEach((m) => {
            const mat = (m.materials || []).find((x: any) => x._id === selectedTranslateMaterial);
            if (mat) foundMat = mat;
          });
          if (foundMat) {
            contentToProcess = foundMat.text || foundMat.title;
          }
        } else if (translateSourceType === "summary" && result) {
          contentToProcess = result;
        } else if (activeMaterial) {
          contentToProcess = activeMaterial.text || activeMaterial.title;
        }
      } else if (action === "hint" && selectedQuestionText) {
        contentToProcess = selectedQuestionText;
      }
    }

    if (!contentToProcess) {
      setErrorMsg("Please select modules/materials or write text for Gemini to analyze.");
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        action,
        content: contentToProcess,
        language: action === "translate" ? selectedLanguage : undefined,
      };

      if (action === "hint" && activeAssignment) {
        payload.assignmentId = activeAssignment._id;
      }

      const res = await fetch("/api/gemini/assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gemini execution failed");
      }

      setResult(data.result || "No guidance returned.");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  const isAiDisabledForAssignment = activeAssignment && !activeAssignment.allowAi;

  return (
    <div className="bg-stone-900 border border-stone-850 p-6 text-stone-100 font-sans shadow-2xl rounded-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-850">
        <div className="flex items-center gap-2">
          <div className="p-1 px-2 text-[10px] font-mono tracking-wider font-extrabold bg-[#bef264] text-stone-950 rounded-sm">
            GEMINI-3.5
          </div>
          <h4 className="text-sm font-bold tracking-tight uppercase flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#bef264]" />
            AI Sidekick Workspace
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1 mb-6 bg-stone-950 p-1 border border-stone-850 rounded-sm">
        <button
          onClick={() => {
            setActiveSidekickTab("summarize");
            setInputText("");
            setResult("");
          }}
          className={`flex flex-col items-center gap-1 py-3 text-[10px] uppercase font-mono tracking-wider transition-colors rounded-sm cursor-pointer ${
            activeSidekickTab === "summarize" ? "bg-stone-800 text-white font-bold" : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Summary
        </button>

        <button
          onClick={() => {
            setActiveSidekickTab("translate");
            setInputText("");
            setResult("");
          }}
          className={`flex flex-col items-center gap-1 py-3 text-[10px] uppercase font-mono tracking-wider transition-colors rounded-sm cursor-pointer ${
            activeSidekickTab === "translate" ? "bg-stone-800 text-white font-bold" : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Languages className="w-4 h-4" />
          Translate
        </button>

        <button
          onClick={() => {
            setActiveSidekickTab("glossary");
            setInputText("");
            setResult("");
          }}
          className={`flex flex-col items-center gap-1 py-3 text-[10px] uppercase font-mono tracking-wider transition-colors rounded-sm cursor-pointer ${
            activeSidekickTab === "glossary" ? "bg-stone-800 text-white font-bold" : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Glossary
        </button>

        <button
          onClick={() => {
            setActiveSidekickTab("practice");
            setInputText("");
            setResult("");
          }}
          className={`flex flex-col items-center gap-1 py-3 text-[10px] uppercase font-mono tracking-wider transition-colors rounded-sm cursor-pointer ${
            activeSidekickTab === "practice" ? "bg-stone-800 text-white font-bold" : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#bef264]" />
          Practice
        </button>

        <button
          onClick={() => {
            setActiveSidekickTab("hint");
            setInputText("");
            setResult("");
          }}
          className={`flex flex-col items-center gap-1 py-3 text-[10px] uppercase font-mono tracking-wider transition-colors rounded-sm relative cursor-pointer ${
            activeSidekickTab === "hint" ? "bg-stone-800 text-white font-bold" : "text-stone-400 hover:text-stone-200"
          }`}
        >
          {isAiDisabledForAssignment && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-[8px] px-1 font-sans rounded-full text-white font-bold">
              LOCKED
            </span>
          )}
          <HelpCircle className="w-4 h-4" />
          Hints
        </button>
      </div>

      <div className="space-y-4">
        {/* SUMMARIZE TAB - Supports Multiple Modules + Materials selection */}
        {activeSidekickTab === "summarize" && (
          <div className="space-y-3 bg-stone-950/60 p-4 border border-stone-850 rounded-sm">
            <span className="font-mono text-[9px] text-[#bef264] uppercase block font-black">
              Dynamic Summary Hub - Scope Selectors
            </span>
            <p className="text-[10px] text-stone-400 font-mono">
              Select multiple modules or course documents to synthesize. If none are selected, it highlights the active reading document.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-mono text-stone-300 block mb-1 font-bold">
                  Syllabus Modules (Multi)
                </label>
                <div className="h-24 overflow-y-auto bg-stone-900 border border-stone-800 p-1.5 text-[9px] font-mono space-y-1 rounded-sm">
                  {courseModules.map((m) => (
                    <label key={m._id} className="flex items-start gap-1 py-0.5 hover:bg-stone-800 cursor-pointer text-stone-300 select-none">
                      <input
                        type="checkbox"
                        checked={selectedSummaryModules.includes(m._id)}
                        onChange={() => handleToggleSummaryModule(m._id)}
                        className="mt-0.5 h-3 w-3 accent-[#bef264]"
                      />
                      <span className="line-clamp-1">{m.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-mono text-stone-300 block mb-1 font-bold">
                  Scribbles / Study Documents (Multi)
                </label>
                <div className="h-24 overflow-y-auto bg-stone-900 border border-stone-800 p-1.5 text-[9px] font-mono space-y-1 rounded-sm">
                  {courseModules
                    .filter((m) => selectedSummaryModules.includes(m._id))
                    .map((m) => {
                      const mats = m.materials || [];
                      if (mats.length === 0) return null;
                      return (
                        <div key={m._id} className="border-t border-stone-800/60 pt-1 first:border-0 first:pt-0">
                          <span className="text-[8px] text-[#bef264] font-bold block mb-0.5 uppercase tracking-wide opacity-80">{m.title}</span>
                          {mats.map((mat: any) => (
                            <label key={mat._id} className="flex items-start gap-1 py-0.5 hover:bg-stone-800 cursor-pointer text-stone-300 select-none">
                              <input
                                type="checkbox"
                                checked={selectedSummaryMaterials.includes(mat._id)}
                                onChange={() => handleToggleSummaryMaterial(mat._id)}
                                className="mt-0.5 h-3 w-3 accent-[#bef264]"
                              />
                              <span className="line-clamp-1">{mat.title}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  {selectedSummaryModules.length === 0 && (
                    <div className="text-[9px] text-stone-500 italic p-2 text-center">Select Syllabus Modules first.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TRANSLATE TAB - Supports Material and current Summary translations */}
        {activeSidekickTab === "translate" && (
          <div className="space-y-3 bg-stone-950/60 p-4 border border-stone-850 rounded-sm">
            <span className="font-mono text-[9px] text-[#bef264] uppercase block font-black">
              Translation Grounding Settings
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
              <div>
                <label className="text-[9px] font-mono text-stone-300 block mb-1 font-bold">Source Element</label>
                <select
                  value={translateSourceType}
                  onChange={(e) => setTranslateSourceType(e.target.value as any)}
                  className="w-full bg-stone-900 border border-stone-800 text-[10px] font-mono py-1.5 px-2 text-stone-300 focus:outline-none focus:border-[#bef264] rounded-sm"
                >
                  <option value="custom">Custom typed text</option>
                  <option value="material">Specific course document</option>
                  <option value="summary">Current summary text buffer</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-mono text-stone-300 block mb-1 font-bold">Regional Target Dialect</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 text-[10px] font-mono py-1.5 px-2 text-stone-300 focus:outline-none focus:border-[#bef264] rounded-sm"
                >
                  {SCHEDULED_LANGUAGES.map((l) => (
                    <option key={l.name} value={l.name}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {translateSourceType === "material" && (
              <div>
                <label className="text-[9px] font-mono text-stone-400 block mb-1">Select Document to Translate</label>
                <select
                  value={selectedTranslateMaterial}
                  onChange={(e) => setSelectedTranslateMaterial(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 text-[10px] font-mono py-1 px-2 text-stone-300 focus:outline-none focus:border-[#bef264] rounded-sm"
                >
                  <option value="">-- Choose document --</option>
                  {courseModules.map((m) => (
                    <optgroup key={m._id} label={m.title} className="text-stone-400 bg-stone-950">
                      {(m.materials || []).map((mat: any) => (
                        <option key={mat._id} value={mat._id} className="text-stone-300 bg-stone-900">
                          {mat.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {translateSourceType === "summary" && !result && (
              <p className="text-[9px] text-amber-500 font-mono italic">
                ⚠️ Summary element currently blank. Generate a summary first or use typed custom text.
              </p>
            )}
          </div>
        )}

        {/* GLOSSARY TAB - Terminology & custom explain Lookups */}
        {activeSidekickTab === "glossary" && (
          <div className="space-y-4">
            {/* Filter scope for terminology definitions */}
            <div className="bg-stone-950/60 p-4 border border-stone-850 rounded-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-[#bef264] uppercase font-black">
                  Academic Glossary filter scope
                </span>

                <button
                  type="button"
                  onClick={() => setIsAddingTerm(!isAddingTerm)}
                  className="bg-[#bef264] text-stone-950 px-2 py-0.5 text-[9px] font-mono font-black uppercase rounded-sm hover:bg-[#a6d852] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Terminology
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1 bg-stone-900 p-0.5 border border-stone-800 rounded-sm">
                <button
                  type="button"
                  onClick={() => setGlossaryScope("course")}
                  className={`py-1.5 text-[9px] font-mono uppercase rounded-sm cursor-pointer ${glossaryScope === "course" ? "bg-stone-800 text-white font-bold" : "text-stone-400 hover:text-stone-200"}`}
                >
                  Whole course
                </button>
                <button
                  type="button"
                  onClick={() => setGlossaryScope("module")}
                  className={`py-1.5 text-[9px] font-mono uppercase rounded-sm cursor-pointer ${glossaryScope === "module" ? "bg-stone-800 text-white font-bold" : "text-stone-400 hover:text-stone-200"}`}
                >
                  Module level
                </button>
                <button
                  type="button"
                  onClick={() => setGlossaryScope("material")}
                  className={`py-1.5 text-[9px] font-mono uppercase rounded-sm cursor-pointer ${glossaryScope === "material" ? "bg-stone-800 text-white font-bold" : "text-stone-400 hover:text-stone-200"}`}
                >
                  Material level
                </button>
              </div>

              {glossaryScope === "module" && (
                <div>
                  <label className="text-[8px] font-mono text-stone-400 block mb-0.5 uppercase font-bold">Target Module</label>
                  <select
                    value={selectedGlossaryModule}
                    onChange={(e) => setSelectedGlossaryModule(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 text-[10px] font-mono py-1 px-1.5 text-stone-300 focus:outline-none rounded-sm"
                  >
                    {courseModules.map((m) => (
                      <option key={m._id} value={m._id}>{m.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {glossaryScope === "material" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] font-mono text-stone-400 block mb-0.5 uppercase font-bold">Syllabus Module</label>
                    <select
                      value={selectedGlossaryModule}
                      onChange={(e) => {
                        setSelectedGlossaryModule(e.target.value);
                        const mod = courseModules.find(m => m._id === e.target.value);
                        if (mod?.materials?.length > 0) {
                          setSelectedGlossaryMaterial(mod.materials[0]._id);
                        } else {
                          setSelectedGlossaryMaterial("");
                        }
                      }}
                      className="w-full bg-stone-900 border border-stone-800 text-[10px] font-mono py-1 px-1.5 text-stone-300 focus:outline-none rounded-sm"
                    >
                      {courseModules.map((m) => (
                        <option key={m._id} value={m._id}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-mono text-stone-400 block mb-0.5 uppercase font-bold">Target Document</label>
                    <select
                      value={selectedGlossaryMaterial}
                      onChange={(e) => setSelectedGlossaryMaterial(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 text-[10px] font-mono py-1 px-1.5 text-stone-300 focus:outline-none rounded-sm"
                    >
                      <option value="">-- Choose document --</option>
                      {(courseModules.find(m => m._id === selectedGlossaryModule)?.materials || []).map((mat: any) => (
                        <option key={mat._id} value={mat._id}>{mat.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Display Term Add Form is toggled */}
            <AnimatePresence>
              {isAddingTerm && (
                <motion.form
                  onSubmit={handleAddGlossaryTerm}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-stone-950 border border-stone-800 p-4 space-y-3 rounded-sm overflow-hidden"
                >
                  <span className="font-mono text-[9px] text-[#bef264] uppercase block font-black">
                    Formulate New Glossary Entry ({glossaryScope} level)
                  </span>
                  <div>
                    <label className="text-[8px] font-mono text-stone-400 uppercase block font-bold mb-1">Keywords / Concept Word</label>
                    <input
                      type="text"
                      required
                      value={newTermName}
                      onChange={(e) => setNewTermName(e.target.value)}
                      placeholder="e.g. Alveolar-velar consonants, Leipzig rules..."
                      className="w-full bg-stone-900 border border-stone-800 p-2 text-xs text-stone-100 placeholder-stone-600 focus:ring-1 focus:ring-[#bef264] focus:outline-none font-mono rounded-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-mono text-stone-400 uppercase block font-bold mb-1">Definition description</label>
                    <textarea
                      required
                      rows={2}
                      value={newTermDesc}
                      onChange={(e) => setNewTermDesc(e.target.value)}
                      placeholder="Brief description of the terminology..."
                      className="w-full bg-stone-900 border border-stone-800 p-2 text-xs text-stone-100 placeholder-stone-600 focus:ring-1 focus:ring-[#bef264] focus:outline-none font-sans rounded-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1 border-t border-stone-800/40">
                    <button
                      type="button"
                      onClick={() => setIsAddingTerm(false)}
                      className="text-[9px] text-stone-400 hover:text-stone-200 font-mono uppercase bg-stone-900 px-3 py-1 border border-stone-800 rounded-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-[9px] text-stone-950 hover:bg-[#a6d852] font-mono font-black uppercase bg-[#bef264] px-3 py-1 rounded-sm cursor-pointer"
                    >
                      Save Terminology
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Glossary definitions display container */}
            <div className="bg-stone-950 border border-stone-850 p-4 rounded-sm space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800/60 pb-1.5">
                <span className="font-mono text-[9px] text-stone-400 uppercase font-black">
                  Glossary database ({glossary.length} entries)
                </span>
                {glossaryLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-500" />}
              </div>

              {glossary.length === 0 ? (
                <p className="text-[10px] text-stone-500 font-mono italic text-center py-4">
                  No vocabulary registered. Click "+ Terminology" to add definitions or ask Gemini.
                </p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {glossary.map((g, idx) => (
                    <div key={g._id || idx} className="p-2.5 bg-stone-900 border border-stone-850 hover:border-stone-800 rounded-sm">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[11px] font-bold font-mono text-[#bef264]">{g.term}</span>
                        <span className="text-[8px] font-mono text-stone-500 bg-stone-950 px-1 rounded-sm">by {g.createdBy}</span>
                      </div>
                      <p className="text-[10px] text-stone-300 leading-normal font-sans">{g.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Student terminology lookup & explanation console */}
            <div className="bg-[#bef264]/5 border border-[#bef264]/25 p-4 rounded-sm space-y-3">
              <span className="font-mono text-[9px] text-[#bef264] uppercase block font-black flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#bef264]" />
                Interactive Linguistic Tutorial Agent
              </span>
              <p className="text-[10px] text-stone-400 leading-tight block">
                Students: Enter any word, phoneme, phrase, or language aspect to explain it immediately within the context of your study modules.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask explanation of a phrase..."
                  value={explainPhrase}
                  onChange={(e) => setExplainPhrase(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 p-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-[#bef264] font-mono rounded-sm"
                />
                <button
                  type="button"
                  disabled={explainingLoading || !explainPhrase.trim()}
                  onClick={handleExplainConcept}
                  className="bg-stone-950 text-[#bef264] hover:bg-stone-900 px-3 text-[10px] font-mono font-black border border-[#bef264] uppercase rounded-sm flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  {explainingLoading ? <Loader2 className="w-3 h-3 animate-spin text-[#bef264]" /> : "Explain"}
                </button>
              </div>

              {explainingResult && (
                <div className="p-3 bg-stone-950 border border-stone-800 text-[10px] text-stone-300 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar font-sans text-left leading-relaxed whitespace-pre-wrap rounded-sm">
                  <div className="text-[8px] font-mono uppercase bg-stone-900 p-1 font-bold text-stone-400 mb-1 border-b border-stone-850">Linguistic Tutor explanation:</div>
                  {explainingResult}
                </div>
              )}
            </div>
          </div>
        )}

        {/* INTERACTIVE GAMIFIED PRACTICE TAB */}
        {activeSidekickTab === "practice" && (
          <div className="space-y-4">
            {/* Filter Selection Panel */}
            <div className="bg-stone-950/60 p-4 border border-stone-850 rounded-sm space-y-3">
              <span className="font-mono text-[9px] text-[#bef264] uppercase block font-black">
                Practice Deck setup & curation
              </span>
              <p className="text-[10px] text-stone-400 font-mono">
                Deconstruct selected course documents into interactive gamified study items. Choose your formats below.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-mono text-stone-300 block mb-1 font-bold uppercase">
                    1. Study Modules (Multi)
                  </label>
                  <div className="h-28 overflow-y-auto bg-stone-900 border border-stone-800 p-1.5 text-[9px] font-mono space-y-1 rounded-sm">
                    {courseModules.map((m) => (
                      <label key={m._id} className="flex items-start gap-1 py-0.5 hover:bg-stone-800 cursor-pointer text-stone-300 select-none">
                        <input
                          type="checkbox"
                          checked={selectedPracticeModules.includes(m._id)}
                          onChange={() => handleTogglePracticeModule(m._id)}
                          className="mt-0.5 h-3 w-3 accent-[#bef264]"
                        />
                        <span className="line-clamp-1">{m.title}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-mono text-stone-300 block mb-1 font-bold uppercase">
                    2. Study Documents (Multi)
                  </label>
                  <div className="h-28 overflow-y-auto bg-stone-900 border border-stone-800 p-1.5 text-[9px] font-mono space-y-1 rounded-sm font-sans transition-all">
                    {courseModules
                      .filter((m) => selectedPracticeModules.includes(m._id))
                      .map((m) => {
                        const mats = m.materials || [];
                        if (mats.length === 0) return null;
                        return (
                          <div key={m._id} className="border-t border-stone-800/60 pt-1 first:border-0 first:pt-0">
                            <span className="text-[8px] text-[#bef264] font-bold block mb-0.5 uppercase tracking-wide opacity-80">{m.title}</span>
                            {mats.map((mat: any) => (
                              <label key={mat._id} className="flex items-start gap-1 py-0.5 hover:bg-stone-800 cursor-pointer text-stone-300 select-none font-mono">
                                <input
                                  type="checkbox"
                                  checked={selectedPracticeMaterials.includes(mat._id)}
                                  onChange={() => handleTogglePracticeMaterial(mat._id)}
                                  className="mt-0.5 h-3 w-3 accent-[#bef264]"
                                />
                                <span className="line-clamp-1">{mat.title}</span>
                              </label>
                            ))}
                          </div>
                        );
                      })}
                    {selectedPracticeModules.length === 0 && (
                      <div className="text-[9px] text-stone-500 italic p-2 text-center">Select Syllabus Modules first.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Format selection selectors */}
              <div>
                <label className="text-[9px] font-mono text-stone-300 block mb-1 font-bold uppercase">
                  3. Select Gamified Practice Formats
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { id: "quizzes", label: "📝 MCQ Quizzes" },
                    { id: "flashcards", label: "🎴 Flashcards" },
                    { id: "jeopardy", label: "🏆 Jeopardy Board" },
                    { id: "problemSets", label: "📐 Problem Sets" },
                    { id: "spacedRepetition", label: "🔄 Spaced Repet." },
                    { id: "quickRecall", label: "⚡ Quick Recall" }
                  ].map((fmt) => {
                    const isSelected = selectedPracticeFormats.includes(fmt.id);
                    return (
                      <button
                        type="button"
                        key={fmt.id}
                        onClick={() => handleTogglePracticeFormat(fmt.id)}
                        className={`py-2 px-1.5 text-[9px] font-mono rounded-sm text-left flex items-center justify-between border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-stone-800 border-[#bef264] text-[#bef264] font-bold"
                            : "bg-stone-900/50 border-stone-800 text-stone-400 hover:text-stone-300 hover:border-stone-700"
                        }`}
                      >
                        <span>{fmt.label}</span>
                        {isSelected && <span className="font-sans text-[8px] text-[#bef264]">✔</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate button */}
              <button
                type="button"
                onClick={handleGeneratePracticePack}
                disabled={practiceLoading}
                className="w-full bg-[#bef264] hover:bg-[#a6d852] disabled:bg-stone-800 text-stone-950 disabled:text-stone-500 font-mono text-xs uppercase py-3 font-extrabold tracking-wider flex items-center justify-center gap-2 transition-colors duration-150 border border-stone-900 rounded-sm cursor-pointer"
              >
                {practiceLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                    Generating Study Deck...
                  </>
                ) : (
                  <>
                    🎮 Compose Practice Deck
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* ERROR DISPLAY */}
            {errorMsg && (
              <div className="p-3 bg-red-950/30 border border-red-900 text-red-400 text-xs font-mono rounded-sm">
                {errorMsg}
              </div>
            )}

            {/* DECKS DISPLAY AREA */}
            {practiceData && (
              <div className="bg-stone-950 border border-stone-850 p-4 rounded-sm space-y-4">
                {/* Fallback watermark to reassure run stability */}
                {practiceData.fallback && (
                  <div className="bg-lime-950/20 border border-lime-800/40 p-2.5 text-[10px] text-lime-400 font-mono rounded-sm">
                    💡 Loaded professional syllabus study presets (Model key is not set, offline presets enabled)
                  </div>
                )}

                {/* Tab layout of formats generated */}
                <div className="flex flex-wrap gap-1 border-b border-stone-800 pb-2">
                  {Object.keys(practiceData)
                    .filter((key) => Array.isArray(practiceData[key]) && practiceData[key].length > 0)
                    .map((key) => {
                      const label = {
                        quizzes: "📝 Quizzes",
                        flashcards: "🎴 Flashcards",
                        jeopardy: "🏆 Jeopardy",
                        problemSets: "📐 Problem Sets",
                        spacedRepetition: "🔄 Spaced Repet.",
                        quickRecall: "⚡ Quick Recall"
                      }[key] || key;

                      const isSelected = practiceActiveFormatTab === key;
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setPracticeActiveFormatTab(key)}
                          className={`py-1 px-2.5 text-[9px] font-mono uppercase tracking-tight rounded-sm border cursor-pointer ${
                            isSelected
                              ? "bg-[#bef264] text-stone-950 border-[#bef264] font-black shadow-sm bg-opacity-100"
                              : "bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200"
                          }`}
                        >
                          {label} ({practiceData[key].length})
                        </button>
                      );
                    })}
                </div>

                {/* GAME WORKBENCH CONTENT VIEW */}
                <div className="space-y-4">
                  {/* MC QUIZ RENDER */}
                  {practiceActiveFormatTab === "quizzes" && (
                    <div className="space-y-4">
                      {/* Interactive Score Header */}
                      <div className="flex justify-between items-center bg-stone-900 p-2.5 border border-stone-850 rounded-sm font-mono text-[10px]">
                        <span className="text-[#bef264] font-bold">🎯 GAMIFIED PRACTICE SESSION</span>
                        <span className="bg-stone-950 p-1 px-2 text-stone-200 rounded-sm">
                          🏆 Score: {Object.values(quizAnswers).filter((ans, idx) => {
                            const q = practiceData.quizzes?.[idx];
                            return q && ans === q.correctAnswer && quizSubmitted[idx];
                          }).length} / {Object.keys(quizSubmitted).length} Submissions
                        </span>
                      </div>

                      <div className="space-y-3">
                        {practiceData.quizzes?.map((item: any, qIdx: number) => {
                          const isSubmitted = !!quizSubmitted[qIdx];
                          const selectedVal = quizAnswers[qIdx] || "";
                          const isCorrect = selectedVal === item.correctAnswer;

                          return (
                            <div key={qIdx} className="p-3 bg-stone-900 border border-stone-850 rounded-sm space-y-2.5">
                              <span className="font-mono text-[9px] text-[#bef264]/70">QUESTION #{qIdx + 1}</span>
                              <p className="text-[11px] leading-relaxed font-bold text-stone-100">{item.question}</p>
                              
                              <div className="grid grid-cols-1 gap-1.5 pt-1 font-sans">
                                {item.options?.map((opt: string, oIdx: number) => {
                                  const optLetter = ["A", "B", "C", "D"][oIdx] || "•";
                                  const isCurrentSel = selectedVal === opt;
                                  
                                  let optStyle = "bg-stone-955 border-stone-800 text-stone-300 hover:border-stone-700";
                                  if (isCurrentSel) {
                                    optStyle = "bg-stone-800 border-[#bef264] text-[#bef264] font-semibold";
                                  }
                                  if (isSubmitted) {
                                    if (opt === item.correctAnswer) {
                                      optStyle = "bg-green-950/60 border-green-700 text-green-300 font-bold";
                                    } else if (isCurrentSel && !isCorrect) {
                                      optStyle = "bg-red-950/60 border-red-800 text-red-300 line-through";
                                    } else {
                                      optStyle = "opacity-40 bg-stone-900/10 border-stone-850 text-stone-500 scale-95";
                                    }
                                  }

                                  return (
                                    <button
                                      type="button"
                                      key={oIdx}
                                      disabled={isSubmitted}
                                      onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: opt }))}
                                      className={`p-2.5 text-left text-[11px] rounded-sm border transition-all flex items-start gap-2 ${optStyle} ${!isSubmitted ? 'cursor-pointer hover:bg-stone-800/40' : ''}`}
                                    >
                                      <span className="font-mono text-[9px] bg-stone-950 px-1.5 py-0.5 rounded-sm shrink-0">{optLetter}</span>
                                      <span className="leading-tight">{opt}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="flex justify-between items-center pt-2 border-t border-stone-800/40">
                                {isSubmitted ? (
                                  <div className="w-full space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      {isCorrect ? (
                                        <span className="text-green-400 font-mono text-[10px] uppercase font-black">🎉 CORRECT (+10 XP)</span>
                                      ) : (
                                        <span className="text-red-400 font-mono text-[10px] uppercase font-black">❌ INCORRECT (QUIZ RESPONSE)</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-stone-400 font-sans italic bg-stone-950 p-2 rounded-sm leading-normal border border-stone-900">
                                      {item.explanation || "Correct response validated."}
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-[9px] text-stone-500 italic">Select option & lock below</span>
                                    <button
                                      type="button"
                                      disabled={!selectedVal}
                                      onClick={() => setQuizSubmitted(prev => ({ ...prev, [qIdx]: true }))}
                                      className="bg-stone-800 hover:bg-stone-700 disabled:opacity-40 px-3 py-1 text-[9px] font-mono uppercase font-bold text-[#bef264] border border-stone-700 rounded-sm cursor-pointer"
                                    >
                                      🔒 Lock Answer
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* FLASHCARDS GAME RENDER */}
                  {practiceActiveFormatTab === "flashcards" && (
                    <div className="space-y-4">
                      <p className="text-[10px] text-stone-400 font-mono italic text-center">
                        🎴 Click a card to flip face and reveal explanation. Gamify by grading yourself!
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {practiceData.flashcards?.map((card: any, fIdx: number) => {
                          const isFlipped = !!flashcardFlipped[fIdx];
                          return (
                            <div
                              key={fIdx}
                              onClick={() => setFlashcardFlipped(prev => ({ ...prev, [fIdx]: !isFlipped }))}
                              className="relative h-44 cursor-pointer perspective-300"
                            >
                              <div className={`w-full h-full text-center p-4 border rounded-sm transition-all duration-300 flex flex-col justify-between ${
                                isFlipped
                                  ? "bg-stone-950 border-[#bef264] text-stone-100"
                                  : "bg-stone-900 border-stone-800 text-[#bef264] hover:border-stone-700"
                              }`}>
                                <div className="flex justify-between items-center font-mono text-[8px] opacity-70 border-b border-stone-800 pb-1">
                                  <span>FLASHCARD #{fIdx + 1}</span>
                                  <span>{isFlipped ? "📖 BACK PANEL" : "🎴 FRONT SIDE"}</span>
                                </div>

                                <div className="my-auto py-2">
                                  {isFlipped ? (
                                    <div className="space-y-1 text-left">
                                      <p className="text-[11px] leading-relaxed text-stone-200 font-sans">{card.back}</p>
                                    </div>
                                  ) : (
                                    <h5 className="text-xs font-bold leading-normal text-stone-100 font-mono">{card.front}</h5>
                                  )}
                                </div>

                                <div className="font-mono text-[8px] pt-1.5 border-t border-stone-800">
                                  {isFlipped ? (
                                    <span className="text-[#bef264] uppercase font-bold">Click card to Flip back</span>
                                  ) : (
                                    <span className="text-stone-400">💡 Hint: <span className="text-stone-300 font-sans">{card.hint || "Activate recall"}</span></span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* JEOPARDY BOARD GAME RENDER */}
                  {practiceActiveFormatTab === "jeopardy" && (
                    <div className="space-y-4">
                      {/* Score metric bar */}
                      <div className="flex justify-between items-center bg-stone-900 p-2.5 border border-stone-800 rounded-sm font-mono text-[10px]">
                        <span className="text-amber-400 font-bold flex items-center gap-1">🏆 TRIVIA JEOPARDY BOARD</span>
                        <span className="bg-stone-955 p-1 px-3 text-[#bef264] font-black rounded-sm border border-[#bef264]/20 font-mono">
                          Wallet Balance: ${Object.keys(jeopardyRevealed).length * 100} Points
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {practiceData.jeopardy?.map((item: any, jIdx: number) => {
                          const isRevealed = !!jeopardyRevealed[jIdx];
                          return (
                            <div key={jIdx} className="bg-stone-900 border border-stone-800 p-3 flex flex-col justify-between gap-3 rounded-sm relative overflow-hidden transition-all">
                              <div className="flex justify-between items-center font-mono text-[8px] border-b border-stone-850 pb-1 text-stone-400">
                                <span className="uppercase font-bold text-[#bef264]">{item.category}</span>
                                <span className="bg-amber-950 text-amber-300 font-black px-1.5 py-0.5 rounded-sm">${item.value || 100}</span>
                              </div>

                              <div className="py-2 text-center">
                                <span className="font-mono text-[9px] text-stone-500 uppercase block mb-1">CLUE STATEMENT</span>
                                <p className="text-[11px] leading-relaxed text-stone-200 font-sans italic">"{item.clue}"</p>
                              </div>

                              <div className="space-y-2 pt-2 border-t border-stone-850">
                                {isRevealed ? (
                                  <div className="p-2 bg-stone-950 border border-amber-900/40 rounded-sm text-center">
                                    <span className="font-mono text-[8px] text-stone-400 block mb-0.5 uppercase">RESPONSE (MUST PHRASE AS QUESTION)</span>
                                    <span className="text-[11px] text-[#bef264] font-mono font-bold leading-tight">{item.answer}</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setJeopardyRevealed(prev => ({ ...prev, [jIdx]: true }))}
                                    className="w-full py-1.5 text-center font-mono text-[9px] uppercase font-black bg-stone-950 border border-stone-800 text-amber-300 hover:bg-stone-800 cursor-pointer rounded-sm"
                                  >
                                    🔔 Ringer: Reveal Answer
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PROBLEM SETS RENDER */}
                  {practiceActiveFormatTab === "problemSets" && (
                    <div className="space-y-3">
                      {practiceData.problemSets?.map((ps: any, pIdx: number) => {
                        const isExpanded = !!problemSetsRevealed[pIdx];
                        return (
                          <div key={pIdx} className="p-3.5 bg-stone-900 border border-stone-850 rounded-sm space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-[9px] text-[#bef264] uppercase font-bold">PROBLEM EXERCISE #{pIdx + 1}</span>
                              <button
                                type="button"
                                onClick={() => setProblemSetsRevealed(prev => ({ ...prev, [pIdx]: !isExpanded }))}
                                className="text-[9px] font-mono text-[#bef264] underline hover:text-[#a6d852] cursor-pointer"
                              >
                                {isExpanded ? "Collapse solution" : "Reveal Step-by-Step Solution"}
                              </button>
                            </div>

                            <p className="text-xs leading-relaxed text-stone-100 font-sans">{ps.problem}</p>

                            {isExpanded && (
                              <div className="p-3 bg-stone-950 border border-stone-800 rounded-sm space-y-2.5">
                                <div className="space-y-1">
                                  <span className="font-mono text-[8px] text-lime-400 block uppercase font-bold">Final Correct Reference:</span>
                                  <p className="text-xs text-stone-200 font-mono whitespace-pre-wrap">{ps.solution}</p>
                                </div>
                                <div className="border-t border-stone-800/60 pt-2 space-y-1.5">
                                  <span className="font-mono text-[8px] text-stone-400 block uppercase font-bold">Algorithmic Resolution Steps:</span>
                                  <div className="space-y-1.5">
                                    {ps.steps?.map((step: string, sIdx: number) => (
                                      <div key={sIdx} className="flex gap-2 items-start text-[11px] leading-relaxed text-stone-300">
                                        <span className="font-mono text-[#bef264] font-black shrink-0">{sIdx + 1}.</span>
                                        <p className="font-sans">{step}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SPACED REPETITION / ACTIVE RECALL RENDER */}
                  {practiceActiveFormatTab === "spacedRepetition" && (
                    <div className="space-y-3 font-mono">
                      <p className="text-[10px] text-stone-400 italic text-center">
                        🔄 Active recall improves mental paths. Rate how easy it was to retrieve.
                      </p>

                      <div className="space-y-3">
                        {practiceData.spacedRepetition?.map((sr: any, sIdx: number) => {
                          const selectedSelf = spacedRepetitionSelfGraded[sIdx] || "";
                          const isShowingCheck = selectedSelf !== "";

                          return (
                            <div key={sIdx} className="p-3 bg-stone-900 border border-stone-800 rounded-sm space-y-3">
                              <div className="flex justify-between items-baseline text-[8px] border-b border-stone-850 pb-1 text-stone-400">
                                <span className="uppercase font-bold text-[#bef264]">{sr.prompt}</span>
                                <span>REPT KEY #{sIdx + 1}</span>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[8px] text-stone-500 uppercase block">ACTIVE RECALL QUESTION</span>
                                <p className="text-xs leading-normal font-bold text-stone-200 font-sans">{sr.activeRecallQuestion}</p>
                                <span className="text-[10px] text-stone-500 italic">Category: {sr.details}</span>
                              </div>

                              <div className="pt-2 border-t border-stone-850 space-y-2.5">
                                {isShowingCheck ? (
                                  <div className="space-y-2">
                                    <div className="p-2 bg-stone-950 border border-stone-800 text-[11px] text-stone-300 rounded-sm leading-relaxed whitespace-pre-wrap font-sans">
                                      <span className="font-mono text-[8px] text-stone-400 block mb-1 uppercase font-bold">VERIFIED RESPONSE GUIDE:</span>
                                      {sr.responseGuide}
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-[9px]">
                                      <span className="text-stone-400">Recall rating:</span>
                                      <span className={`px-2 py-0.5 rounded-sm uppercase font-black tracking-wider ${
                                        selectedSelf === "easy" ? "bg-green-950 text-green-300" :
                                        selectedSelf === "medium" ? "bg-yellow-950 text-yellow-300" :
                                        "bg-red-950 text-red-300"
                                      }`}>
                                        Grade: {selectedSelf}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <span className="text-[9px] text-stone-400 italic">Retrieve the concept, then select recall grade:</span>
                                    <div className="grid grid-cols-3 gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setSpacedRepetitionSelfGraded(prev => ({ ...prev, [sIdx]: "fail" }))}
                                        className="py-1.5 text-center text-[10px] font-mono uppercase bg-red-950/45 border border-red-900/60 text-red-400 hover:bg-red-900/40 rounded-sm cursor-pointer"
                                      >
                                        🔴 Fail (Forgot)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSpacedRepetitionSelfGraded(prev => ({ ...prev, [sIdx]: "medium" }))}
                                        className="py-1.5 text-center text-[10px] font-mono uppercase bg-yellow-950/45 border border-yellow-900/60 text-yellow-400 hover:bg-yellow-90s rounded-sm cursor-pointer"
                                      >
                                        🟡 Hard (Slow)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSpacedRepetitionSelfGraded(prev => ({ ...prev, [sIdx]: "easy" }))}
                                        className="py-1.5 text-center text-[10px] font-mono uppercase bg-green-950/45 border border-green-900/60 text-green-400 hover:bg-green-90s rounded-sm cursor-pointer"
                                      >
                                        🟢 Easy (Instant)
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* QUICK RECALL RENDER */}
                  {practiceActiveFormatTab === "quickRecall" && (
                    <div className="space-y-3 font-mono">
                      <p className="text-[10px] text-stone-400 italic text-center">
                        ⚡ Quick term association revision. Hover or tap to focus mnemonic fast facts.
                      </p>

                      <div className="grid grid-cols-1 gap-2.5">
                        {practiceData.quickRecall?.map((item: any, qIdx: number) => (
                          <div key={qIdx} className="p-3 bg-stone-900 border border-stone-850 hover:border-stone-800 rounded-sm group transition-all">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-xs font-bold text-[#bef264]">{item.term}</span>
                              <span className="text-[8px] text-stone-500">RAPID SPECIME #{qIdx + 1}</span>
                            </div>

                            <p className="text-[11px] text-stone-200 leading-normal font-sans">{item.definition}</p>

                            <div className="mt-2.5 p-2 bg-stone-950 border border-stone-850 rounded-sm text-[10px] text-amber-350 transition-all font-mono">
                              <span className="font-extrabold text-[8px] block uppercase text-stone-400">💡 Fast Fact Mnemonic:</span>
                              {item.fastFact || "Critical definition detail metadata."}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ASSESSOR HINT TAB */}
        {activeSidekickTab === "hint" && (
          <div className="space-y-3">
            {isAiDisabledForAssignment ? (
              <div className="p-4 bg-red-950/40 border border-red-900 text-red-400 rounded-sm">
                <p className="text-xs font-mono leading-relaxed">
                  ⚠️ AI ASSISTANCE DISABLED FOR THIS TASK:
                  <br />
                  The course coordinator has restricted Gemini Assistant usage to evaluate authentic student work on this specific assignment.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-stone-400 font-mono">
                  Seeks leading hints and conceptual breakdowns on the chosen assignment. Will never give you direct answers!
                </p>
                {selectedQuestionText ? (
                  <div className="p-3 bg-stone-950 border border-stone-800 rounded-sm text-xs text-stone-300">
                    <span className="font-mono text-[9px] text-[#bef264] block uppercase font-bold">
                      Selected assignment question:
                    </span>
                    <p className="line-clamp-2 italic">{selectedQuestionText}</p>
                  </div>
                ) : (
                  <p className="text-xs text-red-400 font-mono italic">
                    💡 Click on any question item inside your assignment task panel to auto-target it for hints.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* TEXT INPUT FOR AD-HOC EXTRA OR OVERRIDES */}
        {(!isAiDisabledForAssignment || activeSidekickTab !== "hint") && activeSidekickTab !== "glossary" && activeSidekickTab !== "practice" && (
          <div className="space-y-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                activeSidekickTab === "translate"
                  ? "Paste vocabulary or text to translate..."
                  : activeSidekickTab === "hint"
                  ? "Or type custom question topic here..."
                  : "Type custom text to analyze (or leave empty to analyze selected syllabus material above)..."
              }
              rows={4}
              className="w-full bg-stone-950 border border-stone-800 p-3 text-xs focus:ring-1 focus:ring-[#bef264] focus:outline-none placeholder-stone-600 font-mono custom-scrollbar rounded-sm text-stone-100"
            />

            <button
              onClick={() => handleAssist()}
              disabled={loading}
              className="w-full bg-[#bef264] hover:bg-[#a6d852] disabled:bg-stone-800 text-stone-950 disabled:text-stone-500 font-mono text-xs uppercase py-3 font-extrabold tracking-wider flex items-center justify-center gap-2 transition-colors duration-150 border border-stone-900 rounded-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                  Generating Advice...
                </>
              ) : (
                <>
                  Ask Gemini Advisor
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-950/30 border border-red-900 text-red-400 text-xs font-mono rounded-sm">
            {errorMsg}
          </div>
        )}

        <AnimatePresence>
          {result && activeSidekickTab !== "glossary" && activeSidekickTab !== "practice" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 border border-stone-800 bg-stone-950 p-4 rounded-sm"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-800">
                <span className="font-mono text-[10px] text-stone-400 uppercase tracking-widest font-extrabold">
                  Gemini Response Guidance
                </span>
              </div>
              <div className="text-xs leading-relaxed text-stone-300 font-sans whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                {result}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
