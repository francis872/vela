export const STATE_ENGINE_VERSION = "STATE_ENGINE_V1";
export type StateScope="venture"|"person"|"portfolio";
export type StateSource={entity:string;recordId?:string|null;observedAt?:string|null;fields:string[]};
export type StateQuality={completeness:number;confidence:number;missing:string[];sources:StateSource[]};
export type StateEnvelope<T>={scope:StateScope;subjectId:string;version:string;capturedAt:string;quality:StateQuality;state:T};
export type StateChange={path:string;before:unknown;after:unknown;kind:"ADDED"|"REMOVED"|"CHANGED"};
const round=(n:number)=>Math.round(n*100)/100;
export function assessStateQuality(required:Record<string,unknown>,sources:StateSource[]):StateQuality{const entries=Object.entries(required);const missing=entries.filter(([,v])=>v==null).map(([k])=>k);const completeness=entries.length?round((entries.length-missing.length)/entries.length*100):100;const observed=sources.filter(s=>s.observedAt).length;const confidence=round(Math.min(100,completeness*.8+(sources.length?observed/sources.length*20:0)));return{completeness,confidence,missing,sources};}
export function compareStates(a:unknown,b:unknown,prefix=""):StateChange[]{if(Object.is(a,b))return[];if(a==null||b==null||typeof a!=="object"||typeof b!=="object"||Array.isArray(a)||Array.isArray(b))return[{path:prefix||"$",before:a,after:b,kind:a===undefined?"ADDED":b===undefined?"REMOVED":"CHANGED"}];const A=a as Record<string,unknown>,B=b as Record<string,unknown>;return[...new Set([...Object.keys(A),...Object.keys(B)])].flatMap(k=>compareStates(A[k],B[k],prefix?`${prefix}.${k}`:k));}
export function canonicalize(value:unknown):string{if(value==null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return `[${value.map(canonicalize).join(",")}]`;const o=value as Record<string,unknown>;return `{${Object.keys(o).sort().map(k=>`${JSON.stringify(k)}:${canonicalize(o[k])}`).join(",")}}`;}
export function stateFingerprint(value:unknown){let h=2166136261;const s=canonicalize(value);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return `fnv1a-${(h>>>0).toString(16).padStart(8,"0")}`;}
