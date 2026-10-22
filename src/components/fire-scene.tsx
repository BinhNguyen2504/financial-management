import type { GardenVariant } from "./garden";

const ink = "var(--fire-ink)",
  fill = "var(--fire-fill)",
  soft = "var(--fire-soft)",
  glow = "var(--fire-glow)";

export function Flame({
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
      <path
        d="M0-61C9-38 30-36 30-13A30 30 0 0 1-30-13C-30-29-18-37-15-48Q-14-26-6-29Q5-36 0-61Z"
        fill={fill}
        stroke={ink}
        strokeWidth="3"
      />
      <path d="M1-24Q18-9 11 4Q0 17-12 4Q-18-6-5-15Q-4-4 1-24Z" fill={glow} />
    </g>
  );
}

export function Lantern({
  x,
  y,
  scale = 1,
  light = 1,
}: {
  x: number;
  y: number;
  scale?: number;
  light?: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      stroke={ink}
      strokeWidth="3"
      strokeLinejoin="round"
    >
      <path d="M-15-52V-62Q0-83 15-62V-52" />
      <path d="M-34-42H34L27 44H-27Z" fill={soft} />
      <g
        data-fire-lantern-light=""
        transform={`translate(0 26) scale(${light * 0.45})`}
      >
        <Flame x={0} y={0} />
      </g>
      <path
        d="M-34-42L-23-55H23L34-42M-40-39H40M-31 44H31M-35 51H35M-25-39L-19 44M25-39L19 44"
        strokeLinecap="round"
      />
      <path d="M-23-55H23L34-42H-34Z" fill={fill} />
    </g>
  );
}

export function Hearth({ heat = 1 }: { heat?: number }) {
  return (
    <g stroke={ink} strokeWidth="3.5" strokeLinejoin="round">
      <path d="M89 200V115Q89 51 180 51T271 115V200Z" fill={soft} />
      <path
        d="M117 195V124Q117 79 180 79T243 124V195Z"
        fill="var(--fire-hearth)"
      />
      <path d="M86 202H274M94 145H114M247 145H267M111 89L129 104M249 89L231 104M180 55V75" />
      <path
        d="M146 182L214 194M146 194L214 182"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <g
        data-fire-hearth-flame=""
        transform={`translate(180 177) scale(${heat})`}
      >
        <Flame x={0} y={0} />
      </g>
    </g>
  );
}

export function FireScene({ variant }: { variant: GardenVariant }) {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="182" cy="211" rx="139" ry="13" fill="var(--garden-shadow)" />
      <circle cx="278" cy="59" r="27" fill="var(--garden-sun)" />
      {variant === "garden" && (
        <>
          <ellipse cx="180" cy="178" rx="83" ry="26" fill={soft} />
          <path
            d="M124 187L231 209M124 209L231 187"
            stroke={ink}
            strokeWidth="13"
          />
          <Flame x={180} y={159} scale={1.45} />
          <path
            d="M124 105L117 92M233 105L240 92M180 50V39"
            stroke={ink}
            strokeWidth="3"
          />
        </>
      )}
      {variant === "jar" && (
        <>
          <Lantern x={173} y={142} scale={1.15} />
          <path
            d="M253 170Q271 151 289 170Q278 187 253 170Z"
            fill={fill}
            stroke={ink}
            strokeWidth="3"
          />
        </>
      )}
      {variant === "sprout" && (
        <>
          <ellipse cx="180" cy="194" rx="77" ry="15" fill={soft} />
          <Flame x={180} y={165} scale={1.5} />
          <path
            d="M117 123L104 114M243 123L256 114M180 49V35"
            stroke={ink}
            strokeWidth="3"
          />
        </>
      )}
      {variant === "harvest" && (
        <>
          <path d="M56 66Q180 94 304 66" stroke={ink} strokeWidth="3" />
          <Lantern x={92} y={145} scale={0.7} />
          <Lantern x={180} y={153} scale={0.9} />
          <Lantern x={268} y={145} scale={0.7} />
        </>
      )}
      {variant === "grove" && (
        <>
          <path
            d="M56 205L146 81H212L307 205Z"
            fill={soft}
            stroke={ink}
            strokeWidth="3"
          />
          <path
            d="M146 81H212L228 103L206 112L187 97L168 114L132 101Z"
            fill={fill}
          />
          <path
            d="M183 103Q161 131 188 152T174 205"
            stroke={fill}
            strokeWidth="14"
          />
          <Flame x={180} y={65} scale={0.55} />
          <path
            d="M100 204L121 178M257 204L241 181"
            stroke={ink}
            strokeWidth="3"
          />
        </>
      )}
      {variant === "path" && (
        <>
          <path
            d="M58 204Q114 150 181 171T299 110"
            stroke={soft}
            strokeWidth="29"
          />
          <Lantern x={91} y={168} scale={0.4} />
          <Lantern x={177} y={150} scale={0.55} />
          <Lantern x={272} y={111} scale={0.75} />
        </>
      )}
      {variant === "shelter" && <Hearth />}
      {variant === "balance" && (
        <>
          <path
            d="M180 62V195M77 109H283M141 207H219M105 109L73 178H137ZM255 109L223 178H287Z"
            stroke={ink}
            strokeWidth="4"
          />
          <path
            d="M73 178Q105 200 137 178M223 178Q255 200 287 178"
            fill={soft}
            stroke={ink}
            strokeWidth="3"
          />
          <Lantern x={105} y={151} scale={0.45} />
          <Lantern x={255} y={151} scale={0.45} />
        </>
      )}
    </g>
  );
}
