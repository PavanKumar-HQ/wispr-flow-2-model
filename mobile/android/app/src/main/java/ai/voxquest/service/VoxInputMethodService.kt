package ai.voxquest.service

import android.inputmethodservice.InputMethodService
import android.view.View
import android.view.inputmethod.EditorInfo
import ai.voxquest.engine.WhisperMobileEngine

/**
 * VoxInputMethodService
 *
 * Custom Android IME (Keyboard Extension) that provides an integrated
 * one-touch microphone voice bar above standard soft-keyboards.
 * Uses InputConnection.commitText() directly, requiring ZERO special system permissions.
 */
class VoxInputMethodService : InputMethodService() {

    override fun onCreateInputView(): View {
        // Returns the custom keyboard layout containing the VoxQuest Voice Bar
        // return layoutInflater.inflate(R.layout.vox_keyboard_view, null)
        return View(this)
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
    }

    /**
     * Commits transcribed text directly to the current input connection.
     */
    fun commitSpokenTranscript(transcript: String) {
        val ic = currentInputConnection ?: return
        ic.commitText(transcript, 1)
    }
}

