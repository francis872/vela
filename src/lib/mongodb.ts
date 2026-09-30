import {MongoClient,Db} from "mongodb";

declare global {
  var velaMongoClientPromise: Promise<MongoClient> | undefined;
}

export function mongoConfigured(){return Boolean(process.env.MONGODB_ATLAS_URI)}

function clientPromise(){
  const uri=process.env.MONGODB_ATLAS_URI;
  if(!uri)throw new Error("MONGODB_ATLAS_URI is not configured");
  if(!global.velaMongoClientPromise){
    const client=new MongoClient(uri,{maxPoolSize:20,minPoolSize:0,retryWrites:true});
    global.velaMongoClientPromise=client.connect();
  }
  return global.velaMongoClientPromise;
}

export async function mongoDb():Promise<Db>{
  const client=await clientPromise();
  return client.db(process.env.MONGODB_DATABASE||"vela_intelligence");
}

export async function mongoPing(){
  if(!mongoConfigured())return{configured:false,available:false};
  try{const db=await mongoDb();await db.command({ping:1});return{configured:true,available:true,database:db.databaseName}}
  catch(error){return{configured:true,available:false,error:error instanceof Error?error.message:String(error)}}
}
