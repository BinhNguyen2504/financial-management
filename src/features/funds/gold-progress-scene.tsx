import type { FundId } from "@/domain/funds/schema";
import { Coin, CoinStack } from "@/components/gold-scene";

/** Receives only the shared clamped ratio; money and privacy stay in the workspace. */
export function GoldProgressScene({
  fund,
  progress: p,
}: {
  fund: FundId;
  progress: number;
}) {
  const ink = "var(--gold-ink)",
    fill = "var(--gold-fill)",
    soft = "var(--gold-soft)";
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="180" cy="207" rx="145" ry="13" fill="var(--garden-shadow)" />
      <circle cx="288" cy="46" r="26" fill="var(--garden-sun)" />
      {fund === "emergency" && (
        <>
          <path
            d="M66 193H294V205H66Z"
            fill={soft}
            stroke={ink}
            strokeWidth="3"
          />
          <g data-gold-stacks="" data-fill={p}>
            {[114, 180, 246].map((x, i) => (
              <g key={x} transform={`translate(${x} 185) scale(1 ${p})`}>
                <CoinStack x={0} y={0} count={i === 1 ? 8 : 5} />
              </g>
            ))}
          </g>
          <path d="M180 40V56M172 48H188" stroke={ink} strokeWidth="3" />
        </>
      )}
      {fund === "rainy_day" && (
        <>
          <path
            d="M129 81L113 47Q146 34 164 51Q181 38 204 47L189 81Q247 133 231 181Q225 206 180 206H140Q98 206 92 181Q81 134 129 81Z"
            fill={soft}
            stroke={ink}
            strokeWidth="3.5"
          />
          <g data-gold-reserve="" transform={`translate(162 181) scale(${p})`}>
            <CoinStack x={-24} y={0} count={3} />
            <CoinStack x={27} y={0} count={5} />
          </g>
          <path
            d="M124 80Q157 91 195 80M127 91L107 105M191 91L213 103"
            stroke={ink}
            strokeWidth="4"
          />
          <path
            d="M267 126L297 137V162Q297 183 267 196Q237 183 237 162V137Z"
            fill={fill}
            stroke={ink}
            strokeWidth="3"
          />
          <path d="M254 159L265 169L282 148" stroke={ink} strokeWidth="3" />
        </>
      )}
      {fund === "sinking" && (
        <>
          <path
            d="M92 113Q92 72 180 72T268 113"
            stroke={ink}
            strokeWidth="4"
            fill={soft}
          />
          <path
            d="M92 113H268V194Q268 206 256 206H104Q92 206 92 194Z"
            fill={soft}
            stroke={ink}
            strokeWidth="4"
          />
          <rect
            data-gold-chest-level=""
            x="100"
            y={198 - 76 * p}
            width="160"
            height={76 * p}
            rx={Math.min(7, 38 * p)}
            fill={fill}
          />
          <path d="M120 114V204M240 114V204" stroke={ink} strokeWidth="4" />
          <rect
            x="168"
            y="125"
            width="24"
            height="28"
            rx="5"
            fill={fill}
            stroke={ink}
            strokeWidth="3"
          />
          <path d="M180 134V144" stroke={ink} strokeWidth="3" />
          <Coin x={180} y={39} scale={0.65} />
        </>
      )}
    </g>
  );
}
