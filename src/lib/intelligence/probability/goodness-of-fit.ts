import {distributionCdf,fitDistributions,type DistributionFit} from "./distributions";
export type KSTest={d:number;n:number;critical95:number;passes95:boolean};
export function ksTest(xs:number[],fit:DistributionFit):KSTest{const a=xs.filter(Number.isFinite).sort((x,y)=>x-y),n=a.length;if(!n)return{d:NaN,n:0,critical95:NaN,passes95:false};let d=0;for(let i=0;i<n;i++){const f=distributionCdf(fit,a[i]);const dn=Math.max(Math.abs(f-i/n),Math.abs((i+1)/n-f));if(dn>d)d=dn}const critical95=1.36/Math.sqrt(n);return{d,n,critical95,passes95:d<=critical95}}
export function rankFits(xs:number[]){return fitDistributions(xs).map(f=>({fit:f,ks:ksTest(xs,f)})).sort((a,b)=>{if(a.ks.passes95!==b.ks.passes95)return a.ks.passes95?-1:1;if(a.ks.d!==b.ks.d)return a.ks.d-b.ks.d;return a.fit.aic-b.fit.aic})}
export function bestFit(xs:number[]){const ranked=rankFits(xs);return ranked[0]??null}
