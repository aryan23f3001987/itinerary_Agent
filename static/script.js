let currentThreadId = localStorage.getItem("travel_thread_id") || null;
let latestAnswerMarkdown = "";

// =========================
// Photo Gallery Carousel (circular / infinite loop)
// =========================

let galleryPhotos = [];
let galleryIndex = 0;
let galleryTimer = null;
const GALLERY_INTERVAL_MS = 7500;

async function initGallery() {
    const track = document.getElementById("galleryTrack");
    const dotsContainer = document.getElementById("galleryDots");

    if (!track || !dotsContainer) {
        return;
    }

    try {
        const response = await fetch("/api/photos");
        const data = await response.json();

        galleryPhotos = (data.photos || []);

        if (galleryPhotos.length === 0) {
            track.innerHTML = `<div class="gallery-empty">Add images to the photo_database folder to see them here.</div>`;
            return;
        }

        renderGallerySlides(galleryPhotos);
        renderGalleryDots(galleryPhotos.length);

        // Single persistent listener handles the circular wrap-around,
        // no matter how many photos exist or how fast slides advance.
        track.addEventListener("transitionend", handleGalleryTransitionEnd);

        startGalleryAutoplay();

    } catch (error) {
        track.innerHTML = `<div class="gallery-empty">Could not load destination photos.</div>`;
    }
}

function renderGallerySlides(photos) {
    const track = document.getElementById("galleryTrack");

    // The list behaves like a circular loop: after the real photos,
    // we append one clone of photo #1. Once we slide onto that clone,
    // we instantly (and invisibly) rewind to the real photo #1, so the
    // carousel always keeps moving right and never "dead ends."
    const slidesHtml = photos
        .map((url, i) => `
            <div class="gallery-slide">
                <img src="${url}" alt="Destination photo ${i + 1}" loading="lazy">
            </div>
        `)
        .join("");

    const cloneFirstHtml = photos.length > 1
        ? `<div class="gallery-slide"><img src="${photos[0]}" alt="Destination photo 1"></div>`
        : "";

    track.innerHTML = slidesHtml + cloneFirstHtml;

    galleryIndex = 0;
    track.style.transform = `translateX(0%)`;
}

function renderGalleryDots(count) {
    const dotsContainer = document.getElementById("galleryDots");

    dotsContainer.innerHTML = Array.from({ length: count })
        .map((_, i) => `<button class="gallery-dot${i === 0 ? " active" : ""}" data-index="${i}"></button>`)
        .join("");

    dotsContainer.querySelectorAll(".gallery-dot").forEach((dot) => {
        dot.addEventListener("click", () => {
            const targetIndex = parseInt(dot.dataset.index, 10);
            goToGallerySlide(targetIndex);
            restartGalleryAutoplay();
        });
    });
}

function updateGalleryDots() {
    const dotsContainer = document.getElementById("galleryDots");
    if (!dotsContainer) return;

    const realIndex = galleryIndex % galleryPhotos.length;

    dotsContainer.querySelectorAll(".gallery-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === realIndex);
    });
}

function goToGallerySlide(index) {
    const track = document.getElementById("galleryTrack");
    if (!track) return;

    track.classList.remove("no-transition");
    galleryIndex = index;
    track.style.transform = `translateX(-${galleryIndex * 100}%)`;
    updateGalleryDots();
}

function advanceGallerySlide() {
    const track = document.getElementById("galleryTrack");
    if (!track || galleryPhotos.length === 0) return;

    galleryIndex += 1;
    track.style.transform = `translateX(-${galleryIndex * 100}%)`;
    updateGalleryDots();
}

function handleGalleryTransitionEnd() {
    const track = document.getElementById("galleryTrack");
    if (!track) return;

    // We only rewind once we've landed on the cloned slide
    // (one position past the real last photo).
    if (galleryIndex !== galleryPhotos.length) {
        return;
    }

    track.classList.add("no-transition");
    galleryIndex = 0;
    track.style.transform = `translateX(0%)`;

    // Force a reflow so the browser applies the instant jump
    // before we re-enable the smooth transition.
    void track.offsetWidth;

    track.classList.remove("no-transition");
}

function startGalleryAutoplay() {
    if (galleryPhotos.length <= 1) return;

    galleryTimer = setInterval(advanceGallerySlide, GALLERY_INTERVAL_MS);
}

function restartGalleryAutoplay() {
    if (galleryTimer) {
        clearInterval(galleryTimer);
    }
    startGalleryAutoplay();
}

document.addEventListener("DOMContentLoaded", initGallery);

function setPrompt(text) {
    document.getElementById("userInput").value = text;
}

function setLoading(isLoading) {
    const sendBtn = document.getElementById("sendBtn");
    const btnText = document.getElementById("btnText");
    const btnLoader = document.getElementById("btnLoader");

    sendBtn.disabled = isLoading;

    if (isLoading) {
        btnText.classList.add("hidden");
        btnLoader.classList.remove("hidden");
    } else {
        btnText.classList.remove("hidden");
        btnLoader.classList.add("hidden");
    }
}

function showError(message) {
    const errorBox = document.getElementById("errorBox");

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function hideError() {
    const errorBox = document.getElementById("errorBox");

    errorBox.classList.add("hidden");
    errorBox.textContent = "";
}

function showResult(answer, threadId) {
    latestAnswerMarkdown = answer;

    const resultSection = document.getElementById("resultSection");
    const resultBox = document.getElementById("resultBox");
    const threadInfo = document.getElementById("threadInfo");

    if (typeof marked !== "undefined") {
        resultBox.innerHTML = marked.parse(answer);
    } else {
        resultBox.innerText = answer;
    }

    threadInfo.textContent = `Thread ID: ${threadId}`;

    resultSection.classList.remove("hidden");

    resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

async function sendMessage() {
    hideError();

    const input = document.getElementById("userInput");
    const message = input.value.trim();

    if (!message) {
        showError("Please enter your travel request first.");
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/api/travel", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                thread_id: currentThreadId
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Something went wrong.");
        }

        currentThreadId = data.thread_id;
        localStorage.setItem("travel_thread_id", currentThreadId);

        showResult(data.answer, data.thread_id);

    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

function copyResult() {
    const resultBox = document.getElementById("resultBox");
    const text = resultBox.innerText;

    if (!text) {
        return;
    }

    navigator.clipboard.writeText(text)
        .then(() => {
            const copyBtn = document.querySelector(".copy-btn");
            const oldText = copyBtn.textContent;

            copyBtn.textContent = "Copied!";

            setTimeout(() => {
                copyBtn.textContent = oldText;
            }, 1400);
        })
        .catch(() => {
            showError("Could not copy result.");
        });
}

function downloadPDF() {
    const pdfContent = document.getElementById("pdfContent");

    if (!latestAnswerMarkdown || !pdfContent) {
        showError("No travel plan available to download.");
        return;
    }

    const downloadBtn = document.querySelector(".download-btn");
    const oldText = downloadBtn.textContent;

    downloadBtn.textContent = "Preparing PDF...";
    downloadBtn.disabled = true;

    const options = {
        margin: 0.5,
        filename: "ai-travel-plan.pdf",
        image: {
            type: "jpeg",
            quality: 0.98
        },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff"
        },
        jsPDF: {
            unit: "in",
            format: "a4",
            orientation: "portrait"
        },
        pagebreak: {
            mode: ["avoid-all", "css", "legacy"]
        }
    };

    html2pdf()
        .set(options)
        .from(pdfContent)
        .save()
        .then(() => {
            downloadBtn.textContent = oldText;
            downloadBtn.disabled = false;
        })
        .catch(() => {
            downloadBtn.textContent = oldText;
            downloadBtn.disabled = false;
            showError("Could not download PDF.");
        });
}

document.addEventListener("keydown", function(event) {
    if (event.ctrlKey && event.key === "Enter") {
        sendMessage();
    }
});