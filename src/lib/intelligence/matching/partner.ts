import {overlapScore,weightedMatch,type MatchFactor} from "./matching";
export type PartnerNeed={capabilities?:string[];sectors?:string[];locations?:string[];goals?:string[];vector?:Record<string,number|null>};
export type PartnerProfile={id:string;name:string;capabilities?:string[];sectors?:string[];locations?:string[];goals?:string[];vector?:Record<string,number|null>};
export function matchPartner(n:PartnerNeed,p:PartnerProfile){
 const factors:MatchFactor[]=[
  {name:"capabilities",score:overlapScore(n.capabilities,p.capabilities)??0,weight:.35,evidence:"capability complementarity",available:Boolean(n.capabilities?.length&&p.capabilities?.length)},
  {name:"sector",score:overlapScore(n.sectors,p.sectors)??0,weight:.2,evidence:"sector overlap",available:Boolean(n.sectors?.length&&p.sectors?.length)},
  {name:"location",score:overlapScore(n.locations,p.locations)??0,weight:.15,evidence:"geographic overlap",available:Boolean(n.locations?.length&&p.locations?.length)},
  {name:"goals",score:overlapScore(n.goals,p.goals)??0,weight:.2,evidence:"strategic goal alignment",available:Boolean(n.goals?.length&&p.goals?.length)}
 ];
 return{id:p.id,name:p.name,...weightedMatch(factors,n.vector&&p.vector?{query:n.vector,target:p.vector,weight:.1}:undefined)};
}