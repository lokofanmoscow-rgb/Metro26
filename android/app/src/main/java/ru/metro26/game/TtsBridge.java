package ru.metro26.game;

import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;

/** Голосовые объявления игры через системный синтезатор речи Android (window.AndroidTTS). */
public class TtsBridge {
    TextToSpeech tts;
    volatile boolean ready = false;

    @JavascriptInterface
    public void speak(String text, int male) {
        if (tts == null || !ready) return;
        tts.setPitch(male == 1 ? 0.85f : 1.1f);
        tts.setSpeechRate(1.0f);
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "metro26");
    }

    @JavascriptInterface
    public void stop() {
        if (tts != null) tts.stop();
    }

    @JavascriptInterface
    public boolean available() {
        return ready;
    }
}
