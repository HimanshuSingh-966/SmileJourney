export type ScreenType =
  | 'welcome'
  | 'home'
  | 'scan'
  | 'report'
  | 'specialists'
  | 'progress'
  | 'account';

export type FindingSeverity = 'none' | 'mild' | 'moderate' | 'severe';

export type IssueCategory =
  | 'crowding/alignment'
  | 'gaps'
  | 'discoloration'
  | 'gum line'
  | 'symmetry';

export interface FindingItem {
  id: string;
  title: string;
  severity: FindingSeverity;
  description: string;
  category: IssueCategory;
  icon?: string;
}

export interface MilestoneItem {
  id: string;
  date: string;
  dayLabel: string;
  score: number;
  scoreBadgeColor?: string;
  photoUrl: string;
  altText: string;
  title: string;
  description: string;
  tags: string[];
  assessmentId?: string;
  timestamp?: number;
  isLegacy?: boolean;
  hasFullReport?: boolean;
}

export interface ValidatedLegacyMilestone {
  id: string;
  score: number;
  photoUrl: string;
  date: string;
  timestamp: number;
  dayLabel: string;
  title: string;
  description: string;
  tags: string[];
  assessmentId?: string;
  isLegacy: true;
  hasFullReport: false;
}

export interface MilestoneComparison {
  baselineScore: number;
  currentScore: number;
  ptsDelta: number;
  isImproving: boolean;
  daysElapsed: number;
  velocitySummary: string;
}

export interface SpecialistRole {
  title: string;
  statusTag: string;
  isMatch: boolean;
  focus: string;
  description: string;
  highlight: string;
  highlightTag: string;
  icon: string;
}

export interface ConsultationQuestion {
  id: string;
  question: string;
  explanation: string;
  checked: boolean;
}

export interface CompletedAssessmentFinding {
  id: string;
  category: IssueCategory;
  title: string;
  severity: FindingSeverity;
  description: string;
  icon?: string;
}

export type BackendFinding = CompletedAssessmentFinding;
export type HistoricalFinding = CompletedAssessmentFinding;

export interface BackendSpecialistRecommendation {
  primarySpecialist?: string;
  coSpecialist?: string | null;
  notes?: string;
  reasons?: string[];
  discipline?: string;
}

export interface CompletedAssessmentResult {
  assessment_id: string;
  status: 'complete';
  score: number;
  findings: CompletedAssessmentFinding[];
  photo_url: string;
  created_at: string;
  completed_at?: string;
  specialist_recommendation?: BackendSpecialistRecommendation | null;
  consultation_questions?: ConsultationQuestion[];
}

export interface BackendAssessmentResult {
  assessment_id: string;
  status: 'complete' | 'failed' | 'processing' | 'pending';
  score?: number;
  findings?: CompletedAssessmentFinding[];
  specialist_recommendation?: BackendSpecialistRecommendation | null;
  consultation_questions?: ConsultationQuestion[];
  photo_url?: string;
  created_at?: string;
  completed_at?: string;
  error?: string;
}

export interface AssessmentSubmitResponse {
  assessment_id: string;
  status: 'processing' | 'pending' | 'complete' | 'failed';
  message?: string;
}

export interface AssessmentStatusResponse extends BackendAssessmentResult {}

export type HistoricalAssessment = CompletedAssessmentResult;

