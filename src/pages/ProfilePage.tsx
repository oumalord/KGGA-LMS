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

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">My Profile</h1>
      {requirePasswordChange && (
        <form onSubmit={changePassword} className="bg-[#FFF8DC] border border-[#F5D87E] rounded-2xl p-6 mb-6">
          <div className="flex gap-3 mb-4"><LockKeyhole className="text-[#8a6d00] shrink-0" size={20} /><div><p className="font-bold text-gray-900">Set your personal password</p><p className="text-xs text-gray-600 mt-1">Your administrator set a temporary password. Change it before accessing the LMS.</p></div></div>
          <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password (minimum 8 characters)" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3" required minLength={8} />
          <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" required minLength={8} />
          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
          <button disabled={saving} className="mt-4 bg-[#0057B8] text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">{saving ? "Saving..." : "Change Password"}</button>
        </form>
      )}
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
