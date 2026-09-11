import Link from "next/link";
import BrandLogo from "@/components/brand-logo";

const capabilities = [
  ["Command", "Strategic clarity", "Turn ambition into objectives, priorities and decisions.", "/vela"],
  ["Build", "Execution engine", "Move from intent to commitments, dependencies and Sprints.", "/build"],
  ["Validate", "Evidence, not assumptions", "Capture interviews, experiments, metrics and insights.", "/validate"],
  ["Capital", "Readiness", "See what evidence exists and what your venture still needs.", "/capital"],
];
const loop = ["Understand", "Plan", "Execute", "Validate", "Grow"];

export default function LaunchPage() {
  return <main className="public-site">
    <header className="public-header">
      <Link href="/launch" className="public-brand"><BrandLogo variant="wordmark" priority /><span>VENTURE OPERATING SYSTEM</span></Link>
      <nav className="public-nav"><a href="#product">Product</a><a href="#how">How it works</a><a href="#audiences">For whom</a><a href="#mission">Mission</a></nav>
      <div className="public-actions"><Link href="/login" className="public-signin">Sign in</Link><Link href="/signup" className="public-cta">Create account <span>→</span></Link></div>
    </header>
    <section className="public-hero"><div className="public-hero-content"><span className="public-eyebrow">FROM IDEAS TO EXTRAORDINARY COMPANIES</span><h1>A system<br />for builders.</h1><p>VELA is a Venture Operating System that brings strategy, execution, validation and intelligence into one place, turning ambition into measurable progress.</p><div className="public-hero-actions"><Link href="/signup" className="public-cta">Create account <span>→</span></Link><a href="#how" className="public-outline">See how it works <span>↓</span></a></div><span className="public-microcopy">DISCIPLINE TODAY.<br />A BRIGHTER TOMORROW.</span></div><div className="public-orbit" aria-hidden="true"><span className="public-marker">YOU ARE HERE<br /><b>YOUR NEXT STEP<br />STARTS HERE</b></span></div></section>
    <div className="public-audience-strip">{["BUILDERS", "UNIVERSITIES", "ACCELERATORS", "INVESTORS", "GOVERNMENTS", "COMMUNITIES"].map((item) => <span key={item}>{item}</span>)}</div>
    <section id="product" className="public-section public-why"><div><span className="public-eyebrow">WHY VELA</span><h2>More than tools.<br />A way to build.</h2></div><p>Entrepreneurship is complex. VELA gives you structure, clarity and intelligence to move forward with confidence, backed by real data and an intelligent companion that understands your journey.</p><Link href="/signup" className="public-outline">Explore VELA <span>→</span></Link></section>
    <section className="public-capabilities">{capabilities.map(([title, sub, body, href]) => <article key={title}><div className="public-icon">◇</div><h3>{sub}</h3><p>{body}</p><Link href={href}>{title} <span>→</span></Link></article>)}</section>
    <section id="how" className="public-section public-loop"><div><span className="public-eyebrow">HOW IT WORKS</span><h2>From idea<br />to impact.</h2></div><div className="public-loop-track">{loop.map((item, index) => <div key={item} className="public-loop-node"><span>0{index + 1}</span><i>◦</i><h3>{item}</h3><p>{["Diagnose your venture with real data and AI.", "Set objectives and create Sprints.", "Build, test and iterate with your team.", "Use real evidence to learn and adapt.", "Get investment-ready and scale with confidence."][index]}</p></div>)}</div></section>
    <section id="audiences" className="public-section public-audiences"><div><span className="public-eyebrow">FOR WHOM</span><h2>Different roles.<br />A shared future.</h2></div><div className="public-audience-grid">{[["Founders", "Turn your idea into a real business."], ["Teams", "Align, execute and grow together."], ["Universities", "Support the next generation of builders."], ["Accelerators & Investors", "Identify and support high-potential ventures."]].map(([title, body]) => <article key={title}><div className="public-icon">◇</div><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section id="mission" className="public-mission"><span className="public-eyebrow">MISSION</span><h2>Give builders the structure, intelligence and connections needed to turn ideas into real progress.</h2><p>IDEA → DIRECTION → EXECUTION → EVIDENCE → LEARNING → READINESS → CONNECTION → GROWTH</p></section>
    <section className="public-final"><div><span className="public-eyebrow">JOIN VELA</span><h2>The next generation<br />of builders starts here.</h2></div><div><p>Turn your idea into a system you can understand, execute, validate and improve.</p><div className="public-hero-actions"><Link href="/signup" className="public-cta">Create account <span>→</span></Link><Link href="/login" className="public-outline">Sign in</Link></div></div></section>
    <footer className="public-footer"><div className="public-brand"><BrandLogo variant="wordmark" /><span>VENTURE OPERATING SYSTEM</span></div><div><a href="#product">Product</a><a href="#how">How it works</a><a href="#audiences">For whom</a><a href="#mission">Mission</a><Link href="/login">Sign in</Link></div><em>BUILD THE NEXT POSSIBLE.</em></footer>
  </main>;
}
