const KEY = 'maras-cultural-discoveries-v1';

/** Discoveries never mutate the game's hearts, scores, venue unlocks or order. */
export class DiscoveryProgress {
  constructor(catalog, storage) {
    this.catalog = new Map(catalog.map(item => [item.id, item]));
    if (storage === undefined) {
      try { storage = globalThis.localStorage; } catch { storage = null; }
    }
    this.storage = storage;
    this.found = new Set();
    try {
      const saved = JSON.parse(storage?.getItem(KEY) || '[]');
      if (Array.isArray(saved)) for (const id of saved) if (this.catalog.has(id)) this.found.add(id);
    } catch { /* Private browsing and damaged discovery data stay playable. */ }
  }
  canInspect(id, venueId, unlockedStage) {
    const item = this.catalog.get(id);
    return Boolean(item && item.venueId === venueId && (item.unlockStage || 1) <= unlockedStage);
  }
  discover(id, venueId, unlockedStage) {
    if (!this.canInspect(id, venueId, unlockedStage)) return false;
    const fresh = !this.found.has(id);
    this.found.add(id);
    if (fresh) try { this.storage?.setItem(KEY, JSON.stringify([...this.found])); } catch { /* Session discoveries still work. */ }
    return fresh;
  }
  count(venueId) {
    return [...this.found].filter(id => !venueId || this.catalog.get(id)?.venueId === venueId).length;
  }
  get ids() { return [...this.found]; }
}
