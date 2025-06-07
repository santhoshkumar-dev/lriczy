let lyricsArray = [];
let lyricsState = {
  previous: "",
  current: "",
  next: "",
};
let displayedLyric = ""; // For fade control
let fadeClass = "fade-in"; // fade-in or fade-out

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

chrome.runtime.sendMessage({ type: "GET_CURRENT_LYRICS" }, (response) => {
  if (response && response.syncedLyrics) {
    document.getElementById("songTitle").innerText =
      response.songName + " - " + response.author;

    lyricsArray = parseSyncedLyrics(response.syncedLyrics);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "BROADCAST_LYRICS") {
    console.log("Floating window: received BROADCAST_LYRICS");

    document.getElementById("songTitle").innerText =
      message.songName + " - " + message.author;

    lyricsArray = parseSyncedLyrics(message.syncedLyrics);
  }

  if (message.type === "CURRENT_TIME_UPDATE") {
    const currentTime = message.currentTime;

    for (let i = 0; i < lyricsArray.length; i++) {
      const current = lyricsArray[i];
      const next = lyricsArray[i + 1];
      const prev = lyricsArray[i - 1];

      if (currentTime >= current.time && (!next || currentTime < next.time)) {
        // Only when current lyric changes, trigger fade
        if (current.text !== lyricsState.current) {
          triggerLyricFade(current.text);
        }

        lyricsState = {
          previous: prev ? prev.text : "",
          current: current.text,
          next: next ? next.text : "",
        };

        // Update previous and next lines:
        updatePreviousNextLines();

        break;
      }
    }
  }
});

function updatePreviousNextLines() {
  const previousEl = document.getElementById("previousLyric");
  const nextEl = document.getElementById("nextLyric");

  if (lyricsState.previous) {
    previousEl.innerText = lyricsState.previous;
    previousEl.className = "lyrics-line previous-style";
  } else {
    previousEl.innerHTML = "&nbsp;";
    previousEl.className = "lyrics-line previous-hidden";
  }

  if (lyricsState.next) {
    nextEl.innerText = lyricsState.next;
    nextEl.className = "lyrics-line next-style";
  } else {
    nextEl.innerHTML = "&nbsp;";
    nextEl.className = "lyrics-line next-hidden";
  }
}

// Fade out → change lyric → fade in
function triggerLyricFade(newLyric) {
  const currentEl = document.getElementById("currentLyric");

  // Fade out
  currentEl.classList.remove("fade-in");
  currentEl.classList.add("fade-out");

  setTimeout(() => {
    // Change lyric
    currentEl.innerText = newLyric;

    // Fade in
    currentEl.classList.remove("fade-out");
    currentEl.classList.add("fade-in");

    displayedLyric = newLyric;
  }, 200); // match your App.tsx fade-out duration
}
