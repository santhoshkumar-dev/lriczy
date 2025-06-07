// @ts-nocheck

// @ts-nocheck

export default defineBackground(() => {
  console.log("Background script loaded ✅");

  // Memory cache:
  let currentSong = "";
  let currentAuthor = "";
  let currentLyrics = "";

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "LYRICS_UPDATED") {
      console.log("Background received LYRICS_UPDATED:", message.songName);
      console.log("Author:", message);

      currentSong = message.songName;
      currentAuthor = message.author;
      currentLyrics = message.syncedLyrics;

      // Broadcast to all popup/floating windows:
      chrome.runtime.sendMessage({
        type: "BROADCAST_LYRICS",
        songName: currentSong,
        author: currentAuthor,
        syncedLyrics: currentLyrics,
      });
    }

    if (message.type === "GET_CURRENT_LYRICS") {
      sendResponse({
        songName: currentSong,
        author: currentAuthor,
        syncedLyrics: currentLyrics,
      });
    }
  });
});
