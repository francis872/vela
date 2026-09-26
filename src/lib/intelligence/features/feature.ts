export const FEATURE_ENGINE_VERSION="FEATURE_ENGINE_V1";
export type FeatureValue=number|null;
export type FeatureVector=Record<string,FeatureValue>;
export type FeatureEvidence={feature:string;source:string;path:string;available:boolean};
export type FeatureSet={domain:string;version:string;values:FeatureVector;missing:string[];evidence:FeatureEvidence[]};
export function num(value:unknown):number|null{if(typeof value==="number"&&Number.isFinite(value))return value;if(typeof value==="string"&&value.trim()!==""&&Number.isFinite(Number(value)))return Number(value);return null;}
export function ratio(n:number|null,d:number|null,scale=1):number|null{return n==null||d==null||d===0?null:(n/d)*scale;}
export function pct(n:number|null,d:number|null):number|null{return ratio(n,d,100);}
export function clamp(value:number|null,min=0,max=100):number|null{return value==null?null:Math.max(min,Math.min(max,value));}
export function round(value:number|null,digits=4):number|null{if(value==null)return null;const p=10**digits;return Math.round(value*p)/p;}
export function buildFeatureSet(domain:string,values:FeatureVector,sources:Record<string,{source:string;path:string}>):FeatureSet{const missing=Object.entries(values).filter(([,v])=>v==null).map(([k])=>k);const evidence=Object.keys(values).map(feature=>({feature,source:sources[feature]?.source??"state",path:sources[feature]?.path??feature,available:values[feature]!=null}));return{domain,version:FEATURE_ENGINE_VERSION,values,missing,evidence};}
export function mergeFeatureSets(...sets:FeatureSet[]){const values:FeatureVector={};const evidence:FeatureEvidence[]=[];const missing:string[]=[];for(const set of sets){for(const [k,v] of Object.entries(set.values))values[`${set.domain}.${k}`]=v;for(const e of set.evidence)evidence.push({...e,feature:`${set.domain}.${e.feature}`});for(const m of set.missing)missing.push(`${set.domain}.${m}`)}return{version:FEATURE_ENGINE_VERSION,values,missing,evidence};}
