import { useEffect, useRef, useState } from "react";
import { api } from "../lib/neonClient";
import {
  BookOpen, Award, CalendarDays, Users, HardDrive, TrendingUp, ShieldCheck,
  Plus, ClipboardCheck, Users2, ArrowRight, Sparkles, Flame, Upload, Loader2,
} from "lucide-react";
import type { Profile, Enrollment, Certificate, Page, SiteSettings } from "../types";
import Badges from "../components/Badges";

interface Stats {
  totalLearners: number;
  totalUsers: number;
  totalCourses: number;
  totalEvents: number;
  certificatesIssued: number;
  resourceCount: number;
  adminCount: number;
  adminCap: number;
  avgCompletionRate: number;
  totalEnrollments: number;
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_6px_24px_rgba(0,0,0,0.05)] border border-gray-50">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: color + "1a" }}>
        <Icon size={18} style={{ color }} />
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

const roleLabel: Record<string, string> = {
  learner: "Student",
  trainer: "Tutor",
  coordinator: "Coordinator",
  admin: "Administrator",
  superadmin: "Super Administrator",
};

export default function Dashboard({
  profile,
  onNavigate,
  heroFallback,
  settings,
  onUpdated,
}: {
  profile: Profile;
  onNavigate?: (p: Page) => void;
  heroFallback: string;
  settings: SiteSettings;
  onUpdated?: () => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [logoPreview, setLogoPreview] = useState(settings.logoImageUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isSuper = profile.role === "superadmin";
  const isCourseManager = ["trainer", "coordinator", "admin", "superadmin"].includes(profile.role);
  const heroSrc = settings.heroImageUrl || heroFallback;

  useEffect(() => {
    setLogoPreview(settings.logoImageUrl);
  }, [settings.logoImageUrl]);

  useEffect(() => {
    if (isSuper) {
      api.get("/api/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    }
    api.get("/api/my/courses").then((r) => setEnrollments(r.data.enrollments)).catch(() => {});
    api.get("/api/my/certificates").then((r) => setCerts(r.data.certificates)).catch(() => {});
    api.get("/api/my/submissions").then((r) => setResults((r.data.submissions ?? []).filter((s: any) => s.grade))).catch(() => {});
  }, [isSuper]);

  const quickActions = isSuper
    ? [
        { key: "courses" as Page, label: "New Course", icon: Plus },
        { key: "admin-users" as Page, label: "Administrators", icon: ShieldCheck },
        { key: "students" as Page, label: "My Students", icon: Users2 },
        { key: "settings" as Page, label: "Site Settings", icon: Sparkles },
      ]
    : isCourseManager
    ? [
        { key: "courses" as Page, label: "New Course", icon: Plus },
        { key: "students" as Page, label: "My Students", icon: Users2 },
        { key: "grading" as Page, label: "Grading & Results", icon: ClipboardCheck },
        { key: "events" as Page, label: "Events", icon: CalendarDays },
      ]
    : [
        { key: "courses" as Page, label: "Browse Courses", icon: BookOpen },
        { key: "certificates" as Page, label: "My Certificates", icon: Award },
        { key: "events" as Page, label: "Upcoming Events", icon: CalendarDays },
        { key: "resources" as Page, label: "Resource Center", icon: HardDrive },
      ];

  const avgProgress = enrollments.length > 0 ? Math.round(enrollments.reduce((s, e) => s + e.progressPercent, 0) / enrollments.length) : 0;

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const nextLogoUrl = `data:${file.type || "image/png"};base64,${base64}`;
      setLogoPreview(nextLogoUrl);
      await api.post("/api/settings/logo-image", { contentBase64: base64, contentType: file.type || "image/png" });
      setUploadingLogo(false);
      onUpdated?.();
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="pb-10">
      {isSuper && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_6px_24px_rgba(0,0,0,0.05)] border border-gray-50 mb-6">
          <div className="flex items-center gap-4 flex-col sm:flex-row">
            <div className="w-20 h-20 rounded-2xl bg-[#0057B8] ring-2 ring-[#FFD700] ring-offset-3 ring-offset-white shadow-[0_8px_22px_rgba(0,87,184,0.3)] overflow-hidden flex items-center justify-center shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="Brand logo preview" className="w-full h-full object-cover drop-shadow-md" />
              ) : (
                <span className="text-[#FFD700] text-lg font-black">{settings.logoText}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm mb-1">Admin Brand Logo</p>
              <p className="text-xs text-gray-500 mb-3">Upload a logo for the dashboard header, sidebar, and certificate branding.</p>
              <label className="inline-flex items-center gap-2 text-xs font-semibold bg-[#0057B8] text-white px-3 py-2 rounded-lg cursor-pointer hover:brightness-110">
                {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploadingLogo ? "Uploading…" : "Upload Logo"}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Hero welcome banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0057B8] mb-8">
        <img src={heroSrc} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0057B8] via-[#0057B8]/95 to-[#0057B8]/60" />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#FFD700]/20 blur-3xl" />
        <div className="relative p-8 sm:p-10">
          <span className="inline-flex items-center gap-1.5 bg-white/15 text-white px-3 py-1 rounded-full text-[11px] font-semibold mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD700] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFD700]" />
            </span>
            Live · {roleLabel[profile.role]} Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Welcome back, {profile.name.split(" ")[0]} 👋</h1>
          <p className="text-white/75 text-sm max-w-lg mb-6">
            Here's what's happening across {settings.orgName} today — your progress, your community, your next step.
          </p>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((qa) => (
              <button
                key={qa.key}
                onClick={() => onNavigate?.(qa.key)}
                className="flex items-center gap-2 bg-white/95 hover:bg-white text-[#0057B8] text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                <qa.icon size={15} /> {qa.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isSuper && stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard icon={Users} label="Total Learners" value={stats.totalLearners} color="#0057B8" />
            <StatCard icon={BookOpen} label="Active Courses" value={stats.totalCourses} color="#c9a300" />
            <StatCard icon={CalendarDays} label="Events" value={stats.totalEvents} color="#0057B8" />
            <StatCard icon={Award} label="Certificates Issued" value={stats.certificatesIssued} color="#c9a300" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={HardDrive} label="Resources in Library" value={stats.resourceCount} color="#0057B8" />
            <StatCard icon={TrendingUp} label="Avg. Completion Rate" value={`${stats.avgCompletionRate}%`} color="#c9a300" />
            <StatCard icon={ShieldCheck} label="Administrators" value={`${stats.adminCount}/${stats.adminCap}`} color="#0057B8" />
            <StatCard icon={Users} label="Total Enrollments" value={stats.totalEnrollments} color="#c9a300" />
          </div>
        </>
      )}

      {!isSuper && !isCourseManager && (
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <StatCard icon={BookOpen} label="Courses Enrolled" value={enrollments.length} color="#0057B8" />
          <StatCard icon={Flame} label="Average Progress" value={`${avgProgress}%`} color="#c9a300" />
          <StatCard icon={Award} label="Certificates Earned" value={certs.length} color="#0057B8" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-[0_6px_24px_rgba(0,0,0,0.05)] border border-gray-50">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-gray-900">My Learning Progress</p>
            <button onClick={() => onNavigate?.("courses")} className="text-xs font-semibold text-[#0057B8] flex items-center gap-1 hover:underline">
              View all <ArrowRight size={12} />
            </button>
          </div>
          {enrollments.length === 0 ? (
            <p className="text-sm text-gray-400">You haven't enrolled in any courses yet.</p>
          ) : (
            <div className="space-y-4">
              {enrollments.slice(0, 5).map((e) => (
                <div key={e.id}>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-gray-700">Course progress</span>
                    <span className="text-[#0057B8]">{e.progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#FFD700] transition-all duration-500" style={{ width: `${e.progressPercent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0_6px_24px_rgba(0,0,0,0.05)] border border-gray-50">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-gray-900">Recent Certificates</p>
            <button onClick={() => onNavigate?.("certificates")} className="text-xs font-semibold text-[#0057B8] flex items-center gap-1 hover:underline">
              View all <ArrowRight size={12} />
            </button>
          </div>
          {certs.length === 0 ? (
            <p className="text-sm text-gray-400">No certificates earned yet — complete a course to earn one!</p>
          ) : (
            <div className="space-y-3">
              {certs.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#FFF8DC]/60">
                  <Award size={18} className="text-[#c9a300]" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{c.courseTitle}</p>
                    <p className="text-[11px] text-gray-500">{c.certNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-[0_6px_24px_rgba(0,0,0,0.05)] border border-gray-50 mt-6">
          <p className="font-bold text-gray-900 mb-4">My Results</p>
          <div className="space-y-2">
            {results.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.lessonTitle}</p>
                  <p className="text-[11px] text-gray-400">{r.courseTitle}{r.feedback ? ` — "${r.feedback}"` : ""}</p>
                </div>
                <span className="text-xs font-bold text-[#0057B8] bg-[#0057B8]/10 px-2.5 py-1 rounded-full">{r.grade}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-[0_6px_24px_rgba(0,0,0,0.05)] border border-gray-50 mt-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-gray-900">My Badges</p>
          <button onClick={() => onNavigate?.("profile")} className="text-xs font-semibold text-[#0057B8] flex items-center gap-1 hover:underline">
            View profile <ArrowRight size={12} />
          </button>
        </div>
        <Badges compact />
      </div>
    </div>
  );
}
