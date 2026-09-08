import { useEffect, useRef, useState } from "react";
import { Building2, ExternalLink, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { api } from "../lib/neonClient";
import type { Partner, Profile } from "../types";

export default function Partners({ profile }: { profile: Profile }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [logoData, setLogoData] = useState<{ contentBase64: string; contentType: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canManage = profile.role === "admin" || profile.role === "superadmin";

  function load() { api.get("/api/partners").then((r) => setPartners(r.data.partners)); }
  useEffect(load, []);

  function openEditor(partner?: Partner) {
    setEditing(partner || null);
    setEditorOpen(true);
    setName(partner?.name || "");
    setWebsiteUrl(partner?.websiteUrl || "");
    setDescription(partner?.description || "");
    setLogoData(null);
  }

  function selectLogo(file: File) {
    const reader = new FileReader();
    reader.onload = () => setLogoData({ contentBase64: (reader.result as string).split(",")[1], contentType: file.type || "image/png" });
    reader.readAsDataURL(file);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const body = { name, websiteUrl, description, ...logoData };
      if (editing) await api.put(`/api/partners/${editing.id}`, body);
      else await api.post("/api/partners", body);
      setEditing(null);
      setEditorOpen(false);
      load();
    } finally { setSaving(false); }
  }

  async function remove(id: string) { if (window.confirm("Delete this partner?")) { await api.delete(`/api/partners/${id}`); load(); } }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div><h1 className="text-2xl font-extrabold text-gray-900">Partners</h1><p className="text-gray-500 text-sm mt-1">Organizations supporting the Kenya Girl Guides Association.</p></div>
        {canManage && <button onClick={() => openEditor()} className="inline-flex items-center gap-2 bg-[#0057B8] text-white px-4 py-2.5 rounded-xl font-semibold text-sm"><Plus size={16} /> Add Partner</button>}
      </div>
      {partners.length === 0 ? <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center"><Building2 className="mx-auto text-gray-300 mb-3" size={42} /><p className="text-gray-500">No partners have been added yet.</p></div> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{partners.map((partner) => <article key={partner.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"><div className="h-28 rounded-xl bg-gray-50 flex items-center justify-center mb-4 overflow-hidden">{partner.logoUrl ? <img src={partner.logoUrl} alt={`${partner.name} logo`} className="max-h-20 max-w-[80%] object-contain" /> : <Building2 size={36} className="text-[#0057B8]/40" />}</div><h2 className="font-bold text-gray-900">{partner.name}</h2>{partner.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{partner.description}</p>}<div className="flex items-center gap-2 mt-4">{partner.websiteUrl && <a href={partner.websiteUrl} target="_blank" rel="noreferrer" className="flex-1 inline-flex justify-center items-center gap-1.5 text-xs bg-gray-50 py-2 rounded-lg font-semibold text-[#0057B8]">Visit <ExternalLink size={13} /></a>}{canManage && <><button title="Edit partner" onClick={() => openEditor(partner)} className="p-2 text-gray-400 hover:text-[#0057B8]"><Pencil size={15} /></button><button title="Delete partner" onClick={() => remove(partner.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button></>}</div></article>)}</div>}
      {editorOpen && canManage && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><form onSubmit={save} className="bg-white rounded-2xl p-6 w-full max-w-md"><div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold">{editing ? "Edit Partner" : "Add Partner"}</h2><button type="button" onClick={() => { setEditing(null); setEditorOpen(false); }}><X size={20} className="text-gray-400" /></button></div><input required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm" placeholder="Partner name" value={name} onChange={(e) => setName(e.target.value)} /><input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm" placeholder="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} /><textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm" rows={3} placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} /><label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-600 cursor-pointer mb-5"><Upload size={16} /> {logoData ? "Logo selected" : "Upload partner logo"}<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && selectLogo(e.target.files[0])} /></label><button disabled={saving} className="w-full bg-[#FFD700] text-[#0057B8] font-bold py-2.5 rounded-xl">{saving ? "Saving..." : "Save Partner"}</button></form></div>}
    </div>
  );
}
