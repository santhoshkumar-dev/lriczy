// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [songName, setSongName] = useState("Loading...");
  const [author, setAuthor] = useState("Loading...");
  const [syncedLyrics, setSyncedLyrics] = useState([]);
  const [lyricsState, setLyricsState] = useState({
    previous: "",
    current: "",
    next: "",
  });

  // For fade control
  const [displayedLyric, setDisplayedLyric] = useState(""); // what is shown now
  const [fadeClass, setFadeClass] = useState("opacity-100"); // fade in/out class

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;

      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "GET_SONG_NAME" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            setSongName("Error: " + chrome.runtime.lastError.message);
            setAuthor("Unknown author");
          } else {
            const song = response?.songName || "No song playing";
            const authorName = response?.author || "Unknown author";

            setSongName(song);
            setAuthor(authorName);

            if (response?.syncedLyrics) {
              const parsedLyrics = parseSyncedLyrics(response.syncedLyrics);
              setSyncedLyrics(parsedLyrics);
            } else {
              setSyncedLyrics([]);
            }
          }
        }
      );
    });
  }, []);

  // Listen for CURRENT_TIME_UPDATE
  useEffect(() => {
    const handleMessage = (message) => {
      if (message.type === "CURRENT_TIME_UPDATE") {
        const currentTime = message.currentTime;

        for (let i = 0; i < syncedLyrics.length; i++) {
          const current = syncedLyrics[i];
          const next = syncedLyrics[i + 1];
          const prev = syncedLyrics[i - 1];

          if (
            currentTime >= current.time &&
            (!next || currentTime < next.time)
          ) {
            if (current.text !== lyricsState.current) {
              triggerLyricFade(current.text);
            }

            setLyricsState({
              previous: prev ? prev.text : "",
              current: current.text,
              next: next ? next.text : "",
            });

            chrome.runtime.sendMessage({
              type: "UPDATE_FLOATING_LYRIC",
              lyric: current.text,
            });

            break;
          }
        }
      }

      // ADD THIS:
      if (message.type === "BROADCAST_LYRICS") {
        console.log("App received BROADCAST_LYRICS", message.songName);

        const parsedLyrics = parseSyncedLyrics(message.syncedLyrics);
        setSyncedLyrics(parsedLyrics);

        setLyricsState({
          previous: "",
          current: "",
          next: "",
        });

        triggerLyricFade(""); // Reset displayed lyric
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [syncedLyrics, lyricsState.current]);

  function parseSyncedLyrics(syncedLyrics) {
    const lines = syncedLyrics.split("\n");
    const parsed = [];

    const timeRegex = /\[(\d+):(\d+\.\d+)\]/;

    lines.forEach((line) => {
      const match = timeRegex.exec(line);
      if (match) {
        const min = parseInt(match[1]);
        const sec = parseFloat(match[2]);
        const timeInSeconds = min * 60 + sec;
        const text = line.replace(timeRegex, "").trim();
        parsed.push({ time: timeInSeconds, text });
      }
    });

    return parsed;
  }

  // Fade out → change lyric → fade in
  function triggerLyricFade(newLyric) {
    setFadeClass("opacity-0"); // fade out
    setTimeout(() => {
      setDisplayedLyric(newLyric); // change lyric
      setFadeClass("opacity-100"); // fade in
    }, 200); // fade out duration (ms) → you can tune this
  }

  // On first mount, set displayed lyric too
  useEffect(() => {
    setDisplayedLyric(lyricsState.current);
  }, []);

  const openFloatingLyricsWindow = () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("lyrics_window.html"),
      type: "popup",
      focused: true,
      width: 500,
      height: 250,
      top: 100,
      left: 100,
    });
  };

  function sendPlayerAction(action) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;

      chrome.tabs.sendMessage(tabs[0].id, { type: "PLAYER_ACTION", action });
    });
  }

  return (
    <div className="min-w-2xl p-4 bg-gray-900 text-white rounded-md shadow-lg space-y-3">
      <h1 className="text-xl font-bold text-indigo-400 text-center">
        🎵 Lyrics Sync
      </h1>

      <button
        onClick={openFloatingLyricsWindow}
        className="px-4 py-2 bg-indigo-600 rounded text-white"
      >
        Open Floating Lyrics
      </button>

      <div>
        <p className="text-sm text-gray-400">Current Song:</p>
        <h3 className="text-lg font-semibold truncate">🎵 {songName}</h3>
      </div>

      <div>
        <p className="text-sm text-gray-400">Author:</p>
        <h3 className="text-lg font-semibold truncate">👤 {author}</h3>
      </div>

      {/* Previous Lyric */}
      <div className="text-center text-[#b3b3b3] text-xl relative h-[2em] overflow-hidden">
        <span
          className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out"
          style={{
            opacity: lyricsState.previous ? 0.6 : 0,
            transform: lyricsState.previous
              ? "translateY(0) scale(0.9)"
              : "translateY(40px) scale(0.8)",
            filter: lyricsState.previous ? "blur(0.5px)" : "blur(4px)",
          }}
        >
          {lyricsState.previous || <>&nbsp;</>}
        </span>
      </div>

      {/* Current Lyric → premium fade version */}
      {/* Current Lyric → premium fade version */}
      <div className="text-center text-white text-3xl font-bold relative h-[2em] overflow-hidden">
        <span
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out ${fadeClass}`}
          style={{
            transform: "translateY(0) scale(1)",
            textShadow: "0 0 15px rgba(30, 215, 96, 0.4)",
            willChange: "opacity",
          }}
        >
          {/* Render each word */}
          {displayedLyric ? (
            displayedLyric.split(" ").map((word, index) => (
              <span
                key={index}
                className="current-lyric-word"
                style={{
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                {word + " "}
              </span>
            ))
          ) : (
            <>&nbsp;</>
          )}
        </span>
      </div>

      {/* Next Lyric */}
      <div className="text-center text-[#a0a0a0] text-xl relative h-[2em] overflow-hidden">
        <span
          className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out"
          style={{
            opacity: lyricsState.next ? 0.6 : 0,
            transform: lyricsState.next
              ? "translateY(0) scale(0.9)"
              : "translateY(-40px) scale(0.8)",
            filter: lyricsState.next ? "blur(0.5px)" : "blur(4px)",
          }}
        >
          {lyricsState.next || <>&nbsp;</>}
        </span>
      </div>

      <div className="flex gap-3 items-center">
        <button type="button" onClick={() => sendPlayerAction("playPause")}>
          Play / Pause
        </button>

        <button type="button" onClick={() => sendPlayerAction("previous")}>
          Previous
        </button>

        <button type="button" onClick={() => sendPlayerAction("next")}>
          Next
        </button>
      </div>
    </div>
  );
}

export default App;
