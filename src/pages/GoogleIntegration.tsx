import { useEffect, useState } from "react";
import { api } from "@appdeploy/client";
import { Cloud, FileSpreadsheet, Calendar, Video, CheckCircle2, AlertTriangle } from "lucide-react";

export default function GoogleIntegration() {
  const [status, setStatus] = useState<{ driveConfigured: boolean; calendarConfigured: boolean } | null>(null);

  useEffect(() => {
    api.get("/api/integrations/google/status").then((r) => setStatus(r.data));
  }, []);

  const cards = [
    { icon: Cloud, title: "Google Drive", desc: "Store course videos, handbooks, certificates & reports in KGGA's Drive.", configured: status?.driveConfigured },
    { icon: FileSpreadsheet, title: "Docs & Sheets", desc: "Open and collaborate on policy documents and reports.", configured: status?.driveConfigured },
    { icon: Calendar, title: "Google Calendar", desc: "Sync events, workshops and leadership programs.", configured: status?.calendarConfigured },
    { icon: Video, title: "Google Meet", desc: "Launch and join live training sessions.", configured: status?.calendarConfigured },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Google Workspace Integration</h1>
      <p className="text-gray-500 text-sm mb-6 max-w-2xl">
        Connect KGGA's official Google Workspace to power Drive storage, Docs/Sheets collaboration, Calendar sync
        and Meet for live sessions.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3 mb-6">
        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Setup required</p>
          <p>
            Full Drive/Calendar/Meet integration needs KGGA's own Google Cloud project credentials (OAuth client +
            API keys with the relevant scopes). Ask your Anthropic/AppDeploy admin to add them as app secrets, then
            this panel will show "Connected" automatically. In the meantime, files can be stored securely in the
            LMS's built-in Resource Center.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {cards.map((c, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-gray-50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-[#0057B8]/10 flex items-center justify-center">
                <c.icon className="text-[#0057B8]" size={20} />
              </div>
              {c.configured ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 size={12} /> Connected
                </span>
              ) : (
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">Not connected</span>
              )}
            </div>
            <p className="font-bold text-gray-900 mb-1">{c.title}</p>
            <p className="text-xs text-gray-500">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
