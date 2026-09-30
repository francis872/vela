import {createHash} from "node:crypto";
import {mongoConfigured,mongoDb} from "@/lib/mongodb";

export const INTELLIGENCE_STORE_VERSION="VELA_INTELLIGENCE_STORE_V1";
export const COLLECTIONS={
  computationalRuns:"computational_runs",
  featureSnapshots:"feature_snapshots",
  optimizationRuns:"optimization_runs",
  digitalTwinRuns:"digital_twin_runs",
  learningMemory:"learning_memory",
  graphSnapshots:"graph_snapshots",
  eventDocuments:"event_documents",
  encryptedModels:"encrypted_models"
} as const;

function fingerprint(value:unknown){return createHash("sha256").update(JSON.stringify(value??null)).digest("hex")}

async function collection(name:string){return (await mongoDb()).collection(name)}

export async function ensureIntelligenceIndexes(){
  if(!mongoConfigured())return{status:"SKIPPED" as const,reason:"MongoDB Atlas is not configured"};
  const db=await mongoDb();
  await Promise.all([
    db.collection(COLLECTIONS.computationalRuns).createIndexes([{key:{ownerId:1,createdAt:-1}},{key:{runId:1},unique:true}]),
    db.collection(COLLECTIONS.featureSnapshots).createIndexes([{key:{ownerId:1,subjectId:1,capturedAt:-1}},{key:{fingerprint:1}}]),
    db.collection(COLLECTIONS.optimizationRuns).createIndexes([{key:{ownerId:1,algorithm:1,createdAt:-1}},{key:{runId:1},unique:true}]),
    db.collection(COLLECTIONS.digitalTwinRuns).createIndexes([{key:{ownerId:1,subjectId:1,createdAt:-1}},{key:{runId:1},unique:true}]),
    db.collection(COLLECTIONS.learningMemory).createIndexes([{key:{ownerId:1,problemSignature:1,learnedAt:-1}},{key:{interventionId:1},unique:true,sparse:true}]),
    db.collection(COLLECTIONS.graphSnapshots).createIndexes([{key:{ownerId:1,generatedAt:-1}},{key:{fingerprint:1}}]),
    db.collection(COLLECTIONS.eventDocuments).createIndexes([{key:{ownerId:1,occurredAt:-1}},{key:{postgresEventId:1},unique:true}]),
    db.collection(COLLECTIONS.encryptedModels).createIndexes([{key:{ownerId:1,modelType:1,createdAt:-1}},{key:{fingerprint:1}}])
  ]);
  return{status:"READY" as const,database:db.databaseName};
}

export async function bestEffortMongo<T>(operation:()=>Promise<T>){
  if(!mongoConfigured())return{status:"SKIPPED" as const};
  try{return{status:"STORED" as const,result:await operation()}}
  catch(error){console.error("Mongo intelligence store write failed",error);return{status:"ERROR" as const,error:error instanceof Error?error.message:String(error)}}
}

export async function storeFeatureSnapshot(input:{ownerId:string;subjectId:string;scope:string;features:unknown;capturedAt?:string}){
  const doc={...input,capturedAt:new Date(input.capturedAt??Date.now()),fingerprint:fingerprint(input.features),version:INTELLIGENCE_STORE_VERSION};
  return (await collection(COLLECTIONS.featureSnapshots)).insertOne(doc);
}
export async function storeComputationalRun(input:{runId:string;ownerId:string;scope:string;subjectId:string;request:unknown;result:unknown}){
  return (await collection(COLLECTIONS.computationalRuns)).updateOne({runId:input.runId},{$set:{...input,createdAt:new Date(),version:INTELLIGENCE_STORE_VERSION}},{upsert:true});
}
export async function storeOptimizationRun(input:{runId:string;ownerId:string;algorithm:string;context:string;input:unknown;result:unknown}){
  return (await collection(COLLECTIONS.optimizationRuns)).updateOne({runId:input.runId},{$set:{...input,createdAt:new Date(),version:INTELLIGENCE_STORE_VERSION}},{upsert:true});
}
export async function storeDigitalTwinRun(input:{runId:string;ownerId:string;subjectId:string;baselineFingerprint?:string;scenario:unknown;result:unknown}){
  return (await collection(COLLECTIONS.digitalTwinRuns)).updateOne({runId:input.runId},{$set:{...input,createdAt:new Date(),version:INTELLIGENCE_STORE_VERSION}},{upsert:true});
}
export async function storeLearningMemory(input:{ownerId:string;interventionId:string;problemSignature:string;targetMetric:string;actionTitle:string;effectiveness:number;confidence:string;lesson:string;evidence:string[];context?:unknown;learnedAt?:Date}){
  return (await collection(COLLECTIONS.learningMemory)).updateOne({interventionId:input.interventionId},{$set:{...input,learnedAt:input.learnedAt??new Date(),version:INTELLIGENCE_STORE_VERSION}},{upsert:true});
}
export async function storeGraphSnapshot(input:{ownerId:string;graph:unknown;generatedAt?:string}){
  const fp=fingerprint(input.graph);return (await collection(COLLECTIONS.graphSnapshots)).updateOne({ownerId:input.ownerId,fingerprint:fp},{$set:{ownerId:input.ownerId,graph:input.graph,fingerprint:fp,generatedAt:new Date(input.generatedAt??Date.now()),version:INTELLIGENCE_STORE_VERSION}},{upsert:true});
}
export async function mirrorDomainEvent(input:{postgresEventId:string;ownerId:string;name:string;aggregate?:string|null;aggregateId?:string|null;payload:unknown;occurredAt:Date}){
  return (await collection(COLLECTIONS.eventDocuments)).updateOne({postgresEventId:input.postgresEventId},{$set:{...input,version:INTELLIGENCE_STORE_VERSION}},{upsert:true});
}
