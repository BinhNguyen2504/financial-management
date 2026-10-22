import type { FundId } from "@/domain/funds/schema";
import { ClayShelter, Pebble } from "@/components/earth-scene";

/** Only the shared, clamped progress ratio enters the decorative scene. */
export function EarthProgressScene({
  fund,
  progress: p,
}: {
  fund: FundId;
  progress: number;
}) {
  const ink = "var(--earth-ink)",
    soft = "var(--earth-soft)";
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="180" cy="207" rx="145" ry="13" fill="var(--garden-shadow)" />
      <circle cx="288" cy="46" r="26" fill="var(--garden-sun)" />
      {fund === "emergency" && (
        <>
          <path d="M60 205H300" stroke={ink} strokeWidth="5" />
          <g
            data-earth-foundation=""
            transform={`translate(180 202) scale(1 ${p})`}
            stroke={ink}
            strokeWidth="3"
          >
            <path
              d="M-112 0L-96-38H-72V-76H-45V-114H45V-76H72V-38H96L112 0Z"
              fill={soft}
            />
            <path d="M-96-38H96L112 0H-112Z" fill="var(--earth-clay)" />
            <path d="M-72-76H72V-38H-72Z" fill="var(--earth-fill)" />
            <path d="M-45-76V-38M17-76V-38M-48-38V0M45-38V0M0-114V-76" />
          </g>
        </>
      )}
      {fund === "rainy_day" && (
        <>
          <ClayShelter coverage={0.35 + 0.65 * p} />
          <path
            d="M45 96L63 89M40 126H62M299 96L317 89M298 126H320"
            stroke={ink}
            strokeWidth="3"
          />
        </>
      )}
      {fund === "sinking" && (
        <>
          <path
            d="M45 204H99V182H144V160H189V138H234V116H305"
            stroke={soft}
            strokeWidth="25"
          />
          <path
            d="M45 204H99V182H144V160H189V138H234V116H305M301 113V61L326 72L301 85"
            stroke={ink}
            strokeWidth="3"
          />
          <g
            data-earth-traveler=""
            transform={`translate(${65 + 220 * p} ${183 - 67 * p})`}
          >
            <Pebble x={0} y={0} scale={0.6} />
            <Pebble x={0} y={-18} scale={0.4} />
          </g>
        </>
      )}
    </g>
  );
}
