import {NextRequest,NextResponse} from "next/server";
import {requireAuth} from "@/lib/api-auth";
import {matchInvestor} from "@/lib/intelligence/matching/investor";
import {matchTalent} from "@/lib/intelligence/matching/talent";
import {matchCustomer} from "@/lib/intelligence/matching/customer";
import {matchPartner} from "@/lib/intelligence/matching/partner";
export async function POST(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const b=await req.json().catch(()=>({}));
 if(!["investor","talent","customer","partner"].includes(b.type))return NextResponse.json({error:"type must be investor, talent, customer, or partner"},{status:400});
 if(!b.query||!Array.isArray(b.candidates))return NextResponse.json({error:"query and candidates are required"},{status:400});
 const results=b.candidates.map((c:any)=>b.type==="investor"?matchInvestor(b.query,c):b.type==="talent"?matchTalent(b.query,c):b.type==="customer"?matchCustomer(b.query,c):matchPartner(b.query,c)).sort((a:any,b:any)=>(b.score??-1)-(a.score??-1));
 return NextResponse.json({status:"AVAILABLE",type:b.type,results});
}
