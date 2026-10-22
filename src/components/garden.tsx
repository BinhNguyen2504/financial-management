import { WaterScene } from "./water-scene";
import { GoldScene } from "./gold-scene";
import { FireScene } from "./fire-scene";
import { EarthScene } from "./earth-scene";
import type { VisualTheme } from "./visual-theme";

export type GardenVariant =
  | "garden"
  | "jar"
  | "sprout"
  | "harvest"
  | "grove"
  | "path"
  | "shelter"
  | "balance";

// Shared palette and drawing language; each context gets its own scene.
export function Garden({
  variant = "garden",
  className = "",
  theme,
}: {
  variant?: GardenVariant;
  className?: string;
  theme?: VisualTheme;
}) {
  return (
    <svg
      className={`garden-art ${className}`}
      data-scene={variant}
      data-visual-preview={theme}
      viewBox="0 0 360 240"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g data-visual-only="forest">
        <ellipse
          cx="182"
          cy="211"
          rx="139"
          ry="13"
          fill="var(--garden-shadow)"
        />
        <circle cx="272" cy="64" r="32" fill="var(--garden-sun)" />
        <g strokeLinecap="round" strokeLinejoin="round">
          {variant === "garden" && (
            <>
              <path
                d="M110 130H236L224 195Q222 210 207 210H140Q126 210 124 195Z"
                fill="var(--garden-pot)"
              />
              <rect
                x="104"
                y="119"
                width="138"
                height="21"
                rx="10"
                fill="var(--garden-pot-rim)"
              />
              <path
                d="M174 119V53"
                stroke="var(--garden-stem)"
                strokeWidth="5"
              />
              <Leaf x={172} y={96} />
              <Leaf x={178} y={74} flip />
              <path
                d="M149 164Q173 179 199 164"
                stroke="var(--garden-pot-rim)"
                strokeWidth="3"
              />
              <path
                d="M267 154H310L304 194Q302 205 292 205H282Q271 205 270 194Z"
                fill="var(--garden-leaf-soft)"
              />
              <path
                d="M309 161C338 151 340 185 307 185M269 166L248 151L242 159L268 183"
                stroke="var(--garden-stem)"
                strokeWidth="6"
              />
              <path
                d="M278 153V144Q289 132 300 144V153M239 166L234 176M246 171L242 181"
                stroke="var(--garden-leaf)"
                strokeWidth="3"
              />
              <Sprig x={66} y={205} />
            </>
          )}
          {variant === "jar" && (
            <>
              <rect
                x="84"
                y="108"
                width="106"
                height="99"
                rx="26"
                fill="var(--garden-leaf-soft)"
              />
              <rect
                x="90"
                y="94"
                width="94"
                height="22"
                rx="9"
                fill="var(--garden-stem)"
              />
              <path
                d="M115 153H159M137 131V175"
                stroke="var(--garden-leaf)"
                strokeWidth="5"
              />
              <rect
                x="206"
                y="142"
                width="70"
                height="65"
                rx="20"
                fill="var(--garden-sun)"
              />
              <rect
                x="211"
                y="131"
                width="60"
                height="17"
                rx="7"
                fill="var(--garden-pot-rim)"
              />
              <path
                d="M231 169H250M241 160V182"
                stroke="var(--garden-pot)"
                strokeWidth="4"
              />
              <circle cx="139" cy="65" r="19" fill="var(--garden-sun)" />
              <path
                d="M133 65H145"
                stroke="var(--garden-pot-rim)"
                strokeWidth="3"
              />
              <Sprig x={297} y={207} />
            </>
          )}
          {variant === "sprout" && (
            <>
              <path
                d="M86 197Q179 159 270 197L259 211H99Z"
                fill="var(--garden-pot)"
              />
              <path
                d="M178 189V112"
                stroke="var(--garden-stem)"
                strokeWidth="5"
              />
              <Leaf x={175} y={150} />
              <Leaf x={181} y={124} flip />
              <path
                d="M132 201L145 198M200 199L213 203M165 207L171 205"
                stroke="var(--garden-pot-rim)"
                strokeWidth="3"
              />
              <path
                d="M112 88C112 88 100 104 100 112A12 12 0 0 0 124 112C124 104 112 88 112 88Z"
                fill="var(--garden-leaf-soft)"
              />
              <Sprig x={279} y={208} />
            </>
          )}
          {variant === "harvest" && (
            <>
              <path
                d="M116 146V119C116 58 240 58 240 119V146"
                stroke="var(--garden-pot-rim)"
                strokeWidth="9"
              />
              <circle cx="140" cy="139" r="28" fill="var(--garden-leaf)" />
              <circle cx="181" cy="126" r="30" fill="var(--garden-sun)" />
              <circle cx="221" cy="140" r="28" fill="var(--garden-leaf-soft)" />
              <path
                d="M180 98L184 87M139 111L133 99M220 111L229 100"
                stroke="var(--garden-stem)"
                strokeWidth="4"
              />
              <path
                d="M98 148H263L247 198Q245 210 230 210H131Q116 210 113 198Z"
                fill="var(--garden-pot)"
              />
              <path
                d="M104 150H258M121 174H242M130 193H234M146 153L151 207M179 153V208M213 153L208 207"
                stroke="var(--garden-pot-rim)"
                strokeWidth="4"
              />
              <Sprig x={66} y={209} />
              <Sprig x={294} y={207} />
            </>
          )}
          {variant === "grove" && (
            <>
              <path
                d="M60 207Q168 162 304 203V212H60Z"
                fill="var(--garden-leaf-soft)"
              />
              <path
                d="M99 202V137M181 196V104M262 205V146"
                stroke="var(--garden-pot)"
                strokeWidth="8"
              />
              <path
                d="M99 82C51 116 49 165 99 169C149 165 147 116 99 82Z"
                fill="var(--garden-leaf-soft)"
              />
              <path
                d="M181 34C119 78 114 142 181 151C248 142 243 78 181 34Z"
                fill="var(--garden-leaf)"
              />
              <path
                d="M262 99C218 133 215 176 262 180C309 176 306 133 262 99Z"
                fill="var(--garden-leaf-soft)"
              />
              <path
                d="M181 178V95M181 134L160 113M181 150L205 125M99 179V133M262 190V145"
                stroke="var(--garden-stem)"
                strokeWidth="4"
              />
              <path
                d="M143 210Q171 189 203 208"
                stroke="var(--garden-pot-rim)"
                strokeWidth="5"
              />
            </>
          )}
          {variant === "path" && (
            <>
              <path
                d="M66 209C101 168 167 174 172 137S241 113 259 75"
                stroke="var(--garden-leaf-soft)"
                strokeWidth="27"
              />
              <ellipse
                cx="92"
                cy="199"
                rx="26"
                ry="11"
                fill="var(--garden-pot-rim)"
              />
              <ellipse
                cx="148"
                cy="169"
                rx="22"
                ry="10"
                fill="var(--garden-pot)"
              />
              <ellipse
                cx="181"
                cy="132"
                rx="18"
                ry="9"
                fill="var(--garden-pot-rim)"
              />
              <ellipse
                cx="236"
                cy="103"
                rx="19"
                ry="8"
                fill="var(--garden-pot)"
              />
              <path
                d="M258 88V35L298 49L258 66"
                fill="var(--garden-leaf)"
                stroke="var(--garden-stem)"
                strokeWidth="4"
              />
              <Sprig x={84} y={151} />
              <Sprig x={279} y={205} />
            </>
          )}
          {variant === "shelter" && (
            <>
              <path
                d="M89 109L180 44L271 109V208H89Z"
                fill="var(--garden-leaf-soft)"
              />
              <path
                d="M80 113L180 40L280 113M90 108V209H270V108M180 43V208M91 136H269"
                stroke="var(--garden-stem)"
                strokeWidth="6"
              />
              <path
                d="M120 178H153L149 205H125ZM207 178H240L236 205H212Z"
                fill="var(--garden-pot)"
              />
              <path
                d="M137 178V158M223 178V157"
                stroke="var(--garden-stem)"
                strokeWidth="3"
              />
              <path
                d="M137 163Q109 160 116 146Q137 143 137 163ZM223 163Q248 155 242 143Q219 141 223 163Z"
                fill="var(--garden-leaf)"
              />
              <Sprig x={61} y={210} />
            </>
          )}
          {variant === "balance" && (
            <>
              <path
                d="M103 194C103 172 256 172 256 194C256 217 103 217 103 194Z"
                fill="var(--garden-pot)"
              />
              <path
                d="M125 161C125 136 240 136 240 161C240 187 125 187 125 161Z"
                fill="var(--garden-pot-rim)"
              />
              <path
                d="M146 123C146 101 221 101 221 123C221 147 146 147 146 123Z"
                fill="var(--garden-leaf-soft)"
              />
              <path
                d="M183 107V74"
                stroke="var(--garden-stem)"
                strokeWidth="4"
              />
              <path
                d="M181 86Q148 86 151 63Q176 62 181 86ZM185 80Q186 50 213 48Q216 72 185 80Z"
                fill="var(--garden-leaf)"
              />
              <Sprig x={73} y={209} />
            </>
          )}
        </g>
        <path
          d="M65 66V78M59 72H71M300 120V130M295 125H305"
          stroke="var(--garden-pot-rim)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g data-visual-only="water">
        <WaterScene variant={variant} />
      </g>
      <g data-visual-only="gold">
        <GoldScene variant={variant} />
      </g>
      <g data-visual-only="fire">
        <FireScene variant={variant} />
      </g>
      <g data-visual-only="earth">
        <EarthScene variant={variant} />
      </g>
    </svg>
  );
}
function Leaf({
  x,
  y,
  flip = false,
}: {
  x: number;
  y: number;
  flip?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <path
        d="M0 0C-39 1-50-26-44-42C-16-44 2-27 0 0Z"
        fill={flip ? "var(--garden-leaf-soft)" : "var(--garden-leaf)"}
      />
      <path d="M-29-25L-2-3" stroke="var(--garden-stem)" strokeWidth="2" />
    </g>
  );
}
function Sprig({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M0 0V-30M0-13Q-25-10-20-29Q-2-32 0-13Z"
        stroke="var(--garden-stem)"
        strokeWidth="3"
        fill="var(--garden-leaf-soft)"
      />
      <path d="M1-21Q1-43 23-41Q25-23 1-21Z" fill="var(--garden-leaf)" />
    </g>
  );
}
