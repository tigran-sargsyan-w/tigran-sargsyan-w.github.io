const BASE_URL = document.documentElement?.dataset?.baseurl || "";
document.addEventListener("DOMContentLoaded", () => {
    initCertificatesCarousel();
});

async function initCertificatesCarousel() {
    const slideshowContainer = document.querySelector(".slideshow-container");
    const dotsContainer = document.getElementById("dots-container");

    if (!slideshowContainer || !dotsContainer) {
        return;
    }

    let certificates = [];

    try {
        const response = await fetch(`${BASE_URL}/data/certificates.json`);
        if (!response.ok) {
            throw new Error(`Failed to load certificates: ${response.status}`);
        }
        certificates = await response.json();
    } catch (error) {
        console.error("Error loading certificates data:", error);
        return;
    }

    if (!Array.isArray(certificates) || certificates.length === 0) {
        return;
    }

    let slideIndex = 1;
    let intervalId;
    let slides = [];
    let dots = [];

    const startCarousel = () => {
        if (slides.length > 0) {
            intervalId = setInterval(() => {
                plusSlides(1);
            }, 4000);
        }
    };

    const stopCarousel = () => {
        clearInterval(intervalId);
    };

    const plusSlides = (n) => {
        showSlides(slideIndex + n);
    };

    const currentSlide = (n) => {
        showSlides(n);
    };

    const showSlides = (n) => {
        if (slides.length === 0 || dots.length === 0) {
            return;
        }

        slideIndex = n;
        if (slideIndex > slides.length) {
            slideIndex = 1;
        }
        if (slideIndex < 1) {
            slideIndex = slides.length;
        }

        slides.forEach((slide) => {
            slide.style.display = "none";
        });

        dots.forEach((dot) => {
            dot.className = dot.className.replace(" active", "");
        });

        slides[slideIndex - 1].style.display = "block";
        dots[slideIndex - 1].className += " active";
    };

    const generateSlides = () => {
        const slidesHtml = certificates
            .map((certificate, index) => {
                const slideNumber = index + 1;
                return `
                <div class="mySlides fade">
                    <div class="numbertext">${slideNumber} / ${certificates.length}</div>
                    <img src="${certificate.imageSrc}" style="width:100%">
                    <div class="text">${certificate.title}</div>
                </div>
            `;
            })
            .join("");

        const dotsHtml = certificates
            .map(() => '<span class="dot"></span>')
            .join("");

        slideshowContainer.innerHTML = `${slidesHtml}
            <a class="prev">&#10094;</a>
            <a class="next">&#10095;</a>`;
        dotsContainer.innerHTML = dotsHtml;

        slides = Array.from(slideshowContainer.getElementsByClassName("mySlides"));
        dots = Array.from(dotsContainer.getElementsByClassName("dot"));

        const prevButton = slideshowContainer.querySelector(".prev");
        const nextButton = slideshowContainer.querySelector(".next");

        if (prevButton) {
            prevButton.addEventListener("click", () => {
                stopCarousel();
                plusSlides(-1);
            });
        }

        if (nextButton) {
            nextButton.addEventListener("click", () => {
                stopCarousel();
                plusSlides(1);
            });
        }

        dots.forEach((dot, index) => {
            dot.addEventListener("click", () => {
                stopCarousel();
                currentSlide(index + 1);
            });
        });

        showSlides(1);
    };

    generateSlides();
    startCarousel();
}
