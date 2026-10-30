
import { app } from "./firebase-config.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "Q6utzRG0evSqffWQXPhDwKiw42q2";

const WORKER_URL =
  "https://edi-creative-stories-api.ediaman45.workers.dev";

const storyForm = document.getElementById("storyForm");

if (storyForm) {
  storyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const user = auth.currentUser;

    if (!user || user.uid !== ADMIN_UID) {
      alert("Silakan login sebagai admin.");
      return;
    }

    const title = document.getElementById("storyTitle").value.trim();
    const category = document.getElementById("storyCategory").value;
    const file = document.getElementById("storyFile").files[0];

    if (!title || !file) {
      alert("Isi judul dan pilih foto/video.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "video/mp4"].includes(file.type)) {
      alert("Gunakan JPG, PNG, WebP, atau MP4.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Ukuran maksimal 10 MB.");
      return;
    }

    const button = storyForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Mengupload...";

    try {
      const token = await user.getIdToken();

      const signatureResponse = await fetch(
        `${WORKER_URL}/upload-signature`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const signatureData = await signatureResponse.json();

      if (!signatureResponse.ok) {
        throw new Error(signatureData.error || "Izin upload gagal.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signatureData.apiKey);
      formData.append("timestamp", String(signatureData.timestamp));
      formData.append("folder", signatureData.folder);
      formData.append("upload_preset", signatureData.upload_preset);
      formData.append("signature", signatureData.signature);

      const mediaType = file.type.startsWith("video/") ? "video" : "image";

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${mediaType}/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error?.message || "Upload Cloudinary gagal.");
      }

      await addDoc(collection(db, "stories"), {
        title,
        category,
        mediaUrl: uploadData.secure_url,
        mediaType,
        publicId: uploadData.public_id,
        published: true,
        createdAt: serverTimestamp()
      });

      alert("Story berhasil diupload!");
      storyForm.reset();

    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload gagal: " + error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Upload Story";
    }
  }, true);
}
