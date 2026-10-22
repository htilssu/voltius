package com.voltius.app

import android.content.ComponentCallbacks
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver

/**
 * Pushes the phone's light/dark mode and, on Android 12+, its Material You (wallpaper) tonal
 * palettes to the page as `window.__voltiusSystemColors = {dark, palette}` + a `window` event
 * `voltius:system-colors` (D1). The page builds its "Material You" theme from the palette and
 * follows `dark` for the "Follow system" theme mode.
 *
 * `palette` is null below API 31; otherwise five 13-tone arrays (`a1`/`a2`/`a3`/`n1`/`n2`,
 * shades 0, 10, 50, 100 .. 1000 of `android.R.color.system_<palette>_<shade>`, i.e. tones
 * 100, 99, 95, 90 .. 0). Re-pushed only when it changes: uiMode / asset-paths configuration
 * changes (both in the activity configChanges, so a wallpaper change no longer relaunches the
 * activity and reloads the page) and on resume as a catch-all.
 */
object SystemColors {
  private val SHADES = intArrayOf(0, 10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000)
  private val PALETTES = listOf("a1" to "accent1", "a2" to "accent2", "a3" to "accent3", "n1" to "neutral1", "n2" to "neutral2")

  private val script = PageScript("SystemColors")
  private var webView: WebView? = null
  private var last: String? = null
  private var appCallbacks = false

  /** From onWebViewCreate (again for a recreated activity: the new WebView gets a fresh push). */
  fun install(activity: ComponentActivity, webView: WebView) {
    this.webView = webView
    last = null
    push(activity)
    activity.addOnConfigurationChangedListener { activity.window.decorView.post { push(activity) } }
    activity.lifecycle.addObserver(LifecycleEventObserver { _, event ->
      if (event == Lifecycle.Event.ON_RESUME) push(activity)
    })
    // Overlay (palette) changes reach the application even when the activity isn't told.
    if (!appCallbacks) {
      appCallbacks = true
      activity.application.registerComponentCallbacks(object : ComponentCallbacks {
        override fun onConfigurationChanged(newConfig: Configuration) {
          val a = MainActivity.instance ?: return
          a.window.decorView.post { push(a) }
        }

        @Deprecated("Deprecated in Java")
        override fun onLowMemory() {}
      })
    }
  }

  private fun push(ctx: Context) {
    val wv = webView ?: return
    val night = ctx.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
    val payload = "{\"dark\":${night == Configuration.UI_MODE_NIGHT_YES},\"palette\":${palette(ctx)}}"
    if (payload == last) return
    last = payload
    val js = "(function(){var d=$payload;window.__voltiusSystemColors=d;" +
      "window.dispatchEvent(new CustomEvent('voltius:system-colors',{detail:d}));})();"
    script.set(wv, js)
  }

  private fun palette(ctx: Context): String {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return "null"
    val res = ctx.resources
    val out = StringBuilder("{")
    for ((i, pair) in PALETTES.withIndex()) {
      val (key, name) = pair
      if (i > 0) out.append(',')
      out.append("\"").append(key).append("\":[")
      for ((j, shade) in SHADES.withIndex()) {
        val id = res.getIdentifier("system_${name}_$shade", "color", "android")
        if (id == 0) return "null"
        if (j > 0) out.append(',')
        out.append("\"#%06x\"".format(ctx.getColor(id) and 0xffffff))
      }
      out.append(']')
    }
    return out.append('}').toString()
  }
}
