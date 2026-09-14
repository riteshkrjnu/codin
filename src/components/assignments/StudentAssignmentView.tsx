import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle2, XCircle, AlertCircle, Calendar, Upload, FileText, Check, ChevronRight, Lock, ExternalLink, HelpCircle, RefreshCw } from "lucide-react";
import { Assignment, SubmissionAnswer } from "../../types/assignments";

interface StudentAssignmentViewProps {
  user: any;
  courseSlug: string;
  moduleId: string;
  onSelectAssignmentForAi: (assignment: Assignment | null, questionText: string) => void;
}

export const StudentAssignmentView: React.FC<StudentAssignmentViewProps> = ({
  user,
  courseSlug,
  moduleId,
  onSelectAssignmentForAi,
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> selectedOption OR textResponse
  const [driveFiles, setDriveFiles] = useState<Record<string, { url: string; name: string }>>({}); // questionId -> drive upload
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [uploadActiveQ, setUploadActiveQ] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseSlug}/assignments?moduleId=${moduleId}`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setAssignments(data.assignments || []);
      }
    } catch (e) {
      console.error("Error fetching assignments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    setActiveAssignment(null);
  }, [courseSlug, moduleId]);

  const selectAssignment = (assignment: Assignment) => {
    setActiveAssignment(assignment);
    setSuccessMsg("");
    setErrorMsg("");

    // Initialize answers from existing submission if exists
    const initialAnswers: Record<string, string> = {};
    const initialDrive: Record<string, { url: string; name: string }> = {};

    if (assignment.mySubmission && assignment.mySubmission.answers) {
      assignment.mySubmission.answers.forEach((ans) => {
        if (assignment.type === "objective") {
          initialAnswers[ans.questionId] = ans.selectedOption || ans.textResponse || "";
        } else {
          initialAnswers[ans.questionId] = ans.textResponse || "";
          if (ans.driveFileUrl) {
            initialDrive[ans.questionId] = {
              url: ans.driveFileUrl,
              name: ans.driveFileName || "Attached Document",
            };
          }
        }
      });
    }

    setAnswers(initialAnswers);
    setDriveFiles(initialDrive);
  };

  const handleObjectiveSelect = (qId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: option }));
    
    // Auto-select for hint
    const question = activeAssignment?.questions.find(q => q.id === qId);
    if (question) {
      onSelectAssignmentForAi(activeAssignment, question.questionText);
    }
  };

  const handleSubjectiveChange = (qId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: text }));
  };

  const handleQuestionFocusForAi = (qId: string) => {
    const question = activeAssignment?.questions.find(q => q.id === qId);
    if (question) {
      onSelectAssignmentForAi(activeAssignment, question.questionText);
    }
  };

  const [errorMsg, setErrorMsg] = useState("");

  const handleDriveFileUploadSimulated = async (qId: string, file: File) => {
    setUploadActiveQ(qId);
    setUploadProgress(10);
    setErrorMsg("");

    try {
      // Step 1: Simulate upload progress to prompt realistic user feel
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 25;
        });
      }, 200);

      // Fetch user access token for Google APIs (or mock simulation token)
      const token = localStorage.getItem("google_access_token") || "mock_token_student_99";
      const targetUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

      // Build real or mock metadata
      const metadata = {
        name: `LMS_Assignment_${activeAssignment?.title}_${file.name}`,
        mimeType: file.type || "application/pdf"
      };

      // Call general purpose tunnel proxy to upload
      const res = await fetch(`/api/google-proxy?url=${encodeURIComponent(targetUrl)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lms-google-auth": `Bearer ${token}`
        },
        body: JSON.stringify({
          metadata,
          fileData: "base64_simulated_stream_data_bytes"
        })
      });

      clearInterval(interval);
      setUploadProgress(100);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google Drive upload failed");
      }

      setDriveFiles((prev) => ({
        ...prev,
        [qId]: {
          url: data.webViewLink || `https://drive.google.com/file/d/${data.id || 'mock'}/view`,
          name: file.name
        }
      }));

      // Grant anyoneWithLink permissions via proxy
      const permissionUrl = `https://www.googleapis.com/drive/v3/files/${data.id || 'mock'}/permissions`;
      await fetch(`/api/google-proxy?url=${encodeURIComponent(permissionUrl)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lms-google-auth": `Bearer ${token}`
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone"
        })
      });

      setTimeout(() => {
        setUploadActiveQ(null);
        setUploadProgress(0);
      }, 500);

    } catch (e: any) {
      setErrorMsg(e.message || "Failed uploading to Google Drive.");
      setUploadActiveQ(null);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleDriveFileUploadSimulated(qId, file);
    }
  };

  const submitAssignment = async () => {
    if (!activeAssignment) return;
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const formattedAnswers = activeAssignment.questions.map((q) => {
      const drive = driveFiles[q.id];
      return {
        questionId: q.id,
        selectedOption: activeAssignment.type === "objective" ? answers[q.id] || "" : "",
        textResponse: activeAssignment.type === "subjective" ? answers[q.id] || "" : "",
        driveFileUrl: drive?.url || "",
        driveFileName: drive?.name || ""
      };
    });

    try {
      const res = await fetch(`/api/assignments/${activeAssignment._id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify({ answers: formattedAnswers })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Assignment submission submitted successfully!");
        fetchAssignments();
        // Update active selection to match new submission
        setActiveAssignment(prev => prev ? { ...prev, mySubmission: data.submission } : null);
      } else {
        setErrorMsg(data.error || "Submission failed.");
      }
    } catch (e) {
      setErrorMsg("Connection timed out. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-ink font-mono text-xs flex flex-col items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin opacity-55" />
        Synching assessment logs...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* LEFT COLUMN: List of Module Assignments */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="font-mono text-xs uppercase tracking-wider text-ink/70 flex items-center justify-between">
          <span>Module Task Board</span>
          <span className="text-[10px] bg-stone-100 border border-ink/20 px-2 py-0.5 rounded-full text-ink">
            {assignments.length} Available
          </span>
        </h3>

        <div className="space-y-3">
          {assignments.map((assignment) => {
            const isCompleted = !!assignment.mySubmission;
            const isGraded = assignment.mySubmission?.status === "graded";
            const scorePercent = isGraded && assignment.totalMarks > 0
              ? Math.round((assignment.mySubmission!.totalScore / assignment.totalMarks) * 100)
              : null;

            return (
              <div
                key={assignment._id}
                onClick={() => selectAssignment(assignment)}
                className={`p-4 border-2 transition-all duration-150 cursor-pointer ${
                  activeAssignment?._id === assignment._id
                    ? "border-stone-900 bg-stone-50/50 shadow-[4px_4px_0px_#000]"
                    : "border-stone-200 hover:border-stone-400 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className={`inline-block font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-sm font-bold ${
                      assignment.type === "objective"
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}>
                      {assignment.type === "objective" ? "MCQ Exam" : "Subjective Study"}
                    </span>
                    <h4 className="font-bold text-sm text-stone-900 leading-tight">{assignment.title}</h4>
                  </div>

                  {isCompleted ? (
                    <div className="flex flex-col items-end">
                      {isGraded && assignment.released ? (
                        <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                          {assignment.mySubmission!.totalScore}/{assignment.totalMarks} M
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] uppercase text-amber-600 bg-amber-50 px-2 py-0.5 border border-amber-200">
                          Submitted
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="font-mono text-[10px] uppercase text-rose-500 bg-rose-50 px-2 py-0.5 border border-rose-200 animate-pulse font-extrabold">
                      Due
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-dashed border-stone-100 text-stone-500 text-[10px] font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Marks Weight: {assignment.totalMarks} CP</span>
                  {assignment.allowAi && (
                    <span className="ml-auto text-emerald-600 font-extrabold bg-emerald-50 px-1 py-0.2 select-accent rounded-sm">
                      AI SUPPORTED
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {assignments.length === 0 && (
            <div className="p-8 border border-dashed border-ink/20 text-center font-mono text-xs text-ink/40">
              No tasks have been assigned to this module yet.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Assignment Attempt Sheet */}
      <div className="lg:col-span-3">
        {activeAssignment ? (
          <div className="border-4 border-stone-900 bg-white p-6 shadow-[6px_6px_0px_#000] space-y-6">
            <div className="border-b border-stone-900 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs uppercase tracking-wider text-[#bef264] bg-stone-950 px-2 py-0.5 rounded-sm">
                  Active Assess Sheet
                </span>
                <span className="font-mono text-xs font-bold">
                  Topic Weight: {activeAssignment.totalMarks} Credits
                </span>
              </div>
              <h2 className="text-xl font-black text-stone-950">{activeAssignment.title}</h2>
              {activeAssignment.description && (
                <p className="mt-2 text-xs text-stone-600 leading-relaxed font-sans">{activeAssignment.description}</p>
              )}
            </div>

            {/* Questions list */}
            <div className="space-y-6">
              {activeAssignment.questions.map((q, idx) => {
                const submissionAns = activeAssignment.mySubmission?.answers?.find(
                  (ans) => ans.questionId === q.id
                );
                
                const isCorrect = submissionAns?.marksObtained && submissionAns.marksObtained > 0;
                const isWrong = submissionAns && (!submissionAns.marksObtained || submissionAns.marksObtained === 0);
                const isReleased = activeAssignment.released;

                return (
                  <div
                    key={q.id}
                    onClick={() => handleQuestionFocusForAi(q.id)}
                    className={`p-4 border-2 transition-colors ${
                      submissionAns ? "border-stone-900 bg-stone-50/20" : "border-stone-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h5 className="font-mono text-xs font-black text-stone-950">
                        TASK QUESTIONS {idx + 1} OF {activeAssignment.questions.length} ({q.marks} CP)
                      </h5>
                      {activeAssignment.mySubmission && isReleased && (
                        <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
                          {activeAssignment.type === "objective" ? (
                            isCorrect ? (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-sm flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Correct (+{q.marks})
                              </span>
                            ) : (
                              <span className="text-rose-700 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-sm flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> 0/{q.marks}
                              </span>
                            )
                          ) : (
                            <span className="text-amber-700 bg-[#bef264]/10 border border-amber-300 px-2 py-0.5 rounded-sm">
                              Points Given: {submissionAns?.marksObtained || 0} / {q.marks}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="font-medium text-sm text-stone-900 mb-4">{q.questionText}</p>

                    {/* MCQ Options */}
                    {activeAssignment.type === "objective" && q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 gap-2">
                        {q.options.map((option, oIdx) => {
                          const isSelected = answers[q.id] === option;
                          const originalCorrect = (q as any).correctAnswer; // Only hydrated if released or authorized
                          const showCorrectMark = isReleased && originalCorrect === option;
                          const showWrongSelected = isReleased && isSelected && originalCorrect !== option;

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              disabled={!!activeAssignment.mySubmission}
                              onClick={() => handleObjectiveSelect(q.id, option)}
                              className={`text-left p-3 text-xs transition-all flex items-center justify-between border select-none cursor-pointer ${
                                showCorrectMark
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-medium"
                                  : showWrongSelected
                                  ? "bg-rose-50 border-rose-500 text-rose-950"
                                  : isSelected
                                  ? "bg-stone-950 text-white border-stone-950 font-bold"
                                  : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800"
                              }`}
                            >
                              <span>{oIdx + 1}. {option}</span>
                              {showCorrectMark && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                              {showWrongSelected && <XCircle className="w-4 h-4 text-rose-600" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Fill in the Blank / No options objective questions */}
                    {activeAssignment.type === "objective" && (!q.options || q.options.length === 0) && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-mono text-stone-600 uppercase font-black">
                          Your Answer:
                        </label>
                        <input
                          type="text"
                          placeholder="Type your answer here..."
                          disabled={!!activeAssignment.mySubmission}
                          value={answers[q.id] || ""}
                          onChange={(e) => handleObjectiveSelect(q.id, e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 p-2.5 text-xs font-mono focus:ring-1 focus:ring-stone-950 focus:outline-none placeholder-stone-400"
                        />
                        {isReleased && (
                          <div className="mt-1 text-xs font-mono text-stone-600">
                            Correct Answer: <span className="font-bold text-emerald-700">{(q as any).correctAnswer}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Subjective Input / Uploader */}
                    {activeAssignment.type === "subjective" && (
                      <div className="space-y-4">
                        <textarea
                          placeholder="Formulate your detailed narrative answer or gloss analysis sheet here..."
                          value={answers[q.id] || ""}
                          disabled={!!activeAssignment.mySubmission}
                          onChange={(e) => handleSubjectiveChange(q.id, e.target.value)}
                          rows={5}
                          className="w-full bg-stone-50 border border-stone-200 p-3 text-xs font-mono focus:ring-1 focus:ring-stone-900 focus:outline-none placeholder-stone-400"
                        />

                        {/* Google Drive Upload Widget */}
                        <div className="p-4 bg-stone-50 border border-dashed border-stone-300 rounded-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-stone-600 uppercase font-black flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5" />
                              Google Drive Submissions
                            </span>
                            <span className="text-[9px] text-stone-400 font-mono">
                              Personal storage view-only share link
                            </span>
                          </div>

                          {driveFiles[q.id] ? (
                            <div className="flex items-center justify-between p-3 bg-white border border-stone-200 text-xs rounded-sm">
                              <div className="flex items-center gap-2 text-stone-700 font-mono truncate">
                                <FileText className="w-4 h-4 text-stone-500 flex-shrink-0" />
                                <span className="truncate max-w-[200px]">{driveFiles[q.id].name}</span>
                              </div>
                              <a
                                href={driveFiles[q.id].url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-[10px] text-blue-600 hover:underline flex items-center gap-1 ml-4"
                              >
                                View File <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <input
                                id={`drive-picker-${q.id}`}
                                type="file"
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv"
                                onChange={(e) => handleFileChange(q.id, e)}
                                disabled={!!activeAssignment.mySubmission || uploadActiveQ !== null}
                                className="hidden"
                              />
                              <label
                                htmlFor={`drive-picker-${q.id}`}
                                className={`font-mono text-[11px] uppercase border px-3 py-2 cursor-pointer transition-colors ${
                                  !!activeAssignment.mySubmission
                                    ? "bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed"
                                    : "bg-white border-stone-300 hover:border-stone-900 text-stone-700"
                                }`}
                              >
                                {uploadActiveQ === q.id ? `Uploading (${uploadProgress}%)` : "Upload to Google Drive"}
                              </label>
                              <span className="text-[10px] text-stone-500 font-sans italic">
                                Supports PDF, doc, audio logs.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Display feedback from coordinate if released */}
                    {isReleased && submissionAns?.feedback && (
                      <div className="mt-4 p-3 bg-stone-100 border-l-4 border-stone-500 rounded-sm">
                        <span className="font-mono text-[9px] text-stone-500 uppercase block font-black">
                          Assessor Feedback:
                        </span>
                        <p className="text-xs text-stone-700 italic font-medium">{submissionAns.feedback}</p>
                      </div>
                    )}

                    {/* Display Reference guides if objective was incorrect or subjective reference answer exists */}
                    {isReleased && activeAssignment.type === "subjective" && q.referenceAnswer && (
                      <div className="mt-3 p-3 bg-[#bef264]/10 border-l-4 border-[#bef264] rounded-sm text-xs text-stone-800">
                        <span className="font-mono text-[9px] text-stone-600 uppercase block font-bold">
                          Study Reference Answer Guide:
                        </span>
                        <p className="font-mono leading-relaxed mt-1 text-[11px] whitespace-pre-wrap">{q.referenceAnswer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* General Overall Submission Feedback if graded */}
            {activeAssignment.mySubmission && activeAssignment.released && activeAssignment.mySubmission.generalFeedback && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-600 text-emerald-950 font-sans rounded-none">
                <h4 className="text-emerald-900 font-black font-mono text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Overall Coordinator Evaluation
                </h4>
                <p className="text-xs leading-relaxed italic">{activeAssignment.mySubmission.generalFeedback}</p>
                {activeAssignment.mySubmission.gradedAt && (
                  <span className="block font-mono text-[9px] text-emerald-600 uppercase font-bold mt-2">
                    Graded on: {new Date(activeAssignment.mySubmission.gradedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}

            {/* Error alerts */}
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

            {/* Submission triggers */}
            {!activeAssignment.mySubmission ? (
              <button
                type="button"
                onClick={submitAssignment}
                disabled={submitting}
                className="w-full py-4 text-sm font-mono text-center font-extrabold bg-[#bef264] text-stone-950 hover:bg-[#a6d852] tracking-widest border-2 border-stone-900 shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
              >
                {submitting ? "VERIFYING EXAM MATRICES..." : "SUBMIT FINAL WORK"}
              </button>
            ) : !activeAssignment.released ? (
              <div className="p-4 border border-dashed border-amber-300 bg-amber-50 rounded-sm text-center">
                <p className="text-xs font-mono text-amber-800 flex items-center justify-center gap-1.5 font-bold">
                  <Lock className="w-4 h-4 text-amber-600" />
                  SUBMITTED ON {new Date(activeAssignment.mySubmission.submittedAt).toLocaleDateString()} — GRADING IN PROGRESS
                </p>
                <p className="text-[10px] text-stone-500 font-sans mt-1">
                  Correct answers and points will be revealed immediately when the instructor releases evaluated marks.
                </p>
              </div>
            ) : (
              <div className="p-4 border border-[#bef264] bg-[#bef264]/10 rounded-sm text-center">
                <p className="text-xs font-mono text-stone-950 font-bold">
                  ✓ EVALUATION FINISHED & MARKS RELEASED
                </p>
                <p className="text-[10px] text-stone-500 font-sans mt-0.5">
                  Points: {activeAssignment.mySubmission.totalScore} CP achieved. Review questions above for feedbacks.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="border-4 border-dashed border-stone-200 h-[450px] flex flex-col items-center justify-center text-center p-8 bg-white/50">
            <HelpCircle className="w-12 h-12 text-stone-300 mb-2 animate-bounce" />
            <h4 className="font-mono text-xs uppercase tracking-widest text-[#bef264] bg-stone-950 px-2 py-0.5 rounded-sm mb-2">
              Assignment Panel
            </h4>
            <p className="text-xs font-mono text-stone-400 max-w-sm leading-relaxed">
              Click on any active task or objective on the left sidebar boards to initiate attempts or review graded scores.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
