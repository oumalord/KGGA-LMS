import { useEffect, useRef, useState } from "react";
import { api } from "../lib/neonClient";
import { Upload, FileText, Download, Trash2, Search } from "lucide-react";
import type { Profile, Resource } from "../types";

const CATEGORIES = ["Handbooks", "Policies", "Training Manuals", "Templates", "Reports", "General"];

export default function Resources({ profile }: { profile: Profile }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isStaff = profile.role === "admin" || profile.role === "superadmin";

  function load() {
    api.get("/api/resources").then((r) => setResources(r.data.resources));
  }
  useEffect(load, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      await api.post("/api/resources", {
        title: file.name,
        category: category === "All" ? "General" : category,
        contentBase64: base64,
        contentType: file.type || "application/octet-stream",
        fileName: file.name,
      });
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      load();
    };
    reader.readAsDataURL(file);
  }

  async function download(id: string) {
    const r = await api.get(`/api/resources/${id}/url`);
    window.open(r.data.url, "_blank");
  }

  async function remove(id: string) {
    await api.delete(`/api/resources/${id}`);
    load();
  }

  const filtered = resources.filter(
    (r) => (category === "All" || r.category === category) && r.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Resource Center</h1>
          <p className="text-gray-500 text-sm mt-1">Handbooks, policies, guides, templates & training materials.</p>
        </div>
        <label className="flex items-center gap-2 bg-[#0057B8] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:brightness-110 shadow-md cursor-pointer">
          <Upload size={16} /> {uploading ? "Uploading..." : "Upload File"}
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057B8]/30"
            placeholder="Search resources..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <FileText className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500">No resources found.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-5 border border-gray-50 shadow-sm flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#0057B8]/10 flex items-center justify-center shrink-0">
                  <FileText className="text-[#0057B8]" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{r.title}</p>
                  <p className="text-[11px] text-gray-400">{r.category} · {r.uploadedBy}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-auto pt-2">
                <button onClick={() => download(r.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-gray-50 hover:bg-gray-100 py-2 rounded-lg font-medium text-gray-700">
                  <Download size={13} /> Download
                </button>
                {isStaff && (
                  <button onClick={() => remove(r.id)} className="px-2.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
