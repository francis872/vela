export type TeamWork = { id:string; memberId:string; workType:string; workId:string; title:string; status:string; weight:number; dueAt:Date|null };
export type CapacityMember = { id:string; name:string; role:string; status:string };

export function analyzeTeamCapacity(members: CapacityMember[], assignments: TeamWork[], now=new Date()) {
  const active=members.filter(m=>m.status==="active");
  const open=assignments.filter(a=>!["completed","closed","done"].includes(a.status));
  const byMember=active.map(member=>{
    const work=open.filter(a=>a.memberId===member.id);
    const load=work.reduce((sum,a)=>sum+Math.max(1,a.weight),0);
    const overdue=work.filter(a=>a.dueAt&&a.dueAt<now).length;
    const blockers=work.filter(a=>a.workType==="blocker").length;
    return {memberId:member.id,name:member.name,role:member.role,items:work.length,load,overdue,blockers,level:load>=8?"OVERLOADED":load>=5?"HIGH":load>=2?"BALANCED":"AVAILABLE"};
  });
  const totalLoad=byMember.reduce((s,m)=>s+m.load,0);
  const maxLoad=Math.max(0,...byMember.map(m=>m.load));
  const concentration=totalLoad?Math.round(maxLoad/totalLoad*100):0;
  const unassignedByType=["objective","sprint_item","decision","blocker"].reduce<Record<string,number>>((acc,type)=>{acc[type]=0;return acc},{});
  const overloaded=byMember.filter(m=>m.level==="OVERLOADED");
  const overdue=byMember.reduce((s,m)=>s+m.overdue,0);
  return {members:byMember,totalLoad,concentration,overloaded:overloaded.length,overdue,unassignedByType};
}

export function teamCapacityIntelligence(capacity:ReturnType<typeof analyzeTeamCapacity>, unassigned:{objective:number;sprint_item:number;decision:number;blocker:number}) {
  capacity.unassignedByType=unassigned;
  const totalUnassigned=Object.values(unassigned).reduce((a,b)=>a+b,0);
  const evidence=[`load:${capacity.totalLoad}`,`concentration:${capacity.concentration}`,`overloaded:${capacity.overloaded}`,`overdue:${capacity.overdue}`,`unassigned:${totalUnassigned}`];
  if(capacity.overloaded>0)return{status:"ATTENTION" as const,title:"Team capacity is overloaded.",explanation:`${capacity.overloaded} member(s) carry an overloaded assignment score. Rebalance ownership before adding new work.`,focus:"Capacity",evidence};
  if(capacity.overdue>0)return{status:"ATTENTION" as const,title:"Assigned work is overdue.",explanation:`${capacity.overdue} assigned item(s) are past due. Review ownership and delivery constraints.`,focus:"Delivery",evidence};
  if(totalUnassigned>0)return{status:"FOCUS" as const,title:"Operating work has no explicit owner.",explanation:`${totalUnassigned} active item(s) across objectives, sprint work, decisions or blockers have no team assignment.`,focus:"Ownership Matrix",evidence};
  if(capacity.concentration>=70&&capacity.totalLoad>=3)return{status:"FOCUS" as const,title:"Workload is concentrated in one person.",explanation:`${capacity.concentration}% of weighted assigned work sits with one team member.`,focus:"Concentration",evidence};
  return{status:"STABLE" as const,title:"Ownership and workload are structurally balanced.",explanation:"No overloaded member, overdue assignment or unowned active work is visible.",focus:"Team Capacity",evidence};
}
