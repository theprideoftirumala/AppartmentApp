function circularLetters(text, radius, startDeg, endDeg) {
  const chars = String(text).split('');
  if (!chars.length) return [];
  return chars.map((ch, i) => {
    const t = chars.length === 1 ? 0.5 : i / (chars.length - 1);
    const deg = startDeg + (endDeg - startDeg) * t;
    const rad = ((deg - 90) * Math.PI) / 180;
    const x = 80 + radius * Math.cos(rad);
    const y = 80 + radius * Math.sin(rad);
    return (
      <text
        key={`${ch}-${i}`}
        x={x.toFixed(2)}
        y={y.toFixed(2)}
        fill="#1c489e"
        fontSize="7.1"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
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
      viewBox="0 0 160 160"
      width="148"
      height="148"
      role="img"
      aria-label={`${month} digitally verified stamp`}
    >
      <circle cx="80" cy="80" r="76" fill="#fffaf2" stroke="#1c489e" strokeWidth="3.4" />
      <circle cx="80" cy="80" r="69" fill="none" stroke="#1c489e" strokeWidth="1.2" />
      <circle cx="80" cy="80" r="63" fill="none" stroke="#1c489e" strokeWidth="0.6" strokeDasharray="2.2 1.6" />
      {circularLetters('THE PRIDE OF TIRUMALA', 58, -92, 92)}
      <circle cx="80" cy="64" r="9" fill="none" stroke="#1c489e" strokeWidth="1.7" />
      <path
        d="M75.2 64.2 L78.6 68 L86.4 58.4"
        fill="none"
        stroke="#1c489e"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="80" y="92" textAnchor="middle" fill="#1c489e" fontSize="18" fontWeight="700" fontFamily="Arial, Helvetica, sans-serif">{month}</text>
      <text x="80" y="108" textAnchor="middle" fill="#1c489e" fontSize="7.4" fontWeight="700" letterSpacing="0.8" fontFamily="Arial, Helvetica, sans-serif">DIGITALLY VERIFIED</text>
      <text x="80" y="120" textAnchor="middle" fill="#1c489e" fontSize="6.4" letterSpacing="0.6" fontFamily="Arial, Helvetica, sans-serif">COMMON ACCOUNTS</text>
    </svg>
  );
}
