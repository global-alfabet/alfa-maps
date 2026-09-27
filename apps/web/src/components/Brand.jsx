export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#0E2233" />
      <path d="M7 22 L16 9 L25 22" fill="none" stroke="#8EC5E6" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M7 22 H25" stroke="#8EC5E6" strokeWidth="2.4" />
      <circle cx="16" cy="17" r="2.6" fill="#E8742E" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="word">
        Estate<b>Maps</b>
      </span>
    </span>
  );
}
