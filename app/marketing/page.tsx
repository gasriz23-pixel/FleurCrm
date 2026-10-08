import {requireArea} from "../../lib/permissions";
import MarketingClient from "./client";

export default async function MarketingPage(){
  await requireArea("MARKETING");
  return <MarketingClient/>;
}
