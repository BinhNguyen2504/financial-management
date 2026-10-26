const ink = "var(--garden-stem)";
const main = "var(--garden-leaf)";
const soft = "var(--garden-leaf-soft)";
const warm = "var(--garden-sun)";
const clay = "var(--garden-pot)";
const rim = "var(--garden-pot-rim)";

/** Static protection metaphors; actual fund progress belongs to the fund cards. */
export function SafetyScene() {
  return (
    <svg
      className="garden-art safety-scene"
      data-scene="safety"
      viewBox="0 0 360 240"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g data-visual-only="forest" strokeLinecap="round" strokeLinejoin="round">
        <ellipse
          cx="180"
          cy="214"
          rx="136"
          ry="11"
          fill="var(--garden-shadow)"
        />
        <circle cx="280" cy="60" r="27" fill={warm} />
        <path
          d="M95 191Q54 155 75 117Q54 69 102 57Q108 20 146 35Q179 10 209 35Q254 18 264 61Q308 81 285 125Q310 167 267 190Z"
          fill={soft}
        />
        <path
          d="M180 112V208M180 168L120 117M180 145L229 97M180 192L233 151"
          stroke={rim}
          strokeWidth="7"
        />
        <path
          d="M180 81L237 101V144Q237 178 180 201Q123 178 123 144V101Z"
          fill={main}
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M180 174V122M179 146Q148 146 151 123Q177 118 179 146ZM182 138Q183 110 209 112Q212 136 182 138Z"
          fill={soft}
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M63 203Q87 184 111 203M251 204Q275 184 299 204"
          stroke={main}
          strokeWidth="5"
        />
      </g>
      <g data-visual-only="water" strokeLinecap="round" strokeLinejoin="round">
        <ellipse
          cx="180"
          cy="214"
          rx="136"
          ry="11"
          fill="var(--garden-shadow)"
        />
        <path d="M47 177Q87 159 126 177T205 177T314 177V205H47Z" fill={soft} />
        <path d="M121 200L140 174H220L248 203Z" fill={rim} />
        <path
          d="M151 170L160 82H204L214 170Z"
          fill={soft}
          stroke={ink}
          strokeWidth="3"
        />
        <path d="M155 132H210L212 151H153Z" fill={main} />
        <path
          d="M150 84V59H214V84ZM142 58L182 31L222 58Z"
          fill={main}
          stroke={ink}
          strokeWidth="3"
        />
        <path d="M172 63H192V79H172Z" fill={warm} />
        <path
          d="M143 69L70 48V94ZM222 69L292 48V94Z"
          fill={warm}
          opacity=".75"
        />
        <path d="M172 171V151Q182 142 193 151V171" fill={ink} />
        <path
          d="M60 192Q89 182 115 192M248 193Q278 181 304 193"
          stroke={ink}
          strokeWidth="3"
        />
      </g>
      <g data-visual-only="gold" strokeLinecap="round" strokeLinejoin="round">
        <ellipse
          cx="180"
          cy="214"
          rx="136"
          ry="11"
          fill="var(--garden-shadow)"
        />
        <circle cx="281" cy="60" r="26" fill={warm} />
        <path
          d="M97 197V211H125V197M231 197V211H258V197"
          stroke={rim}
          strokeWidth="9"
        />
        <rect x="83" y="52" width="190" height="151" rx="26" fill={clay} />
        <rect
          x="98"
          y="67"
          width="160"
          height="121"
          rx="17"
          fill={soft}
          stroke={ink}
          strokeWidth="3"
        />
        <circle
          cx="178"
          cy="128"
          r="43"
          fill={warm}
          stroke={ink}
          strokeWidth="4"
        />
        <path
          d="M178 96V159M147 128H210M156 106L200 150M156 150L200 106"
          stroke={rim}
          strokeWidth="5"
        />
        <circle
          cx="178"
          cy="128"
          r="13"
          fill={main}
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M244 107V148M109 85V101M109 154V170"
          stroke={ink}
          strokeWidth="5"
        />
        <path
          d="M55 100V114M48 107H62M296 149V163M289 156H303"
          stroke={rim}
          strokeWidth="3"
        />
      </g>
      <g data-visual-only="fire" strokeLinecap="round" strokeLinejoin="round">
        <ellipse
          cx="180"
          cy="214"
          rx="136"
          ry="11"
          fill="var(--garden-shadow)"
        />
        <path d="M87 201V116Q87 30 180 30Q273 30 273 116V201Z" fill={soft} />
        <path
          d="M115 192V117Q115 55 180 55Q245 55 245 117V192"
          stroke={rim}
          strokeWidth="7"
        />
        <path
          d="M155 133H205V189H155Z"
          fill={warm}
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M180 133V121M154 143Q165 134 171 145T188 145T206 143"
          stroke={rim}
          strokeWidth="3"
        />
        <path
          d="M180 79C182 93 201 101 192 116C184 128 169 124 167 113C164 102 175 95 180 79Z"
          fill={main}
        />
        <path d="M126 192H234L244 205H116Z" fill={clay} />
        <path
          d="M73 85L61 79M64 120H49M287 85L299 79M296 120H311"
          stroke={ink}
          strokeWidth="3"
        />
      </g>
      <g data-visual-only="earth" strokeLinecap="round" strokeLinejoin="round">
        <ellipse
          cx="180"
          cy="214"
          rx="136"
          ry="11"
          fill="var(--garden-shadow)"
        />
        <circle cx="279" cy="59" r="26" fill={warm} />
        <path d="M59 205L100 140L142 205M235 205L268 155L307 205" fill={soft} />
        <path
          d="M104 205V124Q104 53 180 53Q256 53 256 124V205H222V130Q222 88 180 88Q138 88 138 130V205Z"
          fill={clay}
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M109 128L137 130M119 86L146 108M157 58L165 90M202 59L195 90M240 85L215 108M252 128L223 130"
          stroke={warm}
          strokeWidth="4"
        />
        <path d="M163 175H197L192 205H168Z" fill={main} />
        <path
          d="M179 175V137M179 158Q152 158 155 138Q178 133 179 158ZM181 149Q183 127 204 128Q206 148 181 149Z"
          fill={soft}
          stroke={ink}
          strokeWidth="3"
        />
        <path d="M92 207H147M216 207H268" stroke={rim} strokeWidth="6" />
      </g>
    </svg>
  );
}
