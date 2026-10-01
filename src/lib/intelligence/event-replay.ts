import {prisma} from "@/lib/prisma";
import {COLLECTIONS,ensureIntelligenceIndexes,mirrorDomainEvent} from "@/lib/intelligence/intelligence-store";
import {mongoConfigured,mongoDb} from "@/lib/mongodb";

export const EVENT_REPLAY_VERSION="VELA_EVENT_REPLAY_V1";
const REPLAY_KEY="postgres-domain-events";

type ReplayOptions={batchSize?:number;maxBatches?:number};

function safePayload(value:string):unknown{try{return JSON.parse(value)}catch{return{}}}

export async function getEventReplayStatus(){
  if(!mongoConfigured())return{version:EVENT_REPLAY_VERSION,status:"UNCONFIGURED" as const};
  const db=await mongoDb();
  const [checkpoint,mirroredEvents,canonicalEvents]=await Promise.all([
    db.collection(COLLECTIONS.replayState).findOne({_id:REPLAY_KEY as never}),
    db.collection(COLLECTIONS.eventDocuments).countDocuments(),
    prisma.domainEventRecord.count()
  ]);
  return{
    version:EVENT_REPLAY_VERSION,
    status:mirroredEvents>=canonicalEvents?"IN_SYNC" as const:"LAGGING" as const,
    canonicalEvents,
    mirroredEvents,
    lag:Math.max(0,canonicalEvents-mirroredEvents),
    checkpoint:checkpoint?{
      lastCreatedAt:checkpoint.lastCreatedAt??null,
      lastEventId:checkpoint.lastEventId??null,
      updatedAt:checkpoint.updatedAt??null,
      replayedEvents:checkpoint.replayedEvents??0
    }:null
  };
}

export async function replayCanonicalEvents(options:ReplayOptions={}){
  if(!mongoConfigured())return{version:EVENT_REPLAY_VERSION,status:"SKIPPED" as const,reason:"MONGODB_ATLAS_URI is not configured"};

  await ensureIntelligenceIndexes();
  const db=await mongoDb();
  const state=db.collection(COLLECTIONS.replayState);
  const checkpoint=await state.findOne({_id:REPLAY_KEY as never});
  const batchSize=Math.max(1,Math.min(500,options.batchSize??100));
  const maxBatches=Math.max(1,Math.min(1000,options.maxBatches??20));
  let lastCreatedAt=checkpoint?.lastCreatedAt instanceof Date?checkpoint.lastCreatedAt:null;
  let lastEventId=typeof checkpoint?.lastEventId==="string"?checkpoint.lastEventId:null;
  let replayed=0;
  let batches=0;

  while(batches<maxBatches){
    const cursor=lastCreatedAt?{
      OR:[
        {createdAt:{gt:lastCreatedAt}},
        {createdAt:lastCreatedAt,id:{gt:lastEventId??""}}
      ]
    }:undefined;
    const rows=await prisma.domainEventRecord.findMany({
      where:cursor,
      orderBy:[{createdAt:"asc"},{id:"asc"}],
      take:batchSize
    });
    if(!rows.length)break;

    for(const row of rows){
      await mirrorDomainEvent({
        postgresEventId:row.id,
        ownerId:row.ownerId,
        name:row.name,
        aggregate:row.aggregate,
        aggregateId:row.aggregateId,
        payload:safePayload(row.payload),
        occurredAt:row.occurredAt,
        createdAt:row.createdAt
      });
      lastCreatedAt=row.createdAt;
      lastEventId=row.id;
      replayed++;
    }

    batches++;
    await state.updateOne(
      {_id:REPLAY_KEY as never},
      {$set:{
        lastCreatedAt,
        lastEventId,
        updatedAt:new Date(),
        version:EVENT_REPLAY_VERSION
      },$inc:{replayedEvents:rows.length}},
      {upsert:true}
    );
    if(rows.length<batchSize)break;
  }

  const status=await getEventReplayStatus();
  return{...status,replayed,batches,batchSize};
}

let recoveryPromise:Promise<unknown>|null=null;

export function scheduleEventReplay(){
  if(!mongoConfigured()||recoveryPromise)return;
  recoveryPromise=replayCanonicalEvents({batchSize:100,maxBatches:5})
    .catch(error=>console.error("VELA event replay failed",error))
    .finally(()=>{recoveryPromise=null});
}
