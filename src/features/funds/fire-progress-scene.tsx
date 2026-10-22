import type { FundId } from "@/domain/funds/schema";
import { Flame, Hearth, Lantern } from "@/components/fire-scene";

/** Decoration receives the shared clamped ratio, never financial amounts. */
export function FireProgressScene({
  fund,
  progress: p,
}: {
  fund: FundId;
  progress: number;
}) {
  const ink = "var(--fire-ink)",
    soft = "var(--fire-soft)";
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="180" cy="207" rx="145" ry="13" fill="var(--garden-shadow)" />
      <circle cx="288" cy="46" r="26" fill="var(--garden-sun)" />
      {fund === "emergency" && <Hearth heat={p} />}
      {fund === "rainy_day" && (
        <>
          <path
            d="M79 95L180 39L281 95Z"
            fill={soft}
            stroke={ink}
            strokeWidth="4"
          />
          <path
            d="M96 98V200M264 98V200M90 203H270"
            stroke={ink}
            strokeWidth="5"
          />
          <Lantern x={180} y={150} scale={0.95} light={p} />
          <path
            d="M48 111L65 103M44 138H64M294 111L311 103M293 138H313"
            stroke={ink}
            strokeWidth="3"
          />
        </>
      )}
      {fund === "sinking" && (
        <>
          <path
            d="M48 197Q119 155 183 182T310 159"
            stroke={soft}
            strokeWidth="28"
          />
          <Lantern x={285} y={112} scale={0.9} />
          <path d="M263 168H312" stroke={ink} strokeWidth="4" />
          <g data-fire-ember="" transform={`translate(${64 + 221 * p} 174)`}>
            <ellipse cy="13" rx="23" ry="6" fill="var(--garden-shadow)" />
            <Flame x={0} y={0} scale={0.5} />
          </g>
        </>
      )}
    </g>
  );
}
