import type { GardenVariant } from "./garden";

const ink = "var(--gold-ink)",
  fill = "var(--gold-fill)",
  soft = "var(--gold-soft)";

export function Coin({
  x,
  y,
  scale = 1,
}: {
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle r="24" fill={fill} stroke={ink} strokeWidth="3" />
      <circle r="16" stroke={ink} strokeWidth="2" opacity=".65" />
      <path
        d="M0-8V8M-6-4H5M-6 3H5"
        stroke={ink}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </g>
  );
}

export function CoinStack({
  x,
  y,
  count = 3,
}: {
  x: number;
  y: number;
  count?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={ink} strokeWidth="2.5">
      {Array.from({ length: count }, (_, i) => (
        <g key={i} transform={`translate(0 ${-i * 12})`}>
          <path d="M-29-7V3A29 9 0 0 0 29 3V-7Z" fill={fill} />
          <ellipse cy="-7" rx="29" ry="9" fill={soft} />
        </g>
      ))}
    </g>
  );
}

export function GoldBar({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      stroke={ink}
      strokeWidth="3"
      strokeLinejoin="round"
    >
      <path d="M-42 13L-30-13H26L42 13Z" fill={fill} />
      <path d="M-30-13L-19 1H33M-19 1L-27 13" />
      <path d="M-30-13H26L33 1H-19Z" fill={soft} />
    </g>
  );
}

export function TreasureChest({
  x = 180,
  y = 139,
}: {
  x?: number;
  y?: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      stroke={ink}
      strokeWidth="3.5"
      strokeLinejoin="round"
    >
      <path d="M-68-13Q-68-64 0-64T68-13Z" fill={soft} />
      <path d="M-68-13H68V58Q68 67 59 67H-59Q-68 67-68 58Z" fill={fill} />
      <path d="M-43-13V66M43-13V66M-68 9H68" />
      <rect x="-11" y="-1" width="22" height="28" rx="5" fill={soft} />
      <path d="M0 8V17" strokeLinecap="round" />
    </g>
  );
}

export function GoldScene({ variant }: { variant: GardenVariant }) {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="182" cy="211" rx="139" ry="13" fill="var(--garden-shadow)" />
      <circle cx="278" cy="59" r="27" fill="var(--garden-sun)" />
      {variant === "garden" && (
        <>
          <CoinStack x={112} y={201} count={3} />
          <CoinStack x={184} y={201} count={6} />
          <CoinStack x={256} y={201} count={4} />
          <Coin x={184} y={88} scale={1.2} />
        </>
      )}
      {variant === "jar" && (
        <>
          <path
            d="M129 88L113 55Q145 40 161 57Q178 43 203 55L188 88C226 117 250 153 229 187Q220 209 180 209H139Q102 209 96 183C84 146 106 110 129 88Z"
            fill={soft}
            stroke={ink}
            strokeWidth="3.5"
          />
          <path
            d="M124 86Q154 98 193 86M128 98L103 115M190 98L215 112"
            stroke={ink}
            strokeWidth="5"
          />
          <Coin x={161} y={156} scale={1.15} />
          <CoinStack x={273} y={201} count={2} />
        </>
      )}
      {variant === "sprout" && (
        <>
          <ellipse cx="180" cy="198" rx="88" ry="14" fill={soft} />
          <Coin x={180} y={146} scale={1.75} />
          <path
            d="M180 53V71M114 100L103 90M246 100L257 90"
            stroke={ink}
            strokeWidth="3"
          />
        </>
      )}
      {variant === "harvest" && (
        <>
          <TreasureChest x={180} y={139} />
          <Coin x={145} y={84} scale={0.65} />
          <Coin x={180} y={70} scale={0.8} />
          <Coin x={214} y={85} scale={0.65} />
          <CoinStack x={79} y={203} count={2} />
          <CoinStack x={284} y={203} count={3} />
        </>
      )}
      {variant === "grove" && (
        <>
          <GoldBar x={104} y={193} />
          <GoldBar x={186} y={193} />
          <GoldBar x={268} y={193} />
          <GoldBar x={145} y={166} />
          <GoldBar x={227} y={166} />
          <GoldBar x={186} y={139} />
          <Coin x={186} y={73} scale={0.9} />
        </>
      )}
      {variant === "path" && (
        <>
          <path
            d="M65 201Q118 157 175 169T292 111"
            stroke={soft}
            strokeWidth="27"
          />
          <Coin x={77} y={183} scale={0.6} />
          <Coin x={132} y={162} scale={0.7} />
          <Coin x={191} y={157} scale={0.8} />
          <g transform="translate(265 90) scale(.6)">
            <TreasureChest x={0} y={0} />
          </g>
        </>
      )}
      {variant === "shelter" && (
        <>
          <path
            d="M180 47L272 80V133Q272 181 180 212Q88 181 88 133V80Z"
            fill={soft}
            stroke={ink}
            strokeWidth="4"
          />
          <CoinStack x={154} y={166} count={3} />
          <CoinStack x={209} y={166} count={4} />
          <path d="M157 81L180 67L203 81" stroke={ink} strokeWidth="3" />
        </>
      )}
      {variant === "balance" && (
        <>
          <path
            d="M180 61V195M77 109H283M141 207H219M105 109L75 168H135ZM255 109L225 168H285Z"
            stroke={ink}
            strokeWidth="4"
          />
          <path
            d="M72 168Q105 199 138 168M222 168Q255 199 288 168"
            fill={soft}
            stroke={ink}
            strokeWidth="3"
          />
          <Coin x={105} y={145} scale={0.7} />
          <Coin x={255} y={145} scale={0.7} />
        </>
      )}
      <path
        d="M68 66V80M61 73H75M294 127V137M289 132H299"
        stroke={ink}
        strokeWidth="2.5"
      />
    </g>
  );
}
