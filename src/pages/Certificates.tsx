import { useEffect, useRef, useState } from "react";
import { api } from "../lib/neonClient";
import { Award, X, Download, Upload, Loader2, ImageIcon } from "lucide-react";
import type { Certificate, Profile, SiteSettings } from "../types";

export default function Certificates({ settings, profile, onUpdated }: { settings: SiteSettings; profile: Profile; onUpdated: () => void }) {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [selected, setSelected] = useState<Certificate | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateNotice, setTemplateNotice] = useState("");
  const templateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/api/my/certificates").then((r) => setCerts(r.data.certificates));
  }, []);

  async function uploadTemplate(file: File) {
    setUploadingTemplate(true);
    setTemplateNotice("");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const response = await api.post("/api/resources", {
          title: "Default certificate template",
          category: "Certificate Templates",
          contentBase64: (reader.result as string).split(",")[1],
          contentType: file.type || "image/png",
          fileName: file.name,
        });
        await api.put("/api/settings", { certificateTemplateResourceId: response.data.id });
        onUpdated();
        setTemplateNotice("Template saved. It will be used for certificates issued from now on.");
      } catch (error: any) {
        setTemplateNotice(error?.response?.data?.error || "The template could not be uploaded.");
      } finally {
        setUploadingTemplate(false);
        if (templateInputRef.current) templateInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">My Certificates</h1>
      <p className="text-gray-500 text-sm mb-6">Every certificate includes a QR code for instant verification.</p>

      {profile.role === "superadmin" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0057B8]/10 flex items-center justify-center shrink-0"><ImageIcon size={18} className="text-[#0057B8]" /></div>
              <div><p className="font-bold text-gray-900 text-sm">Default Certificate Template</p><p className="text-xs text-gray-500 mt-1">Upload a landscape PNG or JPG background for future learner certificates.</p></div>
            </div>
            <label className="inline-flex items-center justify-center gap-2 bg-[#0057B8] text-white px-4 py-2.5 rounded-xl font-semibold text-sm cursor-pointer hover:brightness-110 shrink-0">
              {uploadingTemplate ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {uploadingTemplate ? "Uploading..." : "Upload Template"}
              <input ref={templateInputRef} type="file" accept="image/png,image/jpeg" className="hidden" disabled={uploadingTemplate} onChange={(event) => event.target.files?.[0] && uploadTemplate(event.target.files[0])} />
            </label>
          </div>
          {templateNotice && <p className={`mt-3 text-xs ${templateNotice.startsWith("Template saved") ? "text-green-700" : "text-red-600"}`}>{templateNotice}</p>}
        </div>
      )}

      {certs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <Award className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500">Complete a course to earn your first certificate.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {certs.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="text-left bg-white rounded-2xl p-5 border border-gray-50 shadow-sm hover:-translate-y-1 transition-transform"
            >
              <div className="w-11 h-11 rounded-xl bg-[#FFF8DC] flex items-center justify-center mb-4">
                <Award className="text-[#c9a300]" size={20} />
              </div>
              <p className="font-bold text-gray-900 text-sm mb-1">{c.courseTitle}</p>
              <p className="text-[11px] text-gray-400">{c.certNumber}</p>
              <p className="text-[11px] text-gray-400 mt-1">{new Date(c.issueDate).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      )}

      {selected && <CertificateModal cert={selected} onClose={() => setSelected(null)} settings={settings} />}
    </div>
  );
}

function CertificateModal({ cert, onClose, settings }: { cert: Certificate; onClose: () => void; settings: SiteSettings }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(cert.certNumber)}`;
  const [bgUrl, setBgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (cert.backgroundResourceId) {
      api.get(`/api/resources/${cert.backgroundResourceId}/url`).then((r) => setBgUrl(r.data.url)).catch(() => setBgUrl(null));
    } else {
      setBgUrl(null);
    }
  }, [cert.backgroundResourceId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden">
        <div className="flex justify-end p-3">
          <button onClick={onClose}>
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="px-10 pb-10">
          {bgUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-gray-100">
              <img src={bgUrl} alt="Certificate" className="w-full h-auto" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <p className="text-2xl font-bold text-gray-900 bg-white/85 px-5 py-1.5 rounded-lg mb-2">{cert.userName}</p>
                <p className="text-sm text-gray-800 bg-white/85 px-4 py-1 rounded-lg mb-1.5">{cert.message ?? "has successfully completed"}</p>
                <p className="text-lg font-semibold text-[#0057B8] bg-white/85 px-4 py-1 rounded-lg mb-1.5">{cert.courseTitle}</p>
                <p className="text-[11px] text-gray-600 bg-white/85 px-3 py-0.5 rounded-lg">{cert.certNumber} · {new Date(cert.issueDate).toLocaleDateString()}</p>
              </div>
            </div>
          ) : (
            <div className="border-4 border-[#FFD700] rounded-2xl p-8 text-center relative">
              <div className="w-14 h-14 rounded-full bg-[#0057B8] overflow-hidden text-[#FFD700] font-black flex items-center justify-center mx-auto mb-4">
                {settings.logoImageUrl ? (
                  <img src={settings.logoImageUrl} alt="KGGA logo" className="w-full h-full object-cover drop-shadow-md" />
                ) : (
                  settings.logoText
                )}
              </div>
              <p className="text-xs tracking-widest text-gray-500 font-semibold">{settings.certOrgName}</p>
              <p className="text-2xl font-extrabold text-[#0057B8] mt-3 mb-1">Certificate of Completion</p>
              <p className="text-sm text-gray-500 mb-6">This certifies that</p>
              <p className="text-xl font-bold text-gray-900 mb-6">{cert.userName}</p>
              <p className="text-sm text-gray-500 mb-1">{cert.message ?? "has successfully completed"}</p>
              <p className="text-lg font-semibold text-[#c9a300] mb-6">{cert.courseTitle}</p>
              <div className="flex items-center justify-between mt-8">
                <div className="text-left">
                  <p className="text-[11px] text-gray-400">{cert.signatureLabel ?? "Trainer"}</p>
                  <p className="text-sm font-medium text-gray-800">{cert.trainerName}</p>
                  <p className="text-[11px] text-gray-400 mt-2">Issued</p>
                  <p className="text-sm font-medium text-gray-800">{new Date(cert.issueDate).toLocaleDateString()}</p>
                  <p className="text-[11px] text-gray-400 mt-2">Certificate No.</p>
                  <p className="text-sm font-medium text-gray-800">{cert.certNumber}</p>
                </div>
                <img src={qrUrl} alt="Verification QR" className="w-24 h-24 rounded-lg border border-gray-100" />
              </div>
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="w-full mt-5 flex items-center justify-center gap-2 bg-[#0057B8] text-white py-2.5 rounded-xl font-semibold hover:brightness-110"
          >
            <Download size={16} /> Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
