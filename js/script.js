const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");

hamburger.addEventListener("click", mobileMenu);

function mobileMenu() {
  hamburger.classList.toggle("active");
  navMenu.classList.toggle("active");
}

// Close navbar when link is clicked
const navLink = document.querySelectorAll(".nav-link");

navLink.forEach((n) => n.addEventListener("click", closeMenu));

function closeMenu() {
  hamburger.classList.remove("active");
  navMenu.classList.remove("active");
}

// Event Listeners: Handling toggle event
const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
const userIcon = document.getElementById("user-icon");
const downloadIcon = document.getElementById("download-icon");

function switchTheme(e) {
  if (e.target.checked) {
    document.documentElement.setAttribute("data-theme", "dark");
    userIcon.src = "./assets/user_dark.png";
    if (downloadIcon !== null) {
      downloadIcon.src = "./assets/download-dark.png";
    }
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    userIcon.src = "./assets/user_light.png";
    if (downloadIcon !== null) {
      downloadIcon.src = "./assets/download-light.png";
    }

    localStorage.setItem("theme", "light");
  }
}

toggleSwitch.addEventListener("change", switchTheme);

// Save user preference on load
const currentTheme = localStorage.getItem("theme");

if (currentTheme) {
  document.documentElement.setAttribute("data-theme", currentTheme);

  if (currentTheme === "dark") {
    toggleSwitch.checked = true;
    userIcon.src = "./assets/user_dark.png";
    if (downloadIcon !== null) {
      downloadIcon.src = "./assets/download-dark.png";
    }
  } else {
    userIcon.src = "./assets/user_light.png";
    if (downloadIcon !== null) {
      downloadIcon.src = "./assets/download-light.png";
    }
  }
}


//Adding date

let myDate = document.querySelector("#datee");

const yes = new Date().getFullYear();
myDate.innerHTML = yes;

//project section

var isGameProjectsExpanded = false;
var isNonGameProjectsExpanded = false;

var gamingProjectsSection = document.getElementById("game-projects");
var gamingProjectCards = gamingProjectsSection.querySelectorAll('.card');
var showMoreGamingBtn = document.getElementById('show-more-gaming-btn');

var nonGamingProjectsSection = document.getElementById("non-game-projects");
var nonGamingProjectCards = nonGamingProjectsSection.querySelectorAll('.card');
var showMoreNonGamingBtn = document.getElementById('show-more-non-gaming-btn');

showMoreGamingBtn.addEventListener('click', function() {
  isGameProjectsExpanded = !isGameProjectsExpanded;

  gamingProjectCards.forEach(function(project) {
    // Показываем или скрываем проекты в зависимости от состояния кнопки
    if (isGameProjectsExpanded) {
      project.classList.remove('hidden');
      showMoreGamingBtn.innerHTML = 'Show Less <i class="fas fa-arrow-right"></i>';
    } else {
      // Скрываем проекты, кроме первых трех
      if (!project.classList.contains('initial')) {
        project.classList.add('hidden');
      }
      showMoreGamingBtn.innerHTML = 'Show More <i class="fas fa-arrow-right"></i>';
    }
  });
});

showMoreNonGamingBtn.addEventListener('click', function() {
  isNonGameProjectsExpanded = !isNonGameProjectsExpanded;

  nonGamingProjectCards.forEach(function(project) {
    // Показываем или скрываем проекты в зависимости от состояния кнопки
    if (isNonGameProjectsExpanded) {
      project.classList.remove('hidden');
      showMoreNonGamingBtn.innerHTML = 'Show Less <i class="fas fa-arrow-right"></i>';
    } else {
      // Скрываем проекты, кроме первых трех
      if (!project.classList.contains('initial')) {
        project.classList.add('hidden');
      }
      showMoreNonGamingBtn.innerHTML = 'Show More <i class="fas fa-arrow-right"></i>';
    }
  });
});

