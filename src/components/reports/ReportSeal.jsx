function circularLetters(text, cx, cy, radius, startDeg, endDeg) {
  const chars = String(text).split('');
  if (!chars.length) return [];
  return chars.map((ch, i) => {
    const t = chars.length === 1 ? 0.5 : i / (chars.length - 1);
    const deg = startDeg + (endDeg - startDeg) * t;
    const rad = ((deg - 90) * Math.PI) / 180;
    return (
      <text
        key={`${ch}-${i}`}
        x={(cx + radius * Math.cos(rad)).toFixed(2)}
        y={(cy + radius * Math.sin(rad)).toFixed(2)}
        fill="#1a3d8f"
        fontSize="7"
        fontWeight="700"
        fontFamily="Georgia, 'Times New Roman', serif"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {ch}
      </text>
    );
  });
}

export default function ReportSeal({ month }) {
  return (
    <svg
      className="report-month-seal-svg"
      viewBox="0 0 170 170"
      width="158"
      height="158"
      role="img"
      aria-label={`${month} pressed digitally verified stamp`}
    >
      <ellipse cx="88" cy="92" rx="74" ry="10" fill="#d8cfc0" />
      <circle cx="86" cy="86" r="76" fill="none" stroke="#b7c6e4" strokeWidth="5" />
      <circle cx="82" cy="82" r="76" fill="#f4efe6" stroke="#1a3d8f" strokeWidth="3.8" />
      <circle cx="82.6" cy="82.4" r="76" fill="none" stroke="#4d6fb3" strokeWidth="1.1" />
      <circle cx="82" cy="82" r="69" fill="none" stroke="#1a3d8f" strokeWidth="1.2" />
      <circle cx="82" cy="82" r="63.5" fill="none" stroke="#1a3d8f" strokeWidth="0.75" strokeDasharray="2 1.5" />
      <ellipse cx="128" cy="50" rx="4" ry="2" fill="#c5d0e8" />
      <ellipse cx="42" cy="118" rx="3.4" ry="1.7" fill="#c5d0e8" />
      <ellipse cx="118" cy="126" rx="2.6" ry="1.4" fill="#a8b8dc" />
      {circularLetters('THE PRIDE OF TIRUMALA', 82, 82, 58, -94, 94)}
      <circle cx="82" cy="64" r="10" fill="#eef2fa" stroke="#1a3d8f" strokeWidth="1.8" />
      <path
        d="M76.4 64.4 L80.2 68.6 L89.2 57.6"
        fill="none"
        stroke="#1a3d8f"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="82" y="94" textAnchor="middle" fill="#1a3d8f" fontSize="19" fontWeight="700" fontFamily="Georgia, 'Times New Roman', serif">{month}</text>
      <text x="82" y="110" textAnchor="middle" fill="#1a3d8f" fontSize="7.2" fontWeight="700" letterSpacing="0.7" fontFamily="Arial, Helvetica, sans-serif">DIGITALLY VERIFIED</text>
      <text x="82" y="122" textAnchor="middle" fill="#3d5a99" fontSize="6.2" letterSpacing="1.1" fontFamily="Arial, Helvetica, sans-serif">PRESSED COPY</text>
    </svg>
  );
}
