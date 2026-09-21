export type FinancialInput = {
  revenue: number;
  cogs?: number | null;
  operatingCosts: number;
  cash?: number | null;
  debt?: number | null;
  customers?: number | null;
  newCustomers?: number | null;
  marketingSpend?: number | null;
  churnRate?: number | null;
};

export type ValuationAssumptions = {
  revenueMultiple?: number | null;
  ebitdaMultiple?: number | null;
  discountRate?: number | null;
  terminalGrowth?: number | null;
  projectedGrowth?: number | null;
  capitalRequested?: number | null;
  equityOffered?: number | null;
};

const pct=(n:number)=>Math.round(n*10000)/100;
const money=(n:number)=>Math.round(n*100)/100;

export function analyzeFinancials(input: FinancialInput) {
  const revenue=Math.max(0,input.revenue);
  const cogs=input.cogs==null?null:Math.max(0,input.cogs);
  const operatingCosts=Math.max(0,input.operatingCosts);
  const grossProfit=cogs==null?null:revenue-cogs;
  const grossMargin=grossProfit==null||revenue<=0?null:pct(grossProfit/revenue);
  const ebitda=(grossProfit??revenue)-operatingCosts;
  const ebitdaMargin=revenue<=0?null:pct(ebitda/revenue);
  const burn=ebitda<0?Math.abs(ebitda):0;
  const runway=input.cash==null||burn<=0?null:money(Math.max(0,input.cash)/burn);
  const arpu=input.customers&&input.customers>0?money(revenue/input.customers):null;
  const cac=input.newCustomers&&input.newCustomers>0&&input.marketingSpend!=null?money(input.marketingSpend/input.newCustomers):null;
  const churn=input.churnRate==null?null:Math.max(0,input.churnRate);
  const ltv=arpu!=null&&grossMargin!=null&&churn!=null&&churn>0?money(arpu*(grossMargin/100)/(churn/100)):null;
  const ltvCac=ltv!=null&&cac!=null&&cac>0?Math.round((ltv/cac)*100)/100:null;
  return {revenue,cogs,operatingCosts,grossProfit,grossMargin,ebitda:money(ebitda),ebitdaMargin,burn:money(burn),runwayMonths:runway,arpu,cac,ltv,ltvCac};
}

export function valueVenture(financial: FinancialInput, assumptions: ValuationAssumptions) {
  const metrics=analyzeFinancials(financial);
  const methods:{method:string;value:number;basis:string}[]=[];
  if(assumptions.revenueMultiple!=null&&assumptions.revenueMultiple>0&&metrics.revenue>0){
    methods.push({method:"REVENUE_MULTIPLE",value:money(metrics.revenue*12*assumptions.revenueMultiple),basis:"annualized monthly revenue × supplied multiple"});
  }
  if(assumptions.ebitdaMultiple!=null&&assumptions.ebitdaMultiple>0&&metrics.ebitda>0){
    methods.push({method:"EBITDA_MULTIPLE",value:money(metrics.ebitda*12*assumptions.ebitdaMultiple),basis:"annualized positive EBITDA × supplied multiple"});
  }
  if(assumptions.discountRate!=null&&assumptions.projectedGrowth!=null&&assumptions.discountRate>0){
    const annualCash=Math.max(0,metrics.ebitda*12);
    if(annualCash>0){
      const r=assumptions.discountRate/100,g=assumptions.projectedGrowth/100;
      let pv=0,cash=annualCash;
      for(let year=1;year<=5;year++){cash*=1+g;pv+=cash/Math.pow(1+r,year);}
      const terminalGrowth=(assumptions.terminalGrowth??0)/100;
      if(r>terminalGrowth){const terminal=cash*(1+terminalGrowth)/(r-terminalGrowth);pv+=terminal/Math.pow(1+r,5);}
      methods.push({method:"DCF",value:money(pv),basis:"5-year EBITDA proxy cash flow using supplied growth and discount assumptions"});
    }
  }
  const values=methods.map(m=>m.value).sort((a,b)=>a-b);
  const low=values.length?values[0]:null,high=values.length?values[values.length-1]:null;
  const midpoint=values.length?money(values.reduce((a,b)=>a+b,0)/values.length):null;
  const deal=assumptions.capitalRequested!=null&&assumptions.capitalRequested>0&&assumptions.equityOffered!=null&&assumptions.equityOffered>0&&assumptions.equityOffered<100?{
    capitalRequested:assumptions.capitalRequested,
    equityOffered:assumptions.equityOffered,
    postMoney:money(assumptions.capitalRequested/(assumptions.equityOffered/100)),
    preMoney:money(assumptions.capitalRequested/(assumptions.equityOffered/100)-assumptions.capitalRequested),
  }:null;
  const missing:string[]=[];
  if(!methods.length) missing.push("Provide supported valuation assumptions and enough positive financial evidence.");
  if(metrics.grossMargin==null) missing.push("COGS is required for gross margin.");
  if(metrics.cac==null) missing.push("Marketing spend and new customers are required for CAC.");
  if(metrics.ltv==null) missing.push("ARPU, gross margin and churn are required for LTV.");
  return {status:methods.length?"AVAILABLE":"INSUFFICIENT_DATA",metrics,methods,range:{low,midpoint,high},deal,missing,disclaimer:"Valuation is an analytical estimate based on supplied evidence and assumptions, not a guarantee of market price."};
}
