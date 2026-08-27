import { LayoutDashboard, BookOpen, Award, CalendarDays, FolderOpen, ShieldCheck, Cloud, User, LogOut, X, ClipboardCheck, Users2, Palette, Video } from "lucide-react";
import type { Page, Profile, SiteSettings } from "../types";

interface Props {
  page: Page;
  setPage: (p: Page) => void;
  profile: Profile;
  onSignOut: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  settings: SiteSettings;
}

const roleLabel: Record<string, string> = {
  learner: "Learner",
  trainer: "Tutor",
  coordinator: "Coordinator",
  admin: "Administrator",
  superadmin: "Super Administrator",
};

export default function Sidebar({ page, setPage, profile, onSignOut, mobileOpen, onCloseMobile, settings }: Props) {
  const items: { key: Page; label: string; icon: any }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "courses", label: "Courses", icon: BookOpen },
    { key: "certificates", label: "Certificates", icon: Award },
    { key: "events", label: "Events", icon: CalendarDays },
    { key: "resources", label: "Resource Center", icon: FolderOpen },
  ];
  if (["trainer", "coordinator", "admin", "superadmin"].includes(profile.role)) {
    items.push({ key: "students", label: "My Students", icon: Users2 });
    items.push({ key: "grading", label: "Grading & Results", icon: ClipboardCheck });
  }
  if (profile.role === "superadmin") {
    items.push({ key: "admin-users", label: "Administrators", icon: ShieldCheck });
    items.push({ key: "google", label: "Google Workspace", icon: Cloud });
    items.push({ key: "settings", label: "Site Settings", icon: Palette });
    items.push({ key: "kgga-videos", label: "KGGA Videos", icon: Video });
  }
  items.push({ key: "profile", label: "My Profile", icon: User });

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden" onClick={onCloseMobile} />}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-64 bg-white/80 backdrop-blur-xl border-r border-black/5 flex flex-col transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#0057B8] ring-2 ring-[#FFD700] ring-offset-2 ring-offset-white shadow-[0_5px_14px_rgba(0,87,184,0.32)] overflow-hidden flex items-center justify-center font-bold text-[#FFD700] text-xs shrink-0">
              {settings.logoImageUrl ? (
                <img src={settings.logoImageUrl} alt="KGGA logo" className="w-full h-full object-cover drop-shadow-md" />
              ) : (
                settings.logoText
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 leading-tight text-[14px] tracking-tight truncate">{settings.orgName}</p>
              <p className="text-[10.5px] text-gray-400 leading-tight truncate">Kenya Girl Guides Assoc.</p>
            </div>
          </div>
          <button className="lg:hidden text-gray-400" onClick={onCloseMobile}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {items.map((it) => {
            const Icon = it.icon;
            const active = page === it.key || (it.key === "courses" && page === "course-detail");
            return (
              <button
                key={it.key}
                onClick={() => {
                  setPage(it.key);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all ${
                  active ? "bg-[#FFD700] text-[#0057B8] shadow-sm" : "text-gray-600 hover:bg-black/[0.035]"
                }`}
              >
                <Icon size={17} strokeWidth={2} />
                {it.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-black/5">
          <div className="flex items-center gap-2.5 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-semibold text-xs">
              {profile.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{profile.name}</p>
              <p className="text-[10.5px] text-[#0057B8] font-medium">{roleLabel[profile.role]}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 justify-center px-3 py-2 rounded-xl bg-black/[0.035] hover:bg-black/[0.06] text-[13px] font-medium text-gray-600 transition-colors"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
