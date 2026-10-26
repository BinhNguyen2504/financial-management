import type { ReactNode } from "react";

const ink = "var(--garden-stem)";
const main = "var(--garden-leaf)";
const soft = "var(--garden-leaf-soft)";
const warm = "var(--garden-sun)";
const clay = "var(--garden-pot)";
const rim = "var(--garden-pot-rim)";

/** Decorative stories, independent of balances, returns and progress. CSS selects before paint. */
export function AssetScene({ kind }: { kind: "savings" | "investments" }) {
  const saving = kind === "savings";
  return (
    <svg
      className="garden-art asset-scene"
      data-scene={kind}
      viewBox="0 0 360 240"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <Scene theme="forest">
        {saving ? (
          <>
            <circle cx="279" cy="59" r="27" fill={warm} />
            <path d="M66 112L177 37L288 112V204H66Z" fill={soft} />
            <path
              d="M66 112L177 37L288 112M177 39V203M66 112H288M113 82V203M240 82V203"
              stroke={ink}
              strokeWidth="4"
            />
            <path d="M55 204H299" stroke={rim} strokeWidth="7" />
            <Seedling x={111} y={191} scale={0.65} />
            <Seedling x={178} y={191} scale={0.85} />
            <Seedling x={245} y={191} scale={0.65} />
            <path d="M56 110L177 28L300 110" stroke={rim} strokeWidth="7" />
          </>
        ) : (
          <>
            <circle cx="278" cy="58" r="26" fill={warm} />
            <path d="M54 195Q100 169 163 190T307 189L299 207H62Z" fill={soft} />
            <path
              d="M106 189V123M184 194V86M264 190V139"
              stroke={rim}
              strokeWidth="8"
            />
            <path
              d="M76 145Q104 157 128 137M158 120L184 137L209 112M244 157L263 169L283 150"
              stroke={rim}
              strokeWidth="4"
            />
            <path
              d="M60 115Q53 78 80 73Q82 43 111 46Q143 45 143 78Q166 93 149 120Q131 141 106 130Q77 141 60 115Z"
              fill={main}
            />
            <path
              d="M144 87Q132 53 158 39Q166 15 190 26Q225 18 225 53Q248 74 227 98Q205 114 182 101Q155 113 144 87Z"
              fill={soft}
            />
            <ellipse cx="264" cy="128" rx="40" ry="36" fill={main} />
            <circle cx="83" cy="96" r="8" fill={warm} />
            <circle cx="125" cy="103" r="8" fill={warm} />
            <circle cx="172" cy="62" r="8" fill={clay} />
            <circle cx="211" cy="78" r="8" fill={clay} />
            <circle cx="251" cy="126" r="7" fill={warm} />
            <circle cx="280" cy="140" r="7" fill={warm} />
            <path d="M166 193L161 211H208L203 193Z" fill={clay} />
            <path d="M169 193Q184 172 200 193" stroke={rim} strokeWidth="3" />
          </>
        )}
      </Scene>
      <Scene theme="water">
        {saving ? (
          <>
            <path
              d="M66 80Q47 57 70 44Q76 21 100 28Q121 10 140 31Q164 30 166 52Q182 72 158 82Z"
              fill={soft}
            />
            <path
              d="M87 98L81 111M119 94L113 107M147 98L141 111"
              stroke={main}
              strokeWidth="5"
            />
            <path d="M66 128H187L170 151H83Z" fill={main} />
            <path
              d="M127 150V170Q127 184 149 184H197"
              stroke={ink}
              strokeWidth="7"
            />
            <rect
              x="186"
              y="97"
              width="97"
              height="111"
              rx="24"
              fill={soft}
              stroke={ink}
              strokeWidth="3"
            />
            <path
              d="M192 159Q213 150 235 159T277 159V183Q277 202 260 202H209Q192 202 192 183Z"
              fill={main}
            />
            <path
              d="M198 97H272M214 124H235M214 141H226M280 174H303V190"
              stroke={ink}
              strokeWidth="4"
            />
            <path
              d="M302 193C291 207 295 213 302 213C309 213 313 207 302 193Z"
              fill={main}
            />
          </>
        ) : (
          <>
            <circle cx="278" cy="56" r="25" fill={warm} />
            <path
              d="M49 164Q97 146 143 164T236 164T313 164V202Q266 217 216 202T119 202T49 202Z"
              fill={soft}
            />
            <path
              d="M57 183Q98 169 138 183M169 200Q211 186 253 200M236 177Q269 165 303 177"
              stroke={main}
              strokeWidth="4"
            />
            <path d="M78 146H191L169 171H105Z" fill={ink} />
            <path d="M133 137V45L187 137Z" fill={main} />
            <path
              d="M124 72L84 137H124Z"
              fill={soft}
              stroke={ink}
              strokeWidth="3"
            />
            <path d="M218 151H292L278 167H232Z" fill={rim} />
            <path d="M252 143V86L287 143Z" fill={main} />
            <path d="M243 106L220 143H243Z" fill={warm} />
            <path
              d="M63 65Q82 57 100 65M211 50H236"
              stroke={ink}
              strokeWidth="3"
            />
          </>
        )}
      </Scene>
      <Scene theme="gold">
        {saving ? (
          <>
            <circle cx="269" cy="61" r="28" fill={soft} />
            <path
              d="M104 178L99 205H125L133 184M222 179L230 205H254L249 171"
              fill={rim}
            />
            <path
              d="M251 116L274 126H291V155H273Q253 190 196 192H150Q100 189 88 156Q71 115 112 94Q146 76 207 90L239 73L243 106Z"
              fill={main}
            />
            <path d="M238 86L238 110L219 102Z" fill={warm} />
            <circle cx="255" cy="126" r="4" fill={ink} />
            <path
              d="M143 98H182M88 130Q55 133 65 113Q75 100 79 113"
              stroke={ink}
              strokeWidth="4"
            />
            <Coin x={159} y={53} r={23} />
            <path
              d="M158 80V87M149 79L146 84M169 79L172 84"
              stroke={rim}
              strokeWidth="3"
            />
            <Coin x={74} y={195} r={14} />
          </>
        ) : (
          <>
            <circle cx="181" cy="64" r="32" fill={soft} />
            <path
              d="M180 64V201M146 205H214M82 101L276 83"
              stroke={ink}
              strokeWidth="6"
            />
            <circle
              cx="180"
              cy="92"
              r="9"
              fill={main}
              stroke={ink}
              strokeWidth="3"
            />
            <path
              d="M103 99L74 159H132ZM257 85L228 145H286Z"
              stroke={rim}
              strokeWidth="3"
            />
            <path d="M65 159H141Q133 183 103 183Q73 183 65 159Z" fill={main} />
            <path
              d="M219 145H295Q287 169 257 169Q227 169 219 145Z"
              fill={main}
            />
            <Coin x={103} y={139} r={17} />
            <path
              d="M238 126H276L281 140H233Z"
              fill={warm}
              stroke={ink}
              strokeWidth="2"
            />
            <path d="M153 201L164 188H196L207 201" fill={clay} />
          </>
        )}
      </Scene>
      <Scene theme="fire">
        {saving ? (
          <>
            <circle cx="180" cy="123" r="87" fill={soft} opacity=".6" />
            <path
              d="M155 61V50Q180 24 205 50V61"
              stroke={ink}
              strokeWidth="5"
            />
            <path
              d="M128 84H232L216 191H144Z"
              fill={warm}
              stroke={ink}
              strokeWidth="4"
            />
            <path
              d="M119 85L141 62H219L241 85ZM138 191H222L231 205H129Z"
              fill={clay}
            />
            <path
              d="M149 89L160 187M211 89L200 187"
              stroke={rim}
              strokeWidth="3"
            />
            <path
              d="M179 113C184 139 208 142 198 163C189 183 159 174 160 155C160 142 172 133 179 113Z"
              fill={main}
            />
            <path d="M179 147Q198 169 180 173Q166 171 179 147Z" fill={warm} />
            <path
              d="M81 113L69 107M88 154H71M272 109L284 103M273 154H290"
              stroke={rim}
              strokeWidth="3"
            />
          </>
        ) : (
          <>
            <path
              d="M83 202V109Q83 47 148 47Q213 47 213 109V202Z"
              fill={clay}
            />
            <path
              d="M101 150V112Q101 67 148 67Q195 67 195 112V150Z"
              fill={soft}
              stroke={ink}
              strokeWidth="3"
            />
            <path d="M104 150H192M148 68V149" stroke={rim} strokeWidth="4" />
            <path
              d="M119 124L124 143H142L147 124M160 110H177L183 141H154Z"
              fill={main}
              stroke={ink}
              strokeWidth="2"
            />
            <path d="M113 202V176Q148 153 183 176V202Z" fill={ink} />
            <path
              d="M148 170C151 186 172 185 164 199H130Q125 187 148 170Z"
              fill={warm}
            />
            <path
              d="M232 143H283L278 157Q305 204 277 207H239Q212 204 238 157Z"
              fill={main}
            />
            <path
              d="M236 143H280M235 181Q258 193 284 181"
              stroke={ink}
              strokeWidth="3"
            />
            <path
              d="M241 114Q230 103 242 92M264 112Q253 101 265 90"
              stroke={rim}
              strokeWidth="3"
            />
            <path d="M205 60V32H183V59" fill={rim} />
          </>
        )}
      </Scene>
      <Scene theme="earth">
        {saving ? (
          <>
            <circle cx="275" cy="61" r="26" fill={warm} />
            <path d="M55 179Q114 151 181 177T307 174V207H55Z" fill={soft} />
            <path
              d="M114 98H202L195 123Q230 152 220 184Q216 207 190 207H127Q102 207 98 184Q86 152 121 123Z"
              fill={clay}
            />
            <path d="M112 96Q158 84 204 96L201 107H115Z" fill={rim} />
            <path
              d="M111 151Q158 171 207 151M111 177Q158 196 207 177"
              stroke={warm}
              strokeWidth="5"
            />
            <path d="M139 132H177M139 142H162" stroke={ink} strokeWidth="3" />
            <path
              d="M245 160H285L280 172Q303 207 279 207H249Q227 207 250 172Z"
              fill={main}
            />
            <path d="M244 158H286M246 187H283" stroke={ink} strokeWidth="3" />
            <path
              d="M69 201V163M69 181Q44 177 49 158Q68 157 69 181M70 174Q71 151 89 151Q93 170 70 174"
              stroke={ink}
              strokeWidth="3"
              fill={main}
            />
          </>
        ) : (
          <>
            <circle cx="278" cy="58" r="26" fill={warm} />
            <path
              d="M47 151L111 65L174 151ZM183 151L237 83L307 151Z"
              fill={soft}
            />
            <path
              d="M49 205Q109 188 178 205T311 205"
              stroke={main}
              strokeWidth="8"
            />
            <path
              d="M66 129H295V187H267V170Q244 134 219 170V193H184V170Q160 134 135 170V193H102V171Q85 143 66 163Z"
              fill={clay}
              stroke={ink}
              strokeWidth="3"
            />
            <path
              d="M62 128H300M77 124V105M122 124V105M167 124V105M212 124V105M257 124V105M295 124V105M76 105H296"
              stroke={rim}
              strokeWidth="5"
            />
            <path
              d="M116 135V151M161 129V146M203 134V154M249 129V145M277 155H292"
              stroke={warm}
              strokeWidth="3"
            />
            <path
              d="M68 202L79 187H99L110 204M267 205L278 188H297L308 205"
              fill={main}
            />
          </>
        )}
      </Scene>
    </svg>
  );
}

function Scene({ theme, children }: { theme: string; children: ReactNode }) {
  return (
    <g data-visual-only={theme} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="180" cy="214" rx="139" ry="11" fill="var(--garden-shadow)" />
      {children}
    </g>
  );
}

function Seedling({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-23-21H23L18 5H-18Z" fill={clay} />
      <path d="M-26-23H26" stroke={rim} strokeWidth="7" />
      <path d="M0-25V-63" stroke={ink} strokeWidth="4" />
      <path
        d="M-1-45Q-35-43-30-68Q-4-70-1-45ZM2-54Q1-84 30-81Q35-57 2-54Z"
        fill={main}
        stroke={ink}
        strokeWidth="2"
      />
    </g>
  );
}

function Coin({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={warm} stroke={ink} strokeWidth="3" />
      <circle cx={x} cy={y} r={r - 6} stroke={rim} strokeWidth="2" />
      <path d={`M${x - 4} ${y}h8`} stroke={ink} strokeWidth="3" />
    </g>
  );
}
