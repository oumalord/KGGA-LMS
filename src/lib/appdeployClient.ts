type ApiResponse<T = unknown> = { data: T };

type ApiClient = {
  get: <T = unknown>(url: string) => Promise<ApiResponse<T>>;
  post: <T = unknown>(url: string, body?: unknown) => Promise<ApiResponse<T>>;
  put: <T = unknown>(url: string, body?: unknown) => Promise<ApiResponse<T>>;
  delete: <T = unknown>(url: string) => Promise<ApiResponse<T>>;
};

const DEFAULT_SETTINGS = {
  orgName: "KGGA LMS",
  tagline: "Empowering Girls Through Digital Learning, Leadership and Innovation.",
  logoText: "KG",
  logoImageUrl: null as string | null,
  certOrgName: "KENYA GIRL GUIDES ASSOCIATION",
  heroImageUrl: null as string | null,
};

const STORAGE_KEY = "kgga-lms-site-settings";
const AUTH_STORAGE_KEY = "kgga-lms-auth-session";
const AUTH_ID_KEY = "kgga-lms-auth-identifier";
const USERS_KEY = "kgga-lms-users-v2";
const COURSES_KEY = "kgga-lms-courses";
const ENROLLMENTS_KEY = "kgga-lms-enrollments";
const CERTIFICATES_KEY = "kgga-lms-certificates";
const RESOURCES_KEY = "kgga-lms-resources";
const VIDEOS_KEY = "kgga-lms-videos";
const SUBMISSIONS_KEY = "kgga-lms-submissions";

const MOCK_DASHBOARD_STATS = {
  totalLearners: 128,
  totalUsers: 142,
  totalCourses: 12,
  totalEvents: 6,
  certificatesIssued: 93,
  resourceCount: 18,
  adminCount: 4,
  adminCap: 8,
  avgCompletionRate: 76,
  totalEnrollments: 311,
};

const MOCK_COURSES = [
  {
    id: "course-1",
    title: "Leadership Essentials",
    description: "Build confidence, communication, and service leadership skills.",
    category: "Leadership",
    trainerId: "auth-trainer-1",
    trainerName: "KGGA Trainer",
    published: true,
    coverColor: "#0057B8",
    isPaid: false,
    price: 0,
    certificateTemplate: {
      message: "has successfully completed",
      signatureLabel: "Trainer",
      backgroundResourceId: null,
    },
    createdAt: Date.now(),
    modules: [
      {
        id: "module-1",
        title: "Leadership Foundations",
        lessons: [
          { id: "lesson-1", title: "Your Leadership Journey", type: "video", durationMin: 8, contentSource: "youtube", youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
          { id: "lesson-2", title: "Team Communication", type: "document", durationMin: 6, contentSource: "text", contentText: "Practice active listening, accountably leading, and documenting outcomes." },
          { id: "lesson-3", title: "Assessment Reflection", type: "quiz", durationMin: 5, contentSource: "text", contentText: "Summarize how you will apply leadership in your unit." },
        ],
      },
    ],
  },
];

function readStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorageJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getStoredUsers() {
  return readStorageJson(USERS_KEY, [] as any[]);
}

function writeStoredUsers(users: any[]) {
  writeStorageJson(USERS_KEY, users);
}

function getUserByIdentifier(identifier?: string | null) {
  const normalizedIdentifier = identifier?.trim().toLowerCase();
  if (!normalizedIdentifier) return null;

  return getStoredUsers().find((user: any) => {
    const email = (user.email || "").trim().toLowerCase();
    const phone = (user.phone || "").trim();
    return email === normalizedIdentifier || phone === normalizedIdentifier;
  }) ?? null;
}

function readStoredSettings() {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<typeof DEFAULT_SETTINGS>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeStoredSettings(next: Partial<typeof DEFAULT_SETTINGS>) {
  if (typeof window === "undefined") return;

  const merged = { ...readStoredSettings(), ...next };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

function getStoredCourses() {
  return readStorageJson(COURSES_KEY, MOCK_COURSES);
}

function writeStoredCourses(courses: typeof MOCK_COURSES) {
  writeStorageJson(COURSES_KEY, courses);
}

function getStoredEnrollments() {
  return readStorageJson(ENROLLMENTS_KEY, [] as any[]);
}

function writeStoredEnrollments(enrollments: any[]) {
  writeStorageJson(ENROLLMENTS_KEY, enrollments);
}

function getStoredCertificates() {
  return readStorageJson(CERTIFICATES_KEY, [] as any[]);
}

function writeStoredCertificates(certificates: any[]) {
  writeStorageJson(CERTIFICATES_KEY, certificates);
}

function getStoredSubmissions() {
  return readStorageJson(SUBMISSIONS_KEY, [] as any[]);
}

function writeStoredSubmissions(submissions: any[]) {
  writeStorageJson(SUBMISSIONS_KEY, submissions);
}

function getStoredResources() {
  return readStorageJson(RESOURCES_KEY, [] as any[]);
}

function writeStoredResources(resources: any[]) {
  writeStorageJson(RESOURCES_KEY, resources);
}

function getStoredVideos() {
  return readStorageJson(VIDEOS_KEY, [] as any[]);
}

function writeStoredVideos(videos: any[]) {
  writeStorageJson(VIDEOS_KEY, videos);
}

function getCurrentAuthProfile() {
  if (typeof window === "undefined") return null;
  const storedIdentifier = window.localStorage.getItem(AUTH_ID_KEY);
  return auth.isSignedIn() ? getUserByIdentifier(storedIdentifier) : null;
}

function makeCertificateNumber(courseId: string, userId: string) {
  return `KGGA-${new Date().getFullYear()}-${courseId.slice(-3).toUpperCase()}-${userId.slice(-3).toUpperCase()}`;
}

function issueCertificateForCourse(courseId: string, userId: string, userName: string, courseTitle: string, trainerName: string, message: string, signatureLabel: string, backgroundResourceId?: string | null) {
  const existing = getStoredCertificates().find((cert: any) => cert.courseId === courseId && cert.userId === userId);
  if (existing) return existing;

  const cert = {
    id: `cert-${Date.now()}`,
    userId,
    userName,
    courseId,
    courseTitle,
    certNumber: makeCertificateNumber(courseId, userId),
    issueDate: Date.now(),
    trainerName,
    message,
    signatureLabel,
    backgroundResourceId: backgroundResourceId ?? null,
  };

  const next = [...getStoredCertificates(), cert];
  writeStoredCertificates(next);
  return cert;
}

export const auth = {
  isSignedIn: () => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(AUTH_STORAGE_KEY) === "true";
  },
  signIn: async (identifier?: string, password?: string) => {
    if (typeof window !== "undefined") {
      const normalizedIdentifier = identifier?.trim().toLowerCase();
      const matchingProfile = getUserByIdentifier(normalizedIdentifier);
      const suppliedPassword = password?.trim();
      const hasValidPassword = suppliedPassword?.length;

      if (normalizedIdentifier && hasValidPassword && matchingProfile && matchingProfile.password === suppliedPassword) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
        window.localStorage.setItem(AUTH_ID_KEY, normalizedIdentifier);
        return { profile: matchingProfile };
      }

      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(AUTH_ID_KEY);
    }
    return { profile: null };
  },
  signOut: async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(AUTH_ID_KEY);
    }
    return undefined;
  },
};

export const api: ApiClient = {
  get: async <T = unknown>(url: string) => {
    if (url.includes("/api/public/courses")) {
      return { data: { courses: getStoredCourses() } as T };
    }

    if (url.includes("/api/public/videos")) {
      return { data: { videos: getStoredVideos() } as T };
    }

    if (url.includes("/api/settings/public")) {
      return { data: readStoredSettings() as T };
    }

    if (url.includes("/api/me")) {
      const profile = getCurrentAuthProfile();
      return {
        data: {
          profile,
          needsRoleSelection: false,
        },
      } as ApiResponse<T>;
    }

    if (url.includes("/api/admin/stats")) {
      return { data: MOCK_DASHBOARD_STATS as T };
    }

    if (url.includes("/api/my/courses")) {
      const profile = getCurrentAuthProfile();
      const enrollments = getStoredEnrollments().filter((entry: any) => entry.userId === profile?.authUserId);
      return { data: { enrollments } as T };
    }

    if (url.includes("/api/my/certificates")) {
      const profile = getCurrentAuthProfile();
      const certificates = getStoredCertificates().filter((entry: any) => entry.userId === profile?.authUserId);
      return { data: { certificates } as T };
    }

    if (url.includes("/api/my/submissions")) {
      const profile = getCurrentAuthProfile();
      const submissions = getStoredSubmissions().filter((entry: any) => entry.userId === profile?.authUserId);
      return { data: { submissions } as T };
    }

    if (url.includes("/api/my/badges")) {
      return { data: { badges: [] } as T };
    }

    if (url.includes("/api/resources/")) {
      const resourceId = url.split("/api/resources/")[1]?.split("/")[0];
      const resource = getStoredResources().find((entry: any) => entry.id === resourceId);
      return { data: { url: resource?.path || "" } as T };
    }

    if (url.includes("/api/videos")) {
      return { data: { videos: getStoredVideos() } as T };
    }

    if (url.includes("/api/courses/") && url.includes("/submissions")) {
      const courseId = url.split("/api/courses/")[1].split("/submissions")[0];
      const submissions = getStoredSubmissions().filter((entry: any) => entry.courseId === courseId);
      return { data: { submissions } as T };
    }

    if (url.includes("/api/courses/") && url.includes("/surveys")) {
      return { data: { surveys: [] } as T };
    }

    if (url.includes("/api/courses/")) {
      const courseId = url.split("/api/courses/")[1]?.split("/")[0];
      const course = getStoredCourses().find((entry: any) => entry.id === courseId);
      return { data: { course } as T };
    }

    if (url.includes("/api/courses")) {
      return { data: { courses: getStoredCourses() } as T };
    }

    if (url.includes("/api/users")) {
      return { data: { users: getStoredUsers() } as T };
    }

    if (url.includes("/api/audit-log")) {
      return { data: { logs: [] } as T };
    }

    if (url.includes("/api/events")) {
      return { data: { events: [] } as T };
    }

    if (url.includes("/api/my/events")) {
      return { data: { registrations: [] } as T };
    }

    if (url.includes("/api/my/purchases")) {
      return { data: { purchases: [] } as T };
    }

    if (url.includes("/api/integrations/google/status")) {
      return { data: { connected: false } as T };
    }

    return { data: {} as T };
  },
  post: async <T = unknown>(url: string, body?: unknown) => {
    if (url.includes("/api/settings/hero-image")) {
      const payload = body as { contentBase64?: string; contentType?: string };
      const contentType = payload?.contentType || "image/jpeg";
      const contentBase64 = payload?.contentBase64 || "";
      const heroImageUrl = `data:${contentType};base64,${contentBase64}`;
      writeStoredSettings({ heroImageUrl });
      return { data: { success: true, heroImageUrl } as T };
    }

    if (url.includes("/api/settings/logo-image")) {
      const payload = body as { contentBase64?: string; contentType?: string };
      const contentType = payload?.contentType || "image/png";
      const contentBase64 = payload?.contentBase64 || "";
      const logoImageUrl = `data:${contentType};base64,${contentBase64}`;
      writeStoredSettings({ logoImageUrl });
      return { data: { success: true, logoImageUrl } as T };
    }

    if (url.includes("/api/videos/upload")) {
      const payload = body as { title?: string; description?: string; contentBase64?: string; contentType?: string };
      const contentType = payload?.contentType || "video/mp4";
      const videoUrl = `data:${contentType};base64,${payload?.contentBase64 || ""}`;
      const video = { id: `video-${Date.now()}`, title: payload?.title || "KGGA Video", description: payload?.description || "", videoUrl, contentType, sourceType: "upload", uploadedBy: getCurrentAuthProfile()?.name || "Administrator", uploadedAt: Date.now() };
      writeStoredVideos([video, ...getStoredVideos()]);
      return { data: { video } as T };
    }

    if (url.includes("/api/videos")) {
      const payload = body as { title?: string; description?: string; videoUrl?: string };
      const video = { id: `video-${Date.now()}`, title: payload?.title || "KGGA Video", description: payload?.description || "", videoUrl: payload?.videoUrl || "", contentType: "video/*", sourceType: "link", uploadedBy: getCurrentAuthProfile()?.name || "Administrator", uploadedAt: Date.now() };
      writeStoredVideos([video, ...getStoredVideos()]);
      return { data: { video } as T };
    }

    if (url.includes("/api/me/role")) {
      const payload = body as { role?: string; name?: string; phone?: string; county?: string; dob?: string; guidingUnit?: string; gender?: string; password?: string };
      const phone = payload?.phone?.trim();
      const password = payload?.password?.trim();
      if (!phone || !password) return { data: { error: "Phone number and password are required." } as T };

      const existing = getStoredUsers().find((user: any) => user.phone === phone || user.email === `${phone.replace(/\D/g, "")}@student.kgga.local`);
      if (existing) return { data: { error: "A learner with this phone number already exists." } as T };

      const profile = {
        id: `student-${Date.now()}`,
        authUserId: `auth-student-${Date.now()}`,
        email: `${phone.replace(/\D/g, "")}@student.kgga.local`,
        name: payload?.name || "Learner",
        role: "learner",
        status: "active" as const,
        createdAt: Date.now(),
        phone,
        county: payload?.county,
        dob: payload?.dob,
        guidingUnit: payload?.guidingUnit,
        gender: payload?.gender,
        password,
      };
      const nextUsers = [...getStoredUsers(), profile];
      writeStoredUsers(nextUsers);
      return { data: { profile } as T };
    }

    if (url.includes("/api/staff/invite")) {
      const payload = body as { name?: string; email?: string; role?: string; password?: string };
      const password = payload?.password?.trim();
      const incomingRole = payload?.role === "admin" ? "admin" : "trainer";
      const adminCount = getStoredUsers().filter((user: any) => user.role === "admin").length;
      if (incomingRole === "admin" && adminCount >= 3) {
        return { data: { error: "Administrator capacity has been reached." } as T };
      }
      if (!password) return { data: { error: "A password is required." } as T };

      const user = {
        id: `staff-${Date.now()}`,
        authUserId: `auth-staff-${Date.now()}`,
        email: payload?.email || "",
        name: payload?.name || "New Staff Member",
        role: incomingRole,
        status: "active" as const,
        createdAt: Date.now(),
        password,
      };
      const nextUsers = [...getStoredUsers(), user];
      writeStoredUsers(nextUsers);
      return { data: { success: true, user } as T };
    }

    if (url.includes("/api/resources")) {
      const payload = body as { title?: string; category?: string; contentBase64?: string; contentType?: string; fileName?: string };
      const resource = {
        id: `resource-${Date.now()}`,
        title: payload?.title || "Certificate Template",
        category: payload?.category || "Certificate Templates",
        path: `data:${payload?.contentType || "image/png"};base64,${payload?.contentBase64 || ""}`,
        fileName: payload?.fileName || "certificate-template.png",
        contentType: payload?.contentType || "image/png",
        uploadedBy: getCurrentAuthProfile()?.authUserId || "system",
        uploadedAt: Date.now(),
      };
      const next = [...getStoredResources(), resource];
      writeStoredResources(next);
      return { data: resource as T };
    }

    if (url.includes("/api/courses/") && url.includes("/enroll")) {
      const courseId = url.split("/api/courses/")[1].split("/enroll")[0];
      const profile = getCurrentAuthProfile();
      if (!profile) return { data: { success: false } as T };
      const enrollment = {
        id: `enrollment-${Date.now()}`,
        courseId,
        userId: profile.authUserId,
        userName: profile.name,
        completedLessonIds: [],
        progressPercent: 0,
        enrolledAt: Date.now(),
        completedAt: null,
      };
      const next = [...getStoredEnrollments(), enrollment];
      writeStoredEnrollments(next);
      return { data: { enrollment } as T };
    }

    if (url.includes("/api/courses/") && url.includes("/lessons/") && url.includes("/complete")) {
      const courseId = url.split("/api/courses/")[1].split("/lessons/")[0];
      const lessonId = url.split("/lessons/")[1].split("/complete")[0];
      const profile = getCurrentAuthProfile();
      const course = getStoredCourses().find((entry: any) => entry.id === courseId);
      const enrollments = getStoredEnrollments();
      const existing = enrollments.find((entry: any) => entry.userId === profile?.authUserId && entry.courseId === courseId);
      const totalLessons = course?.modules?.reduce((sum: number, module: any) => sum + module.lessons.length, 0) || 0;
      const nextCompleted = existing?.completedLessonIds?.includes(lessonId) ? existing.completedLessonIds : [...(existing?.completedLessonIds || []), lessonId];
      const progressPercent = totalLessons > 0 ? Math.round((nextCompleted.length / totalLessons) * 100) : 0;

      const updatedEnrollment = {
        ...(existing || {
          id: `enrollment-${Date.now()}`,
          courseId,
          userId: profile?.authUserId,
          userName: profile?.name,
          completedLessonIds: [],
          progressPercent: 0,
          enrolledAt: Date.now(),
          completedAt: null,
        }),
        completedLessonIds: nextCompleted,
        progressPercent,
        completedAt: progressPercent >= 100 ? Date.now() : null,
      };

      const nextEnrollments = enrollments.filter((entry: any) => !(entry.userId === profile?.authUserId && entry.courseId === courseId));
      nextEnrollments.push(updatedEnrollment);
      writeStoredEnrollments(nextEnrollments);

      const certificate = progressPercent >= 100
        ? issueCertificateForCourse(
            courseId,
            profile?.authUserId || "learner",
            profile?.name || "Learner",
            course?.title || "Course",
            course?.trainerName || "Trainer",
            course?.certificateTemplate?.message || "has successfully completed",
            course?.certificateTemplate?.signatureLabel || "Trainer",
            course?.certificateTemplate?.backgroundResourceId,
          )
        : null;

      return { data: { certificate, newBadges: [] } as T };
    }

    if (url.includes("/api/courses/") && url.includes("/lessons/") && url.includes("/submit")) {
      const courseId = url.split("/api/courses/")[1].split("/lessons/")[0];
      const lessonId = url.split("/lessons/")[1].split("/submit")[0];
      const profile = getCurrentAuthProfile();
      const submission = {
        id: `submission-${Date.now()}`,
        courseId,
        courseTitle: getStoredCourses().find((entry: any) => entry.id === courseId)?.title || "Course",
        lessonId,
        lessonTitle: "Assessment Response",
        userId: profile?.authUserId || "learner",
        userName: profile?.name || "Learner",
        content: (body as any)?.content || "",
        submittedAt: Date.now(),
        grade: null,
        feedback: null,
        reaction: null,
      };
      const next = [...getStoredSubmissions(), submission];
      writeStoredSubmissions(next);
      return { data: { success: true } as T };
    }

    if (url.includes("/api/courses/") && url.includes("/survey")) {
      return { data: { success: true } as T };
    }

    return { data: {} as T };
  },
  put: async <T = unknown>(url: string, body?: unknown) => {
    if (url.includes("/api/settings")) {
      const payload = body as Partial<typeof DEFAULT_SETTINGS>;
      writeStoredSettings(payload);
      return { data: { success: true } as T };
    }

    if (url.includes("/api/courses/")) {
      const courseId = url.split("/api/courses/")[1];
      const courses = getStoredCourses();
      const nextCourses = courses.map((course: any) => {
        if (course.id !== courseId) return course;
        return {
          ...course,
          ...(body as any)?.certificateTemplate ? { certificateTemplate: { ...course.certificateTemplate, ...(body as any).certificateTemplate } } : {},
        };
      });
      writeStoredCourses(nextCourses);
      return { data: { success: true } as T };
    }

    if (url.includes("/api/users/") && url.includes("/suspend")) {
      const userId = url.split("/api/users/")[1].split("/suspend")[0];
      const users = getStoredUsers();
      const nextUsers = users.map((user: any) => user.id === userId ? { ...user, status: user.status === "active" ? "suspended" : "active" } : user);
      writeStoredUsers(nextUsers);
      return { data: { success: true } as T };
    }

    return { data: {} as T };
  },
  delete: async <T = unknown>(url: string) => {
    if (url.includes("/api/users/")) {
      const userId = url.split("/api/users/")[1];
      const nextUsers = getStoredUsers().filter((user: any) => user.id !== userId);
      writeStoredUsers(nextUsers);
      return { data: { success: true } as T };
    }

    if (url.includes("/api/videos/")) {
      const videoId = url.split("/api/videos/")[1];
      writeStoredVideos(getStoredVideos().filter((video: any) => video.id !== videoId));
      return { data: { success: true } as T };
    }

    return { data: {} as T };
  },
};
