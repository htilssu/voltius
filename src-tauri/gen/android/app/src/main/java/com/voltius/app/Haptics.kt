package com.voltius.app

import android.os.Build
import android.util.Log
import android.view.HapticFeedbackConstants
import android.webkit.JavascriptInterface
import android.webkit.WebView

/**
 * Haptic ticks for the web UI (src/lib/haptics.ts): `window.VoltiusHaptics.perform(kind)`.
 *
 * Plays View.performHapticFeedback on the WebView, so the system "Touch feedback"
 * setting and the device's vibrator profile apply exactly as for native controls (no
 * VIBRATE permission, no custom waveforms). Newer constants fall back to the closest
 * one on older releases. Every call logs `VoltiusHaptics: <kind> -> <result>`, the
 * return value of performHapticFeedback (`adb logcat -s VoltiusHaptics`).
 */
object Haptics {
  private const val TAG = "VoltiusHaptics"

  /** Kind name (from JS) → HapticFeedbackConstants value for this API level, null if unknown. */
  private fun constantFor(kind: String, sdk: Int = Build.VERSION.SDK_INT): Int? = when (kind) {
    "key" -> HapticFeedbackConstants.KEYBOARD_TAP
    "tick" -> HapticFeedbackConstants.CLOCK_TICK
    "press" -> HapticFeedbackConstants.LONG_PRESS
    "confirm" -> if (sdk >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY
    "reject" -> if (sdk >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS
    "gesture" -> if (sdk >= 30) HapticFeedbackConstants.GESTURE_END else HapticFeedbackConstants.CLOCK_TICK
    "toggleOn" -> if (sdk >= 34) HapticFeedbackConstants.TOGGLE_ON else HapticFeedbackConstants.CLOCK_TICK
    "toggleOff" -> if (sdk >= 34) HapticFeedbackConstants.TOGGLE_OFF else HapticFeedbackConstants.CLOCK_TICK
    else -> null
  }

  fun install(webView: WebView) {
    webView.addJavascriptInterface(Bridge(webView), "VoltiusHaptics")
  }

  private class Bridge(private val webView: WebView) {
    // JavaBridge thread: the view call belongs to the main thread, so it is posted and
    // the answer only says whether the kind is known; the real result goes to logcat.
    @JavascriptInterface
    fun perform(kind: String): Boolean {
      val constant = constantFor(kind) ?: return false
      webView.post {
        val ok = webView.performHapticFeedback(constant)
        Log.d(TAG, "$kind -> $ok")
      }
      return true
    }
  }
}
