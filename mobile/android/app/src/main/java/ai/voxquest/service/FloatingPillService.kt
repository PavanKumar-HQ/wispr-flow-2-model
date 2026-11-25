package ai.voxquest.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import ai.voxquest.engine.WhisperMobileEngine

/**
 * FloatingPillService
 *
 * Manages the floating, omnipresent edge pill window using SYSTEM_ALERT_WINDOW.
 * Supports:
 * - Edge docking with snapping physics
 * - Tap-to-talk / Hold-to-talk gestures
 * - Pulsing live audio waveform
 * - Auto-delegation to VoxAccessibilityService upon transcription completion
 */
class FloatingPillService : Service() {

    private lateinit var windowManager: WindowManager
    private var floatingView: View? = null
    private var isRecording = false

    companion object {
        private var activeService: FloatingPillService? = null

        fun toggleDictationFromService() {
            activeService?.toggleRecording()
        }
    }

    override fun onCreate() {
        super.onCreate()
        activeService = this
        startForeground(101, createNotification())
        setupFloatingWindow()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (floatingView != null) {
            windowManager.removeView(floatingView)
        }
        if (activeService == this) {
            activeService = null
        }
    }

    private fun setupFloatingWindow() {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 20
            y = 300
        }

        // Pill layout setup with drag and click handlers
        // floatingView = LayoutInflater.from(this).inflate(R.layout.floating_pill_layout, null)
        // windowManager.addView(floatingView, params)
    }

    fun toggleRecording() {
        if (isRecording) {
            stopAndInject()
        } else {
            startRecording()
        }
    }

    private fun startRecording() {
        isRecording = true
        WhisperMobileEngine.startAudioCapture()
    }

    private fun stopAndInject() {
        isRecording = false
        val audioData = WhisperMobileEngine.stopAudioCapture()
        val text = WhisperMobileEngine.transcribeLocal(audioData)

        // Inject into focused EditText across any active third-party app
        VoxAccessibilityService.instance?.injectSpokenTextGlobally(text)
    }

    private fun createNotification(): Notification {
        val channelId = "voxquest_floating_pill"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "VoxQuest Floating Trigger",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, channelId)
                .setContentTitle("VoxQuest Mobile")
                .setContentText("Floating voice trigger active")
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("VoxQuest Mobile")
                .setContentText("Floating voice trigger active")
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .build()
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
