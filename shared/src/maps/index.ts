import type { MapDef } from '../types';
import { classicMap } from './classic';
import { worldMap } from './world';

export const MAPS: Record<string, MapDef> = {
  classic: classicMap,
  world: worldMap,
};

export const MAP_LIST: MapDef[] = [classicMap, worldMap];

export function getMap(id: string): MapDef {
  const map = MAPS[id];
  if (!map) throw new Error(`Unknown map: ${id}`);
  return map;
}

export { classicMap, worldMap };
