
const words = [
  "Graphic Designer",
  "Video Editor",
  "Creative Thinker",
  "Public Speaker"
];

const typing = document.getElementById("typing");
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (typing) {
  if (reduceMotion) {
    typing.textContent = words[0];
  } else {
    let wordIndex = 0;
    let letterIndex = 0;
    let deleting = false;

    function typeEffect() {
      const word = words[wordIndex];

      if (deleting) {
        letterIndex--;
      } else {
        letterIndex++;
      }

      typing.textContent = word.slice(0, letterIndex);

      let delay = deleting ? 65 : 110;

      if (!deleting && letterIndex === word.length) {
        deleting = true;
        delay = 1500;
      } else if (deleting && letterIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        delay = 350;
      }

      setTimeout(typeEffect, delay);
    }

    typeEffect();
  }
}


/* PORTFOLIO GALLERY */


const portfolioData = {
  graphic: {
    title: "My Graphic Design Projects",
    projects: [
      {
        title: "Nias Cultural Infographic",
        image: "projects/Backup_of_POSTER nias.jpg",
        description: "Infografis budaya dan tradisi Nias."
      },
      {
        title: "School Admission Brochure",
        image: "projects/BROSUR KIDS EDI siap.jpg",
        description: "Desain brosur promosi pendidikan."
      },
      {
        title: "Chinese New Year 2026",
        image: "projects/Desain Spanduk Imlek 2026 by Ediiii.jpg",
        description: "Desain spanduk perayaan Imlek 2026."
      },
      {
        title: "Ramadan Banner",
        image: "projects/Desain Spanduk Puasa Ramadhan 1443H by Edi.jpg",
        description: "Desain spanduk Ramadan."
      },
      {
        title: "Fight Night Poster",
        image: "projects/Night Fighters.png",
        description: "Poster promosi acara olahraga."
      },
      {
        title: "HIV Awareness Infographic",
        image: "projects/POSTER.jpg",
        description: "Infografis edukasi dan pencegahan HIV."
      },
      {
        title: "Spicy Grills Menu",
        image: "projects/posterRRR.png",
        description: "Poster promosi makanan dan kuliner."
      },
      {
        title: "Creative Design Showcase",
        image: "projects/tugas.png",
        description: "Koleksi karya desain kreatif."
      },
      {
        title: "Naya Laundry Banner",
        image: "projects/Ujian Ediaman siap.jpg",
        description: "Desain spanduk promosi laundry."
      }
    ]
  },

  branding: {
    title: "Creative Branding",
    projects: []
  },

  video: {
    title: "Video Projects",
    projects: []
  }
};


const modal = document.getElementById("galleryModal");
const galleryGrid = document.getElementById("galleryGrid");
const galleryTitle = document.getElementById("galleryTitle");
const closeGallery = document.getElementById("closeGallery");

document.querySelectorAll("[data-gallery]").forEach(button => {
  button.addEventListener("click", () => {
    const category = button.dataset.gallery;
    const data = portfolioData[category];

    galleryTitle.textContent = data.title;
    galleryGrid.replaceChildren();

    data.projects.forEach(project => {
      const item = document.createElement("div");
      item.className = "gallery-item";

      const img = document.createElement("img");
      img.src = project.image;
      img.alt = project.title;
      img.loading = "lazy";
      img.addEventListener("click", () => {
        window.open(project.image, "_blank", "noopener");
      });

      const title = document.createElement("h3");
      title.textContent = project.title;

      const description = document.createElement("p");
      description.textContent = project.description;

      item.append(img, title, description);
      galleryGrid.appendChild(item);
    });

    modal.showModal();
  });
});

closeGallery.addEventListener("click", () => {
  modal.close();
});

modal.addEventListener("click", event => {
  if (event.target === modal) {
    modal.close();
  }
});


/* ==================================
   EDI CREATIVE - CONTACT FORM
================================== */

const contactForm =
  document.getElementById("contactForm");

const formStatus =
  document.getElementById("formStatus");

// GANTI DENGAN EMAIL KAMU
const contactEmail = "ediaman45@gmail.com";

if (contactForm) {
  contactForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name =
      document.getElementById("contactName").value.trim();

    const email =
      document.getElementById("contactEmail").value.trim();

    const message =
      document.getElementById("contactMessage").value.trim();

    if (!name || !email || !message) {
      formStatus.textContent =
        "Please complete all fields.";
      return;
    }

    const subject = encodeURIComponent(
      "New Project Inquiry - Edi Creative"
    );

    const body = encodeURIComponent(
      "Hello Edi Creative,\n\n" +
      "Name: " + name + "\n" +
      "Email: " + email + "\n\n" +
      "Message:\n" + message
    );

    const mailtoLink =
      "mailto:" + contactEmail +
      "?subject=" + subject +
      "&body=" + body;

    formStatus.textContent =
      "Your email app will open. Please press Send there.";

    window.location.href = mailtoLink;
  });
}


/* ===== SCROLL REVEAL ANIMATION ===== */

document.addEventListener("DOMContentLoaded", () => {
  const elements = document.querySelectorAll(
    "#about, #skills, #portfolio, #contact, " +
    ".skill-card, .project-card, .contact-card"
  );

  if (
    !("IntersectionObserver" in window) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.08
    }
  );

  elements.forEach((element) => {
    element.classList.add("reveal-ready");
    observer.observe(element);
  });
});
