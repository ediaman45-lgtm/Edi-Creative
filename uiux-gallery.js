
import { app } from "./firebase-config.js";

import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const db = getFirestore(app);

const galleryGrid = document.getElementById("galleryGrid");
const galleryModal = document.getElementById("galleryModal");

let uiuxProjects = [];
let loaded = false;
let loadError = false;

function validProjectLink(value) {
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function renderUIUXProjects() {
  if (!galleryGrid || !galleryModal) return;

  if (
    !galleryModal.open ||
    galleryModal.dataset.activeCategory !== "uiux"
  ) {
    return;
  }

  // Hapus hanya proyek UI/UX dinamis sebelumnya.
  // Giftory yang sudah ada tetap dipertahankan.
  galleryGrid
    .querySelectorAll("[data-uiux-project]")
    .forEach((item) => item.remove());

  if (loadError) {
    console.warn("Proyek UI/UX belum dapat dimuat.");
    return;
  }

  if (!loaded) return;

  uiuxProjects.forEach((project) => {
    if (!project.imageUrl) return;

    const item = document.createElement("div");
    item.className = "gallery-item";
    item.dataset.uiuxProject = project.id;

    const img = document.createElement("img");
    img.src = project.imageUrl;
    img.alt = project.title || "UI/UX Design";
    img.loading = "lazy";

    const title = document.createElement("h3");
    title.textContent = project.title || "Untitled UI/UX Project";

    const description = document.createElement("p");
    description.textContent = project.description || "";

    item.append(img, title, description);

    if (validProjectLink(project.projectUrl || "")) {
      const link = document.createElement("a");
      link.href = project.projectUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "btn";
      link.textContent = "View Project →";
      link.style.cssText =
        "display:inline-block;margin-top:20px;";

      item.appendChild(link);
    }

    galleryGrid.appendChild(item);
  });
}

// Mengambil proyek UI/UX dari Firestore secara realtime
onSnapshot(
  collection(db, "uiux_projects"),
  (snapshot) => {
    uiuxProjects = snapshot.docs.map((projectDoc) => ({
      id: projectDoc.id,
      ...projectDoc.data()
    }));

    uiuxProjects.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    loaded = true;
    loadError = false;

    renderUIUXProjects();
  },
  (error) => {
    console.error("Gagal memuat UI/UX:", error);
    loadError = true;
    renderUIUXProjects();
  }
);

// Ketika tombol UI/UX diklik, tunggu script.js
// selesai membuat tampilan Giftory.
document.querySelectorAll('[data-gallery="uiux"]').forEach((button) => {
  button.addEventListener("click", () => {
    if (!galleryModal) return;

    galleryModal.dataset.activeCategory = "uiux";

    // script.js menampilkan Giftory menggunakan setTimeout(0).
    // Jalankan render setelah proses tersebut selesai.
    setTimeout(renderUIUXProjects, 0);
  });
});
