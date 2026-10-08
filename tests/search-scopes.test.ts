import {describe,expect,it} from "vitest";
import {buildSearchScopes} from "../lib/search/scopes";

describe("buildSearchScopes",()=>{
  it("preserves mixed city and region scope kinds",()=>{
    const scopes=buildSearchScopes({
      allItaly:false,
      cities:["Bologna"],
      regions:["Toscana"],
      municipalities:[],
      fallback:{name:"default"},
    });
    expect(scopes.map(x=>[x.name,x.kind])).toEqual([
      ["Bologna","city"],
      ["Toscana","region"],
    ]);
  });

  it("uses municipality metadata for all-Italy searches",()=>{
    const scopes=buildSearchScopes({
      allItaly:true,
      cities:[],
      regions:[],
      municipalities:[{name:"Bologna",province:"BO",region:"Emilia-Romagna",cap:"40121"}],
      fallback:{name:"default"},
    });
    expect(scopes[0]).toEqual({
      name:"Bologna",
      kind:"city",
      province:"BO",
      region:"Emilia-Romagna",
      cap:"40121",
    });
  });

  it("falls back to the explicit search location",()=>{
    expect(buildSearchScopes({
      allItaly:false,
      cities:[],
      regions:[],
      municipalities:[],
      fallback:{name:"Bologna",region:"Emilia-Romagna"},
    })).toEqual([{name:"Bologna",region:"Emilia-Romagna",kind:"fallback"}]);
  });
});
