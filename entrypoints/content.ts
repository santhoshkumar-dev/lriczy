// @ts-nocheck

export default defineContentScript({
  matches: ["https://music.youtube.com/*"],

  main() {
    let lastKnownTime = 0;
    let previousSongId = "";
    let cachedLyrics = "";

    async function fetchLyrics(songName, author) {
      const apiUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(
        author + " " + songName
      )}`;

      console.log("Fetching lyrics from:", apiUrl);

      try {
        const apiResponse = await fetch(apiUrl);
        const json = await apiResponse.json();

        let syncedLyrics = "";
        if (json && json.length > 0 && json[0].syncedLyrics) {
          syncedLyrics = json[0].syncedLyrics;
          console.log("Synced lyrics found:", syncedLyrics);
          console.log("Found synced lyrics ✅");
        } else {
          console.log("No synced lyrics found.");
        }

        // Update cachedLyrics
        cachedLyrics = syncedLyrics;

        // Broadcast to background:
        chrome.runtime.sendMessage({
          type: "LYRICS_UPDATED",
          songName,
          author,
          syncedLyrics,
        });
      } catch (err) {
        console.error("Error fetching lyrics:", err);
        cachedLyrics = "";

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

      const songName =
        titleElement && titleElement.textContent
          ? titleElement.textContent.trim()
          : "No song playing";

      const author =
        authorLinkElement && authorLinkElement.textContent
          ? authorLinkElement.textContent.trim()
          : "Unknown author";

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
        }
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
  },
});
