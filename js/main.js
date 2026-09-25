/**
 * AL FAKHAMA - Main UI, Scroll Spy, Mobile Drawer & Lightbox
 */

document.addEventListener("DOMContentLoaded", () => {
  // Sticky Navbar
  const header = document.querySelector(".site-header");
  const scrollThreshold = 50;

  function handleScroll() {
    if (window.scrollY > scrollThreshold) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();

  // Mobile Drawer Toggle & Close Handlers
  const mobileToggle = document.getElementById("mobileMenuToggle");
  const mobileDrawer = document.getElementById("mobileDrawer");
  const closeMobileDrawerBtn = document.getElementById("closeMobileDrawer");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const mobileLinks = document.querySelectorAll(".mobile-nav-link, .mobile-subnav-link, .mobile-quote-btn");

  function toggleMobileMenu() {
    if (mobileToggle) mobileToggle.classList.toggle("active");
    if (mobileDrawer) mobileDrawer.classList.toggle("open");
    if (drawerBackdrop) drawerBackdrop.classList.toggle("active");
    document.body.style.overflow = mobileDrawer && mobileDrawer.classList.contains("open") ? "hidden" : "";
  }

  function closeMobileMenu() {
    if (mobileToggle) mobileToggle.classList.remove("active");
    if (mobileDrawer) mobileDrawer.classList.remove("open");
    if (drawerBackdrop) drawerBackdrop.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (mobileToggle) {
    mobileToggle.addEventListener("click", toggleMobileMenu);
  }

  if (closeMobileDrawerBtn) {
    closeMobileDrawerBtn.addEventListener("click", closeMobileMenu);
  }

  if (drawerBackdrop) {
    drawerBackdrop.addEventListener("click", closeMobileMenu);
  }

  mobileLinks.forEach(link => {
    link.addEventListener("click", closeMobileMenu);
  });

  // ESC key to close drawer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileDrawer && mobileDrawer.classList.contains("open")) {
      closeMobileMenu();
    }
  });

  // Scroll Reveal Animations with IntersectionObserver
  const revealElements = document.querySelectorAll(".reveal-on-scroll");

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.02,
      rootMargin: "50px 0px 50px 0px"
    }
  );

  revealElements.forEach(el => revealObserver.observe(el));

  // Gallery Lightbox
  const galleryItems = document.querySelectorAll(".gallery-item");
  const lightboxModal = document.getElementById("galleryLightbox");
  const lightboxImg = document.getElementById("lightboxImage");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const closeLightbox = document.getElementById("closeLightbox");

  if (galleryItems && lightboxModal) {
    galleryItems.forEach(item => {
      item.addEventListener("click", () => {
        const img = item.querySelector("img");
        const title = item.querySelector(".gallery-item-title")?.textContent || "";
        const tag = item.querySelector(".gallery-item-tag")?.textContent || "";

        if (img) {
          lightboxImg.src = img.src;
          lightboxCaption.innerHTML = `<strong>${title}</strong> <span>• ${tag}</span>`;
          lightboxModal.classList.add("active");
        }
      });
    });

    if (closeLightbox) {
      closeLightbox.addEventListener("click", () => {
        lightboxModal.classList.remove("active");
      });
    }

    lightboxModal.addEventListener("click", (e) => {
      if (e.target === lightboxModal) {
        lightboxModal.classList.remove("active");
      }
    });
  }

  // Hotspots click toggle on mobile/touch
  const hotspots = document.querySelectorAll(".spec-hotspot");
  hotspots.forEach(hs => {
    hs.addEventListener("click", (e) => {
      e.stopPropagation();
      hotspots.forEach(h => { if (h !== hs) h.classList.remove("active"); });
      hs.classList.toggle("active");
    });
  });

  document.addEventListener("click", () => {
    hotspots.forEach(hs => hs.classList.remove("active"));
  });
});
