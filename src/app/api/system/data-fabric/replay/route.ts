import {NextRequest,NextResponse} from "next/server";
import {requireAuth} from "@/lib/api-auth";
import {getEventReplayStatus,replayCanonicalEvents} from "@/lib/intelligence/event-replay";

export async function GET(req:NextRequest){
  const auth=await requireAuth(req);if(!auth.ok)return auth.response;
  try{return NextResponse.json(await getEventReplayStatus())}
  catch(error){return NextResponse.json({status:"ERROR",error:error instanceof Error?error.message:String(error)},{status:500})}
}

export async function POST(req:NextRequest){
  const auth=await requireAuth(req);if(!auth.ok)return auth.response;
  let body:{batchSize?:number;maxBatches?:number}={};
  try{body=await req.json()}catch{}
  try{return NextResponse.json(await replayCanonicalEvents(body))}
  catch(error){return NextResponse.json({status:"ERROR",error:error instanceof Error?error.message:String(error)},{status:500})}
}
