"use client";

import type { FileHistory, ShownFile, TreeOverview } from "@git-investigator/core/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapQueue } from "./map-queue";
import { requestHistories } from "./map-request";
import type { CoreState } from "./types";

export const AUTO_MAP_FILES = 3;
export const MAP_BATCH = 5;
export const IDLE_MS = 1000;

export type HistoryMapControl = {
  states: ReadonlyMap<string, CoreState>;
  mapped: number;
  mapping: number;
  remaining: number;
  mapMore: (() => void) | null;
  mapFile: (path: string) => void;
};

type Keyed<T> = { key: string; value: T };

function stateFor(h: FileHistory): CoreState {
  return { status: h.status, history: h };
}

export function useHistoryMap({
  repoPath,
  overview,
  token,
  active,
  busy,
}: {
  repoPath: string;
  overview: TreeOverview | null;
  token?: string;
  active: boolean;
  busy: boolean;
}): HistoryMapControl {
  const head = overview?.head ?? null;
  const mappable = !!overview?.mappable && !!head;
  const key = overview && head ? `${repoPath}@${head.sha}` : "";
  const files = useMemo(() => (overview?.files ?? []).filter((f) => !!f.blobSha), [overview]);

  const [queue] = useState(() => new MapQueue());
  const [states, setStates] = useState<Keyed<Map<string, CoreState>>>({
    key: "",
    value: new Map(),
  });
  const [cachedDone, setCachedDone] = useState("");
  const [autoDone, setAutoDone] = useState<Keyed<boolean>>({ key: "", value: false });
  const [autoQueued, setAutoQueued] = useState("");
  const latest = useRef(states);
  useEffect(() => {
    latest.current = states;
  });

  const current = useMemo(
    () => (states.key === key ? states.value : new Map<string, CoreState>()),
    [states, key],
  );
  const known = useCallback(
    () => (latest.current.key === key ? latest.current.value : new Map<string, CoreState>()),
    [key],
  );

  const patch = useCallback((forKey: string, update: (map: Map<string, CoreState>) => void) => {
    setStates((prev) => {
      const value = new Map(prev.key === forKey ? prev.value : []);
      update(value);
      return { key: forKey, value };
    });
  }, []);

  const release = useCallback(
    (forKey: string, batch: ShownFile[]) =>
      patch(forKey, (map) => {
        for (const f of batch) if (map.get(f.path)?.status === "mapping") map.delete(f.path);
      }),
    [patch],
  );

  const run = useCallback(
    (
      jobKey: string,
      batch: ShownFile[],
      mode: "cached" | "map",
      onDone: () => void = () => {},
      front = false,
    ) => {
      if (!head) return;
      const forKey = key;
      queue.enqueue(
        {
          key: jobKey,
          run: async (signal) => {
            try {
              const got = await requestHistories({
                repo: repoPath,
                ref: head.sha,
                files: batch,
                mode,
                token,
                signal,
              });
              patch(forKey, (map) => {
                for (const h of got) map.set(h.path, stateFor(h));
              });
            } finally {
              release(forKey, batch);
              if (!signal.aborted) onDone();
            }
          },
        },
        front,
      );
    },
    [head, key, repoPath, token, queue, patch, release],
  );

  const markMapping = useCallback(
    (paths: string[]) =>
      patch(key, (map) => {
        for (const p of paths) map.set(p, { status: "mapping", history: null });
      }),
    [key, patch],
  );

  const abortAll = useCallback(() => {
    queue.clear();
    setAutoQueued("");
    setStates((prev) => ({
      key: prev.key,
      value: new Map([...prev.value].filter(([, s]) => s.status !== "mapping")),
    }));
  }, [queue]);

  useEffect(() => {
    if (!key || !mappable || files.length === 0 || !active) return;
    run(`cached:${key}`, files, "cached", () => setCachedDone(key));
    return abortAll;
  }, [key, mappable, files, active, run, abortAll]);

  useEffect(() => {
    queue.setPaused(busy);
  }, [busy, queue]);

  const autoFinished = autoDone.key === key && autoDone.value;
  useEffect(() => {
    if (!mappable || !active || busy || cachedDone !== key || autoFinished || autoQueued === key) {
      return;
    }
    const t = setTimeout(() => {
      const batch = files.filter((f) => !known().has(f.path)).slice(0, AUTO_MAP_FILES);
      if (!batch.length) {
        setAutoDone({ key, value: true });
        return;
      }
      setAutoQueued(key);
      markMapping(batch.map((f) => f.path));
      run(`auto:${key}`, batch, "map", () => setAutoDone({ key, value: true }));
    }, IDLE_MS);
    return () => clearTimeout(t);
  }, [
    mappable,
    active,
    busy,
    cachedDone,
    key,
    autoFinished,
    autoQueued,
    files,
    known,
    run,
    markMapping,
  ]);

  const mapMore = useCallback(() => {
    const rest = files.filter((f) => !known().has(f.path));
    if (!rest.length) return;
    markMapping(rest.map((f) => f.path));
    for (let i = 0; i < rest.length; i += MAP_BATCH) {
      const batch = rest.slice(i, i + MAP_BATCH);
      run(`more:${key}:${batch[0].path}`, batch, "map");
    }
  }, [files, key, known, markMapping, run]);

  const mapFile = useCallback(
    (path: string) => {
      if (!mappable) return;
      const file = files.find((f) => f.path === path);
      if (!file || known().has(path)) return;
      markMapping([path]);
      run(`open:${key}:${path}`, [file], "map", undefined, true);
    },
    [files, key, known, mappable, markMapping, run],
  );

  const values = [...current.values()];
  const remaining = files.filter((f) => !current.has(f.path)).length;
  return {
    states: current,
    mapped: values.filter((s) => s.status === "mapped").length,
    mapping: values.filter((s) => s.status === "mapping").length,
    remaining,
    mapMore: mappable && remaining > 0 ? mapMore : null,
    mapFile,
  };
}
