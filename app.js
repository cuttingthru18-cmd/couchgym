(() => {
  const CHECKOUT = "https://whop.com/checkout/plan_KFviInXST0OFX";
  const gallery = document.querySelector("[data-gallery]");
  if (!gallery) return;

  const slides = [...gallery.querySelectorAll("[data-slide]")];
  const thumbs = [...gallery.querySelectorAll("[data-thumb]")];
  const frame = gallery.querySelector("[data-frame]");
  const images = slides.map((s) => s.querySelector("img"));
  let index = 0;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setIndex = (next, { fromUser } = {}) => {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const on = i === index;
      slide.classList.toggle("is-active", on);
      slide.hidden = !on;
    });
    thumbs.forEach((thumb, i) => thumb.setAttribute("aria-selected", String(i === index)));
    if (fromUser) resetParallax();
    syncLightbox();
  };

  gallery.querySelector("[data-prev]").addEventListener("click", (e) => {
    e.stopPropagation();
    setIndex(index - 1, { fromUser: true });
  });
  gallery.querySelector("[data-next]").addEventListener("click", (e) => {
    e.stopPropagation();
    setIndex(index + 1, { fromUser: true });
  });
  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => setIndex(Number(thumb.dataset.thumb), { fromUser: true }));
  });

  // Swipe on the main frame
  const bindSwipe = (el, onPrev, onNext, threshold = 48) => {
    let startX = 0, startY = 0, tracking = false;
    el.addEventListener("pointerdown", (e) => {
      if (e.button && e.button !== 0) return;
      tracking = true;
      startX = e.clientX;
      startY = e.clientY;
    });
    const end = (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return;
      dx < 0 ? onNext() : onPrev();
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", () => { tracking = false; });
  };
  bindSwipe(frame, () => setIndex(index - 1, { fromUser: true }), () => setIndex(index + 1, { fromUser: true }));

  // Subtle mouse parallax
  const resetParallax = () => {
    const img = images[index];
    if (img) img.style.transform = "translate3d(0,0,0) scale(1)";
  };
  if (!reduce) {
    frame.addEventListener("pointermove", (e) => {
      if (lightbox.open) return;
      const img = images[index];
      if (!img) return;
      const r = frame.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      img.style.transform = `translate3d(${x * -12}px, ${y * -10}px, 0) scale(1.03)`;
    });
    frame.addEventListener("pointerleave", resetParallax);
  }

  // Lightbox zoom + pan
  const lightbox = {
    root: document.querySelector("[data-lightbox]"),
    img: document.querySelector("[data-lightbox-img]"),
    stage: document.querySelector("[data-lightbox-stage]"),
    open: false,
    scale: 1,
    x: 0,
    y: 0,
  };

  const applyZoom = () => {
    lightbox.img.style.transform = `translate(${lightbox.x}px, ${lightbox.y}px) scale(${lightbox.scale})`;
  };
  const resetZoom = () => {
    lightbox.scale = 1;
    lightbox.x = 0;
    lightbox.y = 0;
    applyZoom();
  };
  const syncLightbox = () => {
    if (!lightbox.open) return;
    const srcImg = images[index];
    lightbox.img.src = srcImg.src;
    lightbox.img.alt = srcImg.alt;
    resetZoom();
  };
  const openLightbox = () => {
    lightbox.open = true;
    lightbox.root.hidden = false;
    document.body.style.overflow = "hidden";
    syncLightbox();
    document.querySelector("[data-lightbox-close]").focus();
  };
  const closeLightbox = () => {
    lightbox.open = false;
    lightbox.root.hidden = true;
    document.body.style.overflow = "";
    resetZoom();
  };

  gallery.querySelector("[data-zoom]").addEventListener("click", (e) => {
    e.stopPropagation();
    openLightbox();
  });
  frame.addEventListener("click", (e) => {
    if (e.target.closest(".nav-btn, .zoom-hint")) return;
    openLightbox();
  });
  document.querySelector("[data-lightbox-close]").addEventListener("click", closeLightbox);
  document.querySelector("[data-lightbox-prev]").addEventListener("click", () => setIndex(index - 1));
  document.querySelector("[data-lightbox-next]").addEventListener("click", () => setIndex(index + 1));
  lightbox.root.addEventListener("click", (e) => {
    if (e.target === lightbox.root) closeLightbox();
  });

  lightbox.stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const next = Math.min(4, Math.max(1, lightbox.scale + (e.deltaY > 0 ? -0.18 : 0.18)));
    lightbox.scale = next;
    if (lightbox.scale === 1) { lightbox.x = 0; lightbox.y = 0; }
    applyZoom();
  }, { passive: false });

  let pan = null;
  lightbox.stage.addEventListener("pointerdown", (e) => {
    pan = { x: e.clientX - lightbox.x, y: e.clientY - lightbox.y, startX: e.clientX, startY: e.clientY, moved: false };
    lightbox.stage.classList.add("is-panning");
    lightbox.stage.setPointerCapture(e.pointerId);
  });
  lightbox.stage.addEventListener("pointermove", (e) => {
    if (!pan) return;
    if (Math.hypot(e.clientX - pan.startX, e.clientY - pan.startY) > 6) pan.moved = true;
    if (lightbox.scale > 1) {
      lightbox.x = e.clientX - pan.x;
      lightbox.y = e.clientY - pan.y;
      applyZoom();
    }
  });
  lightbox.stage.addEventListener("pointerup", (e) => {
    const wasPan = pan;
    pan = null;
    lightbox.stage.classList.remove("is-panning");
    if (!wasPan) return;
    if (lightbox.scale === 1 && !wasPan.moved) {
      const dx = e.clientX - wasPan.startX;
      if (Math.abs(dx) > 48) setIndex(index + (dx < 0 ? 1 : -1));
    }
  });
  lightbox.stage.addEventListener("dblclick", () => {
    lightbox.scale = lightbox.scale > 1 ? 1 : 2;
    if (lightbox.scale === 1) { lightbox.x = 0; lightbox.y = 0; }
    applyZoom();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.open && e.key === "Escape") { closeLightbox(); return; }
    if (e.key === "ArrowLeft") setIndex(index - 1, { fromUser: true });
    if (e.key === "ArrowRight") setIndex(index + 1, { fromUser: true });
  });

  // Quantity
  const form = document.querySelector("[data-form]");
  const qtyInput = document.querySelector("#qty-input");
  const mobileBuy = document.querySelector("[data-mobile-buy]");
  const clampQty = (n) => Math.min(10, Math.max(1, Number(n) || 1));
  const setQty = (n) => {
    const v = clampQty(n);
    qtyInput.value = String(v);
    const href = v > 1 ? `${CHECKOUT}?quantity=${v}` : CHECKOUT;
    form.action = href;
    if (mobileBuy) mobileBuy.href = href;
  };
  document.querySelector("[data-qty-minus]").addEventListener("click", () => setQty(Number(qtyInput.value) - 1));
  document.querySelector("[data-qty-plus]").addEventListener("click", () => setQty(Number(qtyInput.value) + 1));
  qtyInput.addEventListener("change", () => setQty(qtyInput.value));
  setQty(1);

  const animateBuy = (btn) => {
    btn.classList.add("is-launch");
    window.setTimeout(() => btn.classList.remove("is-launch"), 500);
  };
  form.addEventListener("submit", (e) => {
    setQty(qtyInput.value);
    animateBuy(e.submitter || document.querySelector("[data-buy-btn]"));
    // Allow the form to navigate; action already includes quantity when needed.
  });
  if (mobileBuy) {
    mobileBuy.addEventListener("click", () => animateBuy(mobileBuy));
  }

  // Mobile sticky CTA appears after the main buy button leaves view
  const mobileCta = document.querySelector("[data-mobile-cta]");
  const buyBtn = document.querySelector("[data-buy-btn]");
  if (mobileCta && buyBtn && "IntersectionObserver" in window) {
    const mq = window.matchMedia("(max-width: 960px)");
    const io = new IntersectionObserver((entries) => {
      const show = mq.matches && !entries[0].isIntersecting;
      mobileCta.hidden = !show;
    }, { threshold: 0.2 });
    io.observe(buyBtn);
  }

  // Motion
  const bootMotion = () => {
    if (reduce || !window.gsap) return;
    document.documentElement.classList.add("motion");
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray(".reveal").forEach((el, i) => {
      gsap.from(el, {
        y: 18,
        duration: 0.8,
        ease: "power3.out",
        delay: (i % 4) * 0.05,
        immediateRender: false,
        scrollTrigger: { trigger: el, start: "top 90%" },
      });
    });
    document.querySelectorAll(".step").forEach((step) => {
      ScrollTrigger.create({
        trigger: step,
        start: "top 80%",
        onEnter: () => step.classList.add("is-in"),
      });
    });
  };

  if (window.gsap) bootMotion();
  else window.addEventListener("load", bootMotion);

  const shot = new URLSearchParams(location.search).get("shot");
  if (shot) {
    const el = document.getElementById(shot) || document.querySelector(shot);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
  }
})();
