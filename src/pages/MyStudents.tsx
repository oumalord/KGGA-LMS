import { useEffect, useState } from "react";
import { api } from "../lib/neonClient";
import { Users2, Award, CheckCircle2, UserPlus, Trash2, X, GraduationCap } from "lucide-react";
import type { Course, Profile } from "../types";

export default function MyStudents({ profile }: { profile: Profile }) {
  const isCourseManager = ["trainer", "coordinator", "admin", "superadmin"].includes(profile.role);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [allLearners, setAllLearners] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    api.get("/api/courses").then((r) => {
      const mine = (r.data.courses as Course[]).filter(
        (c) => c.trainerId === profile.authUserId || profile.role === "admin" || profile.role === "superadmin"
      );
      setCourses(mine);
      if (mine.length > 0) setSelectedCourseId(mine[0].id);
    });
    if (isCourseManager) loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function loadRoster() {
    api.get("/api/users").then((r) => setAllLearners((r.data.users as any[]).filter((u) => u.role === "learner")));
  }

  useEffect(() => {
    if (!selectedCourseId) return;
    api.get(`/api/courses/${selectedCourseId}/students`).then((r) => setStudents(r.data.students));
  }, [selectedCourseId]);

  async function addStudent() {
    setAddError("");
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      await api.post("/api/students", { name: newName, email: newEmail });
      setNewName("");
      setNewEmail("");
      setShowAdd(false);
      loadRoster();
    } catch (e: any) {
      setAddError(e?.response?.data?.error || "Could not add student.");
    }
  }

  async function removeStudent(id: string) {
    await api.delete(`/api/users/${id}`);
    loadRoster();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">My Students</h1>
          <p className="text-gray-500 text-sm mt-1">Track who's enrolled in your courses and how they're progressing.</p>
        </div>
        {isCourseManager && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-[#0057B8] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:brightness-110 shadow-md"
          >
            <UserPlus size={16} /> Add Student
          </button>
        )}
      </div>

      {isCourseManager && (
        <div className="bg-white rounded-2xl border border-gray-50 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
            <GraduationCap size={16} className="text-[#0057B8]" />
            <p className="font-bold text-gray-900 text-sm">All Students ({allLearners.length})</p>
          </div>
          {allLearners.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">No students in the system yet. Add one to get started.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Name</th>
                  <th className="text-left px-5 py-3 font-semibold">Email</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allLearners.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{s.name}</td>
                    <td className="px-5 py-3.5 text-gray-500">{s.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.status === "active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => removeStudent(s.id)} className="text-gray-400 hover:text-red-500" title="Delete student">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <Users2 className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500">You don't have any courses yet.</p>
        </div>
      ) : (
        <>
          <p className="font-bold text-gray-900 mb-3">Progress by Course</p>
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

          {students.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Users2 className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-gray-500">No students enrolled in this course yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-50 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Student</th>
                    <th className="text-left px-5 py-3 font-semibold">Progress</th>
                    <th className="text-left px-5 py-3 font-semibold">Enrolled</th>
                    <th className="text-left px-5 py-3 font-semibold">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-3.5 font-medium text-gray-800">{s.userName}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 w-40">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#FFD700] transition-all duration-500" style={{ width: `${s.progressPercent}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-9">{s.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{new Date(s.enrolledAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        {s.certificate ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                            <Award size={13} /> Issued
                          </span>
                        ) : s.progressPercent >= 100 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                            <CheckCircle2 size={13} /> Pending
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">In progress</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-lg text-gray-900">Add Student</p>
              <button onClick={() => setShowAdd(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm"
              placeholder="Full name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm"
              placeholder="Email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            {addError && <p className="text-xs text-red-600 mb-3">{addError}</p>}
            <button onClick={addStudent} className="w-full bg-[#FFD700] text-[#0057B8] font-bold py-2.5 rounded-xl hover:brightness-95">
              Add Student
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
