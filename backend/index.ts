import { router, json, error, db, storage, secrets, requireAuth } from "@appdeploy/sdk";

// ---------- helpers ----------

type Role = "learner" | "trainer" | "coordinator" | "admin" | "superadmin";

interface UserRecord {
  authUserId: string;
  email: string;
  name: string;
  role: Role;
  status: "active" | "suspended";
  createdAt: number;
  phone?: string;
  county?: string;
  dob?: string;
  guidingUnit?: string;
  gender?: string;
}

const MAX_ADMINS = 3;

async function getUserByAuthId(authUserId: string) {
  const { items } = await db.list<UserRecord>("users", { filter: { authUserId } });
  return items[0] ?? null;
}

async function getPendingByEmail(email: string) {
  if (!email) return null;
  const { items } = await db.list<UserRecord>("users", { filter: { email } });
  return items.find((u) => u.authUserId.startsWith("roster-") || u.authUserId.startsWith("invite-")) ?? null;
}

async function requireProfile(ctx: any) {
  const u = ctx.user!;
  const profile = await getUserByAuthId(u.userId);
  return profile;
}

function isStaff(role?: string) {
  return role === "admin" || role === "superadmin";
}

function isSuper(role?: string) {
  return role === "superadmin";
}

function isCourseCreator(role?: string) {
  return role === "trainer" || role === "coordinator" || role === "admin" || role === "superadmin";
}

async function writeAudit(actorId: string, actorName: string, action: string, target: string, details: string) {
  await db.add("audit_log", [{ actorId, actorName, action, target, details, timestamp: Date.now() }]);
}

function genCertNumber() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KGGA-${new Date().getFullYear()}-${rand}`;
}

const PROGRESS_BADGES: { threshold: number; key: string; label: string }[] = [
  { threshold: 25, key: "quarter", label: "Quarter Way" },
  { threshold: 50, key: "halfway", label: "Halfway There" },
  { threshold: 75, key: "almost", label: "Almost There" },
  { threshold: 100, key: "graduate", label: "Course Champion" },
];

async function awardBadge(userId: string, userName: string, badgeKey: string, label: string, courseId: string | null, courseTitle: string | null) {
  const filter: any = { userId, badgeKey };
  if (courseId) filter.courseId = courseId;
  const { items } = await db.list("badges", { filter });
  if (items.length > 0) return null;
  const record = { userId, userName, badgeKey, label, courseId, courseTitle, earnedAt: Date.now() };
  const [id] = await db.add("badges", [record]);
  return { id, ...record };
}

async function getSettings() {
  const { items } = await db.list<any>("settings", { filter: { key: "site" }, limit: 1 });
  return items[0] ?? null;
}

async function saveSettings(patch: any) {
  const existing = await getSettings();
  const merged = { key: "site", ...existing, ...patch };
  if (existing?.id) {
    await db.update("settings", [{ id: existing.id, record: merged }]);
  } else {
    await db.add("settings", [merged]);
  }
  return merged;
}

// ---------- route handlers ----------

export const handler = router({
  // Bootstraps the calling user's profile. First-ever user becomes Super Administrator.
  // Everyone else must choose their role via POST /api/me/role before a profile is created,
  // unless the Super Administrator has already pre-invited them by email.
  "GET /api/me": [
    requireAuth(),
    async (ctx) => {
      const u = ctx.user!;
      let profile = await getUserByAuthId(u.userId);
      if (!profile) {
        const pending = await getPendingByEmail(u.email ?? "");
        if (pending) {
          const [ok] = await db.update("users", [{ id: (pending as any).id, record: { ...pending, authUserId: u.userId } }]);
          if (ok) {
            profile = { ...pending, authUserId: u.userId } as any;
            await writeAudit(u.userId, profile!.name, "ACCOUNT_ACTIVATED", profile!.email, `Activated pre-created ${profile!.role} account`);
            return json({ profile });
          }
        }
        const { items: anyUsers } = await db.list("users", { limit: 1 });
        if (anyUsers.length === 0) {
          const record: UserRecord = {
            authUserId: u.userId,
            email: u.email ?? "",
            name: u.name ?? u.email ?? "Guide Member",
            role: "superadmin",
            status: "active",
            createdAt: Date.now(),
          };
          const [id] = await db.add("users", [record]);
          profile = { id: id!, ...record } as any;
          await writeAudit(u.userId, record.name, "BOOTSTRAP_SUPERADMIN", u.userId, "First sign-in became Super Administrator");
        } else {
          return json({ profile: null, needsRoleSelection: true });
        }
      }
      return json({ profile });
    },
  ],

  "POST /api/me/role": [
    requireAuth(),
    async (ctx) => {
      const u = ctx.user!;
      const existing = await getUserByAuthId(u.userId);
      if (existing) return error("Profile already exists", 400);
      const body = ctx.body as {
        role: "learner";
        name?: string;
        phone?: string;
        county?: string;
        dob?: string;
        guidingUnit?: string;
        gender?: string;
      };
      // Public self-registration only ever creates Learner (Student) accounts.
      // Administrator and Tutor accounts are created by the Super Administrator.
      const record: UserRecord = {
        authUserId: u.userId,
        email: u.email ?? "",
        name: (body.name?.trim() || u.name || u.email || "Guide Member") as string,
        role: "learner",
        status: "active",
        createdAt: Date.now(),
        phone: body.phone ?? "",
        county: body.county ?? "",
        dob: body.dob ?? "",
        guidingUnit: body.guidingUnit ?? "",
        gender: body.gender ?? "",
      };
      const [id] = await db.add("users", [record]);
      await writeAudit(u.userId, record.name, "SELF_ONBOARD", record.email, "Joined as learner");
      return json({ profile: { id, ...record } });
    },
  ],

  // ---------- Users / RBAC (Super Administrator only) ----------
  "GET /api/users": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isStaff(me.role)) return error("Forbidden", 403);
      const { items } = await db.list<UserRecord>("users", { limit: 500 });
      return json({ users: items });
    },
  ],

  "POST /api/staff/invite": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isSuper(me.role)) return error("Only the Super Administrator can create Administrator or Tutor accounts", 403);
      const body = ctx.body as { name: string; email: string; role: "admin" | "trainer" };
      if (!body.name?.trim() || !body.email?.trim()) return error("Name and email are required", 400);
      if (!["admin", "trainer"].includes(body.role)) return error("Invalid role", 400);
      const { items: existing } = await db.list<UserRecord>("users", { filter: { email: body.email.trim() } });
      if (existing.length > 0) return error("A user with this email already exists", 400);
      if (body.role === "admin") {
        const { items: admins } = await db.list<UserRecord>("users", { filter: { role: "admin" }, limit: 50 });
        if (admins.length >= MAX_ADMINS) {
          return error(`Maximum number of administrators reached (${MAX_ADMINS}/${MAX_ADMINS}).`, 400);
        }
      }
      const record: UserRecord = {
        authUserId: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        email: body.email.trim(),
        name: body.name.trim(),
        role: body.role,
        status: "active",
        createdAt: Date.now(),
      };
      const [id] = await db.add("users", [record]);
      await writeAudit(ctx.user!.userId, me.name, "INVITE_STAFF", record.email, `Invited as ${body.role}`);
      return json({ id, staff: { id, ...record } });
    },
  ],

  "POST /api/users/:id/suspend": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isStaff(me.role)) return error("Forbidden", 403);
      const targetId = ctx.params.id;
      const [target] = await db.get<UserRecord>("users", [targetId]);
      if (!target) return error("User not found", 404);
      if (target.role === "superadmin") return error("Cannot suspend the Super Administrator", 400);
      if ((target.role === "admin" || target.role === "trainer") && !isSuper(me.role)) return error("Only the Super Administrator can suspend staff accounts", 403);
      const newStatus = target.status === "suspended" ? "active" : "suspended";
      await db.update("users", [{ id: targetId, record: { ...target, status: newStatus } }]);
      await writeAudit(ctx.user!.userId, me.name, "SUSPEND_TOGGLE", target.email, `Status set to ${newStatus}`);
      return json({ success: true, status: newStatus });
    },
  ],

  "DELETE /api/users/:id": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const targetId = ctx.params.id;
      const [target] = await db.get<UserRecord>("users", [targetId]);
      if (!target) return error("User not found", 404);
      if (target.role === "superadmin") return error("Cannot delete the Super Administrator", 400);
      const allowed = me.role === "superadmin" || (isStaff(me.role) && target.role === "learner");
      if (!allowed) return error("Only the Super Administrator can delete this account", 403);
      await db.delete("users", [targetId]);
      await writeAudit(ctx.user!.userId, me.name, "DELETE_USER", target.email, "Account deleted");
      return json({ success: true });
    },
  ],

  "POST /api/students": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isCourseCreator(me.role)) return error("Forbidden", 403);
      const body = ctx.body as { name: string; email: string };
      if (!body.name?.trim() || !body.email?.trim()) return error("Name and email are required", 400);
      const { items: existing } = await db.list<UserRecord>("users", { filter: { email: body.email.trim() } });
      if (existing.length > 0) return error("A user with this email already exists", 400);
      const record: UserRecord = {
        authUserId: `roster-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        email: body.email.trim(),
        name: body.name.trim(),
        role: "learner",
        status: "active",
        createdAt: Date.now(),
      };
      const [id] = await db.add("users", [record]);
      await writeAudit(ctx.user!.userId, me.name, "ADD_STUDENT", record.email, "Added to roster");
      return json({ id, student: { id, ...record } });
    },
  ],

  "GET /api/audit-log": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isSuper(me.role)) return error("Forbidden", 403);
      const { items } = await db.list("audit_log", { limit: 200 });
      items.sort((a: any, b: any) => b.timestamp - a.timestamp);
      return json({ logs: items });
    },
  ],

  // ---------- Site Settings (Super Administrator only) ----------
  "GET /api/settings/public": [
    async () => {
      const settings = await getSettings();
      let heroImageUrl: string | null = null;
      let logoImageUrl: string | null = settings?.logoImageUrl || null;
      if (settings?.heroImagePath) {
        try {
          const [{ url }] = await storage.url([settings.heroImagePath]);
          heroImageUrl = url;
        } catch {
          heroImageUrl = null;
        }
      }
      if (settings?.logoImagePath) {
        try {
          const [{ url }] = await storage.url([settings.logoImagePath]);
          logoImageUrl = url;
        } catch {
          logoImageUrl = null;
        }
      }
      return json({
        orgName: settings?.orgName || "KGGA LMS",
        tagline: settings?.tagline || "Empowering Girls Through Digital Learning, Leadership and Innovation.",
        logoText: settings?.logoText || "KG",
        logoImageUrl,
        certOrgName: settings?.certOrgName || "KENYA GIRL GUIDES ASSOCIATION",
        heroImageUrl,
      });
    },
  ],

  "PUT /api/settings": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isSuper(me.role)) return error("Only the Super Administrator can change site settings", 403);
      const body = ctx.body as { orgName?: string; tagline?: string; logoText?: string; certOrgName?: string };
      await saveSettings(body);
      await writeAudit(ctx.user!.userId, me.name, "UPDATE_SETTINGS", "site", "Updated site settings");
      return json({ success: true });
    },
  ],

  "POST /api/settings/hero-image": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isSuper(me.role)) return error("Only the Super Administrator can change the site image", 403);
      const body = ctx.body as { contentBase64: string; contentType: string };
      const path = `site/hero-${Date.now()}`;
      const [ok] = await storage.write([{ path, content: body.contentBase64, contentType: body.contentType }]);
      if (!ok) return error("Upload failed", 500);
      await saveSettings({ heroImagePath: path });
      const [{ url }] = await storage.url([path]);
      await writeAudit(ctx.user!.userId, me.name, "UPDATE_HERO_IMAGE", "site", "Updated homepage image");
      return json({ success: true, heroImageUrl: url });
    },
  ],

  "POST /api/settings/logo-image": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isSuper(me.role)) return error("Only the Super Administrator can change the site logo", 403);
      const body = ctx.body as { contentBase64: string; contentType: string };
      const path = `site/logo-${Date.now()}`;
      const [ok] = await storage.write([{ path, content: body.contentBase64, contentType: body.contentType }]);
      if (!ok) return error("Upload failed", 500);
      await saveSettings({ logoImagePath: path });
      const [{ url }] = await storage.url([path]);
      await writeAudit(ctx.user!.userId, me.name, "UPDATE_LOGO_IMAGE", "site", "Updated site logo");
      return json({ success: true, logoImageUrl: url });
    },
  ],

  // ---------- Courses ----------
  "GET /api/public/courses": [
    async () => {
      const { items } = await db.list("courses", { limit: 12 });
      const preview = (items as any[])
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 8)
        .map((c) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          trainerName: c.trainerName,
          isPaid: c.isPaid,
          price: c.price,
          coverColor: c.coverColor,
          lessonCount: (c.modules ?? []).reduce((s: number, m: any) => s + (m.lessons?.length ?? 0), 0),
        }));
      return json({ courses: preview });
    },
  ],

  "GET /api/courses": [
    requireAuth(),
    async () => {
      const { items } = await db.list("courses", { limit: 200 });
      return json({ courses: items });
    },
  ],

  "POST /api/courses": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isCourseCreator(me.role)) return error("Only trainers, coordinators, or admins can create courses", 403);
      const body = ctx.body as any;
      const record = {
        title: body.title,
        description: body.description ?? "",
        category: body.category ?? "General",
        modules: body.modules ?? [],
        trainerId: me.authUserId,
        trainerName: me.name,
        published: true,
        coverColor: body.coverColor ?? "#0057B8",
        isPaid: !!body.isPaid,
        price: body.isPaid ? Number(body.price) || 0 : 0,
        certificateTemplate: body.certificateTemplate ?? {
          message: "has successfully completed",
          signatureLabel: "Trainer",
        },
        createdAt: Date.now(),
      };
      const [id] = await db.add("courses", [record]);
      await writeAudit(ctx.user!.userId, me.name, "CREATE_COURSE", record.title, "Course created");
      return json({ id, course: { id, ...record } });
    },
  ],

  "GET /api/courses/:id": [
    requireAuth(),
    async (ctx) => {
      const [course] = await db.get("courses", [ctx.params.id]);
      if (!course) return error("Course not found", 404);
      return json({ course: { id: ctx.params.id, ...course } });
    },
  ],

  "PUT /api/courses/:id": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      const [course] = await db.get<any>("courses", [ctx.params.id]);
      if (!course) return error("Course not found", 404);
      if (!me || (me.authUserId !== course.trainerId && !isStaff(me.role))) return error("Forbidden", 403);
      const body = ctx.body as any;
      const updated = { ...course, ...body };
      await db.update("courses", [{ id: ctx.params.id, record: updated }]);
      return json({ success: true });
    },
  ],

  "DELETE /api/courses/:id": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      const [course] = await db.get<any>("courses", [ctx.params.id]);
      if (!course) return error("Course not found", 404);
      if (!me || (me.authUserId !== course.trainerId && !isStaff(me.role))) return error("Forbidden", 403);
      await db.delete("courses", [ctx.params.id]);
      return json({ success: true });
    },
  ],

  "POST /api/courses/:id/enroll": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const courseId = ctx.params.id;
      const [course] = await db.get<any>("courses", [courseId]);
      if (!course) return error("Course not found", 404);
      if (course.isPaid && me.authUserId !== course.trainerId && !isStaff(me.role)) {
        const { items: purchases } = await db.list("purchases", { filter: { courseId, userId: me.authUserId } });
        if (purchases.length === 0) return error("This course requires payment before enrolling", 402);
      }
      const { items: existing } = await db.list("enrollments", { filter: { courseId, userId: me.authUserId } });
      if (existing.length > 0) return json({ success: true, alreadyEnrolled: true });
      await db.add("enrollments", [
        { courseId, userId: me.authUserId, userName: me.name, completedLessonIds: [], progressPercent: 0, enrolledAt: Date.now(), completedAt: null },
      ]);
      const badge = await awardBadge(me.authUserId, me.name, "first_step", "First Step", null, null);
      return json({ success: true, badge });
    },
  ],

  "POST /api/courses/:id/purchase": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const courseId = ctx.params.id;
      const [course] = await db.get<any>("courses", [courseId]);
      if (!course) return error("Course not found", 404);
      const { items: existing } = await db.list("purchases", { filter: { courseId, userId: me.authUserId } });
      if (existing.length === 0) {
        await db.add("purchases", [
          { courseId, courseTitle: course.title, userId: me.authUserId, userName: me.name, amount: course.price ?? 0, purchasedAt: Date.now() },
        ]);
      }
      return json({ success: true });
    },
  ],

  "GET /api/my/purchases": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const { items } = await db.list("purchases", { filter: { userId: me.authUserId }, limit: 300 });
      return json({ purchases: items });
    },
  ],

  "POST /api/courses/:id/survey": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const courseId = ctx.params.id;
      const body = ctx.body as { rating: number; comments: string };
      const { items: existing } = await db.list("surveys", { filter: { courseId, userId: me.authUserId } });
      if (existing.length > 0) {
        await db.update("surveys", [{ id: existing[0].id, record: { ...existing[0], rating: body.rating, comments: body.comments, submittedAt: Date.now() } }]);
      } else {
        await db.add("surveys", [{ courseId, userId: me.authUserId, userName: me.name, rating: body.rating, comments: body.comments, submittedAt: Date.now() }]);
      }
      return json({ success: true });
    },
  ],

  "GET /api/courses/:id/surveys": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      const [course] = await db.get<any>("courses", [ctx.params.id]);
      if (!course) return error("Course not found", 404);
      if (!me || (me.authUserId !== course.trainerId && !isStaff(me.role))) return error("Forbidden", 403);
      const { items } = await db.list("surveys", { filter: { courseId: ctx.params.id }, limit: 500 });
      return json({ surveys: items });
    },
  ],

  "GET /api/courses/:id/students": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      const [course] = await db.get<any>("courses", [ctx.params.id]);
      if (!course) return error("Course not found", 404);
      if (!me || (me.authUserId !== course.trainerId && !isStaff(me.role))) return error("Forbidden", 403);
      const { items: enrollments } = await db.list("enrollments", { filter: { courseId: ctx.params.id }, limit: 500 });
      const { items: certs } = await db.list("certificates", { filter: { courseId: ctx.params.id }, limit: 500 });
      const certByUser = new Map((certs as any[]).map((c) => [c.userId, c]));
      const students = (enrollments as any[]).map((e) => ({ ...e, certificate: certByUser.get(e.userId) ?? null }));
      return json({ students });
    },
  ],

  "POST /api/courses/:id/lessons/:lessonId/complete": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const courseId = ctx.params.id;
      const [course] = await db.get<any>("courses", [courseId]);
      if (!course) return error("Course not found", 404);
      const { items } = await db.list<any>("enrollments", { filter: { courseId, userId: me.authUserId } });
      const enrollment = items[0];
      if (!enrollment) return error("Not enrolled in this course", 400);

      const lessonId = ctx.params.lessonId;
      const completed: string[] = enrollment.completedLessonIds ?? [];
      if (!completed.includes(lessonId)) completed.push(lessonId);

      const totalLessons = (course.modules ?? []).reduce((sum: number, m: any) => sum + (m.lessons?.length ?? 0), 0);
      const progressPercent = totalLessons > 0 ? Math.round((completed.length / totalLessons) * 100) : 0;
      const justCompleted = progressPercent >= 100 && enrollment.progressPercent < 100;
      const previousPercent = enrollment.progressPercent;

      await db.update("enrollments", [
        {
          id: enrollment.id,
          record: { ...enrollment, completedLessonIds: completed, progressPercent, completedAt: justCompleted ? Date.now() : enrollment.completedAt },
        },
      ]);

      const newBadges = [];
      for (const b of PROGRESS_BADGES) {
        if (progressPercent >= b.threshold && previousPercent < b.threshold) {
          const badge = await awardBadge(me.authUserId, me.name, b.key, b.label, courseId, course.title);
          if (badge) newBadges.push(badge);
        }
      }

      let certificate = null;
      if (justCompleted) {
        const { items: existingCerts } = await db.list("certificates", { filter: { courseId, userId: me.authUserId } });
        if (existingCerts.length === 0) {
          const certRecord = {
            userId: me.authUserId,
            userName: me.name,
            courseId,
            courseTitle: course.title,
            certNumber: genCertNumber(),
            issueDate: Date.now(),
            trainerName: course.trainerName,
            message: course.certificateTemplate?.message ?? "has successfully completed",
            signatureLabel: course.certificateTemplate?.signatureLabel ?? "Trainer",
          };
          const [certId] = await db.add("certificates", [certRecord]);
          certificate = { id: certId, ...certRecord };
        }
      }

      return json({ success: true, progressPercent, certificate, newBadges });
    },
  ],

  "GET /api/my/courses": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const { items } = await db.list<any>("enrollments", { filter: { userId: me.authUserId }, limit: 200 });
      return json({ enrollments: items });
    },
  ],

  "GET /api/my/certificates": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const { items } = await db.list("certificates", { filter: { userId: me.authUserId }, limit: 200 });
      return json({ certificates: items });
    },
  ],

  "GET /api/certificates/verify/:certNumber": [
    async (ctx) => {
      const { items } = await db.list("certificates", { limit: 500 });
      const cert = (items as any[]).find((c) => c.certNumber === ctx.params.certNumber);
      if (!cert) return json({ valid: false });
      return json({ valid: true, certificate: cert });
    },
  ],

  "GET /api/my/badges": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const { items } = await db.list("badges", { filter: { userId: me.authUserId }, limit: 200 });
      (items as any[]).sort((a, b) => b.earnedAt - a.earnedAt);
      return json({ badges: items });
    },
  ],

  // ---------- Notes (per-module, private to each learner) ----------
  "GET /api/courses/:id/modules/:moduleId/notes": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const { items } = await db.list<any>("notes", {
        filter: { courseId: ctx.params.id, moduleId: ctx.params.moduleId, userId: me.authUserId },
      });
      return json({ content: items[0]?.content ?? "" });
    },
  ],

  "POST /api/courses/:id/modules/:moduleId/notes": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const body = ctx.body as { content: string };
      const { items } = await db.list<any>("notes", {
        filter: { courseId: ctx.params.id, moduleId: ctx.params.moduleId, userId: me.authUserId },
      });
      if (items.length > 0) {
        await db.update("notes", [{ id: items[0].id, record: { ...items[0], content: body.content, updatedAt: Date.now() } }]);
      } else {
        await db.add("notes", [
          { courseId: ctx.params.id, moduleId: ctx.params.moduleId, userId: me.authUserId, content: body.content, updatedAt: Date.now() },
        ]);
      }
      return json({ success: true });
    },
  ],

  // ---------- Submissions & Grading (Trainer/Admin) ----------
  "POST /api/courses/:id/lessons/:lessonId/submit": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const courseId = ctx.params.id;
      const lessonId = ctx.params.lessonId;
      const body = ctx.body as { content: string };
      const [course] = await db.get<any>("courses", [courseId]);
      if (!course) return error("Course not found", 404);
      let lessonTitle = "";
      for (const m of course.modules ?? []) {
        const l = (m.lessons ?? []).find((x: any) => x.id === lessonId);
        if (l) lessonTitle = l.title;
      }
      const { items: existing } = await db.list<any>("submissions", { filter: { courseId, lessonId, userId: me.authUserId } });
      if (existing.length > 0) {
        await db.update("submissions", [
          { id: existing[0].id, record: { ...existing[0], content: body.content, submittedAt: Date.now(), grade: null, feedback: null, reaction: null } },
        ]);
      } else {
        await db.add("submissions", [
          {
            courseId,
            courseTitle: course.title,
            lessonId,
            lessonTitle,
            userId: me.authUserId,
            userName: me.name,
            content: body.content,
            submittedAt: Date.now(),
            grade: null,
            feedback: null,
            reaction: null,
          },
        ]);
      }
      return json({ success: true });
    },
  ],

  "GET /api/courses/:id/submissions": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      const [course] = await db.get<any>("courses", [ctx.params.id]);
      if (!course) return error("Course not found", 404);
      if (!me || (me.authUserId !== course.trainerId && !isStaff(me.role))) return error("Forbidden", 403);
      const { items } = await db.list("submissions", { filter: { courseId: ctx.params.id }, limit: 500 });
      (items as any[]).sort((a, b) => b.submittedAt - a.submittedAt);
      return json({ submissions: items });
    },
  ],

  "GET /api/my/submissions": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const { items } = await db.list("submissions", { filter: { userId: me.authUserId }, limit: 500 });
      return json({ submissions: items });
    },
  ],

  "POST /api/submissions/:id/grade": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      const [submission] = await db.get<any>("submissions", [ctx.params.id]);
      if (!submission) return error("Submission not found", 404);
      const [course] = await db.get<any>("courses", [submission.courseId]);
      if (!me || (course && me.authUserId !== course.trainerId && !isStaff(me.role))) return error("Forbidden", 403);
      const body = ctx.body as { grade: string; feedback: string };
      await db.update("submissions", [
        { id: ctx.params.id, record: { ...submission, grade: body.grade, feedback: body.feedback, gradedBy: me.name, gradedAt: Date.now() } },
      ]);
      await writeAudit(ctx.user!.userId, me.name, "GRADE_SUBMISSION", submission.userName, `Graded "${submission.lessonTitle}" — ${body.grade}`);
      return json({ success: true });
    },
  ],

  "POST /api/submissions/:id/react": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      const [submission] = await db.get<any>("submissions", [ctx.params.id]);
      if (!submission) return error("Submission not found", 404);
      const [course] = await db.get<any>("courses", [submission.courseId]);
      if (!me || (course && me.authUserId !== course.trainerId && !isStaff(me.role))) return error("Forbidden", 403);
      const body = ctx.body as { reaction: string };
      await db.update("submissions", [{ id: ctx.params.id, record: { ...submission, reaction: body.reaction } }]);
      return json({ success: true });
    },
  ],

  // ---------- Events ----------
  "GET /api/events": [
    requireAuth(),
    async () => {
      const { items } = await db.list("events", { limit: 200 });
      return json({ events: items });
    },
  ],

  "POST /api/events": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isCourseCreator(me.role)) return error("Forbidden", 403);
      const body = ctx.body as any;
      const record = {
        title: body.title,
        description: body.description ?? "",
        type: body.type ?? "Workshop",
        date: body.date,
        location: body.location ?? "TBA",
        capacity: body.capacity ?? 50,
        createdBy: me.authUserId,
        createdByName: me.name,
        createdAt: Date.now(),
      };
      const [id] = await db.add("events", [record]);
      await writeAudit(ctx.user!.userId, me.name, "CREATE_EVENT", record.title, "Event created");
      return json({ id, event: { id, ...record } });
    },
  ],

  "POST /api/events/:id/register": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const eventId = ctx.params.id;
      const { items: existing } = await db.list("event_registrations", { filter: { eventId, userId: me.authUserId } });
      if (existing.length > 0) return json({ success: true, alreadyRegistered: true });
      await db.add("event_registrations", [
        { eventId, userId: me.authUserId, userName: me.name, checkedIn: false, registeredAt: Date.now() },
      ]);
      return json({ success: true });
    },
  ],

  "GET /api/events/:id/registrations": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isCourseCreator(me.role)) return error("Forbidden", 403);
      const { items } = await db.list("event_registrations", { filter: { eventId: ctx.params.id }, limit: 500 });
      return json({ registrations: items });
    },
  ],

  "POST /api/events/registrations/:regId/checkin": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isCourseCreator(me.role)) return error("Forbidden", 403);
      const [reg] = await db.get<any>("event_registrations", [ctx.params.regId]);
      if (!reg) return error("Registration not found", 404);
      await db.update("event_registrations", [{ id: ctx.params.regId, record: { ...reg, checkedIn: true } }]);
      return json({ success: true });
    },
  ],

  "GET /api/my/events": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const { items } = await db.list("event_registrations", { filter: { userId: me.authUserId }, limit: 200 });
      return json({ registrations: items });
    },
  ],

  // ---------- Resources ----------
  "GET /api/resources": [
    requireAuth(),
    async () => {
      const { items } = await db.list("resources", { limit: 300 });
      return json({ resources: items });
    },
  ],

  "POST /api/resources": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me) return error("Forbidden", 403);
      const body = ctx.body as { title: string; category: string; contentBase64: string; contentType: string; fileName: string };
      const path = `resources/${Date.now()}-${body.fileName}`;
      const [ok] = await storage.write([{ path, content: body.contentBase64, contentType: body.contentType }]);
      if (!ok) return error("Upload failed", 500);
      const record = {
        title: body.title,
        category: body.category || "General",
        path,
        fileName: body.fileName,
        contentType: body.contentType,
        uploadedBy: me.name,
        uploadedAt: Date.now(),
      };
      const [id] = await db.add("resources", [record]);
      return json({ id, resource: { id, ...record } });
    },
  ],

  "GET /api/resources/:id/url": [
    requireAuth(),
    async (ctx) => {
      const [resource] = await db.get<any>("resources", [ctx.params.id]);
      if (!resource) return error("Not found", 404);
      const [{ url }] = await storage.url([resource.path]);
      return json({ url });
    },
  ],

  "DELETE /api/resources/:id": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isStaff(me.role)) return error("Forbidden", 403);
      const [resource] = await db.get<any>("resources", [ctx.params.id]);
      if (!resource) return error("Not found", 404);
      await storage.delete([resource.path]);
      await db.delete("resources", [ctx.params.id]);
      return json({ success: true });
    },
  ],

  // ---------- Admin dashboard stats (Super Administrator only) ----------
  "GET /api/admin/stats": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isSuper(me.role)) return error("Forbidden", 403);
      const [{ items: users }, { items: courses }, { items: events }, { items: certs }, { items: resources }, { items: enrollments }] =
        await Promise.all([
          db.list("users", { limit: 1000 }),
          db.list("courses", { limit: 1000 }),
          db.list("events", { limit: 1000 }),
          db.list("certificates", { limit: 1000 }),
          db.list("resources", { limit: 1000 }),
          db.list<any>("enrollments", { limit: 2000 }),
        ]);
      const learners = (users as any[]).filter((u) => u.role === "learner").length;
      const admins = (users as any[]).filter((u) => u.role === "admin").length;
      const avgCompletion =
        enrollments.length > 0
          ? Math.round(enrollments.reduce((s: number, e: any) => s + (e.progressPercent ?? 0), 0) / enrollments.length)
          : 0;
      return json({
        totalLearners: learners,
        totalUsers: users.length,
        totalCourses: courses.length,
        totalEvents: events.length,
        certificatesIssued: certs.length,
        resourceCount: resources.length,
        adminCount: admins,
        adminCap: MAX_ADMINS,
        avgCompletionRate: avgCompletion,
        totalEnrollments: enrollments.length,
      });
    },
  ],

  // ---------- Google Workspace integration status (Super Administrator only) ----------
  "GET /api/integrations/google/status": [
    requireAuth(),
    async (ctx) => {
      const me = await requireProfile(ctx);
      if (!me || !isSuper(me.role)) return error("Forbidden", 403);
      const names = await secrets.listSecretNames();
      return json({
        driveConfigured: names.includes("GOOGLE_DRIVE_CLIENT_SECRET"),
        calendarConfigured: names.includes("GOOGLE_CALENDAR_API_KEY"),
      });
    },
  ],
});
