export type DriftWindow={baseline:number[];recent:number[]};
export function mean(xs:number[]){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0}
export function std(xs:number[]){if(xs.length<2)return 0;const m=mean(xs);return Math.sqrt(xs.reduce((s,x)=>s+(x-m)**2,0)/(xs.length-1))}
export function detectDrift(w:DriftWindow,thresholdZ=2){if(w.baseline.length<3||w.recent.length<3)return{status:"INSUFFICIENT_DATA" as const,drift:false};const bm=mean(w.baseline),rm=mean(w.recent),bs=std(w.baseline)||1e-9,z=Math.abs(rm-bm)/bs;return{status:"AVAILABLE" as const,drift:z>=thresholdZ,zScore:Math.round(z*1000)/1000,baselineMean:bm,recentMean:rm,baselineStd:bs,thresholdZ}}
export function detectPerformanceDegradation(input:{baselineScore:number;recentScore:number;rollbackDelta:number}){const delta=input.recentScore-input.baselineScore;return{delta,degraded:delta<=-Math.abs(input.rollbackDelta)}}
