const PROJECTS_DATA_URL = "data/projects.json";

const buildProjectLink = (link) => {
  const anchor = document.createElement("a");
  anchor.href = link.url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";

  const icon = document.createElement("i");
  if (link.type === "github") {
    icon.className = "fab fa-github";
  } else {
    icon.className = "fas fa-globe";
  }

  anchor.appendChild(icon);
  return anchor;
};

const createProjectCard = (project, options) => {
  const { isVertical, index } = options;
  const card = document.createElement("div");
  card.classList.add("card");

  if (isVertical) {
    if (index < 3) {
      card.classList.add("initial");
    } else {
      card.classList.add("hidden");
    }
    card.style.cssText = `min-width: 281px; min-height: 500px; background: url(${project.imageSrc}) center center/cover;`;
  } else {
    card.classList.add("hidden");
    card.style.cssText = `min-width: 400px; min-height: 226px; background: url(${project.imageSrc}) center center/cover;`;
  }

  const projectInfo = document.createElement("div");
  projectInfo.classList.add("project-info");

  const projectBio = document.createElement("div");
  projectBio.classList.add(isVertical ? "project-bio-vertical" : "project-bio");

  const title = document.createElement("h3");
  title.textContent = project.title;

  const technologies = document.createElement("p");
  technologies.textContent = project.technologies;

  projectBio.appendChild(title);
  projectBio.appendChild(technologies);

  const projectLink = document.createElement("div");
  projectLink.classList.add("project-link");

  if (Array.isArray(project.links)) {
    project.links.forEach((link) => {
      projectLink.appendChild(buildProjectLink(link));
    });
  }

  projectInfo.appendChild(projectBio);
  projectInfo.appendChild(projectLink);
  card.appendChild(projectInfo);

  return card;
};

const createProjectArticle = (projects, isVertical) => {
  const article = document.createElement("article");
  article.classList.add(isVertical ? "project" : "project-horizontal");
  if (!isVertical) {
    article.style.marginTop = "0.9rem";
  }

  projects.forEach((project, index) => {
    article.appendChild(createProjectCard(project, { isVertical, index }));
  });

  return article;
};

const renderProjectSection = (sectionId, data) => {
  const section = document.getElementById(sectionId);
  if (!section || !data) {
    return;
  }

  section.innerHTML = "";
  section.appendChild(createProjectArticle(data.vertical || [], true));
  section.appendChild(createProjectArticle(data.horizontal || [], false));
};

const setupToggleButton = (buttonId, sectionId) => {
  const button = document.getElementById(buttonId);
  const section = document.getElementById(sectionId);
  if (!button || !section) {
    return;
  }

  let isExpanded = false;

  button.addEventListener("click", () => {
    isExpanded = !isExpanded;

    const cards = section.querySelectorAll(".card");
    cards.forEach((card) => {
      if (isExpanded) {
        card.classList.remove("hidden");
      } else if (!card.classList.contains("initial")) {
        card.classList.add("hidden");
      }
    });

    button.innerHTML = isExpanded
      ? 'Show Less <i class="fas fa-arrow-right"></i>'
      : 'Show More <i class="fas fa-arrow-right"></i>';
  });
};

const loadProjects = async () => {
  try {
    const response = await fetch(PROJECTS_DATA_URL);
    if (!response.ok) {
      throw new Error(`Failed to load ${PROJECTS_DATA_URL}: ${response.status}`);
    }

    const data = await response.json();
    renderProjectSection("game-projects", data.game_projects);
    renderProjectSection("non-game-projects", data.non_game_projects);
    setupToggleButton("show-more-gaming-btn", "game-projects");
    setupToggleButton("show-more-non-gaming-btn", "non-game-projects");
  } catch (error) {
    console.error("Unable to load projects data", error);
  }
};

loadProjects();
