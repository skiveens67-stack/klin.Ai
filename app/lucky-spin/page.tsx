"use client";

import { useState } from "react";

const prizes = [
  { gems: 1000, label: "1,000 Gems", color: "#2563eb" },
  { gems: 1500, label: "1,500 Gems", color: "#7c3aed" },
  { gems: 1800, label: "1,800 Gems", color: "#0e7490" },
  { gems: 2500, label: "2,500 Gems", color: "#9333ea" },
  { gems: 4000, label: "4,000 Gems", color: "#1d4ed8" },
  { gems: 1500, label: "1,500 Gems", color: "#6d28d9" },
  { gems: 1000, label: "1,000 Gems", color: "#0369a1" },
  { gems: 1800, label: "1,800 Gems", color: "#7e22ce" },
];

const segment = 360 / prizes.length;

export default function LuckyGemSpinPage() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const winningIndex = Math.floor(Math.random() * prizes.length);
    const targetAngle = 360 * 6 + (360 - winningIndex * segment - segment / 2);
    setRotation(current => current + targetAngle);
    window.setTimeout(() => {
      setResult(prizes[winningIndex].gems);
      setSpinning(false);
    }, 5200);
  }

  return (
    <main className="lucky-page">
      <style jsx>{`
        .lucky-page{min-height:100vh;background:radial-gradient(ellipse at 50% 0%,#172554 0%,#090b18 48%,#05060b 100%);color:#f8fafc;padding:48px 20px 64px;display:flex;justify-content:center;font-family:inherit}
        .shell{width:min(100%,760px);text-align:center}
        .eyebrow{color:#a5b4fc;font-size:12px;font-weight:800;letter-spacing:.22em}
        h1{font-size:clamp(32px,6vw,54px);margin:12px 0 8px;font-weight:850;letter-spacing:-.04em}
        .sub{color:#aab5d0;margin:0 auto 28px;max-width:520px;line-height:1.6}
        .price{font-size:20px;font-weight:800;color:#c4b5fd;margin-bottom:22px}
        .wheel-wrap{position:relative;width:min(78vw,420px);aspect-ratio:1;margin:0 auto 24px;filter:drop-shadow(0 20px 35px #0009)}
        .pointer{position:absolute;z-index:3;left:50%;top:-10px;transform:translateX(-50%);width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-top:0;border-bottom:34px solid #f8fafc;filter:drop-shadow(0 3px 5px #000)}
        .wheel{position:absolute;inset:0;border-radius:50%;border:9px solid #c4b5fd;background:conic-gradient(#2563eb 0deg 45deg,#7c3aed 45deg 90deg,#0e7490 90deg 135deg,#9333ea 135deg 180deg,#1d4ed8 180deg 225deg,#6d28d9 225deg 270deg,#0369a1 270deg 315deg,#7e22ce 315deg 360deg);transition:transform 5.2s cubic-bezier(.12,.78,.12,1);overflow:hidden}
        .wheel:after{content:"";position:absolute;inset:14px;border:2px solid #ffffff65;border-radius:50%}
        .slice-label{position:absolute;left:50%;top:50%;width:50%;height:34px;transform-origin:0 50%;display:flex;align-items:center;padding-left:24px;font-weight:900;font-size:clamp(11px,2.3vw,15px);text-shadow:0 2px 5px #0009;white-space:nowrap}
        .hub{position:absolute;z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);width:82px;height:82px;border-radius:50%;background:linear-gradient(145deg,#f5d0fe,#818cf8 55%,#312e81);border:6px solid #f8fafc;box-shadow:0 0 28px #818cf8aa;display:grid;place-items:center;color:#111827;font-size:26px;font-weight:900}
        .spin-button{border:1px solid #a78bfa;background:linear-gradient(100deg,#6d28d9,#2563eb);color:white;border-radius:999px;padding:14px 34px;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 8px 28px #4f46e566}
        .spin-button:disabled{opacity:.55;cursor:not-allowed}
        .result{margin:22px auto 0;padding:18px;border:1px solid #8b5cf6aa;border-radius:18px;background:#312e8144;max-width:360px}
        .result strong{display:block;font-size:30px;color:#ddd6fe;margin-top:4px}
        .notice{margin:24px auto 0;color:#94a3b8;font-size:12px;line-height:1.6;max-width:560px}
        .odds{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:24px auto 0;max-width:460px;text-align:left}
        .odds div{border:1px solid #334155;border-radius:10px;padding:10px 12px;background:#0f172a99;color:#cbd5e1;font-size:13px;display:flex;justify-content:space-between}
        @media(prefers-reduced-motion:reduce){.wheel{transition:none}}
      `}</style>
      <section className="shell">
        <div className="eyebrow">KLIN • LUCKY GEM SPIN</div>
        <h1>Try your luck</h1>
        <p className="sub">A preview of the animated Gem wheel. The wheel slows down and lands on a prize.</p>
        <div className="price">$15.00 • proposed pack price</div>
        <div className="wheel-wrap" aria-label="Animated prize wheel">
          <div className="pointer" />
          <div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>
            {prizes.map((prize, index) => <div className="slice-label" key={index} style={{ transform: `rotate(${index * segment + segment / 2}deg)` }}>{prize.label}</div>)}
          </div>
          <div className="hub">K</div>
        </div>
        <button className="spin-button" type="button" onClick={spin} disabled={spinning}>{spinning ? "Spinning…" : "Spin preview"}</button>
        {result !== null && <div className="result" role="status">Preview result<strong>{result.toLocaleString()} Gems</strong></div>}
        <div className="odds">
          <div><span>1,000 Gems</span><b>25%</b></div>
          <div><span>1,500 Gems</span><b>30%</b></div>
          <div><span>1,800 Gems</span><b>25%</b></div>
          <div><span>2,500 Gems</span><b>15%</b></div>
          <div><span>4,000 Gems</span><b>5%</b></div>
        </div>
        <p className="notice">Preview only: this button does not charge money or credit a Gem balance. Paid random rewards remain disabled until Klin has an approved payment and compliance arrangement.</p>
      </section>
    </main>
  );
}
