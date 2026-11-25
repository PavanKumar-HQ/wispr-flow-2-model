package ai.voxquest.service

import android.accessibilityservice.AccessibilityService
import android.os.Bundle
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * VoxAccessibilityService
 *
 * Core Android background service enabling:
 * 1. Global text injection into any third-party app (WhatsApp, Slack, Telegram, Gmail, Chrome)
 *    without relying on clipboard copying.
 * 2. Hardware key intercept (e.g. double-press volume down) for instant push-to-talk.
 */
class VoxAccessibilityService : AccessibilityService() {

    companion object {
        var instance: VoxAccessibilityService? = null
            private set
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
    }

    /**
     * Injects formatted transcribed text directly into whichever input field is currently active.
     */
    fun injectSpokenTextGlobally(formattedText: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val focusedNode = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: return false

        return if (focusedNode.isEditable) {
            val args = Bundle().apply {
                putCharSequence(
                    AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                    formattedText
                )
            }
            focusedNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
        } else {
            false
        }
    }

    /**
     * Intercepts physical hardware key presses (e.g. volume keys) for hands-free dictation triggers.
     */
    override fun onKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_VOLUME_DOWN && event.action == KeyEvent.ACTION_DOWN) {
            if (event.repeatCount == 1) {
                // Double-click detected: trigger floating pill recording
                FloatingPillService.toggleDictationFromService()
                return true
            }
        }
        return super.onKeyEvent(event)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Track active focus shifts if needed for smart app-specific terminology
    }

    override fun onInterrupt() {}
}

