import { useEffect, useState } from "react";
import { api } from "../lib/neonClient";
import { Footprints, TrendingUp, Flag, Rocket, Trophy } from "lucide-react";
import type { Badge } from "../types";

const BADGE_ICON: Record<string, any> = {
  first_step: Footprints,
  quarter: TrendingUp,
  halfway: Flag,
  almost: Rocket,
  graduate: Trophy,
};

const BADGE_COLOR: Record<string, string> = {
  first_step: "#0057B8",
  quarter: "#2563eb",
  halfway: "#c9a300",
  almost: "#b45309",
  graduate: "#c9a300",
};

export default function Badges({ compact = false }: { compact?: boolean }) {
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    api.get("/api/my/badges").then((r) => setBadges(r.data.badges));
  }, []);

  if (badges.length === 0) {
    return <p className="text-sm text-gray-400">No badges earned yet — start a course to earn your first one!</p>;
  }

  return (
    <div className={compact ? "flex flex-wrap gap-3" : "grid grid-cols-2 sm:grid-cols-3 gap-3"}>
      {badges.map((b) => {
        const Icon = BADGE_ICON[b.badgeKey] ?? Trophy;
        const color = BADGE_COLOR[b.badgeKey] ?? "#0057B8";
        return (
          <div key={b.id} className="flex flex-col items-center text-center bg-gray-50 rounded-xl p-3" title={b.courseTitle ?? ""}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2" style={{ background: color + "22" }}>
              <Icon size={20} style={{ color }} />
            </div>
            <p className="text-[11px] font-semibold text-gray-800 leading-tight">{b.label}</p>
            {b.courseTitle && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{b.courseTitle}</p>}
          </div>
        );
      })}
    </div>
  );
}
