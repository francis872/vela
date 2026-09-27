import type {StateEnvelope} from "../state/state";import type {VentureState} from "../state/venture-state";
export const DIGITAL_TWIN_VERSION="DIGITAL_TWIN_V1";
export type VentureTwin={version:string;subjectId:string;createdAt:string;baselineCapturedAt:string;baseline:VentureState;working:VentureState;mutations:{path:string;before:unknown;after:unknown;reason?:string}[]};
function clone<T>(x:T):T{return JSON.parse(JSON.stringify(x))}
function get(obj:any,path:string[]){return path.reduce((o,k)=>o==null?undefined:o[k],obj)}
function set(obj:any,path:string[],value:any){let cur=obj;for(let i=0;i<path.length-1;i++){const k=path[i];if(cur[k]==null||typeof cur[k]!=="object")cur[k]={};cur=cur[k]}cur[path[path.length-1]]=value}
export function createVentureTwin(state:StateEnvelope<VentureState>):VentureTwin{return{version:DIGITAL_TWIN_VERSION,subjectId:state.subjectId,createdAt:new Date().toISOString(),baselineCapturedAt:state.capturedAt,baseline:clone(state.state),working:clone(state.state),mutations:[]}}
export function mutateTwin(twin:VentureTwin,changes:{path:string;value:unknown;reason?:string}[]){const next=clone(twin);for(const c of changes){const parts=c.path.split(".").filter(Boolean),before=get(next.working,parts);set(next.working,parts,c.value);next.mutations.push({path:c.path,before,after:c.value,reason:c.reason})}return next}
export function resetTwin(twin:VentureTwin){return{...twin,working:clone(twin.baseline),mutations:[]}}
