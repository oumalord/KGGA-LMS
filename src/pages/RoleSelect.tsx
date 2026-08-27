import { useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";
import type { SiteSettings } from "../types";

interface RegistrationDetails {
  name: string;
  phone: string;
  county: string;
  dob: string;
  guidingUnit: string;
  gender: string;
  password: string;
}

interface Props {
  onSelect: (details: RegistrationDetails) => Promise<string | null>;
  initialError?: string | null;
  settings: SiteSettings;
}

const COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos", "Kajiado", "Uasin Gishu",
  "Meru", "Kilifi", "Kakamega", "Bungoma", "Nyeri", "Kisii", "Trans Nzoia", "Other",
];

export default function RoleSelect({ onSelect, initialError, settings }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState("Nairobi");
  const [dob, setDob] = useState("");
  const [guidingUnit, setGuidingUnit] = useState("");
  const [gender, setGender] = useState("Female");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError ?? "");

  async function confirm() {
    setSubmitting(true);
    setError("");
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError("Please enter your full name, phone number, and a password to complete registration.");
      setSubmitting(false);
      return;
    }
    const err = await onSelect({ name, phone, county, dob, guidingUnit, gender, password });
    if (err) setError(err);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#0057B8] ring-2 ring-[#FFD700] ring-offset-2 ring-offset-white shadow-[0_6px_18px_rgba(0,87,184,0.3)] overflow-hidden flex items-center justify-center font-bold text-[#FFD700] text-sm mx-auto mb-6">
            {settings.logoImageUrl ? (
              <img src={settings.logoImageUrl} alt="KGGA logo" className="w-full h-full object-cover drop-shadow-md" />
            ) : (
              settings.logoText
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 bg-[#0057B8]/10 text-[#0057B8] px-3 py-1 rounded-full text-[11px] font-semibold mb-4">
            <GraduationCap size={13} /> Student Registration
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">Welcome to {settings.orgName}</h1>
          <p className="text-gray-500">A few details to finish setting up your student account.</p>
        </div>

        <div className="bg-white rounded-3xl border border-black/5 p-8 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Full name</label>
              <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Wanjiru" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Phone number</label>
              <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Date of birth</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">County</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={county} onChange={(e) => setCounty(e.target.value)}>
                {COUNTIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Gender</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option>Female</option>
                <option>Male</option>
                <option>Prefer not to say</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Choose a password</label>
              <input type="password" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a secure password" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Guiding unit / troop (optional)</label>
              <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={guidingUnit} onChange={(e) => setGuidingUnit(e.target.value)} placeholder="e.g. Westlands Rangers" />
            </div>
          </div>

          {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</div>}

          <div className="flex justify-end mt-6">
            <button
              onClick={confirm}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-[#FFD700] text-[#0057B8] px-7 py-3 rounded-full font-bold text-sm hover:brightness-95 transition-all disabled:opacity-40"
            >
              {submitting ? "Setting up your account…" : "Complete Registration"} <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Tutor or Administrator? Ask your Super Administrator to add your account.
        </p>
      </div>
    </div>
  );
}
