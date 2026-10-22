import type { FundId } from "@/domain/funds/schema";
import { Drop } from "@/components/water-scene";

/** The same clamped ratio as the garden scenes; no financial amounts enter SVG. */
export function WaterProgressScene({
  fund,
  progress: p,
}: {
  fund: FundId;
  progress: number;
}) {
  const ink = "var(--water-ink)",
    fill = "var(--water-fill)",
    soft = "var(--water-soft)";
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="180" cy="207" rx="145" ry="13" fill="var(--garden-shadow)" />
      <circle cx="288" cy="46" r={20 + 6 * p} fill="var(--garden-sun)" />
      {fund === "emergency" && (
        <>
          <path
            d="M62 69H298L287 185Q285 205 265 205H95Q75 205 73 185Z"
            fill={soft}
            stroke={ink}
            strokeWidth="4"
          />
          <rect
            data-water-level=""
            x="84"
            y={193 - 116 * p}
            width="192"
            height={116 * p}
            rx={Math.min(14, 58 * p)}
            fill={fill}
          />
          <path
            d={`M96 ${193 - 116 * p}Q124 ${185 - 116 * p} 151 ${193 - 116 * p}T205 ${193 - 116 * p}T264 ${193 - 116 * p}`}
            stroke={ink}
            strokeWidth="3"
            opacity={p === 0 ? 0 : 1}
          />
          <path
            d="M64 69H296M97 97H112M97 122H112M97 147H112M97 172H112"
            stroke={ink}
            strokeWidth="3"
          />
          <Drop x={180} y={43} scale={0.6} />
        </>
      )}
      {fund === "rainy_day" && (
        <>
          <ellipse cx="180" cy="200" rx="108" ry="13" fill={soft} />
          {[56, 87, 277, 309].map((x, i) => (
            <Drop key={x} x={x} y={75 + (i % 2) * 53} scale={0.35} />
          ))}
          <g
            data-water-shelter=""
            transform={`translate(180 0) scale(${0.28 + 0.72 * p} 1)`}
          >
            <path
              d="M-126 109L0 45L126 109Z"
              fill={fill}
              stroke={ink}
              strokeWidth="4"
            />
            <path
              d="M-103 112V195M103 112V195M-111 112H111"
              stroke={ink}
              strokeWidth="5"
            />
          </g>
          <path
            d="M141 192Q180 204 219 192M157 180Q180 185 203 180"
            stroke={ink}
            strokeWidth="3"
          />
        </>
      )}
      {fund === "sinking" && (
        <>
          <path
            d="M37 184Q84 169 126 184T216 184T321 184V207H37Z"
            fill={soft}
          />
          <path
            d="M49 197Q90 186 130 197T220 197T309 197"
            stroke={fill}
            strokeWidth="5"
          />
          <path
            d="M262 147H323M271 147V194M314 147V194M304 145V82L328 94L304 108"
            stroke="var(--water-stone)"
            strokeWidth="5"
          />
          <g data-water-boat="" transform={`translate(${65 + 220 * p} 172)`}>
            <path d="M-31 0H31L18 17H-17Z" fill={ink} />
            <path d="M0-64V-5H27Z" fill={fill} stroke={ink} strokeWidth="3" />
            <path
              d="M-5-52L-27-12H-5Z"
              fill={soft}
              stroke={ink}
              strokeWidth="3"
            />
          </g>
        </>
      )}
    </g>
  );
}
