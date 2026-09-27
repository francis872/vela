export type GeoPoint={id?:string;lat:number;lon:number;weight?:number;category?:string;attributes?:Record<string,unknown>};
export type GeoFeatureSet={origin:GeoPoint;customers?:GeoPoint[];talent?:GeoPoint[];competitors?:GeoPoint[];suppliers?:GeoPoint[];infrastructure?:GeoPoint[]};
const R=6371;
export function haversineKm(a:GeoPoint,b:GeoPoint){const toRad=(d:number)=>d*Math.PI/180,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon),la1=toRad(a.lat),la2=toRad(b.lat),h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
export function validatePoint(p:GeoPoint){return Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=-90&&p.lat<=90&&p.lon>=-180&&p.lon<=180}
export function nearestDistance(origin:GeoPoint,points:GeoPoint[]){const valid=points.filter(validatePoint);if(!valid.length)return null;return Math.min(...valid.map(p=>haversineKm(origin,p)))}
export function averageDistance(origin:GeoPoint,points:GeoPoint[]){const valid=points.filter(validatePoint);if(!valid.length)return null;return valid.reduce((s,p)=>s+haversineKm(origin,p),0)/valid.length}
export function weightedCentroid(points:GeoPoint[]){const valid=points.filter(validatePoint);if(!valid.length)return null;const total=valid.reduce((s,p)=>s+(p.weight??1),0);if(total<=0)return null;return{lat:valid.reduce((s,p)=>s+p.lat*(p.weight??1),0)/total,lon:valid.reduce((s,p)=>s+p.lon*(p.weight??1),0)/total}}
