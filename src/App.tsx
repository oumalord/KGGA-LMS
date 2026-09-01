import { useEffect, useState } from "react";
import { auth, api } from "./lib/neonClient";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar";
import Landing from "./pages/Landing";
import RoleSelect from "./pages/RoleSelect";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Certificates from "./pages/Certificates";
import Events from "./pages/Events";
import Resources from "./pages/Resources";
import AdminUsers from "./pages/AdminUsers";
import Grading from "./pages/Grading";
import MyStudents from "./pages/MyStudents";
import GoogleIntegration from "./pages/GoogleIntegration";
import SiteSettings from "./pages/SiteSettings";
import ProfilePage from "./pages/ProfilePage";
import KGGAVideos from "./pages/KGGAVideos";
import type { Page, Profile, SiteSettings as SiteSettingsType } from "./types";
import { heroImageDataUrl } from "./heroImage";

const DEFAULT_SETTINGS: SiteSettingsType = {
  orgName: "KGGA LMS",
  tagline: "Empowering Girls Through Digital Learning, Leadership and Innovation.",
  logoText: "KG",
  logoImageUrl: null,
  certOrgName: "KENYA GIRL GUIDES ASSOCIATION",
  heroImageUrl: null,
};

const SETTINGS_CACHE_KEY = "kgga-lms-public-settings";

function getCachedSettings(): SiteSettingsType {
  try {
    const cached = window.localStorage.getItem(SETTINGS_CACHE_KEY);
    return cached ? { ...DEFAULT_SETTINGS, ...JSON.parse(cached) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function App() {
  const [checking, setChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState<SiteSettingsType>(getCachedSettings);
  const [studentLoginHint, setStudentLoginHint] = useState<string | null>(null);
  const [autoOpenStudentLogin, setAutoOpenStudentLogin] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  async function loadSettings() {
    try {
      const r = await api.get<SiteSettingsType>("/api/settings/public");
      const payload = r.data as any;
      const nextSettings = {
        orgName: payload.orgName,
        tagline: payload.tagline,
        logoText: payload.logoText,
        logoImageUrl: payload.logoImageUrl || null,
        certOrgName: payload.certOrgName,
        heroImageUrl: payload.heroImageUrl || null,
      };
      window.localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(nextSettings));
      setSettings(nextSettings);
    } catch {}
  }

  async function loadProfile() {
    try {
      const r = await api.get("/api/me");
      const payload = r.data as any;
      setProfile(payload.profile);
      setNeedsRoleSelection(!!payload.needsRoleSelection);
    } catch {
      setProfile(null);
    }
  }

  async function handleRoleSelect(details: {
    name: string;
    email: string;
    phone: string;
    county: string;
    dob: string;
    guidingUnit: string;
    category: string;
    gender: string;
    password: string;
  }): Promise<string | null> {
    try {
      const registration = await api.post<any>("/api/me/role", { role: "learner", ...details });
      const registeredProfile = registration.data.profile;
      await auth.signIn(details.email, details.password);
      setProfile(registeredProfile);
      setNeedsRoleSelection(false);
      setPage(registeredProfile.role === "learner" ? "courses" : "dashboard");
      setAutoOpenStudentLogin(false);
      setStudentLoginHint(null);
      return null;
    } catch (e: any) {
      return e?.response?.data?.error || "Something went wrong. Please try again.";
    }
  }

  useEffect(() => {
    (async () => {
      await loadSettings();
      if (auth.isSignedIn()) {
        await loadProfile();
      }
      setChecking(false);
    })();

    const refreshSettings = () => loadSettings();
    const intervalId = window.setInterval(refreshSettings, 30_000);
    window.addEventListener("focus", refreshSettings);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshSettings);
    };
  }, []);

  async function handleSignIn(identifier = "", password = "") {
    setSigningIn(true);
    setSignInError(null);
    try {
      const normalizedIdentifier = identifier.trim().toLowerCase();

      const signInResult = await auth.signIn(normalizedIdentifier, password);
      const r = await api.get("/api/me");
      const payload = r.data as any;

      if (payload.profile) {
        setProfile(payload.profile);
        setNeedsRoleSelection(false);
        setPage(payload.profile.role === "learner" ? "courses" : "dashboard");
        setStudentLoginHint(null);
        setAutoOpenStudentLogin(false);
      } else {
        setNeedsRoleSelection(true);
      }

      if (signInResult?.profile) {
        setProfile(signInResult.profile);
        setNeedsRoleSelection(false);
        setPage(signInResult.profile.role === "learner" ? "courses" : "dashboard");
        setStudentLoginHint(null);
        setAutoOpenStudentLogin(false);
      }
    } catch (error: any) {
      setSignInError(error?.response?.data?.error || "Unable to sign in right now. Please try again.");
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await auth.signOut();
    setProfile(null);
    setPage("dashboard");
  }

  function openCourse(id: string) {
    setActiveCourseId(id);
    setPage("course-detail");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#0057B8]/20 border-t-[#0057B8] rounded-full animate-spin" />
      </div>
    );
  }

  if (needsRoleSelection) {
    return <RoleSelect onSelect={handleRoleSelect} initialError={roleError} settings={settings} />;
  }

  if (!profile) {
    return (
      <Landing
        onSignIn={handleSignIn}
        signingIn={signingIn}
        settings={settings}
        heroFallback={heroImageDataUrl}
        autoOpenStudentLogin={autoOpenStudentLogin}
        studentNotice={studentLoginHint}
        signInError={signInError}
        onStudentLoginDismissed={() => setAutoOpenStudentLogin(false)}
      />
    );
  }

  if (profile.status === "suspended") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6 text-center">
        <div>
          <p className="text-xl font-bold text-gray-900 mb-2">Account Suspended</p>
          <p className="text-gray-500 mb-6">Your account has been suspended. Please contact a KGGA LMS administrator.</p>
          <button onClick={handleSignOut} className="bg-[#0057B8] text-white px-5 py-2.5 rounded-xl font-semibold">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const isSuper = profile.role === "superadmin";
  const isCourseManager = ["trainer", "coordinator", "admin", "superadmin"].includes(profile.role);

  return (
    <div className="min-h-screen bg-[#fbfbfd] flex">
      <Sidebar page={page} setPage={setPage} profile={profile} onSignOut={handleSignOut} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} settings={settings} />
      <div className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center justify-between px-5 py-3.5 bg-white/80 backdrop-blur-xl border-b border-black/5 sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="text-gray-500">
            <Menu size={20} />
          </button>
          <p className="font-semibold text-gray-900 text-[14px] tracking-tight">{settings.orgName}</p>
          <div className="w-5" />
        </div>
        <main className="p-5 lg:p-10 max-w-6xl mx-auto">
          {page === "dashboard" && <Dashboard profile={profile} onNavigate={setPage} heroFallback={heroImageDataUrl} settings={settings} onUpdated={loadSettings} />}
          {page === "courses" && <Courses profile={profile} onOpenCourse={openCourse} />}
          {page === "course-detail" && activeCourseId && (
            <CourseDetail courseId={activeCourseId} profile={profile} onBack={() => setPage("courses")} />
          )}
          {page === "certificates" && <Certificates settings={settings} />}
          {page === "events" && <Events profile={profile} />}
          {page === "resources" && <Resources profile={profile} />}
          {page === "students" && isCourseManager && <MyStudents profile={profile} />}
          {page === "grading" && isCourseManager && <Grading profile={profile} settings={settings} />}
          {page === "admin-users" && isSuper && <AdminUsers profile={profile} />}
          {page === "google" && isSuper && <GoogleIntegration />}
          {page === "settings" && isSuper && <SiteSettings settings={settings} onUpdated={loadSettings} />}
          {page === "kgga-videos" && isSuper && <KGGAVideos profile={profile} />}
          {page === "profile" && <ProfilePage profile={profile} />}
        </main>
      </div>
    </div>
  );
}

export default App;
