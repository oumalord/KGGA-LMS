import { useEffect, useState } from "react";
import { api } from "../lib/neonClient";
import { ShieldCheck, Ban, Trash2, ScrollText, Crown, UserPlus, X, BookOpen } from "lucide-react";
import type { Profile, AuditLogEntry } from "../types";

const roleLabel: Record<string, string> = {
  learner: "Student",
  trainer: "Tutor",
  coordinator: "Coordinator",
  admin: "Administrator",
  superadmin: "Super Administrator",
};

export default function AdminUsers({ profile }: { profile: Profile }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [tab, setTab] = useState<"staff" | "log">("staff");
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "trainer">("trainer");
  const [inviteNotice, setInviteNotice] = useState("");

  const staff = users.filter((u) => u.role === "admin" || u.role === "trainer" || u.role === "superadmin");
  const adminCount = users.filter((u) => u.role === "admin").length;
  const adminCapReached = adminCount >= 3;

  function load() {
    api.get("/api/users").then((r) => setUsers(r.data.users));
    api.get("/api/audit-log").then((r) => setLogs(r.data.logs));
  }
  useEffect(load, []);

  async function invite() {
    setError("");
    setInviteNotice("");
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    try {
      const r = await api.post("/api/staff/invite", { name: inviteName, email: inviteEmail, role: inviteRole });
      setInviteName("");
      setInviteEmail("");
      setShowInvite(false);
      setInviteNotice(`Credentials created for ${r.data.user.name}. Email: ${r.data.credentials.email} · Password: ${r.data.credentials.password}`);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Could not create the account.");
    }
  }

  async function toggleSuspend(id: string) {
    await api.post(`/api/users/${id}/suspend`, {});
    load();
  }

  async function remove(id: string) {
    await api.delete(`/api/users/${id}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Administrators & Tutors</h1>
          <p className="text-gray-500 text-sm mt-1">
            Only the <strong>Super Administrator</strong> can create staff accounts — up to <strong>3 Administrators</strong>, unlimited Tutors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl font-bold text-sm ${adminCapReached ? "bg-red-50 text-red-600" : "bg-[#FFF8DC] text-[#8a6d00]"}`}>
            Admins {adminCount}/3
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-[#0057B8] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:brightness-110 shadow-md"
          >
            <UserPlus size={16} /> Add Staff
          </button>
        </div>
      </div>

      {error && <div className="mt-3 mb-2 bg-red-50 border border-red-100 text-red-600 text-sm font-medium px-4 py-2.5 rounded-xl">{error}</div>}
      {inviteNotice && <div className="mt-3 mb-2 bg-[#FFF8DC] border border-[#F5D87E] text-[#8a6d00] text-sm font-medium px-4 py-2.5 rounded-xl">{inviteNotice}</div>}

      <div className="flex gap-2 my-5">
        <button onClick={() => setTab("staff")} className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${tab === "staff" ? "bg-[#0057B8] text-white" : "bg-gray-100 text-gray-600"}`}>
          <BookOpen size={14} /> Staff
        </button>
        <button onClick={() => setTab("log")} className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${tab === "log" ? "bg-[#0057B8] text-white" : "bg-gray-100 text-gray-600"}`}>
          <ScrollText size={14} /> Audit Log
        </button>
      </div>

      {tab === "staff" ? (
        <div className="bg-white rounded-2xl border border-gray-50 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Email</th>
                <th className="text-left px-5 py-3 font-semibold">Role</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3.5 font-medium text-gray-800 flex items-center gap-2">
                    {u.role === "superadmin" && <Crown size={14} className="text-[#c9a300]" />}
                    {u.name}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3.5">
                    {u.role === "superadmin" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#c9a300] bg-[#FFF8DC] px-2.5 py-1 rounded-full">
                        <ShieldCheck size={12} /> Super Administrator
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-gray-600">{roleLabel[u.role]}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.status === "active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.role !== "superadmin" && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => toggleSuspend(u.id)} className="text-gray-400 hover:text-amber-500" title="Suspend / Reactivate">
                          <Ban size={15} />
                        </button>
                        <button onClick={() => remove(u.id)} className="text-gray-400 hover:text-red-500" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-50 shadow-sm divide-y divide-gray-50">
          {logs.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">No activity recorded yet.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {l.actorName} · <span className="text-[#0057B8]">{l.action.replace(/_/g, " ")}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {l.target} — {l.details}
                  </p>
                </div>
                <p className="text-[11px] text-gray-400">{new Date(l.timestamp).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-lg text-gray-900">Add Staff Account</p>
              <button onClick={() => setShowInvite(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm"
              placeholder="Full name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-4 text-sm"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "trainer")}
            >
              <option value="trainer">Tutor</option>
              <option value="admin" disabled={adminCapReached}>
                Administrator {adminCapReached ? "(3/3 reached)" : ""}
              </option>
            </select>
            <p className="text-[11px] text-gray-400 mb-4">
              They'll get full access the moment they sign in to KGGA LMS with this email address via Google.
            </p>
            <button onClick={invite} className="w-full bg-[#FFD700] text-[#0057B8] font-bold py-2.5 rounded-xl hover:brightness-95">
              Create Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
