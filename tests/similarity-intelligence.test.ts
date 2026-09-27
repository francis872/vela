import assert from "node:assert/strict";import {alignVectors,cosineDistance,euclidean,manhattan} from "../src/lib/intelligence/similarity/distance";import {compareSimilarity,gaussianRbf,rankSimilarities} from "../src/lib/intelligence/similarity/rbf";
assert.equal(euclidean([0,0],[3,4]),5);assert.equal(manhattan([1,2],[4,6]),7);assert.ok(Math.abs(cosineDistance([1,0],[1,0]))<1e-12);assert.equal(gaussianRbf(0,1),1);
const aligned=alignVectors({a:1,b:null,c:3},{a:1,b:2,c:4});assert.deepEqual(aligned.keys,["a","c"]);assert.equal(aligned.coverage,2/3);
const same=compareSimilarity({a:10,b:20},{a:10,b:20});assert.equal(same.status,"AVAILABLE");if(same.status==="AVAILABLE")assert.equal(same.similarity,1);
const partial=compareSimilarity({a:1,b:null,c:null},{a:1,b:2,c:3},{minimumCoverage:.5});assert.equal(partial.status,"INSUFFICIENT_DATA");
const ranked=rankSimilarities({a:10,b:20},[{id:"near",vector:{a:11,b:21}},{id:"far",vector:{a:100,b:200}}]);assert.equal(ranked[0].id,"near");
const explained=compareSimilarity({revenue:100,risk:20},{revenue:100,risk:80});assert.equal(explained.status,"AVAILABLE");if(explained.status==="AVAILABLE")assert.equal(explained.drivers.different[0].feature,"risk");
console.log("Similarity Intelligence tests passed");