import type {VentureState} from "../state/venture-state";import {buildFeatureSet} from "./feature";
export function iotFeatures(_s:VentureState){const values={signalCount:null,utilization:null,downtime:null,energyIntensity:null,productionRate:null};const src=Object.fromEntries(Object.keys(values).map(k=>[k,{source:"StateEngine",path:"iot.unavailable"}]));return buildFeatureSet("iot",values,src);}
