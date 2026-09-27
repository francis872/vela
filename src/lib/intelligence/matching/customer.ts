import {overlapScore,weightedMatch,type MatchFactor} from "./matching";
export type CustomerTarget={industries?:string[];needs?:string[];locations?:string[];sizeBands?:string[];vector?:Record<string,number|null>};
export type CustomerProfile={id:string;name:string;industry?:string;needs?:string[];location?:string;sizeBand?:string;vector?:Record<string,number|null>};
export function matchCustomer(t:CustomerTarget,c:CustomerProfile){
 const factors:MatchFactor[]=[
  {name:"industry",score:overlapScore(t.industries,c.industry?[c.industry]:[])??0,weight:.3,evidence:"target industry overlap",available:Boolean(t.industries?.length&&c.industry)},
  {name:"needs",score:overlapScore(t.needs,c.needs)??0,weight:.35,evidence:"problem/need overlap",available:Boolean(t.needs?.length&&c.needs?.length)},
  {name:"location",score:overlapScore(t.locations,c.location?[c.location]:[])??0,weight:.15,evidence:"market location overlap",available:Boolean(t.locations?.length&&c.location)},
  {name:"size",score:overlapScore(t.sizeBands,c.sizeBand?[c.sizeBand]:[])??0,weight:.1,evidence:"customer size-band fit",available:Boolean(t.sizeBands?.length&&c.sizeBand)}
 ];
 return{id:c.id,name:c.name,...weightedMatch(factors,t.vector&&c.vector?{query:t.vector,target:c.vector,weight:.1}:undefined)};
}