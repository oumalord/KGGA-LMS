import { useEffect, useState } from "react";
import { api } from "@appdeploy/client";
import { Plus, BookOpen, X, Trash2, Tag, Type, Youtube, HardDrive, Upload, Loader2 } from "lucide-react";
import type { Course, Profile } from "../types";

interface Props {
  profile: Profile;
  onOpenCourse: (id: string) => void;
}

const COLORS = ["#0057B8", "#c9a300", "#2563eb", "#b45309"];
const LESSON_TYPES = [
  { value: "video", label: "Video Lesson" },
  { value: "document", label: "Reading / Document" },
  { value: "live", label: "Live Session" },
  { value: "quiz", label: "Quiz" },
  { value: "cat", label: "CAT (Continuous Assessment Test)" },
];
const CONTENT_SOURCES = [
  { value: "text", label: "Type content", icon: Type },
  { value: "youtube", label: "YouTube link", icon: Youtube },
  { value: "drive", label: "Google Drive link", icon: HardDrive },
  { value: "upload", label: "Upload from computer", icon: Upload },
];

interface DraftLesson {
  id: string;
  title: string;
  type: string;
  contentSource: "text" | "youtube" | "drive" | "upload";
  contentText: string;
  youtubeUrl: string;
  driveUrl: string;
  resourceId?: string;
  fileName?: string;
  uploading?: boolean;
}

function newLesson(title = "", type = "video"): DraftLesson {
  return { id: `l${Date.now()}${Math.random().toString(36).slice(2, 6)}`, title, type, contentSource: "text", contentText: "", youtubeUrl: "", driveUrl: "" };
}

export default function Courses({ profile, onOpenCourse }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Leadership");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("500");
  const [lessons, setLessons] = useState<DraftLesson[]>([newLesson("Welcome & Orientation", "video"), newLesson("Course Handbook", "document")]);
  const canCreate = ["trainer", "coordinator", "admin", "superadmin"].includes(profile.role);

  function addLesson() {
    setLessons([...lessons, newLesson()]);
  }
  function updateLesson(id: string, patch: Partial<DraftLesson>) {
    setLessons(lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLesson(id: string) {
    setLessons(lessons.filter((l) => l.id !== id));
  }

  async function handleUpload(lessonId: string, file: File) {
    updateLesson(lessonId, { uploading: true });
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const r = await api.post("/api/resources", {
        title: file.name,
        category: "Course Materials",
        contentBase64: base64,
        contentType: file.type || "application/octet-stream",
        fileName: file.name,
      });
      updateLesson(lessonId, { uploading: false, resourceId: r.data.id, fileName: file.name });
    };
    reader.readAsDataURL(file);
  }

  function load() {
    setLoading(true);
    api.get("/api/courses").then((r) => setCourses(r.data.courses)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function createCourse() {
    if (!title.trim()) return;
    const validLessons = lessons.filter((l) => l.title.trim());
    await api.post("/api/courses", {
      title,
      description,
      category,
      isPaid,
      price: isPaid ? Number(price) || 0 : 0,
      coverColor: COLORS[Math.floor(Math.random() * COLORS.length)],
      modules: [
        {
          id: "m1",
          title: "Course Curriculum",
          lessons: (validLessons.length > 0 ? validLessons : [newLesson("Welcome & Orientation", "video")]).map((l) => ({
            id: l.id,
            title: l.title,
            type: l.type,
            contentSource: l.contentSource,
            contentText: l.contentSource === "text" ? l.contentText : undefined,
            youtubeUrl: l.contentSource === "youtube" ? l.youtubeUrl : undefined,
            driveUrl: l.contentSource === "drive" ? l.driveUrl : undefined,
            resourceId: l.contentSource === "upload" ? l.resourceId : undefined,
            fileName: l.contentSource === "upload" ? l.fileName : undefined,
          })),
        },
      ],
    });
    setTitle("");
    setDescription("");
    setIsPaid(false);
    setPrice("500");
    setLessons([newLesson("Welcome & Orientation", "video"), newLesson("Course Handbook", "document")]);
    setShowForm(false);
    load();
  }

  async function removeCourse(id: string) {
    await api.delete(`/api/courses/${id}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Courses</h1>
          <p className="text-gray-500 text-sm mt-1">Browse learning paths across leadership, digital skills & more.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#0057B8] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:brightness-110 shadow-md"
          >
            <Plus size={16} /> New Course
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading courses...</p>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500">No courses yet. {canCreate ? "Create the first one!" : "Check back soon."}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.06)] border border-gray-50 hover:-translate-y-1 transition-transform cursor-pointer group"
              onClick={() => onOpenCourse(c.id)}
            >
              <div className="h-24 flex items-center px-5" style={{ background: c.coverColor }}>
                <BookOpen className="text-white/90" size={28} />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-[#0057B8] bg-[#0057B8]/10 px-2.5 py-1 rounded-full">
                    {c.category}
                  </span>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${c.isPaid ? "text-[#8a6d00] bg-[#FFF8DC]" : "text-green-600 bg-green-50"}`}>
                    {c.isPaid ? `KES ${c.price}` : "Free"}
                  </span>
                </div>
                <p className="font-bold text-gray-900 mt-3 mb-1 line-clamp-1">{c.title}</p>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.description || "No description provided."}</p>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-400">By {c.trainerName}</p>
                  {(profile.authUserId === c.trainerId || profile.role === "admin" || profile.role === "superadmin") && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCourse(c.id);
                      }}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-lg text-gray-900">Create Course</p>
              <button onClick={() => setShowForm(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057B8]/30"
              placeholder="Course title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057B8]/30"
              placeholder="Description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <select
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Leadership</option>
              <option>Digital Literacy</option>
              <option>Entrepreneurship</option>
              <option>Advocacy</option>
              <option>Mentorship</option>
              <option>Community Engagement</option>
            </select>

            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                Paid course
              </label>
              {isPaid && (
                <input
                  type="number"
                  min={0}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28"
                  placeholder="Price (KES)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              )}
            </div>

            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <Tag size={12} /> Curriculum & Content
            </p>
            <div className="space-y-3 mb-4 max-h-[360px] overflow-y-auto pr-1">
              {lessons.map((l) => (
                <div key={l.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50/60">
                  <div className="flex gap-2 mb-2">
                    <input
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white"
                      placeholder="Lesson title"
                      value={l.title}
                      onChange={(e) => updateLesson(l.id, { title: e.target.value })}
                    />
                    <select
                      className="border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white"
                      value={l.type}
                      onChange={(e) => updateLesson(l.id, { type: e.target.value })}
                    >
                      {LESSON_TYPES.map((lt) => (
                        <option key={lt.value} value={lt.value}>{lt.label}</option>
                      ))}
                    </select>
                    <button onClick={() => removeLesson(l.id)} className="text-gray-300 hover:text-red-500 px-1">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {l.type !== "quiz" && l.type !== "cat" && (
                    <>
                      <div className="flex gap-1.5 mb-2">
                        {CONTENT_SOURCES.map((cs) => (
                          <button
                            key={cs.value}
                            onClick={() => updateLesson(l.id, { contentSource: cs.value as any })}
                            className={`flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded-lg ${l.contentSource === cs.value ? "bg-[#0057B8] text-white" : "bg-white text-gray-500 border border-gray-200"}`}
                          >
                            <cs.icon size={11} /> {cs.label}
                          </button>
                        ))}
                      </div>
                      {l.contentSource === "text" && (
                        <textarea
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white"
                          rows={2}
                          placeholder="Type the lesson content or notes here..."
                          value={l.contentText}
                          onChange={(e) => updateLesson(l.id, { contentText: e.target.value })}
                        />
                      )}
                      {l.contentSource === "youtube" && (
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white"
                          placeholder="https://youtube.com/watch?v=..."
                          value={l.youtubeUrl}
                          onChange={(e) => updateLesson(l.id, { youtubeUrl: e.target.value })}
                        />
                      )}
                      {l.contentSource === "drive" && (
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white"
                          placeholder="https://drive.google.com/..."
                          value={l.driveUrl}
                          onChange={(e) => updateLesson(l.id, { driveUrl: e.target.value })}
                        />
                      )}
                      {l.contentSource === "upload" && (
                        <div>
                          <label className="flex items-center gap-2 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer text-gray-600 hover:bg-gray-50 w-fit">
                            {l.uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                            {l.uploading ? "Uploading..." : l.fileName ? l.fileName : "Choose file from computer"}
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleUpload(l.id, e.target.files[0])}
                            />
                          </label>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              <button onClick={addLesson} className="text-xs font-semibold text-[#0057B8] hover:underline">
                + Add lesson
              </button>
            </div>

            <button
              onClick={createCourse}
              className="w-full bg-[#FFD700] text-[#0057B8] font-bold py-2.5 rounded-xl hover:brightness-95"
            >
              Create Course
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
