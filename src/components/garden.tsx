export function Garden({
  variant = "garden",
  className = "",
}: {
  variant?: "garden" | "jar" | "sprout";
  className?: string;
}) {
  return (
    <svg
      className={`garden-art ${className}`}
      viewBox="0 0 360 240"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="182" cy="209" rx="139" ry="15" fill="var(--garden-shadow)" />
      <circle cx="262" cy="69" r="36" fill="var(--garden-sun)" />
      <path
        d="M49 140C22 109 49 76 74 90C91 100 88 130 69 151"
        fill="var(--garden-leaf-soft)"
      />
      <path
        d="M64 204V119M64 161L44 140"
        stroke="var(--garden-stem)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M114 124H241L229 195Q227 210 211 210H145Q129 210 127 195L114 124Z"
        fill="var(--garden-pot)"
      />
      <rect
        x="108"
        y="115"
        width="139"
        height="21"
        rx="10"
        fill="var(--garden-pot-rim)"
      />
      <path
        d="M177 116V53"
        stroke="var(--garden-stem)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M176 91C137 92 126 65 132 49C160 47 178 64 176 91Z"
        fill="var(--garden-leaf)"
      />
      <path
        d="M179 71C181 40 204 24 229 33C229 58 207 77 179 71Z"
        fill="var(--garden-leaf-soft)"
      />
      <path
        d="M147 66L174 88M204 48L181 69"
        stroke="var(--garden-stem)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M152 157Q174 170 198 157"
        stroke="var(--garden-pot-rim)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {variant === "garden" && (
        <g>
          <path
            d="M267 153H313L307 193Q306 203 295 203H281Q270 203 269 192L267 153Z"
            fill="var(--garden-leaf-soft)"
          />
          <path
            d="M310 160C338 151 340 184 309 184M269 166L246 151L242 157L268 182"
            stroke="var(--garden-stem)"
            strokeWidth="7"
            strokeLinejoin="round"
          />
          <path
            d="M278 152V143Q288 131 301 143V152"
            stroke="var(--garden-stem)"
            strokeWidth="4"
          />
          <path
            d="M239 158L232 169M246 164L241 175"
            stroke="var(--garden-leaf)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
      {variant === "jar" && (
        <g>
          <rect
            x="265"
            y="155"
            width="52"
            height="47"
            rx="15"
            fill="var(--garden-sun)"
          />
          <rect
            x="269"
            y="149"
            width="44"
            height="11"
            rx="5"
            fill="var(--garden-pot-rim)"
          />
          <path
            d="M290 188V171M283 178L290 171L297 178"
            stroke="var(--garden-stem)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
      <path
        d="M95 51V63M89 57H101M299 112V122M294 117H304"
        stroke="var(--garden-pot-rim)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M81 205Q88 182 104 192M85 206Q70 190 62 200"
        stroke="var(--garden-leaf)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
