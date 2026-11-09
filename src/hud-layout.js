/** Keep information on the canopy, clear of bells, faces and the touch area. */
export function encounterHudLayout(width,height,safeTop,bellTop) {
  const landscape=width>height,top=Math.max(8,safeTop||0);
  const cueTop=top+52;
  return{landscape,top,cueTop,captionMaxHeight:landscape?96:Math.max(36,bellTop-cueTop-8)};
}
