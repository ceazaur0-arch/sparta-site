const DEMO = {
  '1H': [34,39,31,45,42,53,47,60,55,49,65,70,62,75,69,83,77,90,80,96,88,108,101,117,109,125,118,137,130,145,139,151,143,160],
  '24H': [112,104,117,96,103,86,99,77,89,68,83,74,91,65,78,56,71,48,63,53,76,61,87,70,96,81,105,88,119,102,127,113,143,132],
  '7D': [130,118,126,102,112,94,108,84,97,74,90,81,101,68,83,57,72,62,88,70,99,79,110,95,124,105,136,116,128,107,145,127,158,146],
};

// candles: [{t, close}] from the backend, or null to show demo data
export default function Chart({ candles, range, setRange }) {
  const live = Array.isArray(candles) && candles.length > 1;
  const vals = live ? candles.map((c) => Number(c.close)) : DEMO[range];
  const min = Math.min(...vals), max = Math.max(...vals), pad = (max - min) * 0.08 || 1;
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * 580 + 10,
    170 - ((v - (min - pad)) / (max - min + 2 * pad)) * 145,
  ]);
  const d = 'M' + pts.map((p) => p.join(' ')).join(' L');
  const last = pts[pts.length - 1];
  const change = ((vals[vals.length - 1] - vals[0]) / vals[0]) * 100;
  const up = change >= 0, color = up ? '#56e5a1' : '#ff657a';
  const price = live ? vals[vals.length - 1].toFixed(9) : (0.00003 * (vals[vals.length - 1] / 100)).toFixed(8);
  return (
    <div className="market-chart">
      <div className="chart-head">
        <div>
          <div className="muted" style={{ fontSize: 11, letterSpacing: '.08em' }}>{live ? 'LIVE PRICE' : 'DEMO PRICE'} · SOL</div>
          <div className="chart-price">{price} SOL</div>
          <div className="chart-change" style={{ color }}>{up ? '▲ ' : '▼ '}{Math.abs(change).toFixed(2)}%{' '}
            {!live && <span style={{ color: 'var(--muted)', fontWeight: 500 }}>illustrative</span>}</div>
        </div>
        <div className="chart-tabs">
          {['1H', '24H', '7D'].map((r) => (
            <button key={r} type="button" className={r === range ? 'active' : ''} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>
      <svg className="chart-svg" viewBox="0 0 600 190">
        <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4f6dff" stopOpacity=".3" /><stop offset="100%" stopColor="#4f6dff" stopOpacity="0" />
        </linearGradient></defs>
        <path className="chart-grid" d="M0 25H600M0 65H600M0 105H600M0 145H600M0 180H600" />
        <path d={d + ' L590 180 L10 180 Z'} fill="url(#chartFill)" />
        <path d={d} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0]} cy={last[1]} r="4" fill={color} stroke="#101318" strokeWidth="2" />
      </svg>
      <div className="swap-meta"><span>{live ? 'From your backend' : 'Select a token to see live data'}</span><span>{live ? 'Live' : 'Demo'}</span></div>
    </div>
  );
}
