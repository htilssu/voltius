package com.voltius.app

import android.app.Activity
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.content.FileProvider
import org.json.JSONArray
import java.io.File

/**
 * Outgoing share sheet (`window.VoltiusShare`, used by src/services/share.ts).
 *
 * `shareText(text, title)` sends text/plain (a public key line, a snippet's commands).
 * `shareFiles(json, mime, title)` sends remote files the page downloaded first through the
 * normal transfer path into `cache/voltius-downloads/share-<transfer id>/` (see
 * `download_temp_path`). Only files inside those folders are accepted, so the page can't hand
 * out anything else from app storage (vault DB, settings). They go out as FileProvider
 * content:// URIs with a one-shot read grant, carried by the chooser through ClipData.
 *
 * Staged files are pruned when they are older than [STAGE_TTL_MS], at startup and before every
 * file share: the target app may still be reading the current one, so it is never deleted
 * right away.
 */
object ShareSheet {
  private const val TAG = "VoltiusShare"
  private const val STAGE_ROOT = "voltius-downloads"
  private const val STAGE_PREFIX = "share-"
  private const val STAGE_TTL_MS = 60 * 60_000L
  private const val MAX_FILES = 100

  fun install(activity: Activity, webView: WebView) {
    val ctx = activity.applicationContext
    webView.addJavascriptInterface(Bridge(ctx), "VoltiusShare")
    Thread { prune(ctx) }.start()
  }

  private fun stageRoot(ctx: Context) = File(ctx.cacheDir, STAGE_ROOT)

  /** Deletes staged share folders older than the TTL (all of them with [all]). */
  fun prune(ctx: Context, all: Boolean = false) {
    val now = System.currentTimeMillis()
    stageRoot(ctx).listFiles()?.forEach { dir ->
      if (dir.name.startsWith(STAGE_PREFIX) && (all || now - dir.lastModified() > STAGE_TTL_MS)) {
        dir.deleteRecursively()
      }
    }
  }

  /** The file, if it is a regular file directly inside a share staging folder. */
  private fun staged(ctx: Context, path: String): File? {
    val root = stageRoot(ctx).canonicalFile
    val file = File(path).canonicalFile
    val dir = file.parentFile ?: return null
    if (dir.parentFile != root || !dir.name.startsWith(STAGE_PREFIX)) return null
    return file.takeIf { it.isFile }
  }

  private fun launch(ctx: Context, send: Intent, title: String): Boolean {
    val chooser = Intent.createChooser(send, title.ifBlank { null })
    val activity = MainActivity.instance
    return try {
      if (activity != null) {
        activity.runOnUiThread {
          try {
            activity.startActivity(chooser)
          } catch (e: Exception) {
            Log.w(TAG, "chooser failed", e)
          }
        }
      } else {
        ctx.startActivity(chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      true
    } catch (e: Exception) {
      Log.w(TAG, "chooser failed", e)
      false
    }
  }

  private class Bridge(private val ctx: Context) {
    @JavascriptInterface
    fun shareText(text: String?, title: String?): Boolean {
      if (text.isNullOrEmpty()) return false
      val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
        if (!title.isNullOrBlank()) putExtra(Intent.EXTRA_TITLE, title)
      }
      Log.i(TAG, "text (${text.length} chars)")
      return launch(ctx, send, title ?: "")
    }

    @JavascriptInterface
    fun shareFiles(json: String?, mime: String?, title: String?): Boolean {
      val paths = try {
        val arr = JSONArray(json ?: return false)
        (0 until arr.length()).map { arr.getString(it) }
      } catch (e: Exception) {
        return false
      }
      if (paths.isEmpty() || paths.size > MAX_FILES) return false
      val files = paths.map { staged(ctx, it) ?: run {
        Log.w(TAG, "refused a path outside the share staging folder")
        return false
      } }
      prune(ctx)
      val authority = "${ctx.packageName}.fileprovider"
      val uris = try {
        files.map { FileProvider.getUriForFile(ctx, authority, it) }
      } catch (e: Exception) {
        Log.w(TAG, "no FileProvider uri", e)
        return false
      }
      val type = mime?.takeIf { Regex("^[a-z*]+/[A-Za-z0-9.+*-]+$").matches(it) } ?: "*/*"
      val send = if (uris.size == 1) {
        Intent(Intent.ACTION_SEND).putExtra(Intent.EXTRA_STREAM, uris[0])
      } else {
        Intent(Intent.ACTION_SEND_MULTIPLE).putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList<Uri>(uris))
      }
      send.type = type
      // The grant reaches the picked app through ClipData (the chooser copies it over).
      val clip = ClipData.newUri(ctx.contentResolver, files[0].name, uris[0])
      uris.drop(1).forEach { clip.addItem(ClipData.Item(it)) }
      send.clipData = clip
      send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      if (!title.isNullOrBlank()) send.putExtra(Intent.EXTRA_TITLE, title)
      Log.i(TAG, "files ${uris.size} $type")
      return launch(ctx, send, title ?: "")
    }
  }
}
