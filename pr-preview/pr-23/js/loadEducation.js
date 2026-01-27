(() => {
    "use strict";

    const lang = window.APP_LANG || 'en';
    const EDUCATION_ENDPOINT = `data/${lang}/education.json`;
    const getLocaleFromLang = () =>
        window.getLocaleFromLang ? window.getLocaleFromLang() : (window.APP_LANG || 'en');
    const getPresentLabel = () =>
        window.getPresentLabel ? window.getPresentLabel() : 'Present';
    const getI18nValue = (key, fallback, variables) =>
        window.getI18nValue ? window.getI18nValue(key, fallback, variables) : fallback;

    const formatMonthYear = (value) => {
        if (!value) {
            return '';
        }

        if (typeof value === 'string' && value.toLowerCase() === 'present') {
            return getPresentLabel();
        }

        if (typeof value !== 'string') {
            return value;
        }

        const match = value.match(/^(\d{4})-(\d{2})$/);
        if (!match) {
            return value;
        }

        const year = Number(match[1]);
        const month = Number(match[2]);
        if (!year || month < 1 || month > 12) {
            return value;
        }

        const date = new Date(year, month - 1, 1);
        return new Intl.DateTimeFormat(getLocaleFromLang(), {
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    const renderEducation = (items, container) => {
        container.innerHTML = '';

        items.forEach((item) => {
            const listItem = document.createElement('li');
            listItem.classList.add('education-item');

            const content = document.createElement('div');
            content.classList.add('content', 'education-content');

            const school = document.createElement('h3');
            school.textContent = item.school;
            content.appendChild(school);

            if (item.degree) {
                const degree = document.createElement('h4');
                degree.textContent = item.degree;
                content.appendChild(degree);
            }

            if (item.program) {
                const program = document.createElement('h4');
                program.textContent = item.program;
                content.appendChild(program);
            }

            if (item.location) {
                const location = document.createElement('p');
                location.classList.add('education-location');
                location.textContent = item.location;
                content.appendChild(location);
            }

            const highlights = document.createElement('div');
            highlights.classList.add('education-highlights');

            const highlightItems = Array.isArray(item.highlights) ? item.highlights : [];

            highlightItems.forEach((highlight) => {
                const highlightItem = document.createElement('p');
                highlightItem.textContent = `• ${highlight}`;
                highlights.appendChild(highlightItem);
            });

            content.appendChild(highlights);

            if (item.links && item.links.website) {
                const link = document.createElement('a');
                link.classList.add('link-text');
                link.href = item.links.website;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = getI18nValue('ui.website', 'Website');
                content.appendChild(link);
            }

            const time = document.createElement('div');
            time.classList.add('time', 'education-dates');

            const dateRange = document.createElement('h4');
            dateRange.textContent = `${formatMonthYear(item.start)} - ${formatMonthYear(item.end)}`;
            time.appendChild(dateRange);

            listItem.append(content, time);
            container.appendChild(listItem);
        });

        const clearfix = document.createElement('div');
        clearfix.classList.add('clearfix');
        container.appendChild(clearfix);
    };

    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('education-container');

        if (!container) {
            return;
        }

        fetch(EDUCATION_ENDPOINT)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load education data: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                if (!Array.isArray(data)) {
                    throw new Error('Education data is not an array');
                }
                renderEducation(data, container);
            })
            .catch((error) => {
                console.error('Error loading education data:', error);
                container.textContent = getI18nValue(
                    'ui.loadError.education',
                    'Unable to load education at this time.'
                );
            });
    });
})();
