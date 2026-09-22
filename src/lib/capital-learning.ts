export type CapitalLearningInput={id:string;category:string;spentAmount:number;outcomeValue?:number|null;roi?:number|null;createdAt:Date|string;closedAt?:Date|string|null;learning?:string|null;milestone?:string|null};
const round=(n:number)=>Math.round(n*100)/100,clamp=(n:number)=>Math.max(0,Math.min(100,n));
export function capitalEfficiency(x:CapitalLearningInput){
 const roi=x.roi??(x.spentAmount>0&&x.outcomeValue!=null?(x.outcomeValue-x.spentAmount)/x.spentAmount*100:null);
 const days=x.closedAt?Math.max(1,(new Date(x.closedAt).getTime()-new Date(x.createdAt).getTime())/86400000):null;
 const roiScore=roi==null?50:clamp(50+roi/4),timeScore=days==null?50:clamp(100-days*1.5),evidenceScore=(x.learning?25:0)+(x.outcomeValue!=null?25:0)+(x.milestone?25:0)+(x.closedAt?25:0);
 return {score:round(roiScore*.55+timeScore*.2+evidenceScore*.25),roi:roi==null?null:round(roi),timeToImpactDays:days==null?null:round(days),evidenceScore};
}
export function synthesizeCapitalLearning(items:CapitalLearningInput[]){
 const closed=items.filter(x=>x.closedAt&&x.learning);
 const enriched=closed.map(x=>({...x,efficiency:capitalEfficiency(x)}));
 const groups=new Map<string,typeof enriched>();for(const x of enriched){const k=x.category.trim()||"Other";groups.set(k,[...(groups.get(k)??[]),x])}
 const categories=[...groups.entries()].map(([category,rows])=>({category,samples:rows.length,spent:round(rows.reduce((s,x)=>s+x.spentAmount,0)),averageEfficiency:round(rows.reduce((s,x)=>s+x.efficiency.score,0)/rows.length),averageRoi:rows.some(x=>x.efficiency.roi!=null)?round(rows.filter(x=>x.efficiency.roi!=null).reduce((s,x)=>s+(x.efficiency.roi??0),0)/rows.filter(x=>x.efficiency.roi!=null).length):null,learnings:rows.map(x=>x.learning).filter(Boolean).slice(-3)})).sort((a,b)=>b.averageEfficiency-a.averageEfficiency);
 const confidence=closed.length>=8?"HIGH":closed.length>=3?"MEDIUM":"LOW";
 const reallocation=categories.length<2?null:{from:categories[categories.length-1].category,to:categories[0].category,delta:round(categories[0].averageEfficiency-categories[categories.length-1].averageEfficiency),principle:"Consider testing a modest reallocation only when categories are comparable and operational constraints permit. Historical association is not proof of causation."};
 return {status:closed.length?"AVAILABLE":"INSUFFICIENT_DATA",confidence,samples:closed.length,portfolioEfficiency:closed.length?round(enriched.reduce((s,x)=>s+x.efficiency.score,0)/closed.length):null,categories,reallocation,memories:enriched.sort((a,b)=>b.efficiency.score-a.efficiency.score).slice(0,8).map(x=>({deploymentId:x.id,category:x.category,efficiency:x.efficiency,learning:x.learning,milestone:x.milestone}))};
}