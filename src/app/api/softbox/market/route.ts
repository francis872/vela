import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const startups = [
    {
      id: "arclight-ai",
      name: "ArcLight AI",
      sector: "Artificial Intelligence",
      stage: "SCALING",
      shi: 87, pmf: 82, velocity: 91, momentum: 88, risk: 22, investmentReadiness: 85,
      revenue: "$2.4M ARR", runway: "24mo", raise: "$12M Series A",
      description: "Enterprise AI inference platform with proprietary compression stack. Serving 40+ enterprise clients across 12 sectors. Consistent 18% MoM growth for 6 consecutive quarters.",
      signals: 34, trend: "up" as const, change: 4.2,
    },
    {
      id: "novabio-labs",
      name: "NovaBio Labs",
      sector: "Biotech",
      stage: "BUILDING",
      shi: 72, pmf: 68, velocity: 74, momentum: 70, risk: 31, investmentReadiness: 66,
      revenue: "$480K ARR", runway: "18mo", raise: "$8M Series A",
      description: "CRISPR-based diagnostic platform enabling 4-hour disease detection. Patent-pending assay for 7 infectious diseases. FDA breakthrough designation in progress.",
      signals: 21, trend: "up" as const, change: 2.8,
    },
    {
      id: "climategrid",
      name: "ClimateGrid",
      sector: "Climate Tech",
      stage: "SCALING",
      shi: 83, pmf: 79, velocity: 85, momentum: 82, risk: 25, investmentReadiness: 80,
      revenue: "$1.8M ARR", runway: "30mo", raise: "$20M Series B",
      description: "Real-time carbon accounting infrastructure for enterprise supply chains. ISO 14064-3 compliant. Contracted with 6 Fortune 500 companies for 2025 deployment.",
      signals: 29, trend: "up" as const, change: 7.3,
    },
    {
      id: "flint-financial",
      name: "Flint Financial",
      sector: "Fintech",
      stage: "VALIDATING",
      shi: 54, pmf: 48, velocity: 52, momentum: 49, risk: 48, investmentReadiness: 42,
      revenue: "$120K MRR", runway: "12mo",
      description: "Embedded banking infrastructure for freelancer platforms. Processing $4M monthly transaction volume. Active pilots with 3 major gig economy marketplaces.",
      signals: 14, trend: "flat" as const, change: 0.3,
    },
    {
      id: "meridian-space",
      name: "Meridian Space",
      sector: "Deep Tech",
      stage: "BUILDING",
      shi: 68, pmf: 62, velocity: 71, momentum: 65, risk: 35, investmentReadiness: 61,
      revenue: "$340K ARR", runway: "20mo", raise: "$15M Series A",
      description: "Low-orbit satellite telemetry for precision agriculture. 3 operational satellites, 12 contracted customers. Ground station partnerships across 8 countries.",
      signals: 18, trend: "up" as const, change: 2.1,
    },
    {
      id: "voxa-health",
      name: "Voxa Health",
      sector: "Health Tech",
      stage: "VALIDATING",
      shi: 58, pmf: 54, velocity: 60, momentum: 55, risk: 42, investmentReadiness: 50,
      revenue: "$85K MRR", runway: "14mo", raise: "$5M Seed+",
      description: "Voice-based chronic disease monitoring for elderly populations. 98.2% medication adherence improvement in 60-day clinical trial. Pursuing CMS reimbursement pathway.",
      signals: 16, trend: "up" as const, change: 1.4,
    },
    {
      id: "ironfleet-logistics",
      name: "IronFleet Logistics",
      sector: "Logistics",
      stage: "BUILDING",
      shi: 65, pmf: 60, velocity: 68, momentum: 63, risk: 38, investmentReadiness: 57,
      revenue: "$620K ARR", runway: "16mo",
      description: "Autonomous last-mile routing network for cold chain distribution. Regulatory approval in 3 US states. Reducing delivery cost per unit by 31% vs traditional carriers.",
      signals: 22, trend: "flat" as const, change: 0.8,
    },
    {
      id: "quanta-edtech",
      name: "Quanta EdTech",
      sector: "Education",
      stage: "SEARCHING",
      shi: 38, pmf: 28, velocity: 35, momentum: 32, risk: 64, investmentReadiness: 24,
      runway: "8mo",
      description: "Adaptive learning engine for STEM subjects targeting K-12 institutions. Completed 2 school district pilots. Awaiting evidence of strong educator NPS before scaling.",
      signals: 7, trend: "down" as const, change: 1.8,
    },
    {
      id: "nexus-security",
      name: "Nexus Security",
      sector: "Cybersecurity",
      stage: "BUILDING",
      shi: 74, pmf: 70, velocity: 77, momentum: 73, risk: 29, investmentReadiness: 69,
      revenue: "$1.1M ARR", runway: "22mo", raise: "$9M Series A",
      description: "Zero-trust network access platform purpose-built for hybrid infrastructure. SOC 2 Type II certified. 89% renewal rate across 28 enterprise clients.",
      signals: 25, trend: "up" as const, change: 3.2,
    },
    {
      id: "terrain-analytics",
      name: "Terrain Analytics",
      sector: "Data Intelligence",
      stage: "VALIDATING",
      shi: 49, pmf: 42, velocity: 50, momentum: 46, risk: 52, investmentReadiness: 38,
      revenue: "$60K MRR", runway: "11mo",
      description: "Geospatial intelligence platform for commercial real estate underwriting. Integrating 47 data sources. 3 pilot contracts with Tier 1 real estate investment firms.",
      signals: 11, trend: "down" as const, change: 1.1,
    },
    {
      id: "cirque-robotics",
      name: "Cirque Robotics",
      sector: "Deep Tech",
      stage: "BUILDING",
      shi: 70, pmf: 64, velocity: 72, momentum: 67, risk: 33, investmentReadiness: 63,
      revenue: "$290K ARR", runway: "18mo", raise: "$11M Series A",
      description: "Soft robotics assembly systems for electronics manufacturing. 94% defect reduction vs manual assembly. Deployed in 2 Tier 1 contract manufacturing facilities.",
      signals: 19, trend: "up" as const, change: 2.5,
    },
    {
      id: "solsource-energy",
      name: "SolSource Energy",
      sector: "Climate Tech",
      stage: "SCALING",
      shi: 81, pmf: 77, velocity: 83, momentum: 79, risk: 26, investmentReadiness: 77,
      revenue: "$3.1M ARR", runway: "36mo", raise: "$25M Series B",
      description: "Virtual power plant aggregation platform connecting distributed solar + storage assets. 420MW under management. Grid-balancing contracts with 4 state utilities.",
      signals: 31, trend: "up" as const, change: 6.1,
    },
  ];

  const indexes = [
    {
      id: "ai-index",
      name: "AI Index",
      count: startups.filter(s => s.sector === "Artificial Intelligence").length,
      avgSHI: Math.round(startups.filter(s => s.sector === "Artificial Intelligence").reduce((a, s) => a + s.shi, 0) / Math.max(startups.filter(s => s.sector === "Artificial Intelligence").length, 1)),
      change: 4.2,
      trend: "up" as const,
    },
    {
      id: "fintech-index",
      name: "Fintech Index",
      count: startups.filter(s => s.sector === "Fintech").length,
      avgSHI: Math.round(startups.filter(s => s.sector === "Fintech").reduce((a, s) => a + s.shi, 0) / Math.max(startups.filter(s => s.sector === "Fintech").length, 1)),
      change: 1.1,
      trend: "down" as const,
    },
    {
      id: "climate-index",
      name: "Climate Index",
      count: startups.filter(s => s.sector === "Climate Tech").length,
      avgSHI: Math.round(startups.filter(s => s.sector === "Climate Tech").reduce((a, s) => a + s.shi, 0) / Math.max(startups.filter(s => s.sector === "Climate Tech").length, 1)),
      change: 7.3,
      trend: "up" as const,
    },
    {
      id: "deeptech-index",
      name: "DeepTech Index",
      count: startups.filter(s => s.sector === "Deep Tech").length,
      avgSHI: Math.round(startups.filter(s => s.sector === "Deep Tech").reduce((a, s) => a + s.shi, 0) / Math.max(startups.filter(s => s.sector === "Deep Tech").length, 1)),
      change: 2.8,
      trend: "up" as const,
    },
  ];

  return NextResponse.json({
    startups,
    indexes,
    lastUpdated: new Date().toISOString(),
  });
}
