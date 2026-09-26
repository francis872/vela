export type DistributionName="normal"|"lognormal"|"exponential"|"gamma"|"weibull";
export type DistributionFit={name:DistributionName;params:Record<string,number>;logLikelihood:number;aic:number};
const EPS=1e-12;
export function mean(xs:number[]){return xs.reduce((a,b)=>a+b,0)/xs.length}
export function variance(xs:number[],sample=false){const m=mean(xs);const d=xs.reduce((a,b)=>a+(b-m)**2,0);return d/Math.max(1,xs.length-(sample?1:0))}
export function stddev(xs:number[],sample=false){return Math.sqrt(variance(xs,sample))}
export function erf(x:number){const sign=x<0?-1:1;const a=Math.abs(x),t=1/(1+0.3275911*a);const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-a*a);return sign*y}
export function normalPdf(x:number,mu:number,sigma:number){if(sigma<=0)return 0;const z=(x-mu)/sigma;return Math.exp(-0.5*z*z)/(sigma*Math.sqrt(2*Math.PI))}
export function normalCdf(x:number,mu:number,sigma:number){if(sigma<=0)return x<mu?0:1;return .5*(1+erf((x-mu)/(sigma*Math.sqrt(2))))}
export function lognormalPdf(x:number,mu:number,sigma:number){if(x<=0||sigma<=0)return 0;return normalPdf(Math.log(x),mu,sigma)/x}
export function lognormalCdf(x:number,mu:number,sigma:number){if(x<=0)return 0;return normalCdf(Math.log(x),mu,sigma)}
export function exponentialPdf(x:number,lambda:number){return x<0||lambda<=0?0:lambda*Math.exp(-lambda*x)}
export function exponentialCdf(x:number,lambda:number){return x<0?0:1-Math.exp(-lambda*x)}
function logGamma(z:number){const c=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.6150291621406,12.507343278686905,-0.13857109526572012,9.984369578019571e-6,1.5056327351493116e-7];if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);z-=1;let x=.9999999999998099;for(let i=0;i<c.length;i++)x+=c[i]/(z+i+1);const t=z+c.length-.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x)}
function gammaP(a:number,x:number){if(x<0||a<=0)return 0;if(x===0)return 0;if(x<a+1){let ap=a,sum=1/a,del=sum;for(let n=1;n<=100;n++){ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*1e-12)break}return sum*Math.exp(-x+a*Math.log(x)-logGamma(a))}let b=x+1-a,c=1/1e-30,d=1/b,h=d;for(let i=1;i<=100;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-30)d=1e-30;c=b+an/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<1e-12)break}return 1-Math.exp(-x+a*Math.log(x)-logGamma(a))*h}
export function gammaPdf(x:number,k:number,theta:number){if(x<0||k<=0||theta<=0)return 0;return Math.exp((k-1)*Math.log(Math.max(x,EPS))-x/theta-logGamma(k)-k*Math.log(theta))}
export function gammaCdf(x:number,k:number,theta:number){return x<=0?0:gammaP(k,x/theta)}
export function weibullPdf(x:number,k:number,lambda:number){if(x<0||k<=0||lambda<=0)return 0;const z=x/lambda;return (k/lambda)*Math.pow(z,k-1)*Math.exp(-Math.pow(z,k))}
export function weibullCdf(x:number,k:number,lambda:number){return x<0?0:1-Math.exp(-Math.pow(x/lambda,k))}
function ll(xs:number[],pdf:(x:number)=>number){return xs.reduce((s,x)=>s+Math.log(Math.max(pdf(x),EPS)),0)}
export function fitNormal(xs:number[]):DistributionFit{const mu=mean(xs),sigma=Math.max(stddev(xs),1e-9),logLikelihood=ll(xs,x=>normalPdf(x,mu,sigma));return{name:"normal",params:{mu,sigma},logLikelihood,aic:2*2-2*logLikelihood}}
export function fitLognormal(xs:number[]):DistributionFit|null{if(xs.some(x=>x<=0))return null;const logs=xs.map(Math.log),mu=mean(logs),sigma=Math.max(stddev(logs),1e-9),logLikelihood=ll(xs,x=>lognormalPdf(x,mu,sigma));return{name:"lognormal",params:{mu,sigma},logLikelihood,aic:4-2*logLikelihood}}
export function fitExponential(xs:number[]):DistributionFit|null{if(xs.some(x=>x<0))return null;const m=mean(xs);if(m<=0)return null;const lambda=1/m,logLikelihood=ll(xs,x=>exponentialPdf(x,lambda));return{name:"exponential",params:{lambda},logLikelihood,aic:2-2*logLikelihood}}
export function fitGamma(xs:number[]):DistributionFit|null{if(xs.some(x=>x<=0))return null;const m=mean(xs),v=variance(xs);if(m<=0||v<=0)return null;const k=m*m/v,theta=v/m,logLikelihood=ll(xs,x=>gammaPdf(x,k,theta));return{name:"gamma",params:{k,theta},logLikelihood,aic:4-2*logLikelihood}}
export function fitWeibull(xs:number[]):DistributionFit|null{if(xs.some(x=>x<=0))return null;const logs=xs.map(Math.log),s=stddev(logs);if(s<=0)return null;const k=Math.max(.1,Math.min(20,1.2/s)),lambda=mean(xs.map(x=>Math.pow(x,k)))**(1/k),logLikelihood=ll(xs,x=>weibullPdf(x,k,lambda));return{name:"weibull",params:{k,lambda},logLikelihood,aic:4-2*logLikelihood}}
export function fitDistributions(xs:number[]){const clean=xs.filter(Number.isFinite);if(clean.length<3)return[];return [fitNormal(clean),fitLognormal(clean),fitExponential(clean),fitGamma(clean),fitWeibull(clean)].filter((x):x is DistributionFit=>Boolean(x))}
export function distributionCdf(f:DistributionFit,x:number){const p=f.params;switch(f.name){case"normal":return normalCdf(x,p.mu,p.sigma);case"lognormal":return lognormalCdf(x,p.mu,p.sigma);case"exponential":return exponentialCdf(x,p.lambda);case"gamma":return gammaCdf(x,p.k,p.theta);case"weibull":return weibullCdf(x,p.k,p.lambda)}}
export function distributionPdf(f:DistributionFit,x:number){const p=f.params;switch(f.name){case"normal":return normalPdf(x,p.mu,p.sigma);case"lognormal":return lognormalPdf(x,p.mu,p.sigma);case"exponential":return exponentialPdf(x,p.lambda);case"gamma":return gammaPdf(x,p.k,p.theta);case"weibull":return weibullPdf(x,p.k,p.lambda)}}
