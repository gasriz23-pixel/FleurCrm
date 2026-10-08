import {redirect} from "next/navigation";
import {requireArea} from "../../lib/permissions";
import MarketingClient from "./client";

export default async function MarketingPage(){
  try{await requireArea("MARKETING");}catch{redirect("/dashboard");}
  return <MarketingClient/>;
}
