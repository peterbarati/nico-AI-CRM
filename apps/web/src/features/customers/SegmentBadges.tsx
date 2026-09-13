import type { CustomerListSegment } from "./types";
import { displayLabel, t } from "../../i18n";

interface SegmentBadgesProps {
  segments: CustomerListSegment[];
}

const riskSegments = new Set(["AT_RISK", "CRITICAL", "DECLINING", "REACTIVATION"]);

export function SegmentBadges({ segments }: SegmentBadgesProps) {
  if (segments.length === 0) {
    return <span className="muted">{t("No active segments")}</span>;
  }

  return (
    <div className="segment-list">
      {segments.map((segment) => (
        <span
          className={riskSegments.has(segment.code) ? "badge badge--risk" : "badge"}
          key={segment.id}
          title={displayLabel(segment.code)}
        >
          {displayLabel(segment.code)}
        </span>
      ))}
    </div>
  );
}
