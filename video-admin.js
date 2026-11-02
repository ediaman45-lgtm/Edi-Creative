
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

const videoForm = document.getElementById("videoForm");
const videoTitle = document.getElementById("videoTitle");
const videoDescription = document.getElementById("videoDescription");
const videoUrl = document.getElementById("videoUrl");
const videoThumbnail = document.getElementById("videoThumbnail");
const videoStatus = document.getElementById("videoStatus");
const videoList = document.getElementById("videoList");

let unsubscribe = null;

function isAdmin() {
  return auth.currentUser?.uid === ADMIN_UID;
}

function setStatus(message, error = false) {
  videoStatus.textContent = message;
  videoStatus.style.color = error ? "#ff8585" : "#65e6a0";
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol);
  } catch {
    return false;
  }
}

// MENAMPILKAN DAFTAR VIDEO
onAuthStateChanged(auth, (user) => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  videoList.replaceChildren();

  if (!user || user.uid !== ADMIN_UID) return;

  unsubscribe = onSnapshot(
    collection(db, "video_projects"),
    (snapshot) => {
      videoList.replaceChildren();

      if (snapshot.empty) {
        videoList.textContent = "Belum ada proyek video.";
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

        if (project.thumbnailUrl && validUrl(project.thumbnailUrl)) {
          const image = document.createElement("img");
          image.src = project.thumbnailUrl;
          image.alt = project.title || "Video Project";
          image.loading = "lazy";
          image.style.cssText =
            "width:100%;max-height:220px;object-fit:contain;border-radius:10px;";
          item.appendChild(image);
        }

        const title = document.createElement("h4");
        title.textContent = project.title || "Tanpa Judul";

        const description = document.createElement("p");
        description.textContent = project.description || "";

        item.append(title, description);

        if (project.videoUrl && validUrl(project.videoUrl)) {
          const link = document.createElement("a");
          link.href = project.videoUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Lihat Video";
          link.style.cssText =
            "display:block;color:#59d8ff;margin-bottom:14px;";
          item.appendChild(link);
        }

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Hapus Video";
        deleteButton.style.background = "#ff6464";

        deleteButton.addEventListener("click", async () => {
          if (!isAdmin()) return;

          if (!confirm(`Hapus video "${project.title}"?`)) return;

          try {
            await deleteDoc(
              doc(db, "video_projects", projectDoc.id)
            );
            setStatus("Proyek video berhasil dihapus!");
          } catch (error) {
            setStatus("Gagal menghapus: " + error.message, true);
          }
        });

        item.appendChild(deleteButton);
        videoList.appendChild(item);
      });
    },
    (error) => {
      setStatus("Gagal memuat video: " + error.message, true);
    }
  );
});

// MENAMBAHKAN VIDEO
videoForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isAdmin()) {
    setStatus("Silakan login sebagai admin.", true);
    return;
  }

  const title = videoTitle.value.trim();
  const description = videoDescription.value.trim();
  const url = videoUrl.value.trim();
  const thumbnail = videoThumbnail.value.trim();

  if (!title || !description || !validUrl(url)) {
    setStatus("Lengkapi judul, deskripsi, dan URL video yang valid.", true);
    return;
  }

  if (thumbnail && !validUrl(thumbnail)) {
    setStatus("URL thumbnail tidak valid.", true);
    return;
  }

  const button = videoForm.querySelector('button[type="submit"]');
  button.disabled = true;
  setStatus("Menyimpan proyek video...");

  try {
    await addDoc(collection(db, "video_projects"), {
      title,
      description,
      videoUrl: url,
      thumbnailUrl: thumbnail,
      createdAt: serverTimestamp()
    });

    videoForm.reset();
    setStatus("Proyek video berhasil ditambahkan!");
  } catch (error) {
    setStatus("Gagal menambahkan video: " + error.message, true);
  } finally {
    button.disabled = false;
  }
});
