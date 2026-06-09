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
          background: linear-gradient(160deg, #2D0808 0%, #4A0E0E 40%, #1a0505 100%);
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
          background: linear-gradient(135deg, #F5C400 0%, #e6a800 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.25rem;
          letter-spacing: -1px;
          color: #4A0E0E;
          box-shadow: 0 4px 24px rgba(245,196,0,0.4);
          margin: 0 auto 1.5rem;
        }
        .home-title {
          font-size: 2.5rem;
          font-weight: 900;
          color: #F5C400;
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
          color: rgba(245,196,0,0.6);
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
          background: linear-gradient(135deg, #7B1C1C, #a02020);
          border: 1px solid rgba(245,196,0,0.3);
          color: #F5C400;
          font-weight: 700;
          font-size: 0.9rem;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .home-btn-primary:hover {
          background: linear-gradient(135deg, #a02020, #c02525);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
      `}</style>
    </div>
  );
}
