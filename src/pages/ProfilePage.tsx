import { useState } from "react";
import { Crown, Mail, Calendar as CalIcon, Phone, MapPin, Users, LockKeyhole } from "lucide-react";
import { api } from "../lib/neonClient";
import type { Profile } from "../types";
import Badges from "../components/Badges";

const roleLabel: Record<string, string> = {
  learner: "Learner",
  trainer: "Trainer",
  coordinator: "Coordinator",
  admin: "Administrator",
  superadmin: "Super Administrator",
};

export default function ProfilePage({ profile, requirePasswordChange = false, onPasswordChanged }: { profile: Profile; requirePasswordChange?: boolean; onPasswordChanged?: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setSaving(true);
    try {
      await api.post("/api/me/password", { password });
      await onPasswordChanged?.();
    } catch (exception: any) {
      setError(exception?.response?.data?.error || "Could not change your password.");
    } finally {
      setSaving(false);
    }
  }

  if (requirePasswordChange) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] flex items-center justify-center p-5 sm:p-8">
        <section className="w-full max-w-md bg-white border border-gray-100 shadow-[0_20px_50px_rgba(15,30,60,0.12)] rounded-2xl overflow-hidden">
          <div className="bg-[#071633] px-7 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#FFD700] text-[#071633] mx-auto mb-4 flex items-center justify-center shadow-lg">
              <LockKeyhole size={24} />
            </div>
            <p className="text-[#FFD700] text-xs font-bold uppercase tracking-[0.14em]">Account Security</p>
            <h1 className="text-white text-2xl font-extrabold mt-2">Set your personal password</h1>
            <p className="text-white/65 text-sm mt-2">Welcome, {profile.name}. Your temporary password must be changed before continuing.</p>
          </div>
          <form onSubmit={changePassword} className="p-7">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">New password</label>
            <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057B8]/25 focus:border-[#0057B8]" required minLength={8} />
            <label className="block text-xs font-semibold text-gray-600 mt-4 mb-1.5">Confirm new password</label>
            <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter the password again" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057B8]/25 focus:border-[#0057B8]" required minLength={8} />
            {error && <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
            <button disabled={saving} className="w-full mt-6 bg-[#0057B8] text-white py-3 rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-60">
              {saving ? "Saving password..." : "Save Password and Continue"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">My Profile</h1>
      <div className="bg-white rounded-2xl p-8 border border-gray-50 shadow-sm text-center">
        <div className="w-20 h-20 rounded-full bg-[#0057B8] text-[#FFD700] font-black text-2xl flex items-center justify-center mx-auto mb-4">
          {profile.name?.[0]?.toUpperCase()}
        </div>
        <p className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
          {profile.role === "superadmin" && <Crown className="text-[#c9a300]" size={18} />}
          {profile.name}
        </p>
        <p className="text-sm text-[#0057B8] font-semibold mt-1">{roleLabel[profile.role]}</p>

        <div className="mt-6 text-left space-y-3 border-t border-gray-50 pt-6">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Mail size={15} className="text-gray-400" /> {profile.email}
          </div>
          {profile.phone && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Phone size={15} className="text-gray-400" /> {profile.phone}
            </div>
          )}
          {profile.county && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <MapPin size={15} className="text-gray-400" /> {profile.county} County
            </div>
          )}
          {profile.guidingUnit && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Users size={15} className="text-gray-400" /> {profile.guidingUnit}
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <CalIcon size={15} className="text-gray-400" /> Member since {new Date(profile.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-50 shadow-sm mt-6">
        <p className="font-bold text-gray-900 mb-4">My Badges</p>
        <Badges />
      </div>
    </div>
  );
}
