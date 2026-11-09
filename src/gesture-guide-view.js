/** One continuous shape; the illuminated part is earned by the player's hand. */
export function drawFigureEightGuide(ctx, guide) {
  if (!guide?.points?.length) return;
  const path=points=>{
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  };
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  path(guide.points);ctx.strokeStyle='#21120775';ctx.lineWidth=9;ctx.stroke();
  ctx.setLineDash([3,7]);ctx.strokeStyle='#fff1c5a6';ctx.lineWidth=2.5;ctx.stroke();ctx.setLineDash([]);
  if(guide.completedPoints?.length>1){
    path(guide.completedPoints);ctx.strokeStyle='#69e8ab';ctx.lineWidth=4;ctx.stroke();
  }
  ctx.restore();
}
