// @ts-nocheck

export default defineContentScript({
  matches: ["https://music.youtube.com/*"],

  main() {
    // WebSocket client → connects to Electron app
    const socket = new WebSocket("ws://localhost:12345");

    socket.addEventListener("open", () => {
      console.log("WebSocket connected to Electron");
    });

    // Send lyrics to Electron app
    function sendLyricsToElectron(songName, author, lyricsState) {
      const message = {
        songName,
        author,
        lyricsState, // now send { previous, current, next }
        timestamp: Date.now(),
      };

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    }

    let lastKnownTime = 0;
    let previousSongId = "";
    let cachedLyrics = "";
    let syncedLyrics = [];

    async function fetchLyrics(songName, author) {
      console.log("Fetching lyrics for:", songName, "by", author);

      // Build query
      let query = songName;
      if (author && author !== "Unknown author") {
        query = author + " " + songName;
      }

      const apiUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(
        query
      )}`;

      console.log("Fetching lyrics from:", apiUrl);

      try {
        const apiResponse = await fetch(apiUrl);
        const json = await apiResponse.json();

        let newSyncedLyrics = "";
        if (json && json.length > 0 && json[0].syncedLyrics) {
          newSyncedLyrics = json[0].syncedLyrics;
          console.log("Synced lyrics found ✅");
        } else {
          console.log("No synced lyrics found.");
        }

        cachedLyrics = newSyncedLyrics;
        syncedLyrics = parseSyncedLyrics(newSyncedLyrics);

        // Broadcast to background:
        chrome.runtime.sendMessage({
          type: "LYRICS_UPDATED",
          songName,
          author,
          syncedLyrics: newSyncedLyrics,
        });
      } catch (err) {
        console.error("Error fetching lyrics:", err);
        cachedLyrics = "";
        syncedLyrics = [];

        chrome.runtime.sendMessage({
          type: "LYRICS_UPDATED",
          songName,
          author,
          syncedLyrics: "",
        });
      }
    }

    async function checkForSongChange() {
      const titleElement = document.querySelector(
        "yt-formatted-string.title.style-scope.ytmusic-player-bar"
      );

      const authorLinkElement = document.querySelector(
        'yt-formatted-string.byline.style-scope.ytmusic-player-bar a[href^="channel"]'
      );

      let author = "Unknown author";

      if (authorLinkElement && authorLinkElement.textContent) {
        author = authorLinkElement.textContent.trim();
      } else {
        // Fallback to first span inside byline
        const authorSpanElement = document.querySelector(
          "yt-formatted-string.byline.style-scope.ytmusic-player-bar > span"
        );
        if (authorSpanElement && authorSpanElement.textContent) {
          author = authorSpanElement.textContent.trim();
        }
      }

      const songName =
        titleElement && titleElement.textContent
          ? titleElement.textContent.trim()
          : "No song playing";

      const currentSongId = songName + " - " + author;

      const timeInfoElement = document.querySelector(
        "span.time-info.style-scope.ytmusic-player-bar"
      );

      if (timeInfoElement) {
        const timeText = timeInfoElement.textContent.trim();

        const parts = timeText.split("/");
        if (parts.length >= 1) {
          const currentTimeString = parts[0].trim();
          const currentTime = timeStringToSeconds(currentTimeString);

          // Detect song change:
          if (currentSongId !== previousSongId) {
            console.log("Detected song change →", currentSongId);
            previousSongId = currentSongId;
            lastKnownTime = currentTime;

            await fetchLyrics(songName, author);

            // Send empty lyric to Electron → clear previous lyric
            sendLyricsToElectron(songName, author, "");
          } else {
            // Detect if time reset (e.g. song restarted / next song):
            if (currentTime < lastKnownTime) {
              console.log("Detected time reset → re-fetching lyrics");
              previousSongId = currentSongId;
              lastKnownTime = currentTime;

              await fetchLyrics(songName, author);
            } else {
              lastKnownTime = currentTime;
            }
          }

          // Always send CURRENT_TIME_UPDATE:
          chrome.runtime.sendMessage({
            type: "CURRENT_TIME_UPDATE",
            currentTime,
          });

          // Send CURRENT lyric to Electron:
          // Find current lyric index:
          let currentIndex = -1;
          for (let i = 0; i < syncedLyrics.length; i++) {
            const current = syncedLyrics[i];
            const next = syncedLyrics[i + 1];

            if (
              currentTime >= current.time &&
              (!next || currentTime < next.time)
            ) {
              currentIndex = i;
              break;
            }
          }

          if (currentIndex >= 0) {
            const current = syncedLyrics[currentIndex];
            const prev = syncedLyrics[currentIndex - 1];
            const next = syncedLyrics[currentIndex + 1];

            sendLyricsToElectron(songName, author, {
              previous: prev ? prev.text : "",
              current: current.text,
              next: next ? next.text : "",
            });
          }
        }
      }
    }

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

    function timeStringToSeconds(timeString) {
      const parts = timeString.split(":").map(Number);
      if (parts.length === 2) {
        const min = parts[0];
        const sec = parts[1];
        return min * 60 + sec;
      } else {
        return 0;
      }
    }

    setInterval(checkForSongChange, 2000); // Check every 2 seconds

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "GET_SONG_NAME") {
        // Respond with cached data immediately → no refetch
        const titleElement = document.querySelector(
          "yt-formatted-string.title.style-scope.ytmusic-player-bar"
        );

        const authorLinkElement = document.querySelector(
          'yt-formatted-string.byline.style-scope.ytmusic-player-bar a[href^="channel"]'
        );

        const songName =
          titleElement && titleElement.textContent
            ? titleElement.textContent.trim()
            : "No song playing";

        const author =
          authorLinkElement && authorLinkElement.textContent
            ? authorLinkElement.textContent.trim()
            : "Unknown author";

        sendResponse({
          songName,
          author,
          syncedLyrics: cachedLyrics,
        });

        return true;
      }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "PLAYER_ACTION") {
        const action = message.action;

        if (action === "playPause") {
          const playPauseButton = document.querySelector(
            'button[aria-label="Play"], button[aria-label="Pause"]'
          );
          if (playPauseButton) playPauseButton.click();
        }

        if (action === "next") {
          const nextButton = document.querySelector(
            `button[aria-label="Next"]`
          );
          if (nextButton) nextButton.click();
        }

        if (action === "previous") {
          const prevButton = document.querySelector(
            `button[aria-label="Previous"]`
          );
          if (prevButton) prevButton.click();
        }
      }
    });
  },
});
