
import { app } from "./firebase-config.js";

import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const db = getFirestore(app);
const container = document.getElementById("storiesContainer");

const categories = [
  { id: "my-day", name: "My Day" },
  { id: "projects", name: "Projects" },
  { id: "behind-scenes", name: "Behind the Scenes" },
  { id: "achievements", name: "Achievements" }
];

let activeViewer = null;

const storiesQuery = query(
  collection(db, "stories"),
  where("published", "==", true)
);

onSnapshot(storiesQuery, (snapshot) => {
  const stories = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));

  container.innerHTML = "";

  categories.forEach((category) => {
    const items = stories
      .filter((story) => story.category === category.id)
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });

    if (!items.length) return;

    const button = document.createElement("button");
    button.className = "story-circle";
    button.type = "button";

    const image = document.createElement("img");
    image.src = items[items.length - 1].mediaUrl;
    image.alt = category.name;

    const label = document.createElement("span");
    label.textContent = category.name;

    button.append(image, label);
    button.addEventListener("click", () => openStories(items, category.name));

    container.appendChild(button);
  });

  if (!container.children.length) {
    container.textContent = "Belum ada Stories.";
  }
}, (error) => {
  console.error("Gagal memuat Stories:", error);
  container.textContent = "Stories belum dapat dimuat.";
});

function openStories(items, categoryName) {
  if (activeViewer) activeViewer();

  let currentIndex = 0;
  let timer = null;
  let animationFrame = null;
  let startTime = 0;
  let duration = 5000;
  let closed = false;
  let currentMedia = null;

  const viewer = document.createElement("div");
  viewer.className = "story-viewer";

  const storyBox = document.createElement("div");
  storyBox.className = "story-player";

  const progressContainer = document.createElement("div");
  progressContainer.className = "story-progress-container";

  const title = document.createElement("div");
  title.className = "story-player-title";
  title.textContent = categoryName;

  const mediaContainer = document.createElement("div");
  mediaContainer.className = "story-media-container";

  const close = document.createElement("button");
  close.className = "story-close";
  close.textContent = "✕";
  close.setAttribute("aria-label", "Tutup Story");

  const previous = document.createElement("button");
  previous.className = "story-nav story-prev";
  previous.textContent = "❮";
  previous.setAttribute("aria-label", "Story sebelumnya");

  const next = document.createElement("button");
  next.className = "story-nav story-next";
  next.textContent = "❯";
  next.setAttribute("aria-label", "Story berikutnya");

  storyBox.append(
    progressContainer,
    title,
    mediaContainer,
    previous,
    next,
    close
  );

  viewer.appendChild(storyBox);
  document.body.appendChild(viewer);
  document.body.style.overflow = "hidden";

  function stopPlayback() {
    clearTimeout(timer);
    cancelAnimationFrame(animationFrame);

    if (currentMedia?.tagName === "VIDEO") {
      currentMedia.pause();
      currentMedia.onended = null;
      currentMedia.onloadedmetadata = null;
      currentMedia.onerror = null;
    }
  }

  function closeViewer() {
    if (closed) return;
    closed = true;

    stopPlayback();
    viewer.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", handleKeyboard);
    activeViewer = null;
  }

  function nextStory() {
    if (currentIndex < items.length - 1) {
      currentIndex++;
      showStory();
    } else {
      closeViewer();
    }
  }

  function previousStory() {
    if (currentIndex > 0) {
      currentIndex--;
      showStory();
    } else {
      showStory();
    }
  }

  function animateProgress(fill, totalDuration) {
    startTime = performance.now();

    function update(now) {
      if (closed) return;

      const elapsed = now - startTime;
      const percentage = Math.min((elapsed / totalDuration) * 100, 100);

      fill.style.width = percentage + "%";

      if (percentage < 100) {
        animationFrame = requestAnimationFrame(update);
      }
    }

    animationFrame = requestAnimationFrame(update);
  }

  function showStory() {
    stopPlayback();
    mediaContainer.innerHTML = "";
    progressContainer.innerHTML = "";

    const story = items[currentIndex];

    const progressBars = items.map((_, index) => {
      const bar = document.createElement("div");
      bar.className = "story-progress-bar";

      const fill = document.createElement("div");
      fill.className = "story-progress-fill";

      if (index < currentIndex) {
        fill.style.width = "100%";
      }

      bar.appendChild(fill);
      progressContainer.appendChild(bar);
      return fill;
    });

    const media = document.createElement(
      story.mediaType === "video" ? "video" : "img"
    );

    currentMedia = media;
    media.src = story.mediaUrl;

    mediaContainer.appendChild(media);

    previous.style.display = currentIndex === 0 ? "none" : "block";
    next.style.display = "block";

    const currentFill = progressBars[currentIndex];

    if (story.mediaType === "video") {
      media.autoplay = true;
      media.playsInline = true;
      media.controls = true;

      media.onloadedmetadata = () => {
        if (closed || currentMedia !== media) return;

        duration = Number.isFinite(media.duration)
          ? media.duration * 1000
          : 5000;

        animateProgress(currentFill, duration);
      };

      media.onended = nextStory;

      media.play().catch(() => {
        // Pengunjung dapat menekan Play jika autoplay diblokir.
      });
    } else {
      duration = 5000;
      animateProgress(currentFill, duration);
      timer = setTimeout(nextStory, duration);
    }
  }

  function handleKeyboard(event) {
    if (event.key === "Escape") closeViewer();
    if (event.key === "ArrowRight") nextStory();
    if (event.key === "ArrowLeft") previousStory();
  }

  close.addEventListener("click", closeViewer);
  next.addEventListener("click", nextStory);
  previous.addEventListener("click", previousStory);

  document.addEventListener("keydown", handleKeyboard);

  activeViewer = closeViewer;
  showStory();
}
