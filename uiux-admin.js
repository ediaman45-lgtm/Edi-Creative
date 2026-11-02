
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

let unsubscribe = null;

function isAdmin() {
  return auth.currentUser?.uid === ADMIN_UID;
}

function setStatus(message, color = "#65e6a0") {
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

// MENAMPILKAN PROYEK UI/UX DI DASHBOARD
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

        const link = document.createElement("a");
        link.textContent = "Lihat Proyek";
        link.style.cssText =
          "display:block;color:#59d8ff;margin-bottom:15px;";

        if (validProjectLink(project.projectUrl || "")) {
          link.href = project.projectUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        } else {
          link.removeAttribute("href");
          link.textContent = "Link proyek tidak tersedia";
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

        item.append(image, title, description, link, deleteButton);
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

// UPLOAD PROYEK UI/UX
uiuxForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isAdmin()) {
    setStatus("Silakan login sebagai admin.", "#ff8585");
    return;
  }

  const title = uiuxTitle.value.trim();
  const description = uiuxDescription.value.trim();
  const projectUrl = uiuxLink.value.trim();
  const file = uiuxFile.files[0];

  if (!title || !description || !validProjectLink(projectUrl)) {
    setStatus(
      "Isi judul, deskripsi, dan link proyek yang valid.",
      "#ff8585"
    );
    return;
  }

  if (
    !file ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  ) {
    setStatus(
      "Gunakan gambar JPG, PNG, atau WebP.",
      "#ff8585"
    );
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    setStatus("Ukuran maksimal 10 MB.", "#ff8585");
    return;
  }

  const submitButton = uiuxForm.querySelector(
    'button[type="submit"]'
  );
  submitButton.disabled = true;

  try {
    setStatus("Memverifikasi akun admin...");

    const idToken = await auth.currentUser.getIdToken();

    setStatus("Meminta izin upload aman...");

    const signResponse = await fetch(
      `${WORKER_URL}/sign-upload`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      }
    );

    const signResult = await signResponse.json();

    if (!signResponse.ok) {
      throw new Error(
        signResult.error || "Verifikasi upload gagal."
      );
    }

    if (
      !signResult.signature ||
      !signResult.timestamp ||
      !signResult.apiKey ||
      !signResult.folder
    ) {
      throw new Error(
        "Data signature Cloudinary tidak lengkap."
      );
    }

    setStatus("Mengupload gambar ke Cloudinary...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signResult.apiKey);
    formData.append("timestamp", String(signResult.timestamp));
    formData.append("signature", signResult.signature);
    formData.append("folder", signResult.folder);
    formData.append("overwrite", String(signResult.overwrite));

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok || !uploadResult.secure_url) {
      throw new Error(
        uploadResult.error?.message ||
        "Upload Cloudinary gagal."
      );
    }

    setStatus("Menyimpan proyek ke Firebase...");

    await addDoc(collection(db, "uiux_projects"), {
      title,
      description,
      projectUrl,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      createdAt: serverTimestamp()
    });

    uiuxForm.reset();
    setStatus("Proyek UI/UX berhasil ditambahkan!");

  } catch (error) {
    console.error("Upload UI/UX gagal:", error);
    setStatus("Upload gagal: " + error.message, "#ff8585");
  } finally {
    submitButton.disabled = false;
  }
});
