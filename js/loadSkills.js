const SKILLS_ENDPOINT = 'data/skills.json';

const createCategoryElement = (category) => {
  const wrapper = document.createElement('div');
  const className = category.className || 'skills-category';
  wrapper.classList.add(className);

  const heading = document.createElement('h3');
  heading.textContent = category.title;
  wrapper.appendChild(heading);

  const list = document.createElement('ul');
  const skills = Array.isArray(category.skills) ? category.skills : [];

  skills.forEach((skill) => {
    const item = document.createElement('li');
    item.textContent = skill;
    list.appendChild(item);
  });

  wrapper.appendChild(list);
  return wrapper;
};

const createLanguageElement = (language) => {
  const bar = document.createElement('div');
  bar.classList.add('skill-bar');

  const info = document.createElement('div');
  info.classList.add('skill-info');

  const name = document.createElement('div');
  name.classList.add('skill-name');
  name.textContent = language.name;

  const level = document.createElement('div');
  level.classList.add('skill-level');
  level.textContent = language.level;

  info.append(name, level);

  const progress = document.createElement('div');
  progress.classList.add('skill-progress');

  const levelBar = document.createElement('div');
  levelBar.classList.add('skill-level-bar');
  const percent = Number.isFinite(language.percent) ? language.percent : 0;
  levelBar.style.width = `${Math.min(Math.max(percent, 0), 100)}%`;

  progress.appendChild(levelBar);
  bar.append(info, progress);

  return bar;
};

const renderSkills = (data, categoriesContainer, languagesContainer) => {
  categoriesContainer.innerHTML = '';
  languagesContainer.innerHTML = '';

  const categories = Array.isArray(data.categories) ? data.categories : [];
  const languages = Array.isArray(data.languages) ? data.languages : [];

  const categoriesFragment = document.createDocumentFragment();
  categories.forEach((category) => {
    categoriesFragment.appendChild(createCategoryElement(category));
  });
  categoriesContainer.appendChild(categoriesFragment);

  const languagesFragment = document.createDocumentFragment();
  languages.forEach((language) => {
    languagesFragment.appendChild(createLanguageElement(language));
  });
  languagesContainer.appendChild(languagesFragment);
};

document.addEventListener('DOMContentLoaded', () => {
  const categoriesContainer = document.getElementById('skills-categories-container');
  const languagesContainer = document.getElementById('languages-container');

  if (!categoriesContainer || !languagesContainer) {
    return;
  }

  fetch(SKILLS_ENDPOINT)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load skills data: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!data || typeof data !== 'object') {
        throw new Error('Skills data is invalid');
      }
      renderSkills(data, categoriesContainer, languagesContainer);
    })
    .catch((error) => {
      console.error('Error loading skills data:', error);
      categoriesContainer.textContent = 'Unable to load skills at this time.';
    });
});
