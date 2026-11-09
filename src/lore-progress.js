const KEY = 'maras-postcard-story-v1';
/** Only earlier unlocked stages are known legacy wins; failure stars are not completion. */
export function completedStoryStages(unlockedStage = 1, recorded = []) {
  const unlocked = Math.max(1, Math.min(11, Math.floor(Number(unlockedStage) || 1)));
  const ids = Array.from({length:unlocked-1}, (_,i)=>i+1);
  if (Array.isArray(recorded)) ids.push(...recorded.filter(id=>Number.isInteger(id)&&id>=1&&id<=10));
  return [...new Set(ids)].sort((a,b)=>a-b);
}
export function loadStoryWins(storage = localStorage) {
  try { const value=JSON.parse(storage.getItem(KEY)||'[]');return completedStoryStages(1,value); }
  catch { return []; }
}
export function recordStoryWin(recorded, stage, storage = localStorage) {
  const next=completedStoryStages(1,[...recorded,stage]);
  try {storage.setItem(KEY,JSON.stringify(next));}catch { /* Story stays readable when storage is unavailable. */ }
  return next;
}
