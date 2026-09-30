import assert from "node:assert/strict";
import {optimizeGreyWolf} from "../src/lib/intelligence/optimization/gwo";
import {optimizeMultiObjective,paretoFront} from "../src/lib/intelligence/optimization/multi-objective";
import {optimizeAllocation} from "../src/lib/intelligence/optimization/allocation";

const vars=[{name:"product",min:0,max:100},{name:"growth",min:0,max:100}];
const gwo=optimizeGreyWolf(vars,v=>({score:-(Math.pow(v.product-70,2)+Math.pow(v.growth-30,2)),feasible:true}),{seed:872,iterations:35,wolves:30});
assert.equal(gwo.version,"GWO_V1");
assert.ok(Math.abs(gwo.alpha.values.product-70)<15);
assert.ok(Math.abs(gwo.alpha.values.growth-30)<15);

const allocation=optimizeAllocation({mode:"continuous",algorithm:"gwo",variables:vars,weights:{product:2,growth:1},constraints:{product:{max:80}},seed:872});
assert.equal(allocation.algorithm,"gwo");
assert.ok(allocation.result.alpha.feasible);

const mo=optimizeMultiObjective([{name:"capital",min:0,max:100}],[{name:"return",direction:"max"},{name:"risk",direction:"min"}],v=>({objectives:{return:v.capital,risk:v.capital*v.capital/100},feasible:true}),{seed:872,runs:7,iterations:20,wolves:18});
assert.equal(mo.version,"MULTI_OBJECTIVE_GWO_V1");
assert.ok(mo.front.length>0);
for(const s of mo.front)assert.ok(s.candidate.feasible);

const synthetic=[{candidate:{values:{x:1},score:1,feasible:true,violations:[]},objectives:{return:10,risk:10}},{candidate:{values:{x:2},score:2,feasible:true,violations:[]},objectives:{return:9,risk:12}}];
assert.equal(paretoFront(synthetic,[{name:"return",direction:"max"},{name:"risk",direction:"min"}]).length,1);
console.log("GWO optimization tests passed");
