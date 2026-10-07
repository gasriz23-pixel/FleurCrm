import {OverpassProvider} from "./overpass";
import {GooglePlacesProvider} from "./google-places";
import {GoogleWebSearchProvider} from "./google-web-search";
import {ProviderRegistry} from "./providers";

export const providerRegistry=new ProviderRegistry([
  new GooglePlacesProvider(),
  new GoogleWebSearchProvider(),
  new OverpassProvider()
]);
