import type { MapCore } from "./map-core";
import type { MapDir } from "./map-dir";

export type MapLayout = { dirs: MapDir[]; cores: MapCore[]; width: number };
