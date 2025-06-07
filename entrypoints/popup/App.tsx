// @ts-nocheck
import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [songName, setSongName] = useState("Loading...");
  const [author, setAuthor] = useState("Loading...");
  const [syncedLyrics, setSyncedLyrics] = useState([]);
  const [currentLyric, setCurrentLyric] = useState("");

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

          if (
            currentTime >= current.time &&
            (!next || currentTime < next.time)
          ) {
            setCurrentLyric(current.text);

            chrome.runtime.sendMessage({
              type: "UPDATE_FLOATING_LYRIC",
              lyric: current.text,
            });

            break;
          }
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [syncedLyrics]);

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

  function handleOpenLyricsWindow() {
    chrome.windows.create(
      {
        url: chrome.runtime.getURL("lyrics_window.html"),
        type: "popup",
        width: 400,
        height: 200,
        focused: true,
      },
      (newWindow) => {
        // Immediately send current lyric → so window does not show Waiting
        chrome.runtime.sendMessage({
          type: "UPDATE_FLOATING_LYRIC",
          lyric: currentLyric,
        });
      }
    );
  }

  return (
    <div className="min-w-[320px] p-4 bg-gray-900 text-white rounded-md shadow-lg space-y-3">
      <h1 className="text-xl font-bold text-indigo-400 text-center">
        🎵 Lyrics Sync
      </h1>

      <div>
        <p className="text-sm text-gray-400">Current Song:</p>
        <h3 className="text-lg font-semibold truncate">🎵 {songName}</h3>
      </div>

      <div>
        <p className="text-sm text-gray-400">Author:</p>
        <h3 className="text-lg font-semibold truncate">👤 {author}</h3>
      </div>

      <div>
        <p className="text-sm text-gray-400">Current Lyric:</p>
        <h3 className="text-lg font-semibold text-yellow-400 h-16 flex items-center justify-center text-center">
          {currentLyric || "Waiting..."}
        </h3>
      </div>

      <button
        onClick={handleOpenLyricsWindow}
        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 w-full"
      >
        Open Floating Lyrics Window
      </button>
    </div>
  );
}

export default App;
