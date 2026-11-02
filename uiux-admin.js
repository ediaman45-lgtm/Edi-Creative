
import { app } from "./firebase-config.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "Q6utzRG0evSqffWQXPhDwKiw42q2";
const CLOUD_NAME = "lodwv8p7";
const WORKER_URL =
  "https://edi-creative-graphic-api.ediaman45.workers.dev";

const uiuxForm = document.getElementById("uiuxForm");
const uiuxTitle = document.getElementById("uiuxTitle");
const uiuxDescription = document.getElementById("uiuxDescription");
const uiuxLink = document.getElementById("uiuxLink");
const uiuxFile = document.getElementById("uiuxFile");
const uiuxStatus = document.getElementById("uiuxStatus");
const uiuxList = document.getElementById("uiuxList");

const uiuxOverview = document.getElementById("uiuxOverview");
const uiuxTools = document.getElementById("uiuxTools");
const uiuxDevelopment = document.getElementById("uiuxDevelopment");
const uiuxIdeation = document.getElementById("uiuxIdeation");
const uiuxWireframing = document.getElementById("uiuxWireframing");
const uiuxPrototype = document.getElementById("uiuxPrototype");
const uiuxDevelopmentProcess =
  document.getElementById("uiuxDevelopmentProcess");
const uiuxScreenshots =
  document.getElementById("uiuxScreenshots");

let unsubscribe = null;

function isAdmin() {
  return auth.currentUser?.uid === ADMIN_UID;
}

function setStatus(message, color = "#65e6a0") {
  if (!uiuxStatus) return;
  uiuxStatus.textContent = message;
  uiuxStatus.style.color = color;
}

function validProjectLink(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function validateImage(file) {
  if (!file) {
    throw new Error("Pilih gambar terlebih dahulu.");
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Gunakan gambar JPG, PNG, atau WebP.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error(
      `Gambar "${file.name}" melebihi batas 10 MB.`
    );
  }
}

// Meminta tanda tangan upload dari Cloudflare Worker.
async function getUploadSignature() {
  const user = auth.currentUser;

  if (!user || !isAdmin()) {
    throw new Error("Silakan login sebagai admin.");
  }

  const idToken = await user.getIdToken();

  const response = await fetch(`${WORKER_URL}/sign-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Verifikasi upload gagal.");
  }

  if (
    !result.signature ||
    !result.timestamp ||
    !result.apiKey ||
    !result.folder
  ) {
    throw new Error("Data signature Cloudinary tidak lengkap.");
  }

  return result;
}

// Upload satu gambar ke Cloudinary.
async function uploadImage(file) {
  validateImage(file);

  const signResult = await getUploadSignature();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signResult.apiKey);
  formData.append("timestamp", String(signResult.timestamp));
  formData.append("signature", signResult.signature);
  formData.append("folder", signResult.folder);
  formData.append("overwrite", String(signResult.overwrite));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error(
      result.error?.message || "Upload Cloudinary gagal."
    );
  }

  return {
    url: result.secure_url,
    publicId: result.public_id
  };
}

// Menampilkan proyek di Admin Dashboard.
onAuthStateChanged(auth, (user) => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  uiuxList.replaceChildren();

  if (!user || user.uid !== ADMIN_UID) return;

  unsubscribe = onSnapshot(
    collection(db, "uiux_projects"),
    (snapshot) => {
      uiuxList.replaceChildren();

      if (snapshot.empty) {
        uiuxList.textContent = "Belum ada proyek UI/UX.";
        return;
      }

      const projects = snapshot.docs.sort((a, b) => {
        const timeA = a.data().createdAt?.seconds || 0;
        const timeB = b.data().createdAt?.seconds || 0;
        return timeB - timeA;
      });

      projects.forEach((projectDoc) => {
        const project = projectDoc.data();

        const item = document.createElement("div");
        item.style.cssText =
          "padding:15px;margin:12px 0;background:#202a40;border-radius:12px;";

        const image = document.createElement("img");
        image.src = project.imageUrl || "";
        image.alt = project.title || "UI/UX Design";
        image.loading = "lazy";
        image.style.cssText =
          "width:100%;max-height:220px;object-fit:contain;border-radius:10px;";

        const title = document.createElement("h4");
        title.textContent = project.title || "Tanpa Judul";

        const description = document.createElement("p");
        description.textContent = project.description || "";

        const screenshotInfo = document.createElement("p");
        const screenshotCount = Array.isArray(project.screenshots)
          ? project.screenshots.length
          : 0;

        screenshotInfo.textContent =
          `Screenshot tambahan: ${screenshotCount}`;

        const detailLink = document.createElement("a");
        detailLink.href =
          `project-detail.html?id=${encodeURIComponent(projectDoc.id)}`;
        detailLink.textContent = "Lihat Halaman Detail →";
        detailLink.target = "_blank";
        detailLink.rel = "noopener noreferrer";
        detailLink.style.cssText =
          "display:block;color:#59d8ff;margin-bottom:12px;";

        const externalLink = document.createElement("a");
        externalLink.textContent = "Buka Figma / Website";
        externalLink.style.cssText =
          "display:block;color:#59d8ff;margin-bottom:15px;";

        if (validProjectLink(project.projectUrl || "")) {
          externalLink.href = project.projectUrl;
          externalLink.target = "_blank";
          externalLink.rel = "noopener noreferrer";
        } else {
          externalLink.textContent = "Link proyek tidak tersedia";
        }

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Hapus Proyek";
        deleteButton.style.background = "#ff6464";

        deleteButton.addEventListener("click", async () => {
          if (!isAdmin()) {
            alert("Silakan login sebagai admin.");
            return;
          }

          if (!confirm(`Hapus proyek "${project.title}"?`)) {
            return;
          }

          try {
            await deleteDoc(
              doc(db, "uiux_projects", projectDoc.id)
            );

            alert("Proyek berhasil dihapus dari portfolio.");
          } catch (error) {
            alert("Gagal menghapus: " + error.message);
          }
        });

        item.append(
          image,
          title,
          description,
          screenshotInfo,
          detailLink,
          externalLink,
          deleteButton
        );

        uiuxList.appendChild(item);
      });
    },
    (error) => {
      setStatus(
        "Gagal memuat proyek: " + error.message,
        "#ff8585"
      );
    }
  );
});

// Upload proyek UI/UX lengkap.
uiuxForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isAdmin()) {
    setStatus("Silakan login sebagai admin.", "#ff8585");
    return;
  }

  const title = uiuxTitle.value.trim();
  const description = uiuxDescription.value.trim();
  const projectUrl = uiuxLink.value.trim();
  const coverFile = uiuxFile.files[0];

  const screenshotFiles = Array.from(
    uiuxScreenshots?.files || []
  );

  if (!title || !description || !validProjectLink(projectUrl)) {
    setStatus(
      "Isi judul, deskripsi, dan link proyek yang valid.",
      "#ff8585"
    );
    return;
  }

  try {
    validateImage(coverFile);

    screenshotFiles.forEach(validateImage);
  } catch (error) {
    setStatus(error.message, "#ff8585");
    return;
  }

  const submitButton = uiuxForm.querySelector(
    'button[type="submit"]'
  );

  submitButton.disabled = true;

  try {
    setStatus("Mengupload gambar utama...");

    const cover = await uploadImage(coverFile);

    const screenshots = [];

    for (let i = 0; i < screenshotFiles.length; i++) {
      const file = screenshotFiles[i];

      setStatus(
        `Mengupload screenshot ${i + 1} dari ${screenshotFiles.length}...`
      );

      const uploaded = await uploadImage(file);

      screenshots.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
        caption: file.name.replace(/\.[^.]+$/, "")
      });
    }

    setStatus("Menyimpan detail proyek ke Firebase...");

    await addDoc(collection(db, "uiux_projects"), {
      title,
      description,
      projectUrl,
      imageUrl: cover.url,
      publicId: cover.publicId,

      overview: uiuxOverview?.value.trim() || "",
      tools: uiuxTools?.value.trim() || "",
      development: uiuxDevelopment?.value.trim() || "",
      category: "UI/UX Design",

      ideation: uiuxIdeation?.value.trim() || "",
      wireframing: uiuxWireframing?.value.trim() || "",
      prototype: uiuxPrototype?.value.trim() || "",
      developmentProcess:
        uiuxDevelopmentProcess?.value.trim() || "",

      screenshots,

      createdAt: serverTimestamp()
    });

    uiuxForm.reset();

    setStatus(
      "Berhasil! Proyek dan seluruh screenshot sudah disimpan."
    );

  } catch (error) {
    console.error("Upload UI/UX gagal:", error);

    setStatus(
      "Upload gagal: " + error.message,
      "#ff8585"
    );
  } finally {
    submitButton.disabled = false;
  }
});
