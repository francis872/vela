"use client";
import {FormEvent,useEffect,useState} from "react";

type Snapshot={id:string;period:string;currency:string;revenue:number;cogs:number|null;operatingCosts:number;cash:number|null;customers:number|null};
type ValuationResult={status:string;metrics:any;methods:{method:string;value:number;basis:string}[];range:{low:number|null;midpoint:number|null;high:number|null};deal:{capitalRequested:number;equityOffered:number;postMoney:number;preMoney:number}|null;missing:string[];disclaimer:string};
const empty={period:new Date().toISOString().slice(0,7),currency:"COP",revenue:"",cogs:"",operatingCosts:"",cash:"",debt:"",customers:"",newCustomers:"",marketingSpend:"",churnRate:""};
const valuationEmpty={name:"Base case",capitalRequested:"",equityOffered:"",revenueMultiple:"",ebitdaMultiple:"",discountRate:"",terminalGrowth:"",projectedGrowth:""};

export default function ValuationLab(){
 const [data,setData]=useState<any>(null),[snapshot,setSnapshot]=useState<any>(empty),[valuation,setValuation]=useState<any>(valuationEmpty),[result,setResult]=useState<ValuationResult|null>(null),[saving,setSaving]=useState(false);
 const load=async()=>{const r=await fetch("/api/capital/valuation",{cache:"no-store"});if(r.ok)setData(await r.json());};
 useEffect(()=>{void load();},[]);
 const submit=async(e:FormEvent,kind:"snapshot"|"valuation")=>{e.preventDefault();setSaving(true);const body=kind==="snapshot"?{kind,...snapshot}:{kind,...valuation};const r=await fetch("/api/capital/valuation",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const p=await r.json();if(r.ok&&kind==="valuation")setResult(p.result);if(r.ok)await load();setSaving(false);};
 const latest:Snapshot|null=data?.latest??null;
 const fmt=(n:number|null|undefined,c=latest?.currency??"COP")=>n==null?"—":new Intl.NumberFormat("es-CO",{style:"currency",currency:c,maximumFractionDigits:0}).format(n);
 return <section className="valuation-lab">
  <div className="valuation-head"><div><span className="home-eyebrow">Financial OS</span><h2>Valuation Lab</h2><p>Build an investor-defensible valuation from operating evidence and explicit assumptions.</p></div><span className="badge badge-accent">VALUATION_V1</span></div>
  <div className="valuation-grid">
   <form className="valuation-panel" onSubmit={e=>submit(e,"snapshot")}><span className="home-eyebrow">Financial evidence</span><h3>Monthly snapshot</h3>
    <div className="valuation-fields">{Object.keys(empty).map(k=><label key={k}>{k}<input className="os-input" type={k==="period"?"month":k==="currency"?"text":"number"} step="any" value={snapshot[k]} onChange={e=>setSnapshot({...snapshot,[k]:e.target.value})}/></label>)}</div>
    <button className="btn-primary" disabled={saving}>Save financial snapshot</button>
   </form>
   <div className="valuation-panel"><span className="home-eyebrow">Unit economics</span><h3>{latest?latest.period:"No financial evidence yet"}</h3>
    {latest?<div className="valuation-metrics"><Metric label="Revenue" value={fmt(latest.revenue)}/><Metric label="Operating costs" value={fmt(latest.operatingCosts)}/><Metric label="Cash" value={fmt(latest.cash)}/><Metric label="Customers" value={latest.customers??"—"}/></div>:<p className="valuation-muted">Record the first snapshot. VELA will not fabricate missing financials.</p>}
   </div>
  </div>
  <form className="valuation-panel" onSubmit={e=>submit(e,"valuation")}><div className="valuation-head"><div><span className="home-eyebrow">Deal Simulator</span><h3>Valuation assumptions</h3></div><small>All multiples and rates are supplied assumptions, not VELA-generated market claims.</small></div>
   <div className="valuation-fields">{Object.keys(valuationEmpty).map(k=><label key={k}>{k}<input className="os-input" type={k==="name"?"text":"number"} step="any" value={valuation[k]} onChange={e=>setValuation({...valuation,[k]:e.target.value})}/></label>)}</div>
   <button className="btn-primary" disabled={saving||!latest}>Calculate valuation</button>
  </form>
  {result&&<div className="valuation-result"><div><span className="home-eyebrow">Defensible range</span><strong>{fmt(result.range.low)} — {fmt(result.range.high)}</strong><small>Midpoint {fmt(result.range.midpoint)} · {result.methods.length} supported method(s)</small></div>{result.deal&&<div><span className="home-eyebrow">Deal</span><strong>{fmt(result.deal.capitalRequested)} for {result.deal.equityOffered}%</strong><small>Pre-money {fmt(result.deal.preMoney)} · Post-money {fmt(result.deal.postMoney)}</small></div>}<div className="valuation-methods">{result.methods.map(m=><article key={m.method}><b>{m.method}</b><strong>{fmt(m.value)}</strong><small>{m.basis}</small></article>)}</div><p>{result.disclaimer}</p>{result.missing.length>0&&<p>Missing evidence: {result.missing.join(" ")}</p>}</div>}
 </section>;
}
function Metric({label,value}:{label:string;value:string|number}){return <div><span>{label}</span><strong>{value}</strong></div>}
