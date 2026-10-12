import { useEffect, useMemo, useRef, useState } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getProgram, readOnlyWallet, createLaunch, trade, getQuote, getBondSol } from './chain';
import { getLeaderboard, getLaunches, getCandles } from './api';
import Chart from './Chart';
import { uploadMetadata } from './upload';
const short = (s) => (s && s.length > 10 ? s.slice(0, 4) + '…' + s.slice(-4) : s);
const errMsg = (e) => e?.error?.errorMessage || e?.message || 'Something went wrong';

export default function App() {
  const wallet = useAnchorWallet();
  const program = useMemo(() => { try { return getProgram(wallet || readOnlyWallet); } catch { return null; } }, [wallet]);

  const [toast, setToast] = useState('');
  const timer = useRef();
  const notify = (m) => { setToast(m); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 4000); };

  const [form, setForm] = useState({ name: '', symbol: '', uri: '' }); const [file, setFile] = useState(null);
  const [bond, setBond] = useState(null);
  const [mint, setMint] = useState('');
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('0.1');
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState('1H');
  const [candles, setCandles] = useState(null);
  const [launches, setLaunches] = useState([]);
  const [boardType, setBoardType] = useState('traders');
  const [board, setBoard] = useState([]);

  const loadLaunches = () => getLaunches().then(setLaunches).catch(() => setLaunches([]));
  useEffect(() => { loadLaunches(); }, []);
  useEffect(() => { getLeaderboard(boardType).then(setBoard).catch(() => setBoard([])); }, [boardType]);
  useEffect(() => { if (program) getBondSol(program).then(setBond).catch(() => setBond(null)); }, [program]);
  useEffect(() => {
    if (!mint) return setCandles(null);
    getCandles(mint, range).then(setCandles).catch(() => setCandles(null));
  }, [mint, range]);
  useEffect(() => {
    setQuote(null);
    const n = Number(amount);
    if (!program || !mint || !n || n <= 0) return;
    const t = setTimeout(() => getQuote(program, mint, side, n).then(setQuote).catch(() => setQuote(null)), 300);
    return () => clearTimeout(t);
  }, [program, mint, side, amount]);

  async function onLaunch() {
    if (!wallet) return notify('Connect your wallet first.');
    if (!program) return notify('Paste your program IDL into src/idl.json.');
    if (!form.name.trim() || !form.symbol.trim()) return notify('Add a token name and ticker first.');
    if (!file && !form.uri) return notify('Choose an image first.');
    setBusy(true);
    try { const uri = file ? await uploadMetadata({ name: form.name.trim(), symbol: form.symbol.trim(), description: '', file }) : form.uri;
      const r = await createLaunch(program, wallet, { name: form.name.trim(), symbol: form.symbol.trim().toUpperCase(), uri});
      setMint(r.mint); notify('Launched! Mint: ' + short(r.mint)); setTimeout(loadLaunches, 4000);
    } catch (e) { notify(errMsg(e)); }
    setBusy(false);
  }

  async function onTrade() {
    const n = Number(amount);
    if (!wallet) return notify('Connect your wallet first.');
    if (!program) return notify('Paste your program IDL into src/idl.json.');
    if (!mint) return notify('Enter the token mint address.');
    if (!n || n <= 0) return notify('Enter an amount greater than zero.');
    if (quote == null) return notify('No quote yet. Check the mint address.');
    setBusy(true);
    try {
      await trade(program, wallet, mint, side, n, quote);
      notify(side === 'buy' ? 'Bought!' : 'Sold!');
    } catch (e) { notify(errMsg(e)); }
    setBusy(false);
  }

  const inTok = side === 'buy' ? 'SOL' : 'TOKEN';
  const outTok = side === 'buy' ? 'TOKEN' : 'SOL';

  return (
    <>
      <div className="intro"><img className="intro-art" src="/art.jpg" alt="A Spartan warrior looking down" /><div className="intro-glow" />
        <div className="intro-title"><small>THE NEW AGE OF FAIR LAUNCHES</small><h1>SPARTA</h1><p>NO RUGS. NO SNIPERS. NO BUNDLERS.</p><div className="intro-line" /></div></div>

      <header className="wrap nav">
        <a className="brand" href="#home">SPARTA<span style={{ color: '#c084fc' }}>.</span></a>
        <nav className="navlinks"><a href="#home">Home</a><a href="#launch">Launch</a><a href="#tokens">Tokens</a><a href="#leaderboard">Leaderboard</a><a href="#how">How it works</a></nav>
        <WalletMultiButton />
      </header>

      <main className="wrap" id="home">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">A fair fight starts here</div>
            <h2>THE ARENA<br />IS <span>CHANGING.</span></h2>
            <p>Sparta is a Solana meme launchpad designed to make launches fairer. Built around transparent rules, controlled early access, and stronger defenses against rugs, snipers, and bundled buys.</p>
            <div className="actions"><a className="btn primary" href="#launch">⚔ Launch a token</a><a className="btn secondary" href="#how">Explore Sparta ↗</a></div>
          </div>
          <div className="hero-art"><img src="/art.jpg" alt="Spartan warrior in engraved armor" /></div>
        </section>

        <section id="launch">
          <div className="section-head"><div><div className="eyebrow">Enter the arena</div><h2>MAKE YOUR MOVE.</h2></div><p>Connect your wallet, then launch or trade on devnet.</p></div>
          <div className="launch-grid">
            <div className="panel">
              <h3>Create a token</h3>
              <label className="field">Token name</label>
              <input className="input" maxLength={32} placeholder="e.g. SPARTADOG" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="row">
                <div><label className="field">Ticker symbol</label><input className="input" maxLength={10} placeholder="e.g. SPDOG" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} /></div>
                <div><label className="field">Creator bond (SOL)</label><input className="input" readOnly value={bond ?? '—'} /></div>
              </div>
              <label className="field">Token image</label>
          <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
              <button className="btn primary" style={{ width: '100%', marginTop: 20 }} disabled={busy} onClick={onLaunch}>⚔ Launch token</button>
              <p className="note">The bond is set by the platform and returned after the release period.</p>
            </div>

            <div className="panel">
              <Chart candles={candles} range={range} setRange={setRange} />
              <div className="swap-box">
                <div className="swap-top">
                  <div><strong style={{ fontSize: 16 }}>Trade</strong></div>
                  <div className="swap-toggle">
                    <button type="button" className={side === 'buy' ? 'active' : ''} onClick={() => setSide('buy')}>Buy</button>
                    <button type="button" className={side === 'sell' ? 'active' : ''} onClick={() => setSide('sell')}>Sell</button>
                  </div>
                </div>
                <label className="field" style={{ marginTop: 14 }}>Token mint address</label>
                <input className="input" placeholder="Paste a mint address" value={mint} onChange={(e) => setMint(e.target.value.trim())} />
                <label className="field">{side === 'buy' ? 'You pay' : 'You sell'}</label>
                <div className="swap-input"><input type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /><span className="swap-token">{inTok}</span></div>
                <div className="swap-arrow"><span>↓</span></div>
                <div className="swap-input"><input readOnly value={quote == null ? '—' : quote.toLocaleString('en-US', { maximumFractionDigits: 6 })} /><span className="swap-token">{outTok}</span></div>
                <div className="swap-quote">Estimate. Fees and the early-window fee are included. 5% slippage allowed.</div>
                <button className="btn primary swap-submit" disabled={busy} onClick={onTrade}>{side === 'buy' ? 'Buy' : 'Sell'}</button>
              </div>
            </div>
          </div>
        </section>

        <section id="tokens">
          <div className="section-head"><div><div className="eyebrow">The latest contenders</div><h2>IN THE ARENA.</h2></div></div>
          <div className="token-list">
            {launches.length === 0 && <p className="muted">No launches yet.</p>}
            {launches.map((l) => (
              <article className="token" key={l.mint} style={{ cursor: 'pointer' }} onClick={() => { setMint(l.mint); location.hash = 'launch'; }}>
                <div className="token-top"><div className="coin">{(l.symbol || '?').slice(0, 2)}</div><div><h3>{l.name}</h3><small>${l.symbol}</small></div></div>
                <div className="token-bottom"><span className="muted">Curve progress</span><strong>{Number(l.progress ?? 0).toFixed(0)}%</strong></div>
              </article>
            ))}
          </div>
        </section>

        <section id="leaderboard">
          <div className="section-head"><div><div className="eyebrow">Hall of warriors</div><h2>LEADERBOARD.</h2></div>
            <div className="swap-toggle">
              {['traders', 'launches', 'creators'].map((t) => (
                <button key={t} type="button" className={t === boardType ? 'active' : ''} onClick={() => setBoardType(t)}>{t}</button>
              ))}
            </div></div>
          <div className="panel board">
            {board.length === 0 && <p className="muted">No data yet.</p>}
            {board.map((r, i) => (
              <div className="board-row" key={r.id}><b>{i + 1}</b><span>{r.label || short(r.id)}</span><span>{r.trades ?? 0} trades</span><strong>{Number(r.volumeSol ?? 0).toFixed(2)} SOL</strong></div>
            ))}
          </div>
        </section>

        <section id="how">
          <div className="section-head"><div><div className="eyebrow">Discipline. Transparency. Fairness.</div><h2>HOW SPARTA WORKS.</h2></div></div>
          <div className="steps">
            <article className="step"><b>01 / CONNECT</b><h3>Connect wallet</h3><p>Connect a supported Solana wallet and review the launch rules.</p></article>
            <article className="step"><b>02 / CREATE</b><h3>Set your launch</h3><p>Add token metadata and meet the creator-bond requirement.</p></article>
            <article className="step"><b>03 / TRADE</b><h3>Enter fairly</h3><p>Early-window limits and slot delays reduce first-block advantages.</p></article>
            <article className="step"><b>04 / BUILD</b><h3>Grow together</h3><p>Share transparent information and build a community around your token.</p></article>
          </div>
        </section>
      </main>

      <footer className="footer"><div className="wrap footer-inner"><span className="brand">SPARTA.</span><span>THE FUTURE OF FAIR MEME LAUNCHES</span><span>Built for Solana</span></div></footer>
      <div className={'toast' + (toast ? ' show' : '')} role="status">{toast}</div>
    </>
  );
}
