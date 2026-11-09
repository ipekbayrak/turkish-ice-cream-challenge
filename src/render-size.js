/** Resizing a canvas clears its backing store, even when the size is unchanged.
 * Keep the same resolution while avoiding duplicate resize/orientation events. */
export function resizeRenderer(renderer,width,height,pixelRatio,previous=null) {
  if(previous?.width===width&&previous.height===height&&previous.pixelRatio===pixelRatio)return previous;
  renderer.setDrawingBufferSize(width,height,pixelRatio);
  renderer.domElement.style.width=`${width}px`;
  renderer.domElement.style.height=`${height}px`;
  return {width,height,pixelRatio};
}

export function resizeOverlay(canvas,context,width,height,pixelRatio,previous=null) {
  if(previous?.width===width&&previous.height===height&&previous.pixelRatio===pixelRatio)return previous;
  canvas.width=Math.round(width*pixelRatio);canvas.height=Math.round(height*pixelRatio);
  context.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  return {width,height,pixelRatio};
}
