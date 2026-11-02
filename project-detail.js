
import { app } from "./firebase-config.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const db = getFirestore(app);

const statusElement = document.getElementById("detailStatus");
const projectContent = document.getElementById("projectContent");
const screensContainer = document.getElementById("projectScreens");

const lightbox = document.getElementById("detailLightbox");
const lightboxImage = document.getElementById("detailLightboxImage");
const lightboxClose = document.getElementById("detailLightboxClose");

function setText(id, value, fallback = "Belum tersedia") {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value || fallback;
  }
}

function validUrl(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function showError(message) {
  statusElement.textContent = message;
  statusElement.style.color = "#ff8585";
  projectContent.classList.add("detail-hidden");
}

function openLightbox(imageUrl, altText) {
  lightboxImage.src = imageUrl;
  lightboxImage.alt = altText;
  lightbox.classList.add("active");
  lightbox.setAttribute("aria-hidden", "false");
  lightboxClose.focus();
}

function closeLightbox() {
  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.removeAttribute("src");
}

lightboxClose.addEventListener("click", closeLightbox);

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLightbox();
});

function renderScreens(project) {
  screensContainer.replaceChildren();

  // Mendukung beberapa gambar yang akan disimpan
  // melalui Admin Dashboard.
  const screenshots = Array.isArray(project.screenshots)
    ? project.screenshots
    : [];

  // Untuk proyek lama yang hanya memiliki satu gambar.
  const images = screenshots.length
    ? screenshots
    : project.imageUrl
      ? [project.imageUrl]
      : [];

  images.forEach((screen, index) => {
    const imageUrl =
      typeof screen === "string" ? screen : screen?.url;

    const caption =
      typeof screen === "object" && screen?.caption
        ? screen.caption
        : `Project Screen ${index + 1}`;

    if (!validUrl(imageUrl)) return;

    const card = document.createElement("div");
    card.className = "screen-card";

    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = caption;
    image.loading = "lazy";
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `Perbesar ${caption}`);

    image.addEventListener("click", () => {
      openLightbox(imageUrl, caption);
    });

    image.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(imageUrl, caption);
      }
    });

    const label = document.createElement("h3");
    label.textContent = caption;

    card.append(image, label);
    screensContainer.appendChild(card);
  });

  if (!screensContainer.children.length) {
    screensContainer.textContent = "Belum ada screenshot proyek.";
  }
}

function renderProject(project) {
  const title = project.title || "Untitled Project";
  const description = project.description || "";

  document.title = `${title} | EDI CREATIVE`;

  setText("projectTitle", title);
  setText("projectDescription", description, "");
  setText("previewTitle", title);
  setText("previewSubtitle", description, "");
  setText("projectOverview", project.overview || description);

  setText("infoProject", title);
  setText("infoTools", project.tools || "Figma");
  setText("infoDevelopment", project.development || "UI/UX Design");
  setText("infoCategory", project.category || "UI/UX Design");
  setText("projectCategory", project.category || "UI/UX DESIGN");

  setText(
    "processIdeation",
    project.ideation || "Eksplorasi ide dan kebutuhan pengguna."
  );

  setText(
    "processWireframing",
    project.wireframing || "Menyusun struktur dan alur antarmuka."
  );

  setText(
    "processPrototype",
    project.prototype || "Membuat desain dan prototype interaktif."
  );

  setText(
    "processDevelopment",
    project.developmentProcess ||
      "Mengembangkan dan menyempurnakan solusi desain."
  );

  const projectLink = document.getElementById("projectLink");

  if (validUrl(project.projectUrl)) {
    projectLink.href = project.projectUrl;
  } else {
    projectLink.removeAttribute("href");
    projectLink.textContent = "Link proyek belum tersedia";
  }

  renderScreens(project);

  statusElement.style.display = "none";
  projectContent.classList.remove("detail-hidden");
}

async function loadProject() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("id");

  if (!projectId || projectId.includes("/")) {
    showError("ID proyek tidak valid.");
    return;
  }

  try {
    const projectRef = doc(db, "uiux_projects", projectId);
    const snapshot = await getDoc(projectRef);

    if (!snapshot.exists()) {
      showError("Proyek tidak ditemukan.");
      return;
    }

    renderProject(snapshot.data());
  } catch (error) {
    console.error("Gagal memuat proyek:", error);
    showError("Gagal memuat proyek. Periksa koneksi atau izin Firebase.");
  }
}

loadProject();
