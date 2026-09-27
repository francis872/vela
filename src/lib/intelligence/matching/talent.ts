import {overlapScore,weightedMatch,type MatchFactor} from "./matching";
export type TalentNeed={skills:string[];roles?:string[];location?:string;availability?:string;vector?:Record<string,number|null>};
export type TalentProfile={id:string;name:string;skills:string[];roles?:string[];location?:string;availability?:string;vector?:Record<string,number|null>};
export function matchTalent(n:TalentNeed,p:TalentProfile){
 const factors:MatchFactor[]=[
  {name:"skills",score:overlapScore(n.skills,p.skills)??0,weight:.45,evidence:"required skills vs profile skills",available:Boolean(n.skills.length&&p.skills.length)},
  {name:"roles",score:overlapScore(n.roles,p.roles)??0,weight:.2,evidence:"role overlap",available:Boolean(n.roles?.length&&p.roles?.length)},
  {name:"availability",score:n.availability&&p.availability&&n.availability===p.availability?100:0,weight:.15,evidence:"availability compatibility",available:Boolean(n.availability&&p.availability)},
  {name:"location",score:n.location&&p.location&&n.location.toLowerCase()===p.location.toLowerCase()?100:0,weight:.1,evidence:"location compatibility",available:Boolean(n.location&&p.location)}
 ];
 return{id:p.id,name:p.name,...weightedMatch(factors,n.vector&&p.vector?{query:n.vector,target:p.vector,weight:.1}:undefined)};
}