import {OverpassProvider} from "./overpass";
import {GooglePlacesProvider} from "./google-places";
import {ProviderRegistry} from "./providers";
export const providerRegistry=new ProviderRegistry([new GooglePlacesProvider(),new OverpassProvider()]);
