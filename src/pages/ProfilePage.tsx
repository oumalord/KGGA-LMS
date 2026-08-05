import { Crown, Mail, Calendar as CalIcon, Phone, MapPin, Users } from "lucide-react";
import type { Profile } from "../types";
import Badges from "../components/Badges";

const roleLabel: Record<string, string> = {
  learner: "Learner",
  trainer: "Trainer",
  coordinator: "Coordinator",
  admin: "Administrator",
  superadmin: "Super Administrator",
};

export default function ProfilePage({ profile }: { profile: Profile }) {
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
