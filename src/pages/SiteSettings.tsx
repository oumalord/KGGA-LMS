import { useRef, useState } from "react";
import { api } from "../lib/neonClient";
import { Palette, Upload, Loader2, Save, ImageIcon } from "lucide-react";
import type { SiteSettings as SiteSettingsType } from "../types";

export default function SiteSettings({ settings, onUpdated }: { settings: SiteSettingsType; onUpdated: () => void }) {
  const [orgName, setOrgName] = useState(settings.orgName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [logoText, setLogoText] = useState(settings.logoText);
  const [logoImageUrl, setLogoImageUrl] = useState(settings.logoImageUrl);
  const [certOrgName, setCertOrgName] = useState(settings.certOrgName);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const templateFileRef = useRef<HTMLInputElement>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await api.put("/api/settings", { orgName, tagline, logoText, logoImageUrl, certOrgName });
      onUpdated();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      await api.post("/api/settings/hero-image", { contentBase64: base64, contentType: file.type || "image/jpeg" });
      setUploading(false);
      onUpdated();
    };
    reader.readAsDataURL(file);
  }

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const nextLogoUrl = `data:${file.type || "image/png"};base64,${base64}`;
      setLogoImageUrl(nextLogoUrl);
      await api.post("/api/settings/logo-image", { contentBase64: base64, contentType: file.type || "image/png" });
      setLogoUploading(false);
      onUpdated();
    };
    reader.readAsDataURL(file);
  }

  async function handleCertificateTemplateUpload(file: File) {
    setTemplateUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const response = await api.post("/api/resources", {
          title: "Default certificate template",
          category: "Certificate Templates",
          contentBase64: base64,
          contentType: file.type || "image/png",
          fileName: file.name,
        });
        await api.put("/api/settings", { certificateTemplateResourceId: response.data.id });
        onUpdated();
      } finally {
        setTemplateUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-[#0057B8] flex items-center justify-center">
          <Palette size={19} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Site Settings</h1>
          <p className="text-gray-500 text-sm">Control the branding across the whole platform — homepage, sidebar, and certificates.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-50 shadow-sm p-6 mb-6">
        <p className="font-bold text-gray-900 mb-4">Homepage Image</p>
        <div className="rounded-2xl overflow-hidden border border-gray-100 mb-4 bg-gray-50 h-56 flex items-center justify-center">
          {settings.heroImageUrl ? (
            <img src={settings.heroImageUrl} alt="Current homepage" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-gray-400">
              <ImageIcon size={28} className="mx-auto mb-2" />
              <p className="text-xs">Using the default KGGA image</p>
            </div>
          )}
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-semibold bg-[#0057B8] text-white px-4 py-2.5 rounded-xl cursor-pointer hover:brightness-110">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Uploading…" : "Upload New Image"}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
          />
        </label>
        <p className="text-[11px] text-gray-400 mt-2">This photo appears on the homepage hero and dashboard. Use a landscape or portrait photo of KGGA learners for the most professional look.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-50 shadow-sm p-6">
        <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm font-bold text-gray-900 mb-1">Default Certificate Template</p>
          <p className="text-xs text-gray-500 mb-3">Upload a landscape image used for learners' certificates when their course has no custom template.</p>
          <label className="inline-flex items-center gap-2 text-xs font-semibold bg-[#0057B8] text-white px-3 py-2 rounded-lg cursor-pointer hover:brightness-110">
            {templateUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {templateUploading ? "Uploading..." : "Upload Template"}
            <input ref={templateFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleCertificateTemplateUpload(e.target.files[0])} />
          </label>
        </div>
        <p className="font-bold text-gray-900 mb-4">Branding & Text</p>

        <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-[11px] font-semibold text-gray-500 mb-3">Logo</p>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-[#0057B8] ring-2 ring-[#FFD700] ring-offset-3 ring-offset-gray-50 shadow-[0_8px_22px_rgba(0,87,184,0.3)] overflow-hidden flex items-center justify-center text-[#FFD700] font-black shrink-0">
              {logoImageUrl ? (
                <img src={logoImageUrl} alt="KGGA logo preview" className="w-full h-full object-cover drop-shadow-md" />
              ) : (
                <span className="text-lg">{logoText}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700 font-medium mb-2">Upload a square logo for the site header, sidebar, and certificate previews.</p>
              <label className="inline-flex items-center gap-2 text-xs font-semibold bg-[#0057B8] text-white px-3 py-2 rounded-lg cursor-pointer hover:brightness-110">
                {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {logoUploading ? "Uploading…" : "Upload Logo"}
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                />
              </label>
            </div>
          </div>
        </div>

        <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Organization name</label>
        <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-4 text-sm" value={orgName} onChange={(e) => setOrgName(e.target.value)} />

        <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Homepage tagline</label>
        <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-4 text-sm" rows={2} value={tagline} onChange={(e) => setTagline(e.target.value)} />

        <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Certificate organization name</label>
        <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-5 text-sm" value={certOrgName} onChange={(e) => setCertOrgName(e.target.value)} />

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-[#FFD700] text-[#0057B8] font-bold px-5 py-2.5 rounded-xl hover:brightness-95 disabled:opacity-60"
          >
            <Save size={15} /> {saving ? "Saving…" : "Save Changes"}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
        </div>
      </div>
    </div>
  );
}
