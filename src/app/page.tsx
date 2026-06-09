import Link from "next/link";

export default function Home() {
  return (
    <div className="home-page">
      <div className="home-content">
        <div className="home-logo">
          <span>P</span><span>W</span>
        </div>
        <h1 className="home-title">ProcureWise</h1>
        <p className="home-desc">
          An Intelligent Procurement Analytics and Automated Canvassing System<br />
          with Best-Value Recommendation Engine
        </p>
        <p className="home-inst">Batanes State College</p>
        <div className="home-links">
          <Link href="/price-comparison" id="nav-price-comparison" className="home-btn-primary">
            Price Comparison Dashboard →
          </Link>
        </div>
      </div>

      <style>{`
        .home-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(160deg, #030712 0%, #0f172a 60%, #020617 100%);
          padding: 2rem;
        }
        .home-content {
          text-align: center;
          max-width: 520px;
        }
        .home-logo {
          width: 72px;
          height: 72px;
          border-radius: 16px;
          background: linear-gradient(135deg, #6366f1 0%, #38bdf8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.25rem;
          letter-spacing: -1px;
          color: #ffffff;
          box-shadow: 0 4px 24px rgba(99, 102, 241, 0.4);
          margin: 0 auto 1.5rem;
        }
        .home-title {
          font-size: 2.5rem;
          font-weight: 900;
          background: linear-gradient(135deg, #ffffff 30%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -1px;
          margin-bottom: 1rem;
        }
        .home-desc {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.65);
          line-height: 1.7;
          margin-bottom: 0.5rem;
        }
        .home-inst {
          font-size: 0.78rem;
          color: #38bdf8;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
          margin-bottom: 2rem;
        }
        .home-links { display: flex; flex-direction: column; gap: 0.75rem; }
        .home-btn-primary {
          display: inline-block;
          padding: 0.8rem 1.75rem;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.9rem;
          text-decoration: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .home-btn-primary:hover {
          background: linear-gradient(135deg, #4f46e5, #4338ca);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25);
        }
      `}</style>
    </div>
  );
}
