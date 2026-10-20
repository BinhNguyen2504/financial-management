import type { FundId } from "@/domain/funds/schema";
/** Only the dimensionless, clamped ratio crosses into SVG floating-point coordinates. */
export function ProgressScene({
  fund,
  percent,
  animate = false,
}: {
  fund: FundId;
  percent: string;
  animate?: boolean;
}) {
  const whole = percent.split(".")[0];
  const p =
    BigInt(whole) > 100n ? 1 : Math.min(1, Math.max(0, Number(percent) / 100));
  const stage =
    p === 0 ? 0 : p < 0.25 ? 1 : p < 0.5 ? 2 : p < 0.75 ? 3 : p < 1 ? 4 : 5;
  const leaves = [
    [-1, 0],
    [1, 18],
    [-1, 35],
    [1, 52],
    [-1, 70],
    [1, 85],
  ];
  return (
    <svg
      className={`fund-scene ${animate ? "fund-scene-saved" : ""}`}
      data-scene={fund}
      data-stage={stage}
      data-progress={p}
      style={{
        width: "100%",
        display: "block",
        aspectRatio: "360 / 230",
        maxHeight: 220,
      }}
      viewBox="0 0 360 230"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="180" cy="207" rx="145" ry="13" fill="var(--garden-shadow)" />
      <circle cx="288" cy="46" r={20 + 6 * p} fill="var(--garden-sun)" />
      <g strokeLinecap="round" strokeLinejoin="round">
        {fund === "emergency" && (
          <>
            <path d="M59 207Q175 172 300 207" fill="var(--garden-leaf-soft)" />
            <ellipse
              cx="180"
              cy="202"
              rx="10"
              ry="6"
              fill="var(--garden-pot-rim)"
            />
            <g transform={`translate(180 201) scale(${0.28 + 0.72 * p})`}>
              <path
                d={`M0 0V${-25 - 125 * p}`}
                stroke="var(--garden-stem)"
                strokeWidth="8"
              />
              {leaves.map(([side, height], i) => {
                const growth = Math.max(0, Math.min(1, (p - i * 0.13) * 5));
                return (
                  <g
                    key={i}
                    opacity={growth}
                    transform={`translate(0 ${-25 - height}) scale(${side * growth} ${growth})`}
                  >
                    <path
                      d="M0 0Q-62 8-54-38Q-8-44 0 0Z"
                      fill={
                        i % 2 ? "var(--garden-leaf-soft)" : "var(--garden-leaf)"
                      }
                    />
                    <path
                      d="M-37-24L0 0"
                      stroke="var(--garden-stem)"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
              <circle
                cx="0"
                cy={-30 - 125 * p}
                r={4 + 12 * p}
                fill="var(--garden-leaf)"
              />
            </g>
            <path
              d="M151 207L141 213M203 206L215 212"
              stroke="var(--garden-pot-rim)"
              strokeWidth="3"
            />
          </>
        )}
        {fund === "rainy_day" && (
          <>
            {[65, 110, 245, 290].map((x, i) => (
              <path
                key={x}
                d={`M${x} ${65 + (i % 2) * 22}l-5 12m15 34-5 12`}
                stroke="var(--garden-leaf-soft)"
                strokeWidth="3"
              />
            ))}
            <ellipse
              cx="180"
              cy="200"
              rx={20 + 95 * p}
              ry="9"
              fill="var(--garden-sun)"
              opacity=".65"
            />
            <path
              d="M180 58V178Q180 199 199 188"
              stroke="var(--garden-stem)"
              strokeWidth="6"
            />
            <g transform={`translate(180 65) scale(${0.24 + 0.76 * p} 1)`}>
              <path
                d="M-126 64Q-109-16 0-20Q109-16 126 64Q92 47 63 65Q30 47 0 65Q-32 47-63 65Q-96 47-126 64Z"
                fill="var(--garden-leaf)"
              />
              <path
                d="M0-20Q-58 4-63 65M0-20Q58 4 63 65M0-20V65"
                stroke="var(--garden-stem)"
                strokeWidth="3"
              />
            </g>
            <path
              d="M114 196V173M114 182Q91 180 98 163Q115 164 114 182Z"
              stroke="var(--garden-stem)"
              strokeWidth="3"
              fill="var(--garden-leaf-soft)"
            />
          </>
        )}
        {fund === "sinking" && (
          <>
            <path
              d="M34 186Q90 172 116 190M247 190Q285 170 327 186"
              stroke="var(--garden-leaf)"
              strokeWidth="12"
            />
            <path
              d="M107 205Q180 182 253 205M120 216Q183 195 244 216"
              stroke="var(--garden-leaf-soft)"
              strokeWidth="4"
            />
            {Array.from({ length: 8 }, (_, i) => {
              const growth = Math.max(0, Math.min(1, p * 8 - i));
              return (
                <g
                  key={i}
                  opacity={growth}
                  transform={`translate(${69 + i * 29} 0)`}
                >
                  <path
                    d="M0 170H26M3 172V198M23 172V198"
                    stroke="var(--garden-pot-rim)"
                    strokeWidth="5"
                  />
                  <path
                    d="M0 143H26M4 143V170"
                    stroke="var(--garden-stem)"
                    strokeWidth="4"
                  />
                </g>
              );
            })}
            <g transform={`translate(${65 + 230 * p} 150)`}>
              <circle cy="-26" r="8" fill="var(--garden-pot-rim)" />
              <path
                d="M0-17V0M0-9L-10-2M0-9L9-15M0 0L-9 14M0 0L9 12"
                stroke="var(--garden-stem)"
                strokeWidth="4"
              />
            </g>
            <path
              d="M305 151V86L331 98L305 111"
              stroke="var(--garden-stem)"
              strokeWidth="3"
              fill="var(--garden-leaf-soft)"
            />
          </>
        )}
      </g>
    </svg>
  );
}
