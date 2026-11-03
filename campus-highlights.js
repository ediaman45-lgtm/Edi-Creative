
import { app } from "./firebase-config.js";

import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const db = getFirestore(app);
const gallery = document.getElementById("campusHighlightsGrid");

function showEmptyGallery() {
  gallery.innerHTML = `
    <div class="empty-gallery campus-gallery-empty">
      <i class="fas fa-camera-retro"></i>
      <h3>Memories in the Making</h3>
      <p>Photos, campus activities, and achievements will be added here.</p>
    </div>
  `;
}

// Membuka foto ukuran penuh
function openLightbox(imageUrl) {
  const lightbox = document.createElement("div");
  lightbox.className = "campus-lightbox";

  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = "Campus Highlight Photo";

  const closeButton = document.createElement("button");
  closeButton.className = "campus-lightbox-close";
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Tutup foto");

  function closeLightbox() {
    lightbox.remove();
    document.removeEventListener("keydown", handleKeydown);
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      closeLightbox();
    }
  }

  closeButton.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", handleKeydown);

  lightbox.append(image, closeButton);
  document.body.appendChild(lightbox);
}

// Membuat kartu Campus Highlight
function createHighlightCard(item) {
  const card = document.createElement("article");
  card.className = "campus-highlight-card";

  const imagesContainer = document.createElement("div");
  imagesContainer.className = "campus-highlight-images";

  const images = Array.isArray(item.images) ? item.images : [];

  images.forEach((image, index) => {
    if (!image || typeof image.imageUrl !== "string") return;

    const img = document.createElement("img");
    img.src = image.imageUrl;
    img.alt = `${item.title || "Campus highlight"} - foto ${index + 1}`;
    img.loading = "lazy";

    img.addEventListener("click", () => {
      openLightbox(image.imageUrl);
    });

    imagesContainer.appendChild(img);
  });

  const content = document.createElement("div");
  content.className = "campus-highlight-content";

  if (item.date) {
    const date = document.createElement("div");
    date.className = "campus-highlight-date";
    date.textContent = item.date;
    content.appendChild(date);
  }

  const title = document.createElement("h3");
  title.textContent = item.title || "Campus Memory";

  const description = document.createElement("p");
  description.textContent = item.description || "";

  content.append(title, description);

  if (imagesContainer.children.length > 0) {
    card.appendChild(imagesContainer);
  }

  card.appendChild(content);

  return card;
}

// Memuat data dari Firebase
if (gallery) {
  const highlightsQuery = query(
    collection(db, "campus_highlights"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(
    highlightsQuery,
    (snapshot) => {
      gallery.replaceChildren();

      if (snapshot.empty) {
        showEmptyGallery();
        return;
      }

      snapshot.forEach((documentSnapshot) => {
        const item = documentSnapshot.data();
        gallery.appendChild(createHighlightCard(item));
      });
    },
    (error) => {
      console.error("Gagal memuat Campus Highlights:", error);
      showEmptyGallery();
    }
  );
}
