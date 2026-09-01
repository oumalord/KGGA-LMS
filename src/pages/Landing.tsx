import { useEffect, useState } from "react";
import { api } from "../lib/neonClient";
import {
  BookOpen, Award, Users, ArrowRight, Sparkles,
  Star, Clock, PlayCircle, CheckCircle2, Check,
} from "lucide-react";
import type { SiteSettings } from "../types";
import type { KGGAVideo } from "../types";
import { VideoPreview } from "./KGGAVideos";

interface Props {
  onSignIn: (identifier?: string, password?: string) => void;
  signingIn: boolean;
  settings: SiteSettings;
  heroFallback: string;
  autoOpenStudentLogin?: boolean;
  studentNotice?: string | null;
  onStudentLoginDismissed?: () => void;
}

interface PublicCourse {
  id: string;
  title: string;
  category: string;
  trainerName: string;
  isPaid: boolean;
  price: number;
  coverColor: string;
  lessonCount: number;
}

export default function Landing({ onSignIn, signingIn, settings, heroFallback, autoOpenStudentLogin, studentNotice, onStudentLoginDismissed }: Props) {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [videos, setVideos] = useState<KGGAVideo[]>([]);
  const [showLoginCard, setShowLoginCard] = useState(false);
  const [isStudentMode, setIsStudentMode] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const heroSrc = settings.heroImageUrl || heroFallback;

  useEffect(() => {
    api.get("/api/public/courses").then((r) => setCourses(r.data.courses)).catch(() => {});
    api.get("/api/public/videos").then((r) => setVideos(r.data.videos ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (autoOpenStudentLogin) {
      setIsStudentMode(true);
      setIdentifier("");
      setPassword("");
      setShowLoginCard(true);
      onStudentLoginDismissed?.();
    }
  }, [autoOpenStudentLogin, onStudentLoginDismissed]);

  function scrollToSection(e: React.MouseEvent, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setLoginError(isStudentMode ? "Enter your phone number and password to continue." : "Enter your email and password to continue.");
      return;
    }
    setLoginError("");
    onSignIn(identifier, password);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-[#071633]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#FFD700] ring-2 ring-white/80 ring-offset-2 ring-offset-[#071633] shadow-[0_5px_18px_rgba(255,215,0,0.38)] overflow-hidden flex items-center justify-center font-black text-[#071633] text-xs shrink-0">
              {settings.logoImageUrl ? (
                <img src={settings.logoImageUrl} alt="KGGA logo" className="w-full h-full object-cover drop-shadow-md" />
              ) : (
                settings.logoText
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white tracking-tight text-[15px] leading-tight truncate">{settings.orgName}</p>
              <p className="text-[10px] text-white/50 leading-tight">Learn Anytime, Anywhere.</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-white/70">
            <a href="#home" onClick={(e) => scrollToSection(e, "home")} className="text-white hover:text-[#FFD700] transition-colors">Home</a>
            <a href="#courses" onClick={(e) => scrollToSection(e, "courses")} className="hover:text-white transition-colors">Courses</a>
            <a href="#features" onClick={(e) => scrollToSection(e, "features")} className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, "pricing")} className="hover:text-white transition-colors">Pricing</a>
            <a href="#about" onClick={(e) => scrollToSection(e, "about")} className="hover:text-white transition-colors">About</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsStudentMode(false);
                setIdentifier("");
                setPassword("");
                setShowLoginCard((value) => !value);
              }}
              disabled={signingIn}
              className="text-white/85 hover:text-white px-3 py-2 text-sm font-medium disabled:opacity-60"
            >
              Log In
            </button>
            <button
              onClick={() => {
                setIsStudentMode(true);
                setIdentifier("");
                setPassword("");
                setShowLoginCard(true);
              }}
              disabled={signingIn}
              className="bg-[#FFD700] text-[#071633] px-4 py-2 rounded-lg font-bold text-sm hover:brightness-95 transition-all disabled:opacity-60"
            >
              {signingIn ? "Signing in…" : "Student Access"}
            </button>
          </div>
        </div>
      </header>

      {showLoginCard && (
        <div className="fixed inset-0 z-50 bg-[#071633]/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-black/5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-bold text-gray-900">{isStudentMode ? "Student Sign In" : "Staff Sign In"}</p>
                <p className="text-xs text-gray-500">{isStudentMode ? "Use your registered phone number and password." : "Tutors and administrators use email + password."}</p>
              </div>
              <button onClick={() => { setShowLoginCard(false); setLoginError(""); }} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
            </div>
            {studentNotice && <div className="mb-4 rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">{studentNotice}</div>}
            <form onSubmit={submitLogin} className="space-y-4">
              <label className="block text-xs font-semibold text-gray-500">
                {isStudentMode ? "Phone number" : "Email address"}
                <input name="kgga-login-identifier" autoComplete="off" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder={isStudentMode ? "07XX XXX XXX" : "admin@kgga.org"} />
              </label>
              <label className="block text-xs font-semibold text-gray-500">
                Password
                <input name="kgga-login-password" autoComplete="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Enter password" />
              </label>
              {loginError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{loginError}</p>}
              <div className="flex flex-col gap-2 pt-1">
                <button type="submit" disabled={signingIn} className="w-full bg-[#0057B8] text-white px-4 py-3 rounded-xl font-bold text-sm hover:brightness-110 disabled:opacity-60">
                  {signingIn ? "Signing in…" : (isStudentMode ? "Access Student Dashboard" : "Access Dashboard")}
                </button>
                <button type="button" onClick={() => { setIsStudentMode(true); setIdentifier(""); setPassword(""); setLoginError(""); setShowLoginCard(true); }} className="w-full border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50">
                  Continue as Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero */}
      <section id="home" className="relative bg-[#071633] overflow-hidden">
        <div className="pointer-events-none absolute top-10 right-0 w-[480px] h-[480px] rounded-full bg-[#0057B8]/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-10 w-[300px] h-[300px] rounded-full bg-[#FFD700]/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-24 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-white/10 text-[#FFD700] px-3.5 py-1.5 rounded-full text-[12px] font-semibold mb-6">
              <Sparkles size={12} /> Official Digital Learning Ecosystem
            </span>
            <h1 className="text-4xl lg:text-[52px] font-extrabold text-white leading-[1.08] mb-6">
              Learn Skills.
              <br />
              Advance Your <span className="text-[#FFD700]">Future.</span>
            </h1>
            <p className="text-white/65 text-base lg:text-lg mb-8 max-w-md leading-relaxed">{settings.tagline}</p>
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-2 bg-[#FFD700] text-[#071633] px-6 py-3.5 rounded-xl font-bold text-sm hover:brightness-95 shadow-lg shadow-black/20 transition-all"
              >
                Explore Courses <ArrowRight size={16} />
              </button>
              <a
                href="#features"
                onClick={(e) => scrollToSection(e, "features")}
                className="inline-flex items-center gap-2 bg-white/10 text-white px-6 py-3.5 rounded-xl font-semibold text-sm hover:bg-white/15 transition-all"
              >
                <PlayCircle size={16} /> How It Works
              </a>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {["#0057B8", "#FFD700", "#2563eb", "#c9a300"].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#071633] flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c }}>
                    {["JW", "MN", "AK", "5K"][i]}
                  </div>
                ))}
              </div>
              <p className="text-white/60 text-xs">Learners already learning and growing with {settings.orgName}.</p>
            </div>
          </div>

          {/* Photo */}
          <div className="relative hidden lg:block">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <img src={heroSrc} alt="KGGA learners collaborating on a project" className="w-full h-[460px] object-cover object-top" />
            </div>
            <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-4 w-48">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-gray-500">Your Progress</p>
                <p className="text-[11px] font-bold text-[#0057B8]">78%</p>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#FFD700] w-[78%]" />
              </div>
              <p className="text-[10px] text-gray-400 mt-2">You're doing great!</p>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 w-56 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFD700]/20 flex items-center justify-center shrink-0">
                <PlayCircle size={18} className="text-[#c9a300]" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400">Current Lesson</p>
                <p className="text-[12px] font-semibold text-gray-800 leading-tight">Future Leaders Workshop</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section id="features" className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: Users, title: "Expert Tutors", desc: "Learn from trained instructors and professionals." },
            { icon: Clock, title: "Learn at Your Pace", desc: "Study anytime, anywhere at your own speed." },
            { icon: Award, title: "Certification", desc: `Earn certificates backed by ${settings.orgName}.` },
            { icon: Sparkles, title: "Community Support", desc: "Join a community of like-minded learners." },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0057B8]/10 flex items-center justify-center shrink-0">
                <f.icon size={17} className="text-[#0057B8]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm mb-0.5">{f.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular courses */}
      <section id="courses" className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-2">Popular Courses</h2>
          <p className="text-gray-500 text-sm">Explore our most popular and best-learning courses today.</p>
        </div>
        {courses.length === 0 ? (
          <p className="text-center text-sm text-gray-400">New courses are being added — check back soon.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {courses.map((c) => (
              <div key={c.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-lg transition-all">
                <div className="h-28 flex items-center justify-center relative" style={{ background: c.coverColor }}>
                  <BookOpen className="text-white/80" size={30} />
                  <span className="absolute top-2.5 left-2.5 bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full text-gray-700">{c.category}</span>
                </div>
                <div className="p-4">
                  <p className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{c.title}</p>
                  <p className="text-[11px] text-gray-400 mb-3">By {c.trainerName} · {c.lessonCount} lessons</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Star size={11} className="fill-[#FFD700] text-[#FFD700]" /> New
                    </span>
                    <span className={`text-xs font-bold ${c.isPaid ? "text-[#8a6d00]" : "text-green-600"}`}>
                      {c.isPaid ? `KES ${c.price}` : "Free"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="text-center mt-10">
          <button onClick={onSignIn} className="inline-flex items-center gap-2 bg-[#071633] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#0a1f45]">
            View All Courses <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {videos.length > 0 && (
        <section id="videos" className="bg-[#071633] py-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div><p className="text-[#FFD700] text-xs font-bold uppercase tracking-[0.18em] mb-2">From the KGGA community</p><h2 className="text-2xl lg:text-3xl font-extrabold text-white">Watch KGGA Videos</h2><p className="text-white/60 text-sm mt-2">Stories, skills and moments from our learning community.</p></div>
              <PlayCircle className="text-[#FFD700] shrink-0" size={32} />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{videos.map((video) => <article key={video.id} className="overflow-hidden rounded-2xl bg-white/10 border border-white/10"><VideoPreview video={video} /><div className="p-4"><h3 className="font-bold text-white text-sm">{video.title}</h3>{video.description && <p className="text-white/60 text-xs mt-1">{video.description}</p>}</div></article>)}</div>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50/60 border-y border-gray-100 py-16">
        <div className="max-w-5xl mx-auto px-6 lg:px-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-2">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 text-sm">Most {settings.orgName} courses are free. Specialist courses have a one-time fee set by the tutor.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl border border-gray-100 p-7 shadow-sm">
              <p className="text-xs font-bold text-green-600 bg-green-50 inline-block px-2.5 py-1 rounded-full mb-4">FREE</p>
              <p className="text-3xl font-extrabold text-gray-900 mb-1">KES 0</p>
              <p className="text-xs text-gray-400 mb-5">Most courses, forever</p>
              {["Full course access", "Certificates on completion", "Badges & progress tracking", "Community events"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Check size={14} className="text-green-600" /> {f}
                </div>
              ))}
            </div>
            <div className="bg-[#071633] rounded-3xl p-7 shadow-sm text-white relative overflow-hidden">
              <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#FFD700]/20 blur-2xl" />
              <p className="text-xs font-bold text-[#FFD700] bg-white/10 inline-block px-2.5 py-1 rounded-full mb-4">PAID COURSES</p>
              <p className="text-3xl font-extrabold mb-1">Set by Tutor</p>
              <p className="text-xs text-white/50 mb-5">One-time payment per course</p>
              {["Specialist / advanced tracks", "Everything in Free", "Direct tutor feedback", "Priority grading"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-white/80 mb-2">
                  <Check size={14} className="text-[#FFD700]" /> {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="max-w-5xl mx-auto px-6 lg:px-10 py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-[#0057B8]/10 text-[#0057B8] px-3.5 py-1.5 rounded-full text-[12px] font-semibold mb-5">
              About {settings.orgName}
            </span>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-4 leading-tight">
              Built for the Kenya Girl Guides Association's mission.
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              {settings.orgName} is the official digital learning ecosystem of the Kenya Girl Guides Association, empowering
              girls and young women through education, leadership development, mentorship, advocacy, digital
              literacy, entrepreneurship, and community engagement.
            </p>
            <p className="text-gray-500 text-sm leading-relaxed">
              From Nairobi to every county, learners connect with tutors, earn verified certificates, and grow their
              skills together — anytime, anywhere.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Counties Reached", value: "20+" },
              { label: "Learning Areas", value: "6" },
              { label: "Free Courses", value: "Most" },
              { label: "Community First", value: "Always" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
                <p className="text-2xl font-extrabold text-[#0057B8]">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-16">
        <div className="rounded-3xl bg-[#0057B8] p-8 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 w-56 h-56 rounded-full bg-[#FFD700]/20 blur-3xl" />
          <div className="relative">
            <h3 className="text-xl lg:text-2xl font-extrabold text-white mb-1">Start Your Learning Journey Today</h3>
            <p className="text-white/70 text-sm">Join thousands of learners and take the first step in your career growth.</p>
          </div>
          <div className="relative flex items-center gap-3">
            <button onClick={onSignIn} className="bg-[#FFD700] text-[#0057B8] px-6 py-3 rounded-xl font-bold text-sm hover:brightness-95 flex items-center gap-2">
              Get Started for Free <ArrowRight size={15} />
            </button>
            <p className="text-white/60 text-[11px] hidden sm:flex items-center gap-1">
              <CheckCircle2 size={12} /> No credit card required
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 px-6 py-8 text-center text-[13px] text-gray-400">
        &copy; {new Date().getFullYear()} Kenya Girl Guides Association. All rights reserved.
      </footer>
    </div>
  );
}
