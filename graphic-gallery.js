
import { app } from "./firebase-config.js";

import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const db = getFirestore(app);

const galleryGrid = document.getElementById("galleryGrid");
const galleryModal = document.getElementById("galleryModal");

let firebaseProjects = [];
let loaded = false;
let loadError = false;

// Menyimpan daftar karya dari Firebase secara realtime
onSnapshot(
  collection(db, "graphic_projects"),
  (snapshot) => {
    firebaseProjects = snapshot.docs.map((projectDoc) => ({
      id: projectDoc.id,
      ...projectDoc.data()
    }));

    firebaseProjects.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    loaded = true;
    loadError = false;

    // Perbarui galeri jika sedang dibuka
    if (galleryModal?.open &&
        galleryModal.dataset.activeCategory === "graphic") {
      renderFirebaseProjects();
    }
  },
  (error) => {
    console.error("Gagal memuat Graphic Design:", error);
    loadError = true;

    if (galleryModal?.open &&
        galleryModal.dataset.activeCategory === "graphic") {
      renderFirebaseProjects();
    }
  }
);

function renderFirebaseProjects() {
  if (!galleryGrid) return;

  // Hapus hanya karya Firebase yang sebelumnya ditambahkan
  galleryGrid
    .querySelectorAll("[data-firebase-project]")
    .forEach((item) => item.remove());

  if (loadError) {
    console.warn("Karya Firebase belum dapat ditampilkan.");
    return;
  }

  if (!loaded) return;

  firebaseProjects.forEach((project) => {
    if (!project.imageUrl) return;

    const item = document.createElement("div");
    item.className = "gallery-item";
    item.dataset.firebaseProject = project.id;

    const img = document.createElement("img");
    img.src = project.imageUrl;
    img.alt = project.title || "Graphic Design";
    img.loading = "lazy";

    img.addEventListener("click", () => {
      window.open(project.imageUrl, "_blank", "noopener");
    });

    const title = document.createElement("h3");
    title.textContent = project.title || "Untitled Design";

    const description = document.createElement("p");
    description.textContent = project.description || "";

    item.append(img, title, description);
    galleryGrid.appendChild(item);
  });
}

// Berjalan setelah script.js merender 9 karya lama
document.querySelectorAll('[data-gallery="graphic"]').forEach((button) => {
  button.addEventListener("click", () => {
    if (!galleryModal) return;

    galleryModal.dataset.activeCategory = "graphic";

    // Menunggu handler galeri lama selesai
    queueMicrotask(renderFirebaseProjects);
  });
});

// Tandai kategori lain agar pembaruan Firebase tidak
// menambahkan karya Graphic Design ke galeri UI/UX atau Video
document.querySelectorAll("[data-gallery]").forEach((button) => {
  if (button.dataset.gallery === "graphic") return;

  button.addEventListener("click", () => {
    if (galleryModal) {
      galleryModal.dataset.activeCategory = button.dataset.gallery;
    }
  });
});
