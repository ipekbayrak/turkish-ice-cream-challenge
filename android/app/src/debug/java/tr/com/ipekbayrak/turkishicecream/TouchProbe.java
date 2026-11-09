package tr.com.ipekbayrak.turkishicecream;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.drawable.Drawable;
import android.os.SystemClock;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.webkit.WebView;

/** Debug-only black-box touch replay through the normal WebView input path.
 * Hold 8s, drag 8s, hold 4s; the ring marks physical contact, not game aim. */
public final class TouchProbe {
    public static void run(WebView view) {
        replay(view, false);
    }
    public static void runFlow(WebView view) {
        replayRelative(view);
    }
    /** Exercise the production relative input on the physical WebView. */
    private static void replayRelative(WebView view) {
        view.postDelayed(() -> {
            final long start=SystemClock.uptimeMillis();
            final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
            paint.setColor(Color.WHITE);paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(3);
            final float[] point={0,0};final boolean[] held={false};
            Drawable marker=new Drawable(){
                public void draw(Canvas c){if(!held[0])return;c.drawCircle(point[0],point[1],22,paint);c.drawLine(point[0]-30,point[1],point[0]+30,point[1],paint);c.drawLine(point[0],point[1]-30,point[0],point[1]+30,paint);}
                public void setAlpha(int a){paint.setAlpha(a);}
                public void setColorFilter(ColorFilter f){paint.setColorFilter(f);}
                public int getOpacity(){return PixelFormat.TRANSLUCENT;}
            };
            marker.setBounds(0,0,view.getWidth(),view.getHeight());view.getOverlay().add(marker);
            final float[] ends={.65f,1.10f,3.10f,3.70f,7.50f,8.10f,8.40f,8.65f,9.10f,10.55f,12.55f,13f};
            final float[][] paths={{.75f,.90f,.75f,.90f},{.75f,.90f,.628f,.788f},{.628f,.788f,.628f,.788f},{.628f,.788f,.378f,.859f},{.378f,.859f,.378f,.859f},{.378f,.859f,.446f,.847f},{.446f,.847f,.446f,.847f},{.80f,.90f,.80f,.90f},{.80f,.90f,.698f,.90f},{.698f,.90f,.698f,.90f},{.25f,.90f,.25f,.90f},{.25f,.90f,.25f,.90f}};
            final String[] labels={"contact-no-jump","reach-cone","cone-held","choose-white","order-held-into-play","drag-right","release-return","regrab-no-jump","drag-left","return-home","stationary-held","done"};
            Runnable replay=new Runnable(){int previous=-1;long down=start;
                public void run(){
                    long now=SystemClock.uptimeMillis();float t=(now-start)/1000f;int phase=0;while(phase<ends.length-1&&t>=ends[phase])phase++;
                    if(phase!=previous){android.util.Log.i("MarasTouchProbe",labels[phase]);previous=phase;}
                    float beginning=phase==0?0:ends[phase-1],blend=Math.max(0,Math.min(1,(t-beginning)/(ends[phase]-beginning)));
                    float[] p=paths[phase];point[0]=view.getWidth()*(p[0]+(p[2]-p[0])*blend);point[1]=view.getHeight()*(p[1]+(p[3]-p[1])*blend);
                    boolean active=phase!=6&&phase!=9&&phase!=11;
                    if(active||held[0]){
                        int action=!active?MotionEvent.ACTION_UP:held[0]?MotionEvent.ACTION_MOVE:MotionEvent.ACTION_DOWN;
                        if(action==MotionEvent.ACTION_DOWN)down=now;
                        MotionEvent event=MotionEvent.obtain(down,now,action,point[0],point[1],0);event.setSource(InputDevice.SOURCE_TOUCHSCREEN);view.dispatchTouchEvent(event);event.recycle();
                    }
                    held[0]=active;marker.invalidateSelf();
                    if(t<13&&view.isAttachedToWindow())view.postDelayed(this,16);else view.getOverlay().remove(marker);
                }
            };replay.run();
        },2000);
    }
    private static void replay(WebView view, boolean flow) {
        view.postDelayed(() -> {
            final long down=SystemClock.uptimeMillis();
            final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
            paint.setColor(Color.WHITE);paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(3);
            final float[] point={view.getWidth()*.25f,view.getHeight()*.72f};
            Drawable marker=new Drawable(){
                public void draw(Canvas c){c.drawCircle(point[0],point[1],22,paint);c.drawLine(point[0]-30,point[1],point[0]+30,point[1],paint);c.drawLine(point[0],point[1]-30,point[0],point[1]+30,paint);}
                public void setAlpha(int a){paint.setAlpha(a);}
                public void setColorFilter(ColorFilter f){paint.setColorFilter(f);}
                public int getOpacity(){return PixelFormat.TRANSLUCENT;}
            };
            marker.setBounds(0,0,view.getWidth(),view.getHeight());view.getOverlay().add(marker);
            Runnable replay=new Runnable(){boolean first=true;
                public void run(){
                    long now=SystemClock.uptimeMillis();float t=(now-down)/1000f;
                    point[0]=view.getWidth()*(flow?(t<3.2f?.55f:.17f+.58f*Math.max(0,Math.min(1,(t-9)/8))):(.25f+.5f*Math.max(0,Math.min(1,(t-8)/8))));
                    point[1]=view.getHeight()*(flow?(t<3.2f?.585f:.67f):.72f);
                    int action=first?MotionEvent.ACTION_DOWN:t>=20?MotionEvent.ACTION_UP:MotionEvent.ACTION_MOVE;
                    first=false;MotionEvent event=MotionEvent.obtain(down,now,action,point[0],point[1],0);
                    event.setSource(InputDevice.SOURCE_TOUCHSCREEN);view.dispatchTouchEvent(event);event.recycle();marker.invalidateSelf();
                    if(t<20&&view.isAttachedToWindow())view.postDelayed(this,16);else view.getOverlay().remove(marker);
                }
            };replay.run();
        },2000);
    }
}
