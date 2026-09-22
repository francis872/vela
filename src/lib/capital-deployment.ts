export type DeploymentInput={plannedAmount:number;committedAmount:number;spentAmount:number;outcomeValue?:number|null;status:string};
const round=(n:number)=>Math.round(n*100)/100;
export function deploymentMetrics(items:DeploymentInput[]){
 const planned=items.reduce((s,x)=>s+Math.max(0,x.plannedAmount),0),committed=items.reduce((s,x)=>s+Math.max(0,x.committedAmount),0),spent=items.reduce((s,x)=>s+Math.max(0,x.spentAmount),0);
 const outcomeValue=items.reduce((s,x)=>s+Math.max(0,x.outcomeValue??0),0);
 const roi=spent>0?(outcomeValue-spent)/spent*100:null;
 const utilization=planned>0?spent/planned*100:0;
 const committedPct=planned>0?committed/planned*100:0;
 return {planned:round(planned),committed:round(committed),spent:round(spent),remaining:round(Math.max(0,planned-spent)),outcomeValue:round(outcomeValue),roi:roi==null?null:round(roi),utilizationPct:round(utilization),committedPct:round(committedPct),closed:items.filter(x=>x.status==="closed").length,total:items.length};
}
export function deploymentStatus(x:{plannedAmount:number;committedAmount:number;spentAmount:number;actualOutcome?:string|null;learning?:string|null}){
 if(x.actualOutcome&&x.learning)return"closed";if(x.spentAmount>0)return"spent";if(x.committedAmount>0)return"committed";return"planned";
}
export function validateDeploymentAmounts(planned:number,committed:number,spent:number){const errors:string[]=[];if(planned<0||committed<0||spent<0)errors.push("Amounts cannot be negative.");if(committed>planned)errors.push("Committed amount cannot exceed planned amount.");if(spent>committed)errors.push("Spent amount cannot exceed committed amount.");return errors;}
