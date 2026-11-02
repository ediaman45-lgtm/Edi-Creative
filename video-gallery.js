
import { app } from "./firebase-config.js";

import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const db = getFirestore(app);

const galleryGrid = document.getElementById("galleryGrid");
const galleryModal = document.getElementById("galleryModal");

let videoProjects = [];
let loadError = false;

// Mengambil video dari Firebase secara realtime
onSnapshot(
  collection(db, "video_projects"),
  (snapshot) => {
    videoProjects = snapshot.docs.map((videoDoc) => ({
      id: videoDoc.id,
      ...videoDoc.data()
    }));

    videoProjects.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    loadError = false;
    refreshVideoGallery();
  },
  (error) => {
    console.error("Gagal memuat Video Projects:", error);
    loadError = true;
    refreshVideoGallery();
  }
);

// Mengambil ID video dari URL YouTube
function getYouTubeId(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be" ||
        parsed.hostname === "www.youtu.be") {
      return parsed.pathname.split("/")[1] || null;
    }

    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(parsed.hostname)) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }

      const match = parsed.pathname.match(
        /^\/(shorts|embed|live)\/([^/]+)/
      );

      return match ? match[2] : null;
    }
  } catch (error) {
    return null;
  }

  return null;
}

function refreshVideoGallery() {
  if (!galleryGrid || !galleryModal) return;

  if (galleryModal.dataset.activeCategory !== "video") {
    return;
  }

  galleryGrid
    .querySelectorAll("[data-video-project]")
    .forEach((item) => item.remove());

  if (loadError) {
    const message = document.createElement("p");
    message.dataset.videoProject = "error";
    message.textContent = "Gagal memuat video dari Firebase.";
    galleryGrid.appendChild(message);
    return;
  }

  videoProjects.forEach((project) => {
    const videoUrl = project.videoUrl || project.url || project.link || "";
    const youtubeId = getYouTubeId(videoUrl);

    const thumbnail =
      project.thumbnailUrl ||
      project.thumbnail ||
      (youtubeId
        ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
        : "");

    const item = document.createElement("div");
    item.className = "gallery-item";
    item.dataset.videoProject = project.id;

    if (thumbnail) {
      const img = document.createElement("img");
      img.src = thumbnail;
      img.alt = project.title || "Video Project";
      img.loading = "lazy";
      item.appendChild(img);
    }

    const title = document.createElement("h3");
    title.textContent = project.title || "Untitled Video";

    const description = document.createElement("p");
    description.textContent = project.description || "";

    item.append(title, description);

    if (videoUrl) {
      const button = document.createElement("a");
      button.href = videoUrl;
      button.target = "_blank";
      button.rel = "noopener noreferrer";
      button.textContent = "▶ Lihat Video";
      button.className = "video-project-link";
      button.style.cssText = `
        display: inline-block;
        margin-top: 18px;
        padding: 12px 22px;
        border-radius: 10px;
        background: linear-gradient(90deg, #30d5f5, #9061ff);
        color: #080d1d;
        font-weight: 700;
        text-decoration: none;
      `;

      item.appendChild(button);
    }

    galleryGrid.appendChild(item);
  });
}

// Menampilkan video setelah script.js selesai merender galeri
document.querySelectorAll('[data-gallery="video"]').forEach((button) => {
  button.addEventListener("click", () => {
    if (!galleryModal) return;

    galleryModal.dataset.activeCategory = "video";

    queueMicrotask(refreshVideoGallery);
  });
});
