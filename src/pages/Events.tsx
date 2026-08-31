import { useEffect, useState } from "react";
import { api } from "@appdeploy/client";
import { Plus, CalendarDays, MapPin, X, CheckCircle2, Users, Trash2 } from "lucide-react";
import type { KEvent, Profile, EventRegistration } from "../types";

export default function Events({ profile }: { profile: Profile }) {
  const [events, setEvents] = useState<KEvent[]>([]);
  const [myRegs, setMyRegs] = useState<EventRegistration[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [managingEvent, setManagingEvent] = useState<KEvent | null>(null);
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [form, setForm] = useState({ title: "", description: "", type: "Workshop", date: "", location: "" });
  const canCreate = ["trainer", "coordinator", "admin", "superadmin"].includes(profile.role);

  function load() {
    api.get("/api/events").then((r) => setEvents(r.data.events));
    api.get("/api/my/events").then((r) => setMyRegs(r.data.registrations));
  }
  useEffect(load, []);

  async function createEvent() {
    if (!form.title.trim() || !form.date) return;
    await api.post("/api/events", form);
    setForm({ title: "", description: "", type: "Workshop", date: "", location: "" });
    setShowForm(false);
    load();
  }

  async function register(id: string) {
    await api.post(`/api/events/${id}/register`, {});
    load();
  }

  async function openManage(ev: KEvent) {
    setManagingEvent(ev);
    const r = await api.get(`/api/events/${ev.id}/registrations`);
    setRegs(r.data.registrations);
  }

  async function checkin(regId: string) {
    await api.post(`/api/events/registrations/${regId}/checkin`, {});
    if (managingEvent) {
      const r = await api.get(`/api/events/${managingEvent.id}/registrations`);
      setRegs(r.data.registrations);
    }
  }

  async function removeEvent(event: KEvent) {
    if (!window.confirm(`Delete "${event.title}"? This will also remove its attendance registrations.`)) return;
    await api.delete(`/api/events/${event.id}`);
    if (managingEvent?.id === event.id) setManagingEvent(null);
    load();
  }

  const registeredIds = new Set(myRegs.map((r) => r.eventId));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Events</h1>
          <p className="text-gray-500 text-sm mt-1">Workshops, camps, conferences, and leadership programs.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#0057B8] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:brightness-110 shadow-md"
          >
            <Plus size={16} /> New Event
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <CalendarDays className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500">No events scheduled yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((ev) => (
            <div key={ev.id} className="bg-white rounded-2xl p-5 border border-gray-50 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold text-[#0057B8] bg-[#0057B8]/10 px-2.5 py-1 rounded-full">{ev.type}</span>
                {(ev.createdBy === profile.authUserId || profile.role === "superadmin") && (
                  <button onClick={() => removeEvent(ev)} className="text-gray-300 hover:text-red-500 p-1" title="Delete appointment" aria-label={`Delete ${ev.title}`}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p className="font-bold text-gray-900 mt-3 mb-1">{ev.title}</p>
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{ev.description}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <CalendarDays size={13} /> {ev.date}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <MapPin size={13} /> {ev.location}
              </div>
              {registeredIds.has(ev.id) ? (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle2 size={16} /> Registered
                </div>
              ) : (
                <button
                  onClick={() => register(ev.id)}
                  className="w-full bg-[#FFD700] text-[#0057B8] font-bold py-2 rounded-xl text-sm hover:brightness-95"
                >
                  Register
                </button>
              )}
              {canCreate && (
                <button onClick={() => openManage(ev)} className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-[#0057B8] font-medium">
                  <Users size={13} /> Manage attendance
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-lg text-gray-900">Create Event</p>
              <button onClick={() => setShowForm(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm" placeholder="Event title"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm" placeholder="Description" rows={2}
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm" value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Workshop</option><option>Camp</option><option>Conference</option><option>Leadership Program</option>
              <option>Community Activity</option><option>Webinar</option>
            </select>
            <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-sm" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-4 text-sm" placeholder="Location"
              value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <button onClick={createEvent} className="w-full bg-[#FFD700] text-[#0057B8] font-bold py-2.5 rounded-xl hover:brightness-95">
              Create Event
            </button>
          </div>
        </div>
      )}

      {managingEvent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-lg text-gray-900">{managingEvent.title} — Attendance</p>
              <button onClick={() => setManagingEvent(null)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            {regs.length === 0 ? (
              <p className="text-sm text-gray-400">No registrations yet.</p>
            ) : (
              <div className="space-y-2">
                {regs.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <p className="text-sm font-medium text-gray-800">{r.userName}</p>
                    {r.checkedIn ? (
                      <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 size={14}/>Checked in</span>
                    ) : (
                      <button onClick={() => checkin(r.id)} className="text-xs bg-[#0057B8] text-white px-3 py-1.5 rounded-lg font-medium">
                        QR Check-in
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
