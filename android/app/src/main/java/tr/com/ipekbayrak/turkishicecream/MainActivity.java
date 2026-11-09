package tr.com.ipekbayrak.turkishicecream;

import android.os.Bundle;
import android.content.pm.ApplicationInfo;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen awake during active gameplay
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Enable immersive fullscreen game mode (sticky bars)
        enableImmersiveFullscreen();

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0
                && (getIntent().getBooleanExtra("maras_touch_probe", false)||getIntent().getBooleanExtra("maras_flow_probe", false))) {
            String replay = getIntent().getBooleanExtra("maras_flow_probe", false) ? "runFlow" : "run";
            getIntent().removeExtra("maras_flow_probe");getIntent().removeExtra("maras_touch_probe");
            try {
                Class.forName("tr.com.ipekbayrak.turkishicecream.TouchProbe")
                    .getMethod(replay, android.webkit.WebView.class).invoke(null, bridge.getWebView());
            } catch (ReflectiveOperationException e) {
                android.util.Log.e("MarasTouchProbe", "Debug replay unavailable", e);
            }
        }

        // Optional local benchmark assets exist only in diagnostic debug builds.
        // Normal launches and release builds always open the game unchanged.
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0
                && getIntent().getBooleanExtra("maras_soak", false)) {
            int scoops = Math.max(1, Math.min(8, getIntent().getIntExtra("soak_scoops", 8)));
            int seconds = Math.max(30, Math.min(900, getIntent().getIntExtra("soak_seconds", 600)));
            bridge.getWebView().post(() -> bridge.getWebView().loadUrl(
                    bridge.getAppUrl().replaceAll("/+$", "")
                    + "/tests/mobile-soak-preview.html?autorun=1&scoops=" + scoops + "&duration=" + seconds));
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enableImmersiveFullscreen();
        }
    }

    private void enableImmersiveFullscreen() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        }
    }
}
