(() => {
const EXPERIENCE_ENDPOINT = '/data/experience.json';

const EXPERIENCE_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatMonthYear = (value) => {
  if (!value) {
    return '';
  }

  if (value.toLowerCase() === 'present') {
    return 'Present';
  }

  const [year, month] = value.split('-').map(Number);
  if (!year || !month) {
    return value;
  }

  return `${EXPERIENCE_MONTH_NAMES[month - 1]} ${year}`;
};

const parseYearMonth = (value) => {
  const [year, month] = value.split('-').map(Number);
  return { year, month };
};

const calculateMonthsWorked = (startValue, endValue) => {
  const start = parseYearMonth(startValue);
  const end = endValue.toLowerCase() === 'present'
    ? {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      }
    : parseYearMonth(endValue);

  if (start.year > end.year || (start.year === end.year && start.month > end.month)) {
    return 'Invalid dates';
  }

  const monthsWorked = (end.year - start.year) * 12 + (end.month - start.month) + 1;

  if (monthsWorked > 12) {
    const years = Math.floor(monthsWorked / 12);
    const remainingMonths = monthsWorked % 12;
    return `${years} year ${remainingMonths} months`;
  }

  return `${monthsWorked} months`;
};

const renderExperience = (items, container) => {
  container.innerHTML = '';

  items.forEach((item) => {
    const listItem = document.createElement('li');
    listItem.classList.add('experience-item');

    const content = document.createElement('div');
    content.classList.add('content', 'experience-content');

    const title = document.createElement('h3');
    title.textContent = item.title;

    const company = document.createElement('h4');
    company.textContent = item.company;

    content.append(title, company);

    if (item.location) {
      const location = document.createElement('p');
      location.classList.add('experience-location');
      location.textContent = item.location;
      content.appendChild(location);
    }

    if (Array.isArray(item.stack) && item.stack.length > 0) {
      const stack = document.createElement('p');
      stack.classList.add('experience-stack');
      stack.textContent = `Stack: ${item.stack.join(', ')}`;
      content.appendChild(stack);
    }

    const tasks = document.createElement('div');
    tasks.classList.add('experience-tasks');

    const taskItems = Array.isArray(item.tasks) ? item.tasks : [];

    taskItems.forEach((task) => {
      const taskItem = document.createElement('p');
      taskItem.textContent = `• ${task}`;
      tasks.appendChild(taskItem);
    });

    content.appendChild(tasks);

    const time = document.createElement('div');
    time.classList.add('time', 'experience-dates');

    const dateRange = document.createElement('h4');
    dateRange.textContent = `${formatMonthYear(item.start)} - ${formatMonthYear(item.end)}`;

    const duration = document.createElement('h5');
    duration.classList.add('experience-duration');
    duration.textContent = `( ${calculateMonthsWorked(item.start, item.end)} )`;

    time.append(dateRange, duration);

    listItem.append(content, time);
    container.appendChild(listItem);
  });

  const clearfix = document.createElement('div');
  clearfix.classList.add('clearfix');
  container.appendChild(clearfix);
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('experience-container');

  if (!container) {
    return;
  }

  fetch(EXPERIENCE_ENDPOINT)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load experience data: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) {
        throw new Error('Experience data is not an array');
      }
      renderExperience(data, container);
    })
    .catch((error) => {
      console.error('Error loading experience data:', error);
      container.textContent = 'Unable to load experience at this time.';
    });
});
})();
