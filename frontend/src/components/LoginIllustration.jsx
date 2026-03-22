/**
 * Premium job search illustration - professional, clean, attention-grabbing.
 */
export default function LoginIllustration() {
  return (
    <svg
      viewBox="0 0 440 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto max-h-[70vh] object-contain object-center"
    >
      <defs>
        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#FFFBF7" />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Hero card - main focal point */}
      <g filter="url(#softShadow)">
        <rect x="60" y="80" width="320" height="220" rx="20" fill="url(#cardGrad)" stroke="#E7E5E4" strokeWidth="1.5" />
        <rect x="80" y="100" width="280" height="160" rx="12" fill="#0F172A" />
        <line x1="100" y1="130" x2="340" y2="130" stroke="#EA580C" strokeWidth="4" strokeLinecap="round" />
        <line x1="100" y1="155" x2="300" y2="155" stroke="#64748B" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <line x1="100" y1="180" x2="280" y2="180" stroke="#64748B" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <line x1="100" y1="205" x2="260" y2="205" stroke="#64748B" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </g>

      {/* AI badge - sparkle icon */}
      <g transform="translate(295, 55)">
        <rect width="100" height="40" rx="20" fill="url(#accentGrad)" />
        <path d="M30 20 L32 14 L34 20 L40 22 L34 24 L32 30 L30 24 L24 22 Z" fill="white" />
      </g>

      {/* Briefcase with checkmark */}
      <g transform="translate(320, 200)">
        <rect width="80" height="60" rx="10" fill="url(#accentGrad)" />
        <rect x="32" y="8" width="50" height="6" rx="2" fill="#C2410C" opacity="0.8" />
        <rect x="42" y="38" width="18" height="18" rx="4" fill="white" />
        <path d="M48 44 L52 48 L58 40" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* Resume stack */}
      <g transform="translate(50, 220)">
        <rect width="70" height="90" rx="10" fill="white" stroke="#E7E5E4" strokeWidth="2" transform="rotate(-6 35 45)" />
        <rect width="70" height="90" rx="10" fill="white" stroke="#E7E5E4" strokeWidth="2" transform="translate(15, -8) rotate(4 35 45)" />
        <line x1="50" y1="55" x2="95" y2="55" stroke="#94A3B8" strokeWidth="2" transform="translate(15, -8) rotate(4 35 45)" />
        <line x1="50" y1="72" x2="85" y2="72" stroke="#94A3B8" strokeWidth="2" transform="translate(15, -8) rotate(4 35 45)" />
      </g>

      {/* Platform card */}
      <g transform="translate(75, 335)">
        <rect width="130" height="50" rx="12" fill="white" stroke="#E7E5E4" strokeWidth="1.5" />
        <circle cx="35" cy="25" r="8" fill="#EA580C" opacity="0.2" />
        <circle cx="55" cy="25" r="8" fill="#EA580C" opacity="0.3" />
        <circle cx="75" cy="25" r="8" fill="#EA580C" opacity="0.4" />
        <circle cx="95" cy="25" r="8" fill="#EA580C" opacity="0.5" />
      </g>

      {/* Success checkmark */}
      <g transform="translate(310, 305)">
        <circle r="38" fill="#D1FAE5" stroke="#10B981" strokeWidth="2" />
        <path d="M-14 2 L-6 10 L16 -10" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </svg>
  );
}
