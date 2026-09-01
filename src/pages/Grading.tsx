import { useEffect, useState } from "react";
import { api } from "../lib/neonClient";
import { ClipboardCheck, ThumbsUp, Heart, Star, Send, Award, MessageSquare, Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";
import type { Course, Profile, Submission, Survey, SiteSettings } from "../types";

const REACTIONS = [
  { key: "thumbsup", icon: ThumbsUp, label: "Nice work" },
  { key: "heart", icon: Heart, label: "Loved it" },
  { key: "star", icon: Star, label: "Outstanding" },
];

const GRADES = ["Distinction", "Merit", "Pass", "Needs Improvement"];

export default function Grading({ profile, settings }: { profile: Profile; settings: SiteSettings }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [tab, setTab] = useState<"grading" | "certificate" | "surveys">("grading");
  const [certMessage, setCertMessage] = useState("");
  const [certSignature, setCertSignature] = useState("");
  const [certBgResourceId, setCertBgResourceId] = useState<string | null>(null);
  const [certBgUrl, setCertBgUrl] = useState<string | null>(null);
  const [savingCert, setSavingCert] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [surveys, setSurveys] = useState<Survey[]>([]);

  useEffect(() => {
    api.get("/api/courses").then((r) => {
      const mine = (r.data.courses as Course[]).filter(
        (c) => c.trainerId === profile.authUserId || profile.role === "admin" || profile.role === "superadmin"
      );
      setCourses(mine);
      if (mine.length > 0) setSelectedCourseId(mine[0].id);
    });
  }, [profile]);

  function loadSubmissions(courseId: string) {
    if (!courseId) return;
    api.get(`/api/courses/${courseId}/submissions`).then((r) => setSubmissions(r.data.submissions));
  }

  useEffect(() => {
    loadSubmissions(selectedCourseId);
    const course = courses.find((c) => c.id === selectedCourseId);
    if (course) {
      setCertMessage(course.certificateTemplate?.message ?? "has successfully completed");
      setCertSignature(course.certificateTemplate?.signatureLabel ?? "Trainer");
      const bgId = course.certificateTemplate?.backgroundResourceId ?? null;
      setCertBgResourceId(bgId);
      if (bgId) {
        api.get(`/api/resources/${bgId}/url`).then((r) => setCertBgUrl(r.data.url)).catch(() => setCertBgUrl(null));
      } else {
        setCertBgUrl(null);
      }
    }
    if (selectedCourseId) {
      api.get(`/api/courses/${selectedCourseId}/surveys`).then((r) => setSurveys(r.data.surveys)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, courses]);

  async function saveCertTemplate() {
    setSavingCert(true);
    try {
      await api.put(`/api/courses/${selectedCourseId}`, {
        certificateTemplate: { message: certMessage, signatureLabel: certSignature, backgroundResourceId: certBgResourceId },
      });
    } finally {
      setSavingCert(false);
    }
  }

  async function uploadCertBackground(file: File) {
    setUploadingBg(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const r = await api.post("/api/resources", {
        title: `Certificate background - ${file.name}`,
        category: "Certificate Templates",
        contentBase64: base64,
        contentType: file.type || "image/jpeg",
        fileName: file.name,
      });
      setCertBgResourceId(r.data.id);
      const urlRes = await api.get(`/api/resources/${r.data.id}/url`);
      setCertBgUrl(urlRes.data.url);
      await api.put(`/api/courses/${selectedCourseId}`, {
        certificateTemplate: { message: certMessage, signatureLabel: certSignature, backgroundResourceId: r.data.id },
      });
      setUploadingBg(false);
    };
    reader.readAsDataURL(file);
  }

  async function removeCertBackground() {
    setCertBgResourceId(null);
    setCertBgUrl(null);
    await api.put(`/api/courses/${selectedCourseId}`, {
      certificateTemplate: { message: certMessage, signatureLabel: certSignature, backgroundResourceId: null },
    });
  }

  async function postResult(id: string) {
    const draft = drafts[id];
    if (!draft?.grade) return;
    await api.post(`/api/submissions/${id}/grade`, { grade: draft.grade, feedback: draft.feedback ?? "" });
    loadSubmissions(selectedCourseId);
  }

  async function react(id: string, reaction: string) {
    await api.post(`/api/submissions/${id}/react`, { reaction });
    loadSubmissions(selectedCourseId);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Grading & Results</h1>
        <p className="text-gray-500 text-sm mt-1">Mark learner assessments, post results, and react to their responses.</p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <ClipboardCheck className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500">You don't have any courses to grade yet. Create one from the Courses page.</p>
        </div>
      ) : (
        <>
          <select
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-6"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <div className="flex gap-2 mb-6">
            <button onClick={() => setTab("grading")} className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${tab === "grading" ? "bg-[#0057B8] text-white" : "bg-gray-100 text-gray-600"}`}>
              <ClipboardCheck size={14} /> Grading
            </button>
            <button onClick={() => setTab("certificate")} className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${tab === "certificate" ? "bg-[#0057B8] text-white" : "bg-gray-100 text-gray-600"}`}>
              <Award size={14} /> Certificate Template
            </button>
            <button onClick={() => setTab("surveys")} className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${tab === "surveys" ? "bg-[#0057B8] text-white" : "bg-gray-100 text-gray-600"}`}>
              <MessageSquare size={14} /> Survey Results
            </button>
          </div>

          {tab === "certificate" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-50 shadow-sm">
                <p className="font-bold text-gray-900 mb-4">Edit Certificate Template</p>

                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Certificate background (optional)</label>
                <div className="rounded-xl overflow-hidden border border-gray-100 mb-3 bg-gray-50 h-32 flex items-center justify-center">
                  {certBgUrl ? (
                    <img src={certBgUrl} alt="Certificate background" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <ImageIcon size={22} className="mx-auto mb-1" />
                      <p className="text-[11px]">No custom background — using the default design</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-5">
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#0057B8] text-white px-3.5 py-2 rounded-lg cursor-pointer hover:brightness-110">
                    {uploadingBg ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploadingBg ? "Uploading…" : certBgUrl ? "Replace Image" : "Upload Template Image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadCertBackground(e.target.files[0])}
                    />
                  </label>
                  {certBgUrl && (
                    <button onClick={removeCertBackground} className="text-xs font-semibold text-gray-400 hover:text-red-500 flex items-center gap-1">
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mb-5 -mt-3">
                  Upload a blank certificate design (no names). The learner's name, course, date and certificate number are added automatically when it's issued.
                </p>

                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Completion message</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-4 text-sm"
                  value={certMessage}
                  onChange={(e) => setCertMessage(e.target.value)}
                  placeholder="has successfully completed"
                />
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Signature label</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-4 text-sm"
                  value={certSignature}
                  onChange={(e) => setCertSignature(e.target.value)}
                  placeholder="Trainer"
                />
                <button
                  onClick={saveCertTemplate}
                  disabled={savingCert}
                  className="bg-[#0057B8] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:brightness-110 disabled:opacity-60"
                >
                  {savingCert ? "Saving…" : "Save Template"}
                </button>
              </div>

              <div>
                {certBgUrl ? (
                  <div className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                    <img src={certBgUrl} alt="Certificate preview" className="w-full h-auto" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                      <p className="text-xl font-bold text-gray-900 bg-white/80 px-4 py-1 rounded-lg mb-2">Jane Wanjiru</p>
                      <p className="text-sm text-gray-800 bg-white/80 px-3 py-1 rounded-lg mb-1">{certMessage || "has successfully completed"}</p>
                      <p className="text-base font-semibold text-[#0057B8] bg-white/80 px-3 py-1 rounded-lg">{courses.find((c) => c.id === selectedCourseId)?.title ?? "Course Title"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="border-4 border-[#FFD700] rounded-2xl p-8 text-center bg-white">
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
                    <p className="text-xl font-bold text-gray-900 mb-6">Jane Wanjiru</p>
                    <p className="text-sm text-gray-500 mb-1">{certMessage || "has successfully completed"}</p>
                    <p className="text-lg font-semibold text-[#c9a300] mb-6">{courses.find((c) => c.id === selectedCourseId)?.title ?? "Course Title"}</p>
                    <div className="flex items-center justify-between mt-8">
                      <div className="text-left">
                        <p className="text-[11px] text-gray-400">{certSignature || "Trainer"}</p>
                        <p className="text-sm font-medium text-gray-800">{profile.name}</p>
                        <p className="text-[11px] text-gray-400 mt-2">Issued</p>
                        <p className="text-sm font-medium text-gray-800">{new Date().toLocaleDateString()}</p>
                        <p className="text-[11px] text-gray-400 mt-2">Certificate No.</p>
                        <p className="text-sm font-medium text-gray-800">KGGA-{new Date().getFullYear()}-PREVIEW</p>
                      </div>
                      <div className="w-20 h-20 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-[9px] text-gray-300 text-center">
                        QR Code
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-center text-[11px] text-gray-400 mt-3">
                  Preview only — real certificates are generated automatically with the learner's name and a scannable QR code.
                </p>
              </div>
            </div>
          )}

          {tab === "surveys" && (
            <div className="space-y-3">
              {surveys.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <MessageSquare className="mx-auto text-gray-300 mb-3" size={40} />
                  <p className="text-gray-500">No survey responses yet.</p>
                </div>
              ) : (
                surveys.map((sv) => (
                  <div key={sv.id} className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-800">{sv.userName}</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={13} className={n <= sv.rating ? "fill-[#FFD700] text-[#FFD700]" : "text-gray-200"} />
                        ))}
                      </div>
                    </div>
                    {sv.comments && <p className="text-xs text-gray-500">{sv.comments}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "grading" && (submissions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <ClipboardCheck className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-gray-500">No learner responses submitted for this course yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((s) => {
                const draft = drafts[s.id] ?? { grade: s.grade ?? "", feedback: s.feedback ?? "" };
                return (
                  <div key={s.id} className="bg-white rounded-2xl p-5 border border-gray-50 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{s.userName}</p>
                        <p className="text-[11px] text-gray-400">{s.lessonTitle} · {new Date(s.submittedAt).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-1.5">
                        {REACTIONS.map((r) => (
                          <button
                            key={r.key}
                            title={r.label}
                            onClick={() => react(s.id, r.key)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              s.reaction === r.key ? "bg-[#FFD700] text-[#0057B8]" : "bg-gray-50 text-gray-400 hover:text-[#0057B8]"
                            }`}
                          >
                            <r.icon size={14} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 mb-3 whitespace-pre-wrap">{s.content}</p>

                    <div className="grid sm:grid-cols-[1fr_2fr_auto] gap-2 items-start">
                      <select
                        className="border border-gray-200 rounded-lg px-3 py-2 text-xs"
                        value={draft.grade}
                        onChange={(e) => setDrafts({ ...drafts, [s.id]: { ...draft, grade: e.target.value } })}
                      >
                        <option value="">Select grade...</option>
                        {GRADES.map((g) => (
                          <option key={g}>{g}</option>
                        ))}
                      </select>
                      <input
                        className="border border-gray-200 rounded-lg px-3 py-2 text-xs"
                        placeholder="Feedback for the learner (optional)"
                        value={draft.feedback}
                        onChange={(e) => setDrafts({ ...drafts, [s.id]: { ...draft, feedback: e.target.value } })}
                      />
                      <button
                        onClick={() => postResult(s.id)}
                        className="flex items-center gap-1.5 bg-[#0057B8] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:brightness-110"
                      >
                        <Send size={13} /> Post Result
                      </button>
                    </div>

                    {s.grade && (
                      <div className="mt-3 text-xs bg-green-50 text-green-700 font-medium px-3 py-2 rounded-lg inline-block">
                        Result posted: {s.grade} {s.feedback ? `— "${s.feedback}"` : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
