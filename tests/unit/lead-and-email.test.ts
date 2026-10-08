import {describe,expect,it} from "vitest";
import {dedupeLeads,normalizePhone,normalizeWebsite} from "../lib/search/dedupe";
import {renderTemplate} from "../lib/email/provider";

describe("lead dedupe",()=>{
  it("normalizes website and phone",()=>{
    expect(normalizeWebsite("https://www.Example.it/contatti")).toBe("example.it");
    expect(normalizePhone("+39 051 123 4567")).toBe("390511234567");
  });
  it("merges providers and missing fields",()=>{
    const leads=dedupeLeads([
      {name:"Hotel Aurora S.r.l.",city:"Bologna",address:"Via Roma 10",website:"https://hotel-aurora.it",provider:"google-places",phone:"051123456"},
      {name:"Hotel Aurora",city:"Bologna",address:"Via Roma 10",website:"https://www.hotel-aurora.it",provider:"osm-overpass",email:"info@hotel-aurora.it"}
    ]);
    expect(leads).toHaveLength(1);
    expect(leads[0].email).toBe("info@hotel-aurora.it");
    expect(leads[0].providers).toEqual(["google-places","osm-overpass"]);
  });
});

describe("email templates",()=>{
  it("renders known variables and blanks unknown ones",()=>{
    expect(renderTemplate("Ciao {{nome}} di {{azienda}} {{missing}}",{nome:"Mario",azienda:"Hotel Test"})).toBe("Ciao Mario di Hotel Test ");
  });
});
