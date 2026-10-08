export type SearchScope={name:string;kind:"city"|"region"|"fallback";province?:string;region?:string;cap?:string};
export type MunicipalityScopeInput={name:string;province?:string;region?:string;cap?:string};
export function buildSearchScopes(input:{allItaly:boolean;cities:string[];regions:string[];municipalities:MunicipalityScopeInput[];fallback:MunicipalityScopeInput}):SearchScope[]{
  const scopes:SearchScope[]=input.allItaly
    ? input.municipalities.map(scope=>({name:scope.name,kind:"city",province:scope.province,region:scope.region,cap:scope.cap}))
    : [...input.cities.map(name=>({name,kind:"city" as const})),...input.regions.map(name=>({name,kind:"region" as const}))];
  return scopes.length?scopes:[{...input.fallback,kind:"fallback"}];
}
