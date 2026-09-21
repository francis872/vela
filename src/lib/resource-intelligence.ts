export type ResourceInput={id:string;title:string;resourceType:string;status:string;criticality:string;monthlyCost:number|null;ownerMemberId:string|null;usageStatus:string;allocations:number};

export function synthesizeResourceIntelligence(resources:ResourceInput[]){
 const active=resources.filter(r=>r.status!=="retired");
 const unavailable=active.filter(r=>r.status==="unavailable");
 const criticalUnavailable=unavailable.filter(r=>r.criticality==="critical");
 const unowned=active.filter(r=>!r.ownerMemberId);
 const unusedPaid=active.filter(r=>(r.monthlyCost??0)>0&&r.usageStatus==="unused");
 const unallocatedCritical=active.filter(r=>r.criticality==="critical"&&r.allocations===0);
 const monthlyCost=active.reduce((s,r)=>s+(r.monthlyCost??0),0);
 const allocated=active.filter(r=>r.allocations>0).length;
 const evidence=[`resources:${active.length}`,`critical_unavailable:${criticalUnavailable.length}`,`unowned:${unowned.length}`,`unused_paid:${unusedPaid.length}`,`critical_unallocated:${unallocatedCritical.length}`,`monthly_cost:${monthlyCost}`];
 const health={total:active.length,available:active.filter(r=>r.status==="available").length,allocated,unowned:unowned.length,monthlyCost,unusedPaid:unusedPaid.length,criticalUnavailable:criticalUnavailable.length};
 const confidence=active.length>=8?"HIGH":active.length>=3?"MEDIUM":"LOW";
 if(!active.length)return{status:"SETUP" as const,title:"Build the venture resource inventory.",explanation:"No operating resources are registered for this venture. Add the tools, infrastructure, datasets, services or budget that execution actually depends on.",focus:"Resource Setup",action:"ADD",confidence,evidence,health};
 if(criticalUnavailable.length)return{status:"ATTENTION" as const,title:"A critical resource is unavailable.",explanation:`${criticalUnavailable.length} critical resource(s) are marked unavailable. Resolve the constraint before treating dependent work as executable.`,focus:"Critical Availability",action:"RESOLVE",confidence,evidence,health};
 if(unallocatedCritical.length)return{status:"ATTENTION" as const,title:"Critical resources are not connected to work.",explanation:`${unallocatedCritical.length} critical resource(s) have no active allocation to an objective, sprint item, decision or blocker.`,focus:"Allocation",action:"ALLOCATE",confidence,evidence,health};
 if(unusedPaid.length)return{status:"FOCUS" as const,title:"Paid resources show no active usage.",explanation:`${unusedPaid.length} paid resource(s) are marked unused. Review whether to activate, reallocate or retire them before carrying the cost forward.`,focus:"Resource Efficiency",action:"REVIEW_COST",confidence,evidence,health};
 if(unowned.length)return{status:"FOCUS" as const,title:"Resource ownership is incomplete.",explanation:`${unowned.length} operating resource(s) have no accountable team member.`,focus:"Ownership",action:"ASSIGN_OWNER",confidence,evidence,health};
 return{status:"STABLE" as const,title:"Resource capacity has an operating baseline.",explanation:"No critical availability, allocation, ownership or paid-unused constraint dominates the current inventory.",focus:"Resource Health",action:"REVIEW",confidence,evidence,health};
}
