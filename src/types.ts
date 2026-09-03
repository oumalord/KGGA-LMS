export type Role = "learner" | "trainer" | "coordinator" | "admin" | "superadmin";

export interface Profile {
  id: string;
  authUserId: string;
  email: string;
  name: string;
  role: Role;
  status: "active" | "suspended";
  createdAt: number;
  mustChangePassword?: boolean;
  phone?: string;
  county?: string;
  dob?: string;
  guidingUnit?: string;
  category?: string;
  gender?: string;
}

export interface Lesson {
  id: string;
  title: string;
  type: "video" | "document" | "quiz" | "live" | "cat";
  durationMin?: number;
  contentSource?: "text" | "youtube" | "drive" | "upload";
  contentText?: string;
  youtubeUrl?: string;
  driveUrl?: string;
  resourceId?: string;
  fileName?: string;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  modules: Module[];
  trainerId: string;
  trainerName: string;
  published: boolean;
  coverColor: string;
  coverResourceId?: string | null;
  isPaid: boolean;
  price: number;
  certificateTemplate: { message: string; signatureLabel: string; backgroundResourceId?: string | null };
  createdAt: number;
}

export interface Purchase {
  id: string;
  courseId: string;
  courseTitle: string;
  userId: string;
  userName: string;
  amount: number;
  purchasedAt: number;
}

export interface Survey {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  rating: number;
  comments: string;
  submittedAt: number;
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  completedLessonIds: string[];
  progressPercent: number;
  enrolledAt: number;
  completedAt: number | null;
}

export interface Certificate {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  certNumber: string;
  issueDate: number;
  trainerName: string;
  message?: string;
  signatureLabel?: string;
  backgroundResourceId?: string | null;
}

export interface KEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  date: string;
  location: string;
  capacity: number;
  createdBy: string;
  createdByName: string;
  createdAt: number;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  checkedIn: boolean;
  registeredAt: number;
}

export interface Resource {
  id: string;
  title: string;
  category: string;
  path: string;
  fileName: string;
  contentType: string;
  uploadedBy: string;
  uploadedAt: number;
}

export interface KGGAVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  contentType: string;
  sourceType: "link" | "upload";
  uploadedBy: string;
  uploadedAt: number;
}

export interface Badge {
  id: string;
  userId: string;
  userName: string;
  badgeKey: string;
  label: string;
  courseId: string | null;
  courseTitle: string | null;
  earnedAt: number;
}

export interface Submission {
  id: string;
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  userId: string;
  userName: string;
  content: string;
  submittedAt: number;
  grade: string | null;
  feedback: string | null;
  reaction: string | null;
  gradedBy?: string;
  gradedAt?: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  details: string;
  timestamp: number;
}

export interface SiteSettings {
  orgName: string;
  tagline: string;
  logoText: string;
  logoImageUrl: string | null;
  certOrgName: string;
  heroImageUrl: string | null;
  certificateTemplateResourceId?: string | null;
}

export type Page =
  | "dashboard"
  | "courses"
  | "course-detail"
  | "certificates"
  | "events"
  | "resources"
  | "admin-users"
  | "google"
  | "settings"
  | "grading"
  | "students"
  | "profile"
  | "kgga-videos";
