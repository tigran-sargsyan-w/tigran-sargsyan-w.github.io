(() => {
	"use strict";

	const SKILLS_ENDPOINT = 'data/skills.json';
	const CATEGORY_CLASS_NAMES = [
		'programming-dev',
		'project-management',
		'sysadmin',
		'communication',
	];

	const createCategoryItem = (category, index) => {
		const listItem = document.createElement('li');
		listItem.classList.add('skills-category-item');

		const wrapper = document.createElement('div');
		wrapper.classList.add(CATEGORY_CLASS_NAMES[index] || 'skills-category');

		const heading = document.createElement('h3');
		heading.textContent = category.title;
		wrapper.appendChild(heading);

		const list = document.createElement('ul');

		const skills = Array.isArray(category.skills) ? category.skills : [];
		skills.forEach((skill) => {
			const skillItem = document.createElement('li');
			skillItem.textContent = skill;
			list.appendChild(skillItem);
		});

		wrapper.appendChild(list);
		listItem.appendChild(wrapper);

		return listItem;
	};

	const createLanguageItem = (language) => {
		const listItem = document.createElement('li');
		listItem.classList.add('skill-bar');

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

		const bar = document.createElement('div');
		bar.classList.add('skill-level-bar');

		const percentage = Number(language.percent);
		if (!Number.isNaN(percentage)) {
			bar.style.width = `${percentage}%`;
		}

		progress.appendChild(bar);
		listItem.append(info, progress);

		return listItem;
	};

	const renderSkills = (data, categoriesContainer, languagesContainer) => {
		if (categoriesContainer) {
			categoriesContainer.innerHTML = '';

			const categories = Array.isArray(data.categories) ? data.categories : [];
			categories.forEach((category, index) => {
				categoriesContainer.appendChild(createCategoryItem(category, index));
			});
		}

		if (languagesContainer) {
			languagesContainer.innerHTML = '';

			const languages = Array.isArray(data.languages) ? data.languages : [];
			languages.forEach((language) => {
				languagesContainer.appendChild(createLanguageItem(language));
			});
		}
	};

	document.addEventListener('DOMContentLoaded', () => {
		const categoriesContainer = document.getElementById('skills-categories-container');
		const languagesContainer = document.getElementById('languages-container');

		if (!categoriesContainer && !languagesContainer) {
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
					throw new Error('Skills data is not an object');
				}
				renderSkills(data, categoriesContainer, languagesContainer);
			})
			.catch((error) => {
				console.error('Error loading skills data:', error);

				if (categoriesContainer) {
					categoriesContainer.textContent = 'Unable to load skills at this time.';
				}
				if (languagesContainer) {
					languagesContainer.textContent = 'Unable to load languages at this time.';
				}
			});
	});
})();
