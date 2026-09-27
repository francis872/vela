import {overlapScore,rangeFit,weightedMatch,type MatchFactor} from "./matching";
export type VentureInvestorProfile={sector?:string;stage?:string;location?:string;capitalNeed?:number|null;tractionTags?:string[];vector?:Record<string,number|null>};
export type InvestorProfile={id:string;name:string;sectors?:string[];stages?:string[];locations?:string[];minTicket?:number|null;maxTicket?:number|null;preferences?:string[];vector?:Record<string,number|null>};
export function matchInvestor(v:VentureInvestorProfile,i:InvestorProfile){
 const factors:MatchFactor[]=[
  {name:"sector",score:overlapScore(v.sector?[v.sector]:[],i.sectors)??0,weight:.25,evidence:"sector compatibility",available:Boolean(v.sector&&i.sectors?.length)},
  {name:"stage",score:overlapScore(v.stage?[v.stage]:[],i.stages)??0,weight:.2,evidence:"stage compatibility",available:Boolean(v.stage&&i.stages?.length)},
  {name:"ticket",score:rangeFit(v.capitalNeed,i.minTicket,i.maxTicket)??0,weight:.25,evidence:"capital need within ticket range",available:v.capitalNeed!=null&&i.minTicket!=null&&i.maxTicket!=null},
  {name:"location",score:overlapScore(v.location?[v.location]:[],i.locations)??0,weight:.1,evidence:"geographic preference overlap",available:Boolean(v.location&&i.locations?.length)},
  {name:"preferences",score:overlapScore(v.tractionTags,i.preferences)??0,weight:.1,evidence:"traction/preference overlap",available:Boolean(v.tractionTags?.length&&i.preferences?.length)}
 ];
 return{id:i.id,name:i.name,...weightedMatch(factors,v.vector&&i.vector?{query:v.vector,target:i.vector,weight:.1}:undefined)};
}