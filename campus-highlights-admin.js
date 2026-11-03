
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
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "Q6utzRG0evSqffWQXPhDwKiw42q2";
const CLOUD_NAME = "lodwv8p7";

const WORKER_URL =
  "https://edi-creative-graphic-api.ediaman45.workers.dev";

const form = document.getElementById("campusForm");
const titleInput = document.getElementById("campusTitle");
const descriptionInput = document.getElementById("campusDescription");
const dateInput = document.getElementById("campusDate");
const filesInput = document.getElementById("campusFiles");
const statusElement = document.getElementById("campusStatus");
const listElement = document.getElementById("campusList");

let currentUser = null;

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? "#ff6b6b" : "#00e5ff";
}

function validateFiles(files) {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (files.length === 0) {
    throw new Error("Pilih minimal satu foto.");
  }

  if (files.length > 10) {
    throw new Error("Maksimal 10 foto untuk satu postingan.");
  }

  for (const file of files) {
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Gunakan foto JPG, PNG, atau WebP.");
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`Ukuran ${file.name} melebihi 10 MB.`);
    }
  }
}

async function uploadImage(file) {
  const token = await currentUser.getIdToken();

  const signingResponse = await fetch(
    `${WORKER_URL}/sign-upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        purpose: "campus-highlights"
      })
    }
  );

  const signingData = await signingResponse.json();

  if (!signingResponse.ok) {
    throw new Error(
      signingData.error || "Gagal mendapatkan izin upload."
    );
  }

  const uploadData = new FormData();

  uploadData.append("file", file);
  uploadData.append("api_key", signingData.apiKey);
  uploadData.append("timestamp", signingData.timestamp);
  uploadData.append("signature", signingData.signature);
  uploadData.append("folder", signingData.folder);
  uploadData.append("overwrite", signingData.overwrite);

  const cloudinaryResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: uploadData
    }
  );

  const result = await cloudinaryResponse.json();

  if (!cloudinaryResponse.ok) {
    throw new Error(
      result.error?.message || "Gagal mengunggah foto."
    );
  }

  return {
    imageUrl: result.secure_url,
    publicId: result.public_id
  };
}

// EDIT POSTINGAN
async function editHighlight(documentId, item) {
  const newTitle = prompt("Ubah judul:", item.title || "");

  if (newTitle === null) return;

  if (!newTitle.trim()) {
    alert("Judul tidak boleh kosong.");
    return;
  }

  const newDescription = prompt(
    "Ubah deskripsi:",
    item.description || ""
  );

  if (newDescription === null) return;

  const newDate = prompt(
    "Ubah tanggal (YYYY-MM-DD):",
    item.date || ""
  );

  if (newDate === null) return;

  try {
    await updateDoc(
      doc(db, "campus_highlights", documentId),
      {
        title: newTitle.trim(),
        description: newDescription.trim(),
        date: newDate.trim()
      }
    );

    setStatus("Campus Highlight berhasil diperbarui!");
  } catch (error) {
    console.error(error);
    setStatus("Gagal memperbarui postingan.", true);
  }
}

// HAPUS POSTINGAN

async function removeHighlight(documentId, item) {
  const confirmed = confirm(
    `Yakin ingin menghapus "${item.title}" beserta semua fotonya?`
  );

  if (!confirmed) return;

  try {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
      throw new Error("Akses admin diperlukan.");
    }

    const images = Array.isArray(item.images) ? item.images : [];

    setStatus("Memeriksa foto yang akan dihapus...");

    // Hapus foto dari Cloudinary satu per satu
    for (let i = 0; i < images.length; i++) {
      const publicId = images[i]?.publicId;

      if (!publicId) {
        throw new Error(
          `Foto ke-${i + 1} tidak memiliki publicId. Dokumen tidak dihapus.`
        );
      }

      setStatus(
        `Menghapus foto ${i + 1} dari ${images.length}...`
      );

      const token = await currentUser.getIdToken();

      const response = await fetch(
        `${WORKER_URL}/delete-campus-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ publicId })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || `Gagal menghapus foto ke-${i + 1}.`
        );
      }
    }

    // Hapus dokumen Firebase setelah semua foto berhasil diproses
    setStatus("Menghapus data dari Firebase...");

    await deleteDoc(
      doc(db, "campus_highlights", documentId)
    );

    setStatus(
      "Postingan dan foto-fotonya berhasil dihapus!"
    );

  } catch (error) {
    console.error("Campus Highlight deletion error:", error);
    setStatus(
      error.message || "Gagal menghapus postingan.",
      true
    );
  }
}



// TAMPILKAN DAFTAR POSTINGAN
function renderList(snapshot) {
  listElement.replaceChildren();

  if (snapshot.empty) {
    listElement.textContent = "Belum ada Campus Highlights.";
    return;
  }

  snapshot.forEach((documentSnapshot) => {
    const item = documentSnapshot.data();
    const documentId = documentSnapshot.id;

    const card = document.createElement("div");
    card.className = "admin-item";

    const heading = document.createElement("h3");
    heading.textContent = item.title || "Campus Highlight";

    const description = document.createElement("p");
    description.textContent = item.description || "";

    const date = document.createElement("p");
    date.textContent = item.date || "";

    const photoCount = document.createElement("p");
    photoCount.textContent =
      `${Array.isArray(item.images) ? item.images.length : 0} foto`;

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      editHighlight(documentId, item);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Hapus";
    deleteButton.addEventListener("click", () => {
      removeHighlight(documentId, item);
    });

    card.append(
      heading,
      description,
      date,
      photoCount,
      editButton,
      deleteButton
    );

    listElement.appendChild(card);
  });
}

// CEK LOGIN ADMIN
onAuthStateChanged(auth, (user) => {
  if (!user || user.uid !== ADMIN_UID) {
    currentUser = null;

    if (form) {
      form.querySelectorAll("input, textarea, button")
        .forEach((element) => {
          element.disabled = true;
        });
    }

    setStatus("Login sebagai admin diperlukan.", true);
    return;
  }

  currentUser = user;

  const highlightsQuery = query(
    collection(db, "campus_highlights"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(
    highlightsQuery,
    renderList,
    (error) => {
      console.error(error);
      setStatus("Gagal memuat daftar Campus Highlights.", true);
    }
  );
});

// UPLOAD POSTINGAN BARU
if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser || currentUser.uid !== ADMIN_UID) {
      setStatus("Kamu tidak memiliki akses admin.", true);
      return;
    }

    const files = Array.from(filesInput.files);

    const submitButton = form.querySelector(
      'button[type="submit"]'
    );

    try {
      validateFiles(files);

      const title = titleInput.value.trim();
      const description = descriptionInput.value.trim();
      const date = dateInput.value;

      if (!title) {
        throw new Error("Judul harus diisi.");
      }

      submitButton.disabled = true;
      setStatus("Mempersiapkan upload...");

      const uploadedImages = [];

      for (let i = 0; i < files.length; i++) {
        setStatus(
          `Mengunggah foto ${i + 1} dari ${files.length}...`
        );

        const uploadedImage = await uploadImage(files[i]);
        uploadedImages.push(uploadedImage);
      }

      setStatus("Menyimpan data ke Firebase...");

      await addDoc(collection(db, "campus_highlights"), {
        title,
        description,
        date,
        images: uploadedImages,
        createdAt: serverTimestamp()
      });

      form.reset();
      setStatus("Campus Highlight berhasil dipublikasikan!");

    } catch (error) {
      console.error("Campus Highlights upload error:", error);
      setStatus(error.message || "Upload gagal.", true);
    } finally {
      submitButton.disabled = false;
    }
  });
}
