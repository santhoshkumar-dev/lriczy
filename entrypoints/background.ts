// @ts-nocheck

export default defineBackground(() => {
  let syncedLyrics = [];

  chrome.runtime.sendMessage({ type: "GET_SONG_NAME" }, (response) => {
    if (response && response.syncedLyrics) {
      syncedLyrics = response.syncedLyrics;
      console.log("Received syncedLyrics:", syncedLyrics);

      // Initially render lyrics
      renderLyrics(-1);
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "CURRENT_TIME_UPDATE") {
      const currentTime = message.currentTime;

      let currentIndex = -1;

      for (let i = 0; i < syncedLyrics.length; i++) {
        const current = syncedLyrics[i];
        const next = syncedLyrics[i + 1];

        if (currentTime >= current.time && (!next || currentTime < next.time)) {
          currentIndex = i;
          break;
        }
      }

      renderLyrics(currentIndex);
    }
  });

  function renderLyrics(currentIndex) {
    const lyricsList = document.getElementById("lyricsList");
    lyricsList.innerHTML = "";

    syncedLyrics.forEach((line, index) => {
      const div = document.createElement("div");

      if (index < currentIndex) {
        div.className = "text-gray-400";
      } else if (index === currentIndex) {
        div.className = "text-white text-xl font-bold";
      } else {
        div.className = "text-gray-500";
      }

      div.innerText = line.text;
      lyricsList.appendChild(div);
    });

    // Optional → scroll current line into center view
    const currentEl = lyricsList.children[currentIndex];
    if (currentEl) {
      currentEl.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }
});
