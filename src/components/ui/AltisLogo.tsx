type Props = {
  size?: number;
  onDark?: boolean;
};

export function AltisLogoMark({ size = 32, onDark = false }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 90 90"
      fill="none"
      aria-hidden="true"
    >
      <rect
        width="90"
        height="90"
        rx="6"
        fill={onDark ? "transparent" : "#0A2238"}
        stroke={onDark ? "rgba(255,255,255,0.15)" : "none"}
        strokeWidth="1.5"
      />
      <path
        fillRule="evenodd"
        d="M 9 82 L 77 82 L 50 8 Q 45 2, 40 8 Z M 40 16 Q 60 40, 33 66 L 57 66 L 50 16 Z"
        fill="#F2480A"
      />
    </svg>
  );
}
