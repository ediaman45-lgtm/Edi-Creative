
import { app } from "./firebase-config.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
const auth = getAuth(app);
const db = getFirestore(app);

const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");


// Ganti nanti dengan UID admin dari Firebase Authentication
const ADMIN_UID = "Q6utzRG0evSqffWQXPhDwKiw42q2";

onAuthStateChanged(auth, (user) => {
  const dashboard = document.getElementById("adminDashboard");

  if (user && user.uid === ADMIN_UID) {
    loginForm.style.display = "none";
    dashboard.style.display = "block";
  } else {
    loginForm.style.display = "block";
    dashboard.style.display = "none";
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  message.textContent = "Sedang login...";
  message.style.color = "#aab4ca";

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    if (result.user.uid !== ADMIN_UID) {
      await signOut(auth);
      throw new Error("Akun ini bukan admin EDI CREATIVE.");
    }

    message.style.color = "#65e6a0";
    message.textContent = "Login admin berhasil!";

    document.getElementById("loginForm").style.display = "none";
document.getElementById("adminDashboard").style.display = "block";
  } catch (error) {
    message.style.color = "#ff8585";
    message.textContent =
      error.message === "Akun ini bukan admin EDI CREATIVE."
        ? error.message
        : "Login gagal. Periksa email dan password.";
  }
});


const storyForm = document.getElementById("storyForm");
const storyFile = document.getElementById("storyFile");

storyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Pastikan hanya admin yang bisa melanjutkan
  if (!auth.currentUser || auth.currentUser.uid !== ADMIN_UID) {
    alert("Silakan login sebagai admin terlebih dahulu.");
    return;
  }

  const file = storyFile.files[0];

  if (!file) {
    alert("Pilih foto atau video terlebih dahulu.");
    return;
  }

  // Hanya menerima gambar dan video
  if (
    !file.type.startsWith("image/") &&
    !file.type.startsWith("video/")
  ) {
    alert("File harus berupa foto atau video.");
    return;
  }

  // Maksimal 10 MB
  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    alert("Ukuran file maksimal 10 MB.");
    return;
  }

  alert("File berhasil diperiksa. Siap untuk tahap upload!");
});




const storiesList = document.getElementById("storiesList");

onSnapshot(collection(db, "stories"), (snapshot) => {
  storiesList.innerHTML = "";

  snapshot.forEach((storyDoc) => {
    const story = storyDoc.data();

    const item = document.createElement("div");
    item.style.cssText = "padding:12px;margin:10px 0;background:#202a40;border-radius:10px;";

    const title = document.createElement("p");
    title.textContent = story.title || "Story tanpa judul";

    const hapus = document.createElement("button");
    hapus.textContent = "🗑 Hapus Story";
    hapus.type = "button";

    hapus.onclick = async () => {
      if (!confirm("Yakin ingin menghapus Story ini?")) return;

      try {
        await deleteDoc(doc(db, "stories", storyDoc.id));
        alert("Story berhasil dihapus!");
      } catch (error) {
        alert("Gagal menghapus: " + error.message);
      }
    };

    item.append(title, hapus);
    storiesList.appendChild(item);
  });
});
