package com.voltius.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/** Held while tunnels are up or SSH sessions are connected, so Android neither freezes the
 *  backgrounded app nor cuts its network (which drops every SSH connection about a minute
 *  after leaving the app). Driven over JNI from `port_forward/keepalive.rs` through
 *  [updateTunnels] (one line per listening tunnel) and [updateSessions] (connected SSH
 *  sessions). The notification lists the tunnels and offers "Stop tunnels", which closes
 *  every tunnel through Rust ([nativeStopTunnels]) and leaves the SSH sessions alone. */
class VoltiusTunnelService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // startForeground must run for every startForegroundService, even when the tunnels
    // already closed in the meantime, or the system kills the app.
    val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
    try {
      synchronized(lock) { ServiceCompat.startForeground(this, NOTIFICATION_ID, notification(this), type) }
    } catch (e: Exception) {
      stopSelf()
      return START_NOT_STICKY
    }
    if (intent?.action == ACTION_STOP_TUNNELS) stopTunnels()
    apply()
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    if (instance === this) instance = null
    starting = false
    super.onDestroy()
  }

  // Under [lock], like every state change: Rust updates arrive on its own threads while the
  // service runs this on the main thread, and an unlocked post could land after a newer one
  // with a stale snapshot (seen with Stop tunnels: the last tunnel stayed listed).
  private fun apply() = synchronized(lock) {
    if (tunnels.isEmpty() && sessions == 0) {
      ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
      stopSelf()
    } else {
      getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification(this))
    }
  }

  // Rust closes them asynchronously and reports back through updateTunnels.
  private fun stopTunnels() {
    try {
      nativeStopTunnels()
    } catch (e: UnsatisfiedLinkError) {
      Log.w(TAG, "native lib not loaded", e)
    }
  }

  companion object {
    private const val TAG = "VoltiusTunnelService"
    private const val CHANNEL_ID = "tunnels"
    private const val NOTIFICATION_ID = 0x7e1
    private const val ACTION_STOP_TUNNELS = "com.voltius.app.action.STOP_TUNNELS"
    /** Lines shown expanded; the rest is summed up as "+N more". */
    private const val MAX_LINES = 5

    @Volatile private var instance: VoltiusTunnelService? = null
    @Volatile private var tunnels: List<String> = emptyList()
    @Volatile private var sessions = 0
    @Volatile private var starting = false
    private val lock = Any()

    /** Closes every tunnel (keepalive.rs); SSH sessions stay connected. */
    @JvmStatic
    external fun nativeStopTunnels()

    /** Listening tunnels, one `L 8080 → db:5432` line each, `\n`-joined; with no session
     *  either, an empty list stops the service. */
    @JvmStatic
    fun updateTunnels(ctx: Context, lines: String) {
      synchronized(lock) { tunnels = lines.split('\n').filter { it.isNotBlank() } }
      sync(ctx)
    }

    /** Number of connected SSH sessions; with no tunnel either, 0 stops the service. */
    @JvmStatic
    fun updateSessions(ctx: Context, count: Int) {
      synchronized(lock) { sessions = count }
      sync(ctx)
    }

    private fun sync(ctx: Context) {
      val count = tunnels.size + sessions
      val running = instance
      if (running != null) {
        running.apply()
        return
      }
      if (count == 0 || starting) return
      try {
        starting = true
        ContextCompat.startForegroundService(ctx, Intent(ctx, VoltiusTunnelService::class.java))
        // First background-relevant moment (a session or tunnel just went up): ask once.
        MainActivity.instance?.requestNotificationPermission()
      } catch (e: Exception) {
        // Android 12+ refuses a start from the background; the next change retries.
        starting = false
      }
    }

    private fun notification(ctx: Context): Notification {
      val manager = ctx.getSystemService(NotificationManager::class.java)
      if (Build.VERSION.SDK_INT >= 26) {
        // Re-created every time so an existing channel picks up a renamed label.
        val channel = NotificationChannel(
          CHANNEL_ID,
          ctx.getString(R.string.tunnel_channel_name),
          NotificationManager.IMPORTANCE_LOW,
        )
        manager.createNotificationChannel(channel)
      }
      val res = ctx.resources
      val lines = tunnels
      val t = lines.size
      val s = sessions
      val tunnelTitle = res.getQuantityString(R.plurals.tunnel_notification_title, t, t)
      // Sessions: plain launcher intent (resumes the app where it was); tunnels only: their screen.
      val target = if (s > 0) {
        ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
          ?: Intent(ctx, MainActivity::class.java)
      } else {
        Intent(Intent.ACTION_VIEW, Uri.parse("voltius://port-forwarding"), ctx, MainActivity::class.java)
      }
      val open = PendingIntent.getActivity(
        ctx,
        0,
        target,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
      val title = if (s > 0) res.getQuantityString(R.plurals.session_notification_title, s, s) else tunnelTitle
      val text = when {
        s > 0 && t > 0 -> tunnelTitle
        s > 0 -> ctx.getString(R.string.session_notification_text)
        else -> ctx.getString(R.string.tunnel_notification_text)
      }
      val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_stat_tunnel)
        .setContentTitle(title)
        .setContentText(text)
        .setContentIntent(open)
        .setCategory(NotificationCompat.CATEGORY_SERVICE)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      if (t > 0) {
        // Expanded: one line per forward; with sessions too, the port count is the summary.
        val style = NotificationCompat.InboxStyle().setBigContentTitle(title)
        lines.take(MAX_LINES).forEach { style.addLine(it) }
        if (t > MAX_LINES) {
          style.addLine(res.getQuantityString(R.plurals.tunnel_notification_more, t - MAX_LINES, t - MAX_LINES))
        }
        if (s > 0) style.setSummaryText(tunnelTitle)
        builder.setStyle(style)
        // Tunnels only: the sessions have their own way out (the app), and a tunnel-labelled
        // button must not drop someone's shell.
        val stop = PendingIntent.getService(
          ctx,
          1,
          Intent(ctx, VoltiusTunnelService::class.java).setAction(ACTION_STOP_TUNNELS),
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        builder.addAction(R.drawable.ic_stat_tunnel, ctx.getString(R.string.tunnel_action_stop), stop)
      }
      return builder.build()
    }
  }
}
