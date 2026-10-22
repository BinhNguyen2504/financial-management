import type { GardenVariant } from "./garden";

const ink = "var(--water-ink)",
  water = "var(--water-fill)",
  soft = "var(--water-soft)",
  stone = "var(--water-stone)";
export function Drop({
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
        d="M0-26C-7-14-18-4-18 8A18 18 0 0 0 18 8C18-4 7-14 0-26Z"
        fill={water}
      />
      <path d="M-9 8Q-9 17-2 18" stroke={ink} strokeWidth="3" />
    </g>
  );
}
function Ripples({
  x = 180,
  y = 189,
  width = 88,
}: {
  x?: number;
  y?: number;
  width?: number;
}) {
  return (
    <g stroke={ink} strokeWidth="3" opacity=".7">
      <ellipse cx={x} cy={y} rx={width} ry="17" />
      <ellipse cx={x} cy={y} rx={width * 0.55} ry="8" />
    </g>
  );
}
export function WaterScene({ variant }: { variant: GardenVariant }) {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="182" cy="211" rx="139" ry="13" fill="var(--garden-shadow)" />
      <circle cx="278" cy="59" r="27" fill="var(--garden-sun)" />
      {variant === "garden" && (
        <>
          <path
            d="M88 193Q112 152 146 157T198 117Q205 92 258 83"
            stroke={soft}
            strokeWidth="64"
          />
          <path
            d="M87 198Q112 157 146 163T198 123Q205 98 258 89"
            stroke={water}
            strokeWidth="36"
          />
          <path
            d="M98 192Q120 166 144 171M181 151Q204 143 210 123M228 104L250 99"
            stroke={ink}
            strokeWidth="3"
          />
          <ellipse cx="76" cy="145" rx="24" ry="14" fill={stone} />
          <ellipse cx="256" cy="176" rx="33" ry="18" fill={stone} />
          <Drop x={127} y={85} scale={0.8} />
        </>
      )}
      {variant === "jar" && (
        <>
          <path
            d="M111 65H191V93Q208 106 208 130V189Q208 208 190 208H112Q94 208 94 189V130Q94 106 111 93Z"
            fill={soft}
            stroke={ink}
            strokeWidth="3"
          />
          <path
            d="M100 139Q125 128 151 139T202 139V189Q202 202 189 202H113Q100 202 100 189Z"
            fill={water}
          />
          <path
            d="M112 65H191M115 80H188M117 153H150M117 170H141"
            stroke={ink}
            strokeWidth="4"
          />
          <path
            d="M211 127Q245 127 245 153V170M245 153Q285 153 285 179"
            stroke={ink}
            strokeWidth="3"
          />
          <Drop x={245} y={192} scale={0.5} />
          <Drop x={285} y={203} scale={0.4} />
        </>
      )}
      {variant === "sprout" && (
        <>
          <ellipse cx="180" cy="189" rx="119" ry="27" fill={soft} />
          <Ripples />
          <Drop x={180} y={111} scale={1.2} />
          <path
            d="M145 139L135 151M215 139L225 151"
            stroke={ink}
            strokeWidth="3"
          />
        </>
      )}
      {variant === "harvest" && (
        <>
          <path
            d="M68 80Q91 121 143 127T180 193M180 59V125M292 80Q270 121 219 127T180 193"
            stroke={soft}
            strokeWidth="35"
          />
          <path
            d="M68 80Q91 121 143 127T180 193M180 59V125M292 80Q270 121 219 127T180 193"
            stroke={water}
            strokeWidth="18"
          />
          <ellipse cx="180" cy="194" rx="74" ry="18" fill={water} />
          <path d="M149 191Q180 200 211 191" stroke={ink} strokeWidth="3" />
          <Drop x={95} y={54} scale={0.5} />
          <Drop x={257} y={54} scale={0.5} />
        </>
      )}
      {variant === "grove" && (
        <>
          <path
            d="M118 98Q170 105 173 145T253 185"
            stroke={water}
            strokeWidth="18"
          />
          {[
            [107, 94, 59],
            [190, 144, 65],
            [261, 191, 61],
          ].map(([x, y, r]) => (
            <g key={x}>
              <ellipse cx={x} cy={y} rx={r} ry="24" fill={soft} />
              <ellipse cx={x} cy={y} rx={r - 9} ry="16" fill={water} />
              <path
                d={`M${x - 23} ${y}q23 9 46 0`}
                stroke={ink}
                strokeWidth="3"
              />
            </g>
          ))}
          <Drop x={106} y={44} scale={0.6} />
        </>
      )}
      {variant === "path" && (
        <>
          <path
            d="M57 198Q113 153 168 172T286 116"
            stroke={soft}
            strokeWidth="50"
          />
          <path
            d="M57 198Q113 153 168 172T286 116"
            stroke={water}
            strokeWidth="28"
          />
          <path
            d="M246 124H313M255 124V153M301 124V153"
            stroke={stone}
            strokeWidth="7"
          />
          <g transform="translate(145 147)">
            <path d="M-31 0H31L18 17H-17Z" fill={ink} />
            <path d="M0-48V-5H26Z" fill={water} stroke={ink} strokeWidth="3" />
          </g>
        </>
      )}
      {variant === "shelter" && (
        <>
          <ellipse cx="180" cy="195" rx="107" ry="20" fill={soft} />
          <path
            d="M95 116H265L180 52Z"
            fill={water}
            stroke={ink}
            strokeWidth="4"
          />
          <path
            d="M111 118V192M249 118V192M143 177Q180 187 217 177"
            stroke={ink}
            strokeWidth="4"
          />
          {[65, 98, 268, 300].map((x, i) => (
            <Drop key={x} x={x} y={86 + (i % 2) * 47} scale={0.35} />
          ))}
        </>
      )}
      {variant === "balance" && (
        <>
          <path
            d="M180 65V194M85 105H275M144 205H216"
            stroke={ink}
            strokeWidth="5"
          />
          {[108, 252].map((x) => (
            <g key={x}>
              <path
                d={`M${x - 30} 128H${x + 30}V173Q${x + 30} 188 ${x + 15} 188H${x - 15}Q${x - 30} 188 ${x - 30} 173Z`}
                fill={soft}
                stroke={ink}
                strokeWidth="3"
              />
              <path
                d={`M${x - 25} 151Q${x} 144 ${x + 25} 151V172Q${x + 25} 183 ${x + 13} 183H${x - 13}Q${x - 25} 183 ${x - 25} 172Z`}
                fill={water}
              />
              <path d={`M${x} 106V126`} stroke={ink} strokeWidth="3" />
            </g>
          ))}
          <Drop x={180} y={42} scale={0.6} />
        </>
      )}
    </g>
  );
}
