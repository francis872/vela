"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Member={id:string;userId:string;name:string;role:string;responsibility:string|null;position:string|null;headline:string|null;availability:string|null;skills:string[];status:string};
type Intelligence={status:"ATTENTION"|"FOCUS"|"STABLE"|"SETUP";title:string;explanation:string;focus:string;action:{label:string;href:string};confidence:string;health:{members:number;active:number;roles:number;skillCoverage:number;unassignedResponsibilities:number};gaps:string[]};

export default function TeamWorkspace({userName}:{userName:string}) {
  const [members,setMembers]=useState<Member[]>([]);
  const [intel,setIntel]=useState<Intelligence|null>(null);
  const [venture,setVenture]=useState<{id:string;name:string}|null>(null);
  const [capacity,setCapacity]=useState<any>(null);
  async function load(){const [r,c]=await Promise.all([fetch("/api/team",{cache:"no-store"}),fetch("/api/team/capacity",{cache:"no-store"})]);if(r.ok){const p=await r.json();setMembers(p.members??[]);setIntel(p.intelligence??null);setVenture(p.venture??null)}if(c.ok)setCapacity(await c.json())}
  useEffect(()=>{void load()},[]);
  useEffect(()=>{let timer:ReturnType<typeof setTimeout>|null=null;const stream=new EventSource("/api/home/events");const refresh=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>void load(),250)};stream.addEventListener("domain-event",refresh);return()=>{if(timer)clearTimeout(timer);stream.close()}},[]);

  return <div className="team-shell">
    <header className="team-context"><div><span className="home-eyebrow">People system</span><h1>Team</h1><p>Make ownership, responsibilities and capability coverage visible across the venture.</p></div><div className="team-context-meta"><span className="home-eyebrow">Venture</span><strong>{venture?.name??"No venture"}</strong><small>{userName} · operating team</small></div></header>
    <section className={`team-command team-command-${(intel?.status??"SETUP").toLowerCase()}`}><div className="team-command-rail"><span className="home-eyebrow">Team Intelligence</span><span>{intel?.status??"SETUP"}</span></div><div><small>{intel?.focus??"Team setup"}</small><h2>{intel?.title??"Build the operating team."}</h2><p>{intel?.explanation??"VELA is evaluating membership and capability coverage."}</p></div><div className="team-command-action"><Link className="btn-primary" href={intel?.action.href??"/network"}>{intel?.action.label??"Find collaborators"} →</Link><small>{intel?.confidence??"LOW"} confidence</small></div></section>
    <section className="team-strip"><Stat label="Members" value={intel?.health.members??0} note="registered"/><Stat label="Active" value={intel?.health.active??0} note="operating"/><Stat label="Roles" value={intel?.health.roles??0} note="distinct ownership"/><Stat label="Coverage" value={intel?`${intel.health.skillCoverage}%`:"—"} note={intel?.gaps.length?`gaps: ${intel.gaps.join(", ")}`:"declared capabilities"}/></section>
    {capacity?.capacity && <section className="team-capacity">
      <div className="home-section-heading"><div><span className="home-eyebrow">Capacity & ownership</span><h2>{capacity.intelligence.title}</h2><p>{capacity.intelligence.explanation}</p></div></div>
      <div className="team-capacity-strip"><Stat label="Weighted load" value={capacity.capacity.totalLoad} note="active assignments"/><Stat label="Concentration" value={`${capacity.capacity.concentration}%`} note="largest member share"/><Stat label="Overloaded" value={capacity.capacity.overloaded} note="members"/><Stat label="Overdue" value={capacity.capacity.overdue} note="assigned items"/></div>
      <div className="team-capacity-grid">{capacity.capacity.members.map((m:any)=><article key={m.memberId} className="team-capacity-member"><div><strong>{m.name}</strong><span>{m.role}</span></div><b>{m.level}</b><small>{m.items} items · load {m.load} · {m.overdue} overdue</small></article>)}</div>
      <div className="team-ownership-matrix"><span className="home-eyebrow">Unassigned operating work</span>{Object.entries(capacity.unassigned??{}).map(([type,count])=><div key={type}><strong>{String(type).replace("_"," ")}</strong><span>{String(count)}</span></div>)}</div>
    </section>}
    <section className="team-roster"><div className="home-section-heading"><div><span className="home-eyebrow">Operating roster</span><h2>People & ownership</h2></div><Link href="/network">Find people →</Link></div>
      {members.length? <div className="team-grid">{members.map(m=><article key={m.id} className="team-member"><div><span className="home-eyebrow">{m.status}</span><h3>{m.name}</h3><p>{m.position??m.headline??m.role}</p></div><div className="team-member-role"><span>Role</span><strong>{m.role}</strong><small>{m.responsibility??"Responsibility not assigned"}</small></div><div className="team-skills">{m.skills.length?m.skills.slice(0,6).map(s=><span key={s}>{s}</span>):<small>No declared skills</small>}</div></article>)}</div> : <div className="team-empty"><h2>No venture members yet.</h2><p>Use Network to find a relevant collaborator, then register explicit venture ownership here.</p><Link className="btn-primary" href="/network">Open Network →</Link></div>}
    </section>
  </div>
}
function Stat({label,value,note}:{label:string;value:string|number;note:string}){return <div className="team-stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>}
