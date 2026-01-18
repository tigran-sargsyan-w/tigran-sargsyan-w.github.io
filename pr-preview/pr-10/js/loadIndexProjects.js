const PROJECTS_DATA_URL = "/data/projects.json";
const FEATURED_TITLES = ["Gun Crusher", "Try Before Buy", "1124"];

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

const createProjectCard = (project) => {
  const card = document.createElement("div");
  card.classList.add("card", "initial");
  card.style.cssText = `min-width: 281px; min-height: 500px; background: url(${project.imageSrc}) center center/cover;`;

  const projectInfo = document.createElement("div");
  projectInfo.classList.add("project-info");

  const projectBio = document.createElement("div");
  projectBio.classList.add("project-bio-vertical");

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
      if (link?.url) {
        projectLink.appendChild(buildProjectLink(link));
      }
    });
  }

  projectInfo.appendChild(projectBio);
  projectInfo.appendChild(projectLink);
  card.appendChild(projectInfo);

  return card;
};

const collectProjects = (data) => {
  if (!data) {
    return [];
  }

  const gameProjects = data.game_projects || {};
  const nonGameProjects = data.non_game_projects || {};

  return [
    ...(gameProjects.vertical || []),
    ...(gameProjects.horizontal || []),
    ...(nonGameProjects.vertical || []),
    ...(nonGameProjects.horizontal || []),
  ];
};

const getFeaturedProjects = (projects) => {
  const projectsByTitle = new Map(
    projects.map((project) => [project.title, project])
  );

  return FEATURED_TITLES.map((title) => projectsByTitle.get(title)).filter(
    Boolean
  );
};

const renderFeaturedProjects = (projects) => {
  const container = document.getElementById("index-featured-projects-list");
  if (!container) {
    return;
  }

  container.innerHTML = "";
  projects.forEach((project) => {
    container.appendChild(createProjectCard(project));
  });
};

const loadIndexProjects = async () => {
  try {
    const response = await fetch(PROJECTS_DATA_URL);
    if (!response.ok) {
      throw new Error(`Failed to load ${PROJECTS_DATA_URL}: ${response.status}`);
    }

    const data = await response.json();
    const projects = collectProjects(data);
    const featuredProjects = getFeaturedProjects(projects);
    renderFeaturedProjects(featuredProjects);
  } catch (error) {
    console.error("Unable to load featured projects", error);
  }
};

loadIndexProjects();
