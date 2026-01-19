/* global pdfjsLib */

(function () {
  "use strict";

  function ensurePdfJs() {
    // pdf.js is loaded from CDN and attaches itself to window as `pdfjsLib`
    if (typeof window === "undefined") return null;
    return window["pdfjs-dist/build/pdf"] || window.pdfjsLib || null;
  }

  function setWorkerSrc(lib) {
    // Avoid "Setting up fake worker" by pointing to the CDN worker.
    // Must match the version used in resume.html
    try {
      if (lib && lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js";
      }
    } catch (_) {
      // ignore
    }
  }

  async function renderPdfToContainer({ url, containerId, scale }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const lib = ensurePdfJs();
    if (!lib) {
      // If pdf.js failed to load, don't hard-crash the page.
      return;
    }

    setWorkerSrc(lib);

    const loadingTask = lib.getDocument(url);
    const pdf = await loadingTask.promise;

    // Clear existing content (if any)
    container.innerHTML = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.className = "pdf-page";
      canvas.id = `page${pageNumber}`;

      const context = canvas.getContext("2d", { alpha: false });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      container.appendChild(canvas);

      await page.render({ canvasContext: context, viewport }).promise;
    }
  }

    async function loadCvPdf() {
    try {
      const response = await fetch("CV/cv-files.json", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error("Failed to load CV manifest");
      }
      const data = await response.json();
      if (!data || !Array.isArray(data.files)) {
        throw new Error("Invalid CV manifest");
      }
      const pdfFile = data.files.find((file) =>
        typeof file === "string" ? file.toLowerCase().endsWith(".pdf") : false
      );
      if (!pdfFile) {
        throw new Error("No PDF found in CV manifest");
      }
      return `CV/${pdfFile}`;
    } catch (_) {
      return "CV/CV-Tigran Sargsyan.pdf";
    }
  }

  function updateDownloadLink(pdfUrl) {
    const link = document.getElementById("pdfDownloadLink");
    if (link) {
      link.href = pdfUrl;
    }
  }


  document.addEventListener("DOMContentLoaded", function () {
    loadCvPdf()
      .then(function (pdfUrl) {
        updateDownloadLink(pdfUrl);
        return renderPdfToContainer({
          url: pdfUrl,
          containerId: "pdfContainer",
          scale: 1.5,
        });
      })
      .catch(function () {
        // Swallow errors to keep the rest of the page functional.
      });
  });
})();
