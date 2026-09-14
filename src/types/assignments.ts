export interface AssignmentQuestion {
  _id?: string;
  id: string; // e.g. q1, q2
  questionText: string;
  options?: string[]; // for objective/multiple-choice
  correctAnswer?: string; // for objective (stored on server/revealed after release)
  referenceAnswer?: string; // for subjective
  marks: number;
}

export type AssignmentType = 'objective' | 'subjective';

export interface Assignment {
  _id: string;
  courseSlug: string;
  moduleId: string;
  title: string;
  description?: string;
  type: AssignmentType;
  allowAi: boolean;
  totalMarks: number;
  questions: AssignmentQuestion[];
  released: boolean;
  createdAt?: string;
  updatedAt?: string;
  mySubmission?: AssignmentSubmission | null;
}

export interface SubmissionAnswer {
  questionId: string;
  selectedOption?: string; // for objective
  textResponse?: string; // for subjective
  driveFileUrl?: string; // subjective upload link
  driveFileName?: string; // filename on drive
  marksObtained?: number;
  feedback?: string;
}

export interface AssignmentSubmission {
  _id: string;
  assignmentId: string;
  courseSlug: string;
  moduleId: string;
  studentId: string;
  studentEmail: string;
  studentName?: string;
  answers: SubmissionAnswer[];
  totalScore: number;
  status: 'submitted' | 'graded';
  generalFeedback?: string;
  submittedAt: string;
  gradedAt?: string;
  gradedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
