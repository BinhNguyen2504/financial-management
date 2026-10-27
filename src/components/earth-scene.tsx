import type { GardenVariant } from "./garden-types";

const ink = "var(--earth-ink)",
  fill = "var(--earth-fill)",
  soft = "var(--earth-soft)",
  clay = "var(--earth-clay)";

export function Pebble({
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
        d="M-29 7Q-34-9-17-18Q0-33 22-14Q40 4 24 14Q-9 25-29 7Z"
        fill={fill}
        stroke={ink}
        strokeWidth="3"
      />
      <path
        d="M-16-9Q-6-18 7-12"
        stroke={soft}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </g>
  );
}

export function Terraces() {
  return (
    <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
      <path
        d="M45 204V178Q87 177 106 148Q128 115 164 115Q197 114 214 91Q231 71 263 81L315 177V204Z"
        fill={soft}
      />
      <path
        d="M60 201V184Q103 181 123 157Q139 138 172 139Q209 137 227 111Q240 95 269 103L285 130Q252 122 237 142Q219 164 184 163Q150 162 132 182Q117 198 99 201Z"
        fill={fill}
      />
      <path
        d="M107 203Q143 180 184 184Q226 187 247 163Q267 143 297 154L315 181V204Z"
        fill={clay}
      />
      <path d="M60 184Q103 181 123 157Q139 138 172 139Q209 137 227 111M107 203Q143 180 184 184Q226 187 247 163" />
    </g>
  );
}

export function ClayShelter({ coverage = 1 }: { coverage?: number }) {
  return (
    <g
      data-earth-shelter=""
      transform={`translate(180 0) scale(${coverage} 1)`}
      stroke={ink}
      strokeWidth="3.5"
      strokeLinejoin="round"
    >
      <path d="M-101 202V125Q-101 60 0 60T101 125V202Z" fill={clay} />
      <path d="M-76 114Q-65 84-35 84M-99 141H-75M72 141H99M-98 176H-74M73 176H98M-44 66V91M45 66V91" />
      <path d="M-32 202V153Q-32 119 0 119T32 153V202Z" fill={soft} />
      <path d="M-108 205H108" strokeWidth="6" strokeLinecap="round" />
      <path d="M0 122V201M-13 167H-9" strokeLinecap="round" />
    </g>
  );
}

export function EarthScene({ variant }: { variant: GardenVariant }) {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="182" cy="211" rx="139" ry="13" fill="var(--garden-shadow)" />
      <circle cx="278" cy="59" r="27" fill="var(--garden-sun)" />
      {variant === "garden" && (
        <>
          <path
            d="M46 205Q82 147 111 169Q152 70 201 134Q239 108 309 205Z"
            fill={soft}
            stroke={ink}
            strokeWidth="3"
          />
          <path
            d="M47 205Q105 157 158 180Q210 120 309 205Z"
            fill={fill}
            stroke={ink}
            strokeWidth="3"
          />
          <path
            d="M76 205Q129 181 182 195Q228 168 286 205"
            fill={clay}
            stroke={ink}
            strokeWidth="3"
          />
          <Pebble x={94} y={195} scale={0.65} />
          <Pebble x={254} y={192} scale={0.5} />
        </>
      )}
      {variant === "jar" && (
        <>
          <path
            d="M133 67H207L203 96Q234 114 234 158Q234 207 170 207Q106 207 106 158Q106 114 137 96Z"
            fill={clay}
            stroke={ink}
            strokeWidth="3.5"
          />
          <path
            d="M130 67H210M137 81H203M116 135Q170 155 224 135M113 150Q170 171 227 150M127 182Q170 197 213 182"
            stroke={ink}
            strokeWidth="3"
          />
          <Pebble x={280} y={197} scale={0.65} />
        </>
      )}
      {variant === "sprout" && (
        <>
          <ellipse cx="180" cy="196" rx="95" ry="17" fill={soft} />
          <Pebble x={180} y={157} scale={1.65} />
          <path d="M116 199H244M137 212H223" stroke={ink} strokeWidth="3" />
        </>
      )}
      {variant === "harvest" && <Terraces />}
      {variant === "grove" && (
        <>
          <path
            d="M41 206L118 92L167 151L211 64L321 206Z"
            fill={soft}
            stroke={ink}
            strokeWidth="3"
          />
          <path
            d="M99 206L211 64L259 128L235 118L214 135L190 114L173 133L157 132Z"
            fill={fill}
          />
          <path
            d="M56 188Q116 169 176 188Q240 156 307 190M109 161L127 150L145 163M168 203Q224 182 292 203"
            stroke={ink}
            strokeWidth="3"
          />
        </>
      )}
      {variant === "path" && (
        <>
          <path
            d="M53 205H111V184H154V162H198V141H242V119H293"
            stroke={soft}
            strokeWidth="27"
          />
          <path
            d="M53 205H111V184H154V162H198V141H242V119H293"
            stroke={ink}
            strokeWidth="3"
          />
          <Pebble x={76} y={186} scale={0.6} />
          <Pebble x={175} y={145} scale={0.5} />
          <path
            d="M291 118V67L317 78L291 91"
            fill={clay}
            stroke={ink}
            strokeWidth="3"
          />
        </>
      )}
      {variant === "shelter" && <ClayShelter />}
      {variant === "balance" && (
        <>
          <path
            d="M180 65V195M77 110H283M141 207H219M105 110L73 177H137ZM255 110L223 177H287Z"
            stroke={ink}
            strokeWidth="4"
          />
          <path
            d="M73 177Q105 199 137 177M223 177Q255 199 287 177"
            fill={soft}
            stroke={ink}
            strokeWidth="3"
          />
          <Pebble x={105} y={163} scale={0.65} />
          <Pebble x={255} y={163} scale={0.65} />
        </>
      )}
    </g>
  );
}
