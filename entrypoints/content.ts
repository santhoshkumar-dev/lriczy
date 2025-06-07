// @ts-nocheck

export default defineContentScript({
  matches: ["https://music.youtube.com/*"],

  main() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "GET_SONG_NAME") {
        (async () => {
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

          console.log("Popup asked for song →", songName, " by ", author);

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
              console.log("Found synced lyrics ✅");
            } else {
              console.log("No synced lyrics found.");
            }

            sendResponse({ songName, author, syncedLyrics });
          } catch (err) {
            console.error("Error fetching lyrics:", err);
            sendResponse({ songName, author, syncedLyrics: "" });
          }
        })();

        return true;
      }
    });

    setInterval(() => {
      const timeInfoElement = document.querySelector(
        "span.time-info.style-scope.ytmusic-player-bar"
      );

      if (timeInfoElement) {
        const timeText = timeInfoElement.textContent.trim();

        const parts = timeText.split("/");
        if (parts.length >= 1) {
          const currentTimeString = parts[0].trim();

          const currentTime = timeStringToSeconds(currentTimeString);

          chrome.runtime.sendMessage({
            type: "CURRENT_TIME_UPDATE",
            currentTime,
          });
        }
      }
    }, 300);

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
