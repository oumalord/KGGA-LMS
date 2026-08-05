import { useEffect, useState } from "react";
import { api } from "@appdeploy/client";
import { ArrowLeft, CheckCircle2, Circle, PlayCircle, FileText, Video, Award, Sparkles, Lock, Star, ChevronDown, ChevronUp, HardDrive, Download } from "lucide-react";
import type { Course, Enrollment, Profile, Badge } from "../types";

interface Props {
  courseId: string;
  profile: Profile;
  onBack: () => void;
}

const lessonIcon: Record<string, any> = { video: Video, document: FileText, quiz: FileText, live: PlayCircle, cat: FileText };

export default function CourseDetail({ courseId, profile, onBack }: Props) {
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [justEarned, setJustEarned] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [purchased, setPurchased] = useState(false);
  const [buying, setBuying] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyRating, setSurveyRating] = useState(5);
  const [surveyComments, setSurveyComments] = useState("");
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  async function load() {
    const cr = await api.get(`/api/courses/${courseId}`);
    setCourse(cr.data.course);
    const er = await api.get("/api/my/courses");
    const mine = (er.data.enrollments as Enrollment[]).find((e) => e.courseId === courseId);
    setEnrollment(mine ?? null);
    const pr = await api.get("/api/my/purchases");
    setPurchased((pr.data.purchases as any[]).some((p) => p.courseId === courseId));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function enroll() {
    await api.post(`/api/courses/${courseId}/enroll`, {});
    load();
  }

  async function buyAndEnroll() {
    setBuying(true);
    try {
      await api.post(`/api/courses/${courseId}/purchase`, {});
      await api.post(`/api/courses/${courseId}/enroll`, {});
      load();
    } finally {
      setBuying(false);
    }
  }

  async function submitSurvey() {
    await api.post(`/api/courses/${courseId}/survey`, { rating: surveyRating, comments: surveyComments });
    setSurveySubmitted(true);
  }

  async function completeLesson(lessonId: string) {
    const r = await api.post(`/api/courses/${courseId}/lessons/${lessonId}/complete`, {});
    if (r.data.certificate) setJustEarned(r.data.certificate.certNumber);
    if (r.data.newBadges?.length) setNewBadges(r.data.newBadges);
    load();
  }

  async function submitResponse(lessonId: string) {
    const content = responses[lessonId];
    if (!content?.trim()) return;
    await api.post(`/api/courses/${courseId}/lessons/${lessonId}/submit`, { content });
    await completeLesson(lessonId);
  }

  function youtubeEmbedUrl(url: string) {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{6,})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  }

  async function openResource(resourceId: string) {
    const r = await api.get(`/api/resources/${resourceId}/url`);
    window.open(r.data.url, "_blank");
  }

  if (!course) return <p className="text-sm text-gray-400">Loading course...</p>;

  const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5">
        <ArrowLeft size={16} /> Back to Courses
      </button>

      <div className="rounded-2xl p-8 text-white mb-6" style={{ background: course.coverColor }}>
        <span className="text-[11px] font-semibold bg-white/20 px-2.5 py-1 rounded-full">{course.category}</span>
        <h1 className="text-2xl font-extrabold mt-3">{course.title}</h1>
        <p className="text-white/85 text-sm mt-2 max-w-xl">{course.description}</p>
        <p className="text-white/70 text-xs mt-3">Facilitated by {course.trainerName} · {totalLessons} lessons</p>
      </div>

      {justEarned && (
        <div className="mb-6 flex items-center gap-3 bg-[#FFF8DC] border border-[#FFD700] rounded-2xl p-5">
          <Award className="text-[#c9a300]" size={28} />
          <div>
            <p className="font-bold text-gray-900">Congratulations! You earned a certificate 🎉</p>
            <p className="text-xs text-gray-600">Certificate No. {justEarned} — find it under "Certificates".</p>
          </div>
        </div>
      )}

      {newBadges.length > 0 && (
        <div className="mb-6 flex items-center gap-3 bg-[#0057B8]/5 border border-[#0057B8]/20 rounded-2xl p-5">
          <Sparkles className="text-[#0057B8]" size={24} />
          <div>
            <p className="font-bold text-gray-900">New badge{newBadges.length > 1 ? "s" : ""} unlocked!</p>
            <p className="text-xs text-gray-600">{newBadges.map((b) => b.label).join(", ")} — see "My Profile" for your full collection.</p>
          </div>
        </div>
      )}

      {!enrollment ? (
        course.isPaid && profile.authUserId !== course.trainerId && profile.role !== "admin" && profile.role !== "superadmin" && !purchased ? (
          <div className="bg-white rounded-2xl p-6 mb-6 border border-[#FFD700] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="text-[#c9a300]" size={20} />
              <div>
                <p className="font-bold text-gray-900">This is a paid course</p>
                <p className="text-xs text-gray-500">One-time payment of KES {course.price} to unlock all content.</p>
              </div>
            </div>
            <button
              onClick={buyAndEnroll}
              disabled={buying}
              className="bg-[#FFD700] text-[#0057B8] font-bold px-5 py-2.5 rounded-xl hover:brightness-95 disabled:opacity-60"
            >
              {buying ? "Processing…" : `Pay KES ${course.price}`}
            </button>
          </div>
        ) : (
          <button onClick={enroll} className="bg-[#0057B8] text-white px-6 py-3 rounded-xl font-semibold mb-6 hover:brightness-110 shadow-md">
            Enroll in this Course
          </button>
        )
      ) : (
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-50 shadow-sm">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>Your progress</span>
            <span className="text-[#0057B8] font-bold">{enrollment.progressPercent}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#FFD700]" style={{ width: `${enrollment.progressPercent}%` }} />
          </div>
        </div>
      )}

      {enrollment && enrollment.progressPercent >= 100 && !surveySubmitted && (
        <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-50 shadow-sm">
          {!showSurvey ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">How was this course?</p>
                <p className="text-xs text-gray-500">Share quick feedback to help improve it for future learners.</p>
              </div>
              <button onClick={() => setShowSurvey(true)} className="bg-[#0057B8] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:brightness-110">
                Take Survey
              </button>
            </div>
          ) : (
            <div>
              <p className="font-bold text-gray-900 mb-3">Course Feedback Survey</p>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setSurveyRating(n)}>
                    <Star size={22} className={n <= surveyRating ? "fill-[#FFD700] text-[#FFD700]" : "text-gray-200"} />
                  </button>
                ))}
              </div>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3"
                rows={3}
                placeholder="Any comments about the course? (optional)"
                value={surveyComments}
                onChange={(e) => setSurveyComments(e.target.value)}
              />
              <button onClick={submitSurvey} className="bg-[#FFD700] text-[#0057B8] font-bold px-5 py-2 rounded-xl text-sm hover:brightness-95">
                Submit Feedback
              </button>
            </div>
          )}
        </div>
      )}

      {surveySubmitted && (
        <div className="mb-6 bg-green-50 border border-green-100 text-green-700 text-sm font-medium px-4 py-3 rounded-xl">
          Thanks for your feedback! 🎉
        </div>
      )}

      <div className="space-y-5">
        {course.modules.map((m, i) => (
          <div key={m.id} className="bg-white rounded-2xl border border-gray-50 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
              <p className="font-bold text-gray-900 text-sm">
                Module {i + 1}: {m.title}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {m.lessons.map((l) => {
                const Icon = lessonIcon[l.type] ?? FileText;
                const done = enrollment?.completedLessonIds?.includes(l.id);
                if (l.type === "quiz" || l.type === "cat") {
                  return (
                    <div key={l.id} className="px-5 py-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Icon size={16} className="text-[#0057B8]" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{l.title}</p>
                            <p className="text-[11px] text-gray-400">{l.type === "cat" ? "CAT — submit a written response" : "Assessment — submit a written response"}</p>
                          </div>
                        </div>
                        {done && <CheckCircle2 size={20} className="text-green-500" />}
                      </div>
                      {enrollment && !done && (
                        <div className="mt-2">
                          <textarea
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057B8]/30"
                            rows={3}
                            placeholder="Type your response to this assessment..."
                            value={responses[l.id] ?? ""}
                            onChange={(e) => setResponses({ ...responses, [l.id]: e.target.value })}
                          />
                          <button
                            onClick={() => submitResponse(l.id)}
                            className="mt-2 bg-[#0057B8] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:brightness-110"
                          >
                            Submit Response
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={l.id}>
                    <div
                      className="flex items-center justify-between px-5 py-3.5 cursor-pointer"
                      onClick={() => setExpandedLesson(expandedLesson === l.id ? null : l.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} className="text-[#0057B8]" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{l.title}</p>
                          {l.durationMin && <p className="text-[11px] text-gray-400">{l.durationMin} min</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {(l.contentText || l.youtubeUrl || l.driveUrl || l.resourceId) &&
                          (expandedLesson === l.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />)}
                        {enrollment && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              completeLesson(l.id);
                            }}
                            disabled={done}
                          >
                            {done ? (
                              <CheckCircle2 size={20} className="text-green-500" />
                            ) : (
                              <Circle size={20} className="text-gray-300 hover:text-[#0057B8]" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {expandedLesson === l.id && (
                      <div className="px-5 pb-4 -mt-1">
                        {l.youtubeUrl && (
                          <div className="aspect-video rounded-xl overflow-hidden bg-black">
                            <iframe className="w-full h-full" src={youtubeEmbedUrl(l.youtubeUrl)} title={l.title} allowFullScreen />
                          </div>
                        )}
                        {l.driveUrl && (
                          <a
                            href={l.driveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#0057B8] bg-[#0057B8]/5 px-4 py-2.5 rounded-xl hover:bg-[#0057B8]/10"
                          >
                            <HardDrive size={15} /> Open in Google Drive
                          </a>
                        )}
                        {l.resourceId && (
                          <button
                            onClick={() => openResource(l.resourceId!)}
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#0057B8] bg-[#0057B8]/5 px-4 py-2.5 rounded-xl hover:bg-[#0057B8]/10"
                          >
                            <Download size={15} /> {l.fileName || "Download material"}
                          </button>
                        )}
                        {l.contentText && <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{l.contentText}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
