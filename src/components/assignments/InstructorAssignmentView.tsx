import React, { useState, useEffect } from "react";
import { PlusCircle, Search, Edit2, Trash2, CheckCircle, Sparkles, FolderOpen, ArrowDownCircle, RefreshCw, Layers, Sliders, PlayCircle, Eye, EyeOff, User, BookOpen, AlertCircle, Check } from "lucide-react";
import { Assignment, AssignmentQuestion, AssignmentType, AssignmentSubmission } from "../../types/assignments";

interface InstructorAssignmentViewProps {
  user: any;
  courseSlug: string;
  moduleId: string;
  courseModules: any[];
}

export const InstructorAssignmentView: React.FC<InstructorAssignmentViewProps> = ({
  user,
  courseSlug,
  moduleId,
  courseModules,
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  
  // Creation/Edit states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<AssignmentType>("objective");
  const [formAllowAi, setFormAllowAi] = useState(false);
  const [formQuestions, setFormQuestions] = useState<AssignmentQuestion[]>([]);

  // AI Generation configuration states
  const [aiCount, setAiCount] = useState(5);
  const [aiType, setAiType] = useState<AssignmentType>("objective");
  const [aiSourceModules, setAiSourceModules] = useState<string[]>([moduleId]);
  const [aiSourceMaterials, setAiSourceMaterials] = useState<string[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleToggleModule = (mId: string) => {
    setAiSourceModules((prev) => {
      let next;
      if (prev.includes(mId)) {
        next = prev.filter((id) => id !== mId);
      } else {
        next = [...prev, mId];
      }
      if (next.length !== 1) {
        setAiSourceMaterials([]);
      }
      return next;
    });
  };

  const handleToggleMaterial = (matId: string) => {
    setAiSourceMaterials((prev) => {
      if (prev.includes(matId)) {
        return prev.filter((id) => id !== matId);
      } else {
        return [...prev, matId];
      }
    });
  };

  // Submissions review states
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [selectedSub, setSelectedSub] = useState<AssignmentSubmission | null>(null);
  const [subGradingAnswers, setSubGradingAnswers] = useState<Record<string, { marksObtained: number; feedback: string }>>({});
  const [subGeneralFeedback, setSubGeneralFeedback] = useState("");
  const [gradingSuccess, setGradingSuccess] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseSlug}/assignments?moduleId=${moduleId}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAssignments(data.assignments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    setActiveAssignment(null);
    setIsFormOpen(false);
    setSelectedSub(null);
    setAiSourceModules(moduleId ? [moduleId] : []);
    setAiSourceMaterials([]);
  }, [courseSlug, moduleId]);

  const selectAssignment = async (assignment: Assignment) => {
    setActiveAssignment(assignment);
    setSelectedSub(null);
    setGradingSuccess("");
    setErrorMsg("");
    setSuccessMsg("");
    fetchSubmissions(assignment._id);
  };

  const fetchSubmissions = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSubmissions(data.submissions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startCreate = () => {
    setEditingId(null);
    setFormTitle(`Assignment - ${formType === "objective" ? "MCQ Assessment" : "Narrative Thesis"}`);
    setFormDesc("");
    setFormType("objective");
    setFormAllowAi(false);
    setFormQuestions([
      {
        id: "q-1",
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        referenceAnswer: "",
        marks: 10,
      },
    ]);
    setIsFormOpen(true);
    setErrorMsg("");
  };

  const startEdit = (assignment: Assignment) => {
    setEditingId(assignment._id);
    setFormTitle(assignment.title);
    setFormDesc(assignment.description || "");
    setFormType(assignment.type);
    setFormAllowAi(assignment.allowAi);
    setFormQuestions(
      assignment.questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
          // Guarantee array structure
        options: q.options || ["", "", "", ""],
        correctAnswer: q.correctAnswer || "",
        referenceAnswer: q.referenceAnswer || "",
        marks: q.marks || 10,
      }))
    );
    setIsFormOpen(true);
    setErrorMsg("");
  };

  const handleAddQuestion = () => {
    setFormQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}-${prev.length}`,
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        referenceAnswer: "",
        marks: 10,
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setFormQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionFieldChange = (idx: number, field: keyof AssignmentQuestion, val: any) => {
    setFormQuestions((prev) =>
      prev.map((q, i) => {
        if (i === idx) {
          return { ...q, [field]: val };
        }
        return q;
      })
    );
  };

  const handleOptionChange = (qIdx: number, oIdx: number, val: string) => {
    setFormQuestions((prev) =>
      prev.map((q, i) => {
        if (i === qIdx) {
          const updatedOptions = [...(q.options || ["", "", "", ""])];
          updatedOptions[oIdx] = val;
          return { ...q, options: updatedOptions };
        }
        return q;
      })
    );
  };

  const handleGenerateAi = async () => {
    setAiGenerating(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/assignments/generate-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          courseSlug,
          moduleId: aiSourceModules[0] || "",
          materialId: aiSourceMaterials[0] || "",
          moduleIds: aiSourceModules,
          materialIds: aiSourceMaterials,
          count: aiCount,
          type: aiType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gemini API failed to formulate assessment questions.");
      }

      const generated: AssignmentQuestion[] = (data.questions || []).map((q: any, index: number) => ({
        id: q.id || `q-ai-${index}-${Date.now()}`,
        questionText: q.questionText || "Draft question details pending review.",
        options: q.options || ["", "", "", ""],
        correctAnswer: q.correctAnswer || "",
        referenceAnswer: q.referenceAnswer || "",
        marks: q.marks || 10,
      }));

      setFormQuestions(generated);
      setFormType(aiType);
      setSuccessMsg("Gemini synthesized assessment draft fields successfully below!");
    } catch (e: any) {
      setErrorMsg(e.message || "Failed auto-generating questions due to connection issues.");
    } finally {
      setAiGenerating(false);
    }
  };

  const saveAssignment = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    // Basic validity review
    if (!formTitle.trim()) {
      setErrorMsg("Please enter an assignment title.");
      return;
    }
    if (formQuestions.length === 0) {
      setErrorMsg("Assignment must hold at least 1 question.");
      return;
    }

    const payload = {
      title: formTitle,
      description: formDesc,
      type: formType,
      allowAi: formAllowAi,
      questions: formQuestions,
    };

    try {
      let res;
      if (editingId) {
        res = await fetch(`/api/assignments/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/courses/${courseSlug}/modules/${moduleId}/assignments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(editingId ? "Assignment updated successfully!" : "Assignment created successfully!");
        fetchAssignments();
        setIsFormOpen(false);
        if (activeAssignment && activeAssignment._id === editingId) {
          setActiveAssignment((prev) => prev ? { ...prev, ...data.assignment } : null);
        }
      } else {
        setErrorMsg(data.error || "Failed saving changes.");
      }
    } catch (e) {
      setErrorMsg("Network connection lost. Please retry.");
    }
  };

  const handleReleaseToggles = async (assignment: Assignment, releaseState: boolean) => {
    try {
      const res = await fetch(`/api/assignments/${assignment._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ released: releaseState }),
      });
      if (res.ok) {
        setAssignments((prev) =>
          prev.map((a) => (a._id === assignment._id ? { ...a, released: releaseState } : a))
        );
        if (activeAssignment?._id === assignment._id) {
          setActiveAssignment((prev) => prev ? { ...prev, released: releaseState } : null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteAssignment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this assignment?")) return;

    try {
      const res = await fetch(`/api/assignments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        fetchAssignments();
        if (activeAssignment?._id === id) {
          setActiveAssignment(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Grading submissions handler
  const loadSubForGrading = (sub: AssignmentSubmission) => {
    setSelectedSub(sub);
    setSubGeneralFeedback(sub.generalFeedback || "");
    const initialGrading: Record<string, { marksObtained: number; feedback: string }> = {};
    sub.answers.forEach((ans: any) => {
      initialGrading[ans.questionId] = {
        marksObtained: ans.marksObtained || 0,
        feedback: ans.feedback || "",
      };
    });
    setSubGradingAnswers(initialGrading);
    setGradingSuccess("");
  };

  const handleGradeFieldChange = (qId: string, value: number, feedback: string) => {
    setSubGradingAnswers((prev) => ({
      ...prev,
      [qId]: { marksObtained: value, feedback },
    }));
  };

  const submitStudentGrades = async () => {
    if (!selectedSub) return;
    setGradingSuccess("");

    const formattedAnswers = Object.entries(subGradingAnswers).map(([qId, info]: [string, any]) => ({
      questionId: qId,
      marksObtained: info.marksObtained,
      feedback: info.feedback,
    }));

    try {
      const res = await fetch(`/api/submissions/${selectedSub._id}/grade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          answers: formattedAnswers,
          generalFeedback: subGeneralFeedback,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setGradingSuccess("Grades evaluated and updated successfully!");
        fetchSubmissions(activeAssignment!._id);
        setSelectedSub(data.submission);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#bef264] bg-stone-950 px-2 py-0.5 rounded-sm">
          Coordinator Desk — Assignment Workspace
        </h3>
        {!isFormOpen && (
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide font-black uppercase bg-stone-950 text-white hover:text-[#bef264] hover:bg-stone-900 border-2 border-stone-950 px-3 py-2.5 shadow-[4px_4px_0px_#000] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Create Custom assignment
          </button>
        )}
      </div>

      {isFormOpen ? (
        <div className="border-4 border-stone-900 bg-white p-6 shadow-[6px_6px_0px_#000] space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h4 className="font-black text-stone-950 flex items-center gap-1">
              <PlusCircle className="w-5 h-5 text-stone-950" />
              {editingId ? "Update Assigned Sheet" : "Publish New Module Assignment"}
            </h4>
            <button
              onClick={() => setIsFormOpen(false)}
              className="font-mono text-xs hover:underline text-stone-500 hover:text-stone-950"
            >
              Cancel changes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="font-mono text-[10px] text-stone-500 uppercase block font-black">
                Assignment Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. MCQ Quiz - Low Resource Phonology Analysis"
                className="w-full bg-stone-50 border border-stone-300 p-3 text-xs font-medium focus:ring-1 focus:ring-stone-950 focus:outline-none"
              />
            </div>

            <div className="space-y-3">
              <label className="font-mono text-[10px] text-stone-500 uppercase block font-black">
                Exam Model
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as AssignmentType)}
                className="w-full bg-stone-50 border border-stone-300 p-3 text-xs font-medium focus:ring-1 focus:ring-stone-950 focus:outline-none"
              >
                <option value="objective">Multiple Choice (Immediate Auto-Graded)</option>
                <option value="subjective">Subjective Research File Upload / Written Answer</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-[10px] text-stone-500 uppercase block font-black">
              Description / Instructions
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Provide a detailed roadmap, requirements, and background guidelines for students attempting this assignment."
              rows={3}
              className="w-full bg-stone-50 border border-stone-300 p-3 text-xs font-sans focus:ring-1 focus:ring-stone-950 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 py-2 border-y border-dashed border-stone-200">
            <input
              id="allow-ai-sidekick"
              type="checkbox"
              checked={formAllowAi}
              onChange={(e) => setFormAllowAi(e.target.checked)}
              className="w-4 h-4 cursor-pointer accentuate-accent"
            />
            <label htmlFor="allow-ai-sidekick" className="text-xs font-mono text-stone-800 cursor-pointer select-none">
              💡 Enable Gemini AI Sidekick to support students while completing this assignment (provides leading hints and guidelines)
            </label>
          </div>

          {/* AI GENERATOR DRAWER */}
          <div className="bg-[#bef264]/10 border border-[#bef264] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#bef264]/30 pb-2">
              <h5 className="font-mono text-xs font-black text-stone-950 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-stone-900 animate-spin" />
                Gemini Assessor — Instant Assessment Generator
              </h5>
              <span className="text-[9px] font-mono uppercase bg-stone-950 text-white px-2 py-0.5 rounded-sm">
                Model: 3.5-Flash
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="font-mono text-[9px] text-[#42521a] uppercase block font-black mb-1">
                  Draft Count
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={aiCount}
                  onChange={(e) => setAiCount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full bg-white border border-[#bef264] py-1 px-2 text-[11px] font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[9px] text-[#42521a] uppercase block font-black mb-1">
                  Format Mode
                </label>
                <select
                  value={aiType}
                  onChange={(e) => setAiType(e.target.value as AssignmentType)}
                  className="w-full bg-white border border-[#bef264] py-1.5 px-2 text-[11px] font-mono focus:outline-none"
                >
                  <option value="objective">MCQ Grader</option>
                  <option value="subjective">Subjective Rubric</option>
                </select>
              </div>

              <div>
                <label className="font-mono text-[9px] text-[#42521a] uppercase block font-black mb-1">
                  Context Syllabus Modules
                </label>
                <div className="w-full h-24 overflow-y-auto border border-[#bef264] bg-white p-1 text-[10px] font-mono space-y-1">
                  {courseModules.map((m) => {
                    const isChecked = aiSourceModules.includes(m._id);
                    return (
                      <label key={m._id} className="flex items-start gap-1 py-0.5 hover:bg-stone-50 cursor-pointer text-stone-700 leading-tight">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleModule(m._id)}
                          className="mt-0.5 h-3.5 w-3.5"
                        />
                        <span>{m.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-mono text-[9px] text-[#42521a] uppercase block font-black mb-1 flex items-center justify-between">
                  <span>Context Study Document</span>
                  {aiSourceModules.length > 1 && (
                    <span className="text-[8px] text-red-600 normal-case font-normal font-mono">(Disabled)</span>
                  )}
                </label>
                {aiSourceModules.length > 1 ? (
                  <div className="w-full h-24 border border-stone-200 bg-stone-50 p-2 text-[9px] font-mono text-stone-500 flex items-center justify-center text-center leading-tight">
                    Study documents selectable only when exactly 1 module is selected.
                  </div>
                ) : aiSourceModules.length === 0 ? (
                  <div className="w-full h-24 border border-stone-200 bg-stone-50 p-2 text-[9px] font-mono text-stone-500 flex items-center justify-center text-center">
                    Select a syllabus module first.
                  </div>
                ) : (
                  <div className="w-full h-24 overflow-y-auto border border-[#bef264] bg-white p-1 text-[10px] font-mono space-y-1">
                    {(() => {
                      const singleModuleId = aiSourceModules[0];
                      const activeMod = courseModules.find((m) => m._id === singleModuleId);
                      const materials = activeMod?.materials || [];
                      if (materials.length === 0) {
                        return <div className="text-[9px] text-stone-400 p-1 italic">No materials in this module.</div>;
                      }
                      return materials.map((mat: any) => {
                        const isChecked = aiSourceMaterials.includes(mat._id);
                        return (
                          <label key={mat._id} className="flex items-start gap-1 py-0.5 hover:bg-stone-50 cursor-pointer text-stone-700 leading-tight">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleMaterial(mat._id)}
                              className="mt-0.5 h-3.5 w-3.5"
                            />
                            <span>{mat.title} <span className="text-[8px] text-stone-400">({mat.type})</span></span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={aiGenerating}
              className="bg-stone-950 font-mono text-[10px] tracking-wider uppercase font-black px-4 py-3 text-[#bef264] hover:bg-stone-900 border-2 border-[#bef264] flex items-center gap-1.5 cursor-pointer disabled:bg-stone-800"
            >
              {aiGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synthesizing assessment matrices...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Auto-generate Assessment via Gemini API
                </>
              )}
            </button>
          </div>

          {/* QUESTIONS LIST */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-mono text-sm font-black text-stone-950 uppercase tracking-tight">
                Section questions ({formQuestions.length})
              </span>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="font-mono text-[10px] text-blue-600 hover:underline uppercase font-bold"
              >
                + Add Another Question
              </button>
            </div>

            <div className="space-y-6">
              {formQuestions.map((q, qIdx) => (
                <div key={q.id} className="p-4 bg-stone-50 border border-stone-200 rounded-none relative">
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 font-mono text-[11px] uppercase flex items-center gap-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Question
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="font-mono text-[9px] text-indigo-800 uppercase block font-black">
                        Question Text {qIdx + 1}
                      </label>
                      <input
                        type="text"
                        value={q.questionText}
                        onChange={(e) => handleQuestionFieldChange(qIdx, "questionText", e.target.value)}
                        placeholder="Write the complete assessment request..."
                        className="w-full bg-white border border-stone-300 py-2 px-3 text-xs font-semibold focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-mono text-[9px] text-indigo-800 uppercase block font-black">
                        Credits Weight
                      </label>
                      <input
                        type="number"
                        value={q.marks}
                        onChange={(e) => handleQuestionFieldChange(qIdx, "marks", Number(e.target.value))}
                        className="w-full bg-white border border-stone-300 py-2 px-3 text-xs font-mono font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Objective option values */}
                  {formType === "objective" ? (
                    <div className="space-y-3">
                      <label className="font-mono text-[9px] text-purple-800 uppercase block font-black mb-1">
                        MCQ Options (Exactly 4 Options required) & Set Correct Selection
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(q.options || ["", "", "", ""]).map((option, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <span className="font-mono text-xs text-stone-500">{oIdx + 1}.</span>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                              placeholder={`Option ${oIdx + 1}`}
                              className="w-full bg-white border border-stone-300 py-1.5 px-3 text-xs focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuestionFieldChange(qIdx, "correctAnswer", option)}
                              className={`px-3 py-1 text-[10px] font-mono uppercase font-black transition-colors ${
                                q.correctAnswer === option && option !== ""
                                  ? "bg-emerald-600 text-white"
                                  : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                              }`}
                            >
                              {q.correctAnswer === option && option !== "" ? "CORRECT" : "SET"}
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-stone-400 font-sans italic mt-1 uppercase tracking-wide">
                        🔍 Correct Answer Registered: <span className="text-emerald-600 font-extrabold">{q.correctAnswer || "NONE SET YET"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 mt-3">
                      <label className="font-mono text-[9px] text-blue-800 uppercase block font-black">
                        Reference Evaluation Answer / Rubric Guidelines
                      </label>
                      <textarea
                        value={q.referenceAnswer || ""}
                        onChange={(e) => handleQuestionFieldChange(qIdx, "referenceAnswer", e.target.value)}
                        placeholder="Write model solution keywords, study points or essay parameters that should exist for grading evaluation."
                        rows={3}
                        className="w-full bg-white border border-stone-300 py-2 px-3 text-xs font-mono focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-700 font-mono text-xs rounded-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono text-xs rounded-sm flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="pt-4 border-t border-stone-200 flex gap-4">
            <button
              onClick={saveAssignment}
              className="bg-stone-950 font-mono text-xs uppercase font-extrabold px-6 py-3.5 tracking-wider text-white hover:text-[#bef264] border-2 border-stone-950 shadow-[4px_4px_0px_#000] cursor-pointer"
            >
              {editingId ? "Save assessment edits" : "Commit assignment to module"}
            </button>
            <button
              onClick={() => setIsFormOpen(false)}
              className="bg-stone-100 font-mono text-xs uppercase font-semibold px-4 py-3 hover:bg-stone-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ASSIGNMENTS COLUMN */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-mono text-xs uppercase tracking-wider text-ink/70">
              Assigned Materials
            </h4>

            <div className="space-y-3">
              {assignments.map((assignment) => {
                const isSelected = activeAssignment?._id === assignment._id;
                return (
                  <div
                    key={assignment._id}
                    onClick={() => selectAssignment(assignment)}
                    className={`p-4 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-stone-950 bg-stone-50/50 shadow-[4px_4px_0px_#000]"
                        : "border-stone-200 hover:border-stone-400 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className={`inline-block font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-sm font-bold ${
                          assignment.type === "objective" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {assignment.type === "objective" ? "MCQ Exam" : "Subjective Study"}
                        </span>
                        <h5 className="font-bold text-sm text-stone-900 leading-tight">{assignment.title}</h5>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(assignment);
                          }}
                          className="p-1 hover:bg-stone-100 text-stone-600 hover:text-stone-900 rounded-sm"
                          title="Edit questions"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => deleteAssignment(assignment._id, e)}
                          className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-sm"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 mt-3 pt-3 border-t border-dashed border-stone-100 text-[10px] font-mono text-stone-500">
                      <span>Total Marks: {assignment.totalMarks} CP</span>
                      
                      {/* Release State */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReleaseToggles(assignment, !assignment.released);
                        }}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-extrabold ${
                          assignment.released
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                            : "bg-amber-50 text-amber-700 border border-amber-300"
                        }`}
                      >
                        {assignment.released ? (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Released
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Locked
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              {assignments.length === 0 && (
                <div className="p-8 border border-dashed border-ink/20 text-center font-mono text-xs text-ink/40 bg-stone-50/50">
                  No syllabus assignments found. Press "Create Custom assignment" above to post tasks.
                </div>
              )}
            </div>
          </div>

          {/* SUBMISSIONS COLUMN */}
          <div className="lg:col-span-3">
            {activeAssignment ? (
              <div className="border-4 border-stone-900 bg-white p-6 shadow-[6px_6px_0px_#000] space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 border border-amber-300 rounded-sm">
                      Exam Evaluator Workspace
                    </span>
                    <span className="font-mono text-xs font-black">
                      Total Marks Weight: {activeAssignment.totalMarks} Credits
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-stone-950 mt-1">{activeAssignment.title}</h4>
                </div>

                <div className="space-y-4">
                  <h5 className="font-mono text-xs uppercase tracking-widest text-stone-500 font-bold">
                    Student submissions ({submissions.length} enrolled)
                  </h5>

                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {submissions.map((sub) => {
                      const isGraded = sub.status === "graded";
                      const isSelected = selectedSub?._id === sub._id;

                      return (
                        <div
                          key={sub._id}
                          onClick={() => loadSubForGrading(sub)}
                          className={`p-3 border flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-stone-50 border-stone-900 font-bold"
                              : "bg-white border-stone-200 hover:bg-stone-50/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1 px-2 border border-stone-900 font-mono text-xs uppercase text-stone-900 bg-[#bef264]/10">
                              <User className="w-3.5 h-3.5 inline mr-1" />
                              Student
                            </div>
                            <div className="font-mono text-xs">
                              <p className="font-black text-stone-900">{sub.studentName || sub.studentEmail}</p>
                              <p className="text-[10px] text-stone-500">{sub.studentEmail}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 font-mono text-xs">
                            {isGraded ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 font-bold border border-emerald-300">
                                {sub.totalScore} / {activeAssignment.totalMarks} CP
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-300">
                                Submitted
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {submissions.length === 0 && (
                      <div className="p-8 border border-dashed border-stone-200 text-center font-mono text-xs text-stone-400">
                        No submissions compiled yet for this task.
                      </div>
                    )}
                  </div>
                </div>

                {/* Submissions grading details */}
                {selectedSub && (
                  <div className="border-t border-stone-950 pt-5 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-stone-950 font-mono text-xs uppercase">
                        Reviewing: {selectedSub.studentEmail}
                      </h4>
                      <span className="text-xs font-mono text-stone-500 uppercase">
                        Submitted: {new Date(selectedSub.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {activeAssignment.questions.map((q, idx) => {
                        const studentAns = selectedSub.answers.find((ans) => ans.questionId === q.id);
                        const gradingInfo = subGradingAnswers[q.id] || { marksObtained: 0, feedback: "" };

                        return (
                          <div key={q.id} className="p-4 bg-stone-50 border border-stone-200 space-y-3">
                            <span className="font-mono text-[9px] text-stone-500">
                              QUESTION {idx + 1} OF {activeAssignment.questions.length} ({q.marks} CP)
                            </span>
                            <p className="font-medium text-xs text-stone-900">{q.questionText}</p>

                            {/* Student Answer */}
                            <div className="p-3 bg-white border border-stone-200 text-xs font-mono rounded-sm">
                              {activeAssignment.type === "objective" ? (
                                <p>
                                  <span className="text-stone-400 uppercase text-[9px] block">Selected Option:</span>
                                  <span className="font-bold text-stone-900">{studentAns?.selectedOption || "No option chosen."}</span>
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  <div>
                                    <span className="text-stone-400 uppercase text-[9px] block">Written Narrative Attempt:</span>
                                    <p className="text-stone-800 whitespace-pre-wrap leading-relaxed">{studentAns?.textResponse || "No written response submitted."}</p>
                                  </div>
                                  {studentAns?.driveFileUrl && (
                                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                                      <span className="text-emerald-700 font-bold uppercase text-[9px] block">Google Drive Artifact:</span>
                                      <a
                                        href={studentAns.driveFileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1"
                                      >
                                        Open linked Drive document <Eye className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* GRADING ACTION CONTAINER */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pt-2">
                              <div className="space-y-2">
                                <label className="font-mono text-[9px] text-stone-500 uppercase block font-black">
                                  Grade (Max {q.marks})
                                </label>
                                <input
                                  type="number"
                                  disabled={activeAssignment.type === "objective"}
                                  value={gradingInfo.marksObtained}
                                  max={q.marks}
                                  min={0}
                                  onChange={(e) => handleGradeFieldChange(q.id, Number(e.target.value), gradingInfo.feedback)}
                                  className="w-full bg-white border border-stone-300 p-2 text-xs font-mono font-bold focus:outline-none"
                                />
                              </div>

                              <div className="md:col-span-3 space-y-2">
                                <label className="font-mono text-[9px] text-stone-500 uppercase block font-black">
                                  Per-Question Feedback
                                </label>
                                <input
                                  type="text"
                                  value={gradingInfo.feedback}
                                  onChange={(e) => handleGradeFieldChange(q.id, gradingInfo.marksObtained, e.target.value)}
                                  placeholder="Write notes or correction critiques..."
                                  className="w-full bg-white border border-stone-300 p-2 text-xs focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3 bg-stone-50 p-4 border border-stone-200">
                      <label className="font-mono text-[10px] text-stone-500 uppercase block font-black">
                        Overall Coordinator Grade-Book Summary Feedback
                      </label>
                      <textarea
                        value={subGeneralFeedback}
                        onChange={(e) => setSubGeneralFeedback(e.target.value)}
                        placeholder="Write evaluation critiques, encouraging summaries, or grade-sheet remarks..."
                        rows={3}
                        className="w-full bg-white border border-stone-300 p-3 text-xs focus:outline-none"
                      />
                    </div>

                    {gradingSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono text-xs rounded-sm flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{gradingSuccess}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={submitStudentGrades}
                      className="w-full py-4 text-sm font-mono text-center font-extrabold bg-[#bef264] text-stone-950 hover:bg-[#a6d852] tracking-widest border-2 border-stone-900 shadow-[4px_4px_0px_#000] cursor-pointer"
                    >
                      COMMIT EVALUATIONS & UPDATE SCORES
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-4 border-dashed border-stone-200 h-[450px] flex flex-col items-center justify-center text-center p-8 bg-white/50">
                <Sliders className="w-12 h-12 text-stone-300 mb-2 animate-pulse" />
                <h4 className="font-mono text-xs uppercase tracking-widest text-[#bef264] bg-stone-950 px-2 py-0.5 rounded-sm mb-2">
                  Tutor Assessor Desk
                </h4>
                <p className="text-xs font-mono text-stone-400 max-w-sm leading-relaxed">
                  Toggle lock gates to release scores, manage questions via Gemini generators, or click student submissions on the left sidebar boards to initiate active grading.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
