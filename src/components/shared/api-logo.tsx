interface ApiLogoProps {
  variant?: "white" | "navy"
  className?: string
}

const FILL = {
  white: "#ffffff",
  navy: "#273B6E",
}

export function ApiLogo({ variant = "navy", className }: ApiLogoProps) {
  const fill = FILL[variant]
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 166.22 85.48"
      className={className}
      aria-label="API logo"
    >
      <rect fill={fill} x="148.84" y="0.02" width="17.38" height="85.4" />
      <path
        fill={fill}
        d="M120.17,0c-12.66,0-25.32.12-38,.12V69.64L52.72.06H36.15L0,85.42H16.46L44.43,18,72.29,85.42h9.9v.06H97.38V15.36h22.79c19.34,0,19.46,30.24,0,30.24h-7.59V60.36h7.59C159.66,60.36,159.55,0,120.17,0Z"
      />
      <line
        stroke="#78bc43"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="3.5"
        fill="none"
        x1="43.9"
        y1="49.84"
        x2="43.9"
        y2="72.34"
      />
      <line
        stroke="#78bc43"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="3.5"
        fill="none"
        x1="55.15"
        y1="61.09"
        x2="32.65"
        y2="61.09"
      />
    </svg>
  )
}
