
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

// ADMIN EDI CREATIVE
const ADMIN_UID = "Q6utzRG0evSqffWQXPhDwKiw42q2";

// CLOUDINARY
const CLOUD_NAME = "lodwv8p7";

// CLOUDFLARE WORKER
const WORKER_URL =
  "https://edi-creative-graphic-api.ediaman45.workers.dev";

// ELEMENT DASHBOARD
const graphicForm = document.getElementById("graphicForm");
const graphicTitle = document.getElementById("graphicTitle");
const graphicDescription = document.getElementById("graphicDescription");
const graphicFile = document.getElementById("graphicFile");
const graphicStatus = document.getElementById("graphicStatus");
const graphicList = document.getElementById("graphicList");

let unsubscribe = null;

function isAdmin() {
  return auth.currentUser?.uid === ADMIN_UID;
}

function setStatus(text, color = "#65e6a0") {
  graphicStatus.textContent = text;
  graphicStatus.style.color = color;
}

// =====================================
// MENAMPILKAN DAFTAR GRAPHIC DESIGN
// =====================================

onAuthStateChanged(auth, (user) => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  graphicList.replaceChildren();

  if (!user || user.uid !== ADMIN_UID) return;

  unsubscribe = onSnapshot(
    collection(db, "graphic_projects"),
    (snapshot) => {
      graphicList.replaceChildren();

      if (snapshot.empty) {
        graphicList.textContent = "Belum ada karya desain.";
        return;
      }

      snapshot.forEach((projectDoc) => {
        const project = projectDoc.data();

        const item = document.createElement("div");
        item.style.cssText =
          "padding:15px;margin:12px 0;background:#202a40;border-radius:12px;";

        const image = document.createElement("img");
        image.src = project.imageUrl;
        image.alt = project.title || "Graphic Design";
        image.loading = "lazy";
        image.style.cssText =
          "width:100%;max-height:220px;object-fit:contain;border-radius:10px;";

        const title = document.createElement("h4");
        title.textContent = project.title || "Tanpa Judul";

        const description = document.createElement("p");
        description.textContent = project.description || "";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Hapus Desain";
        deleteButton.style.background = "#ff6464";

        deleteButton.addEventListener("click", async () => {
          if (!isAdmin()) {
            alert("Silakan login sebagai admin.");
            return;
          }

          if (!confirm(`Hapus karya "${project.title}"?`)) return;

          try {
            await deleteDoc(
              doc(db, "graphic_projects", projectDoc.id)
            );

            alert("Karya berhasil dihapus dari portfolio.");
          } catch (error) {
            alert("Gagal menghapus: " + error.message);
          }
        });

        item.append(image, title, description, deleteButton);
        graphicList.appendChild(item);
      });
    },
    (error) => {
      setStatus(
        "Gagal memuat karya: " + error.message,
        "#ff8585"
      );
    }
  );
});

// =====================================
// UPLOAD GRAPHIC DESIGN - SIGNED
// =====================================

graphicForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isAdmin()) {
    setStatus(
      "Silakan login sebagai admin terlebih dahulu.",
      "#ff8585"
    );
    return;
  }

  const file = graphicFile.files[0];
  const title = graphicTitle.value.trim();
  const description = graphicDescription.value.trim();

  if (!title || !description) {
    setStatus(
      "Judul dan deskripsi wajib diisi.",
      "#ff8585"
    );
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!file || !allowedTypes.includes(file.type)) {
    setStatus(
      "Gunakan gambar JPG, PNG, atau WebP.",
      "#ff8585"
    );
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    setStatus(
      "Ukuran gambar maksimal 10 MB.",
      "#ff8585"
    );
    return;
  }

  const submitButton = graphicForm.querySelector(
    'button[type="submit"]'
  );

  submitButton.disabled = true;

  try {
    // 1. AMBIL TOKEN LOGIN FIREBASE
    setStatus("Memverifikasi akun admin...");

    const user = auth.currentUser;

    if (!user || user.uid !== ADMIN_UID) {
      throw new Error("Akun admin tidak ditemukan.");
    }

    const idToken = await user.getIdToken();

    // 2. MINTA SIGNATURE DARI CLOUDFLARE
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
        signResult.error ||
        "Verifikasi upload gagal."
      );
    }

    if (
      !signResult.signature ||
      !signResult.timestamp ||
      !signResult.apiKey
    ) {
      throw new Error(
        "Data tanda tangan Cloudinary tidak lengkap."
      );
    }

    // 3. UPLOAD KE CLOUDINARY
    setStatus("Sedang mengupload gambar ke Cloudinary...");

    const formData = new FormData();

    formData.append("file", file);
    formData.append("api_key", signResult.apiKey);
    formData.append("timestamp", String(signResult.timestamp));
    formData.append("signature", signResult.signature);
    formData.append("folder", signResult.folder);
    formData.append("overwrite", signResult.overwrite);

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
        "Upload gambar ke Cloudinary gagal."
      );
    }

    // 4. SIMPAN DATA KE FIREBASE
    setStatus("Menyimpan karya ke Firebase...");

    await addDoc(collection(db, "graphic_projects"), {
      title,
      description,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      createdAt: serverTimestamp()
    });

    graphicForm.reset();

    setStatus(
      "Karya Graphic Design berhasil ditambahkan!"
    );

  } catch (error) {
    console.error("Upload Graphic Design gagal:", error);

    setStatus(
      "Upload gagal: " + error.message,
      "#ff8585"
    );
  } finally {
    submitButton.disabled = false;
  }
});
