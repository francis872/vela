import {optimizeContinuous,type ContinuousVariable} from "./ssa";
import {optimizeDiscrete,type DiscreteOption} from "./aco";
import {optimizeGreyWolf} from "./gwo";
import {optimizeMultiObjective,type MultiObjectiveDefinition} from "./multi-objective";

export type AllocationGoal="maximize_utility"|"maximize_impact"|"maximize_growth"|"minimize_risk";
export type ContinuousAlgorithm="ssa"|"gwo";

export function optimizeAllocation(input:{
 mode:"continuous"|"discrete";
 algorithm?:ContinuousAlgorithm;
 goal?:AllocationGoal;
 variables?:ContinuousVariable[];
 options?:DiscreteOption[];
 capacity?:number;
 constraints?:Record<string,{min?:number;max?:number}>;
 weights?:Record<string,number>;
 seed?:number
}){
 if(input.mode==="discrete")return{mode:"discrete" as const,algorithm:"aco" as const,result:optimizeDiscrete(input.options??[],input.capacity??0,{seed:input.seed})};
 const constraints=input.constraints??{},weights=input.weights??{};
 const evaluate=(values:Record<string,number>)=>{const violations:string[]=[];for(const [k,c] of Object.entries(constraints)){const v=values[k];if(v==null)continue;if(c.min!=null&&v<c.min)violations.push(`${k}<min`);if(c.max!=null&&v>c.max)violations.push(`${k}>max`)}let score=0;for(const [k,v] of Object.entries(values))score+=v*(weights[k]??1);if(input.goal==="minimize_risk")score*=-1;return{score,feasible:violations.length===0,violations}};
 if(input.algorithm==="gwo")return{mode:"continuous" as const,algorithm:"gwo" as const,result:optimizeGreyWolf(input.variables??[],evaluate,{seed:input.seed})};
 return{mode:"continuous" as const,algorithm:"ssa" as const,result:optimizeContinuous(input.variables??[],evaluate,{seed:input.seed})};
}

export function optimizeStrategicAllocation(input:{
 variables:ContinuousVariable[];
 objectives:MultiObjectiveDefinition[];
 evaluate:(values:Record<string,number>)=>{objectives:Record<string,number>;feasible:boolean;violations?:string[]};
 seed?:number;iterations?:number;wolves?:number;runs?:number;
}){
 return optimizeMultiObjective(input.variables,input.objectives,input.evaluate,{seed:input.seed,iterations:input.iterations,wolves:input.wolves,runs:input.runs});
}
