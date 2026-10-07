import {OverpassProvider} from "./overpass";
import {ProviderRegistry} from "./providers";
export const providerRegistry=new ProviderRegistry([new OverpassProvider()]);
