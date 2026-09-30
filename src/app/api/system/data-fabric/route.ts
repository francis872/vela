import {NextRequest,NextResponse} from "next/server";
import {requireAuth} from "@/lib/api-auth";
import {prisma} from "@/lib/prisma";
import {mongoPing, mongoConfigured} from "@/lib/mongodb";
import {ensureIntelligenceIndexes} from "@/lib/intelligence/intelligence-store";

export async function GET(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 let postgres:{available:boolean;error?:string}={available:false};
 try{await prisma.$queryRawUnsafe("SELECT 1");postgres={available:true}}catch(error){postgres={available:false,error:error instanceof Error?error.message:String(error)}}
 const mongo=await mongoPing();
 return NextResponse.json({version:"VELA_2_14_DATA_FABRIC",postgres:{role:"OPERATIONAL_TRUTH",...postgres},mongodb:{role:"COMPUTATIONAL_INTELLIGENCE_MEMORY",...mongo}});
}
export async function POST(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 if(!mongoConfigured())return NextResponse.json({status:"SKIPPED",reason:"MONGODB_ATLAS_URI is not configured"},{status:503});
 try{return NextResponse.json(await ensureIntelligenceIndexes())}catch(error){return NextResponse.json({status:"ERROR",error:error instanceof Error?error.message:String(error)},{status:500})}
}
