/* Panel Super Admin - Skrining ABK
   Skrip ringan: toggle sidebar mobile, toast, upload gambar, sorting tabel. */
(function () {
  "use strict";

  /* ---------------------------- Sidebar mobile ---------------------------- */
  var sidebar = document.querySelector(".admin-sidebar");
  var backdrop = document.querySelector(".sidebar-backdrop");
  var toggle = document.getElementById("sidebarToggle");

  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("is-open");
    if (backdrop) backdrop.classList.remove("is-open");
  }

  if (toggle && sidebar) {
    toggle.addEventListener("click", function () {
      sidebar.classList.toggle("is-open");
      if (backdrop) backdrop.classList.toggle("is-open");
    });
  }

  if (backdrop) backdrop.addEventListener("click", closeSidebar);

  /* ------------------------------- Toast -------------------------------- */
  window.showToast = function (message, type) {
    var stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    var icons = { success: "bi-check-circle-fill", danger: "bi-exclamation-triangle-fill" };
    var el = document.createElement("div");
    el.className = "admin-toast " + (type || "success");
    el.innerHTML = '<i class="bi ' + (icons[type] || "bi-info-circle-fill") + '"></i><span></span>';
    el.querySelector("span").textContent = message;
    stack.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transform = "translateY(-6px)";
      el.style.transition = "all .2s ease";
      setTimeout(function () { el.remove(); }, 220);
    }, 3200);
  };

  /* -------------------------- Konfirmasi hapus -------------------------- */
  document.querySelectorAll("form[data-confirm]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      var pesan = form.getAttribute("data-confirm") || "Lanjutkan tindakan ini?";
      if (!window.confirm(pesan)) event.preventDefault();
    });
  });

  /* -------------------- Sorting kolom tabel (query string) --------------- */
  document.querySelectorAll("[data-sort]").forEach(function (el) {
    el.addEventListener("click", function () {
      var url = new URL(window.location.href);
      var field = el.getAttribute("data-sort");
      var currentSort = url.searchParams.get("sort");
      var currentDir = (url.searchParams.get("dir") || "asc").toLowerCase();
      var nextDir = currentSort === field && currentDir === "asc" ? "desc" : "asc";
      url.searchParams.set("sort", field);
      url.searchParams.set("dir", nextDir);
      url.searchParams.delete("page");
      window.location.href = url.toString();
    });
  });

  /* ---------------- Segarkan halaman setelah POST (PRG flow) ------------- */
  document.querySelectorAll("form[data-ajax]").forEach(function (form) {
    form.addEventListener("submit", function () {
      var btn = form.querySelector("[type=submit]");
      if (btn) {
        btn.disabled = true;
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...';
      }
    });
  });

  /* ---------------------------- Dropzone gambar -------------------------- */
  window.initDropzone = function (root) {
    if (!root) return;
    var input = root.querySelector("input[type=file]");
    var hidden = root.querySelector("input[type=hidden]");
    var preview = root.querySelector(".media-preview");
    var previewImg = preview ? preview.querySelector("img") : null;

    function applyUrl(url) {
      if (hidden) hidden.value = url || "";
      if (!preview) return;
      if (url) {
        if (previewImg) previewImg.src = url;
        preview.classList.remove("d-none");
      } else {
        preview.classList.add("d-none");
        if (previewImg) previewImg.removeAttribute("src");
      }
    }

    function upload(file) {
      if (!file) return;
      if (!/^image\/(jpeg|png|jpg|webp|gif)$/i.test(file.type)) {
        window.showToast("Format gambar harus JPG atau PNG.", "danger");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        window.showToast("Ukuran gambar maksimal 5MB.", "danger");
        return;
      }
      var data = new FormData();
      data.append("gambar", file);
      root.classList.add("is-dragover");
      fetch("/admin/upload", { method: "POST", body: data, credentials: "same-origin" })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (!json.success) throw new Error(json.message || "Gagal mengunggah gambar.");
          applyUrl(json.url);
          window.showToast("Gambar berhasil diunggah.", "success");
        })
        .catch(function (err) {
          window.showToast(err.message || "Gagal mengunggah gambar.", "danger");
        })
        .finally(function () { root.classList.remove("is-dragover"); });
    }

    root.addEventListener("click", function (event) {
      if (event.target.closest(".btn-clear")) {
        event.stopPropagation();
        applyUrl("");
        return;
      }
      if (input) input.click();
    });

    if (input) {
      input.addEventListener("change", function () {
        if (input.files && input.files[0]) upload(input.files[0]);
        input.value = "";
      });
    }

    ["dragover", "dragenter"].forEach(function (evt) {
      root.addEventListener(evt, function (e) {
        e.preventDefault();
        root.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach(function (evt) {
      root.addEventListener(evt, function (e) {
        e.preventDefault();
        root.classList.remove("is-dragover");
        if (evt === "drop" && e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]);
      });
    });

    if (preview && hidden && hidden.value) preview.classList.remove("d-none");
  };

  document.querySelectorAll(".dropzone").forEach(function (zone) {
    window.initDropzone(zone.parentElement || zone);
  });

  /* ----------------- Upload gambar opsi jawaban (ikon kecil) ------------- */
  document.querySelectorAll("[data-opsi-upload]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var wrap = btn.closest(".opsi-row");
      var picker = document.createElement("input");
      picker.type = "file";
      picker.accept = "image/*";
      picker.addEventListener("change", function () {
        var file = picker.files && picker.files[0];
        if (!file) return;
        var data = new FormData();
        data.append("gambar", file);
        fetch("/admin/upload", { method: "POST", body: data, credentials: "same-origin" })
          .then(function (res) { return res.json(); })
          .then(function (json) {
            if (!json.success) throw new Error(json.message || "Gagal mengunggah gambar.");
            wrap.querySelector(".opsi-image-url").value = json.url;
            btn.classList.add("has-image");
            btn.title = "Gambar terpasang - klik untuk mengganti";
            window.showToast("Gambar opsi diunggah.", "success");
          })
          .catch(function (err) {
            window.showToast(err.message || "Gagal mengunggah gambar.", "danger");
          });
      });
      picker.click();
    });
  });

  /* ------------------- Tab detail tes (jaga tab aktif via URL) ----------- */
  var tabButtons = document.querySelectorAll('[data-bs-toggle="tab"][data-tab-key]');
  if (tabButtons.length && window.location.hash) {
    var target = document.querySelector(
      '[data-bs-toggle="tab"][href="' + window.location.hash + '"]'
    );
    if (target && window.bootstrap && window.bootstrap.Tab) {
      new window.bootstrap.Tab(target).show();
    }
  }

  tabButtons.forEach(function (btn) {
    btn.addEventListener("shown.bs.tab", function (event) {
      var key = event.target.getAttribute("data-tab-key");
      if (key && history.replaceState) {
        history.replaceState(null, "", "#" + key);
      }
    });
  });
})();

