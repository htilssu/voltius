package com.voltius.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import org.json.JSONArray

/**
 * Launcher shortcuts: long-press the app icon to connect to a recent host.
 *
 * The page (src/services/launcherShortcuts.ts) publishes its most recent hosts through
 * `window.VoltiusShortcuts.setRecent(json)` (`[{id, label}]`) and retires deleted ones with
 * `removeHosts(json)` (`[id]`). A shortcut carries the host id only, never a credential.
 *
 * Tapping one starts [ShortcutTrampoline] (not exported, so only the launcher acting for this
 * app can start it). The trampoline hands `voltius://connect?host=<id>` to MainActivity with a
 * per-process [token]; [gate] turns that into the VIEW intent the deep-link plugin reads and
 * drops every other voltius://connect (a web page or another app), so the page's `connect`
 * route can act unprompted. The trampoline also absorbs the NEW_TASK | CLEAR_TASK flags the
 * launcher adds to shortcut intents: on MainActivity they would destroy the running activity,
 * which ends the process with every SSH session (see MainActivity.finish).
 */
object LauncherShortcuts {
  const val ACTION_CONNECT = "com.voltius.app.action.CONNECT_HOST"
  const val EXTRA_TOKEN = "com.voltius.app.extra.SHORTCUT_TOKEN"
  private const val TAG = "VoltiusShortcuts"
  private const val PREFIX = "host:"
  private const val MAX = 4
  private const val MAX_LABEL = 64
  private val ID_RE = Regex("^[A-Za-z0-9_-]{1,64}$")

  /** Random per process and never persisted: proves a connect intent came from the trampoline. */
  val token: String = java.util.UUID.randomUUID().toString()

  fun install(ctx: Context, webView: WebView) {
    webView.addJavascriptInterface(Bridge(ctx.applicationContext), "VoltiusShortcuts")
  }

  fun connectUri(hostId: String): Uri =
    Uri.Builder().scheme("voltius").authority("connect").appendQueryParameter("host", hostId).build()

  /** Lets a voltius://connect link through only when the trampoline sent it. Matches the route
   *  the way the page parses it (authority, path or opaque form), so no spelling slips past. */
  fun gate(intent: Intent): Intent {
    val data = intent.data ?: return intent
    val raw = data.toString()
    if (!raw.startsWith("voltius:", ignoreCase = true)) return intent
    val route = raw.substring("voltius:".length).trimStart('/')
    if (!route.startsWith("connect", ignoreCase = true)) return intent
    val trusted = intent.action == ACTION_CONNECT && intent.getStringExtra(EXTRA_TOKEN) == token
    intent.removeExtra(EXTRA_TOKEN)
    if (trusted) {
      intent.action = Intent.ACTION_VIEW
    } else {
      Log.w(TAG, "dropped a connect link that did not come from a launcher shortcut")
      // A plain launch, not a VIEW without data: tao unwraps getType() on every VIEW intent.
      intent.action = Intent.ACTION_MAIN
      intent.data = null
    }
    return intent
  }

  private fun shortcutId(hostId: String) = PREFIX + hostId

  private fun ids(json: String): List<String> {
    val arr = JSONArray(json)
    return (0 until arr.length()).map { arr.optString(it) }.filter { ID_RE.matches(it) }
  }

  private fun build(ctx: Context, hostId: String, label: String, rank: Int): ShortcutInfoCompat {
    val intent = Intent(ctx, ShortcutTrampoline::class.java)
      .setAction(ACTION_CONNECT)
      .setData(connectUri(hostId))
    val text = label.ifBlank { hostId }.take(MAX_LABEL)
    return ShortcutInfoCompat.Builder(ctx, shortcutId(hostId))
      .setShortLabel(text)
      .setLongLabel(text)
      .setIcon(IconCompat.createWithResource(ctx, R.drawable.ic_shortcut_host))
      .setIntent(intent)
      .setRank(rank)
      .build()
  }

  private class Bridge(private val ctx: Context) {
    // JavaBridge thread: ShortcutManager calls are plain binder IPC, fine off the main thread.
    @JavascriptInterface
    fun setRecent(json: String) {
      try {
        val arr = JSONArray(json)
        val hosts = (0 until arr.length())
          .mapNotNull { arr.optJSONObject(it) }
          .map { it.optString("id") to it.optString("label") }
          .filter { ID_RE.matches(it.first) }
          .distinctBy { it.first }
          .take(minOf(MAX, ShortcutManagerCompat.getMaxShortcutCountPerActivity(ctx)))
        // A pinned copy disabled earlier (host deleted, then restored by sync) comes back.
        if (Build.VERSION.SDK_INT >= 25 && hosts.isNotEmpty()) {
          ctx.getSystemService(ShortcutManager::class.java)?.enableShortcuts(hosts.map { shortcutId(it.first) })
        }
        val list = hosts.mapIndexed { i, (id, label) -> build(ctx, id, label, i) }
        ShortcutManagerCompat.setDynamicShortcuts(ctx, list)
        Log.d(TAG, "published ${list.size}")
      } catch (e: Exception) {
        Log.w(TAG, "setRecent failed", e)
      }
    }

    @JavascriptInterface
    fun removeHosts(json: String) {
      try {
        val gone = ids(json).map(::shortcutId)
        if (gone.isEmpty()) return
        ShortcutManagerCompat.removeDynamicShortcuts(ctx, gone)
        // Pinned copies can't be removed by the app, only disabled (greyed out, with this message).
        ShortcutManagerCompat.disableShortcuts(ctx, gone, ctx.getString(R.string.shortcut_host_removed))
        Log.d(TAG, "retired ${gone.size}")
      } catch (e: Exception) {
        Log.w(TAG, "removeHosts failed", e)
      }
    }
  }
}

/** Invisible hop between a launcher shortcut and MainActivity, see [LauncherShortcuts]. */
class ShortcutTrampoline : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val data = intent?.data
    if (intent?.action == LauncherShortcuts.ACTION_CONNECT && data != null) {
      startActivity(
        Intent(this, MainActivity::class.java)
          .setAction(LauncherShortcuts.ACTION_CONNECT)
          .setData(data)
          .putExtra(LauncherShortcuts.EXTRA_TOKEN, LauncherShortcuts.token)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }
    finish()
    @Suppress("DEPRECATION")
    overridePendingTransition(0, 0)
  }
}
