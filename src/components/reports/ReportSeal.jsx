export default function ReportSeal({ month }) {
  const ink = '#2a4a86';
  return (
    <svg
      className="report-month-seal-svg"
      viewBox="0 0 170 170"
      width="158"
      height="158"
      role="img"
      aria-label={`${month} digitally verified watercolor stamp`}
    >
      <ellipse cx="90" cy="94" rx="70" ry="11" fill="#d9cfc0" />
      <ellipse cx="86" cy="84" rx="78" ry="74" fill="#d7e3f4" />
      <ellipse cx="76" cy="78" rx="72" ry="70" fill="#b7cbe6" />
      <ellipse cx="88" cy="88" rx="68" ry="66" fill="#8eadd8" />
      <ellipse cx="82" cy="80" rx="62" ry="60" fill="#cfe0f2" />
      <ellipse cx="70" cy="70" rx="18" ry="12" fill="#e8f0fa" />
      <ellipse cx="108" cy="108" rx="14" ry="9" fill="#9bb8dc" />
      <ellipse cx="124" cy="52" rx="10" ry="6" fill="#a9c2e4" />
      <ellipse cx="44" cy="116" rx="9" ry="5" fill="#7fa0d0" />
      <ellipse cx="82" cy="82" rx="58" ry="57" fill="none" stroke="#4d73b3" strokeWidth="1.4" />
      <ellipse cx="83" cy="83" rx="51" ry="50" fill="none" stroke="#6d8fc4" strokeWidth="0.9" />
      <text x="82" y="50" textAnchor="middle" fill={ink} fontSize="10" fontWeight="700" fontFamily="Georgia, 'Times New Roman', serif">The Pride of</text>
      <text x="82" y="64" textAnchor="middle" fill={ink} fontSize="12" fontWeight="700" fontFamily="Georgia, 'Times New Roman', serif">Tirumala</text>
      <ellipse cx="82" cy="80" rx="10" ry="9" fill="#eaf1fa" stroke="#2a4a86" strokeWidth="1.4" />
      <path
        d="M76.6 80.2 L80.2 84.2 L88.8 73.8"
        fill="none"
        stroke={ink}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="82" y="106" textAnchor="middle" fill={ink} fontSize="18" fontWeight="700" fontFamily="Georgia, 'Times New Roman', serif">{month}</text>
      <text x="82" y="122" textAnchor="middle" fill={ink} fontSize="6.8" fontWeight="700" letterSpacing="0.6" fontFamily="Arial, Helvetica, sans-serif">DIGITALLY VERIFIED</text>
    </svg>
  );
}
