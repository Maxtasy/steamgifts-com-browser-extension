const REASON_NOT_ENOUGH_POINTS = 'Not enough points';
const AUTOJOIN_TIMEOUT_MS = 15000;
const TOAST_DURATION_MS = 6000;

const RATING_VARIANTS = {
  'Overwhelmingly Positive': 'success',
  'Very Positive': 'success',
  Positive: 'success',
  'Mostly Positive': 'success',
  Mixed: 'warning',
  'Mostly Negative': 'danger',
  'Very Negative': 'danger',
  'Overwhelmingly Negative': 'danger',
};

const CHECK_ICON_PATH = 'M20 6 9 17l-5-5';
const TOAST_ICON_PATHS = {
  danger: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20', 'm15 9-6 6', 'm9 9 6 6'],
  warning: [
    'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
    'M12 9v4',
    'M12 17h.01',
  ],
};

// --- Injected UI (Maxtasy design system) ---

function createBadge(text, variant) {
  const badge = document.createElement('span');
  badge.className = `sgx-badge sgx-badge--${variant}`;
  badge.textContent = text;
  return badge;
}

function createJoinButton(onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sgx sgx-join';
  button.title = 'Join giveaway';
  button.setAttribute('aria-label', 'Join giveaway');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', CHECK_ICON_PATH);
  svg.appendChild(path);
  button.appendChild(svg);

  button.addEventListener('click', onClick);
  return button;
}

function createToastIcon(variant) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `sgx-toast__icon sgx-toast__icon--${variant}`);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of TOAST_ICON_PATHS[variant]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

function showToast(title, description, variant) {
  let stack = document.querySelector('.sgx-toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'sgx sgx-toast-stack';
    stack.setAttribute('role', 'status');
    document.body.appendChild(stack);
  }

  const toast = document.createElement('div');
  toast.className = 'sgx-toast';

  if (variant) toast.appendChild(createToastIcon(variant));

  const content = document.createElement('div');
  content.className = 'sgx-toast__content';
  toast.appendChild(content);

  const titleElement = document.createElement('span');
  titleElement.className = 'sgx-toast__title';
  titleElement.textContent = title;
  content.appendChild(titleElement);

  if (description) {
    const descriptionElement = document.createElement('span');
    descriptionElement.className = 'sgx-toast__desc';
    descriptionElement.textContent = description;
    content.appendChild(descriptionElement);
  }

  stack.appendChild(toast);
  setTimeout(() => toast.remove(), TOAST_DURATION_MS);
}

function renderGameInfo(container, info) {
  container.replaceChildren();

  if (!info || info.error || info.unsupported) {
    container.hidden = true;
    return;
  }

  if (info.ageRestricted) {
    container.appendChild(createBadge('Age restricted', 'danger'));
  }

  container.appendChild(
    info.rating
      ? createBadge(info.rating, RATING_VARIANTS[info.rating] ?? 'neutral')
      : createBadge('No reviews', 'neutral')
  );

  if (info.achievements === null) return;
  container.appendChild(
    info.achievements > 0
      ? createBadge(`${info.achievements} achievements`, 'accent')
      : createBadge('No achievements', 'warning')
  );
}

// --- Points ---

// Applied as a delta, not an absolute value: joins finishing in quick succession in
// different tabs can arrive in any order, but subtractions commute.
function spendPoints(cost) {
  const element = document.querySelector('.nav__points');
  if (!element) return;
  const current = parseInt(element.textContent.replace(/\D/g, ''), 10);
  if (Number.isNaN(current)) return;
  element.textContent = Math.max(0, current - cost).toLocaleString('en-US');
}

function readGiveawayCost() {
  const heading = document.querySelector('.featured__heading')?.textContent ?? '';
  return Number(heading.match(/\((\d+)P\)/)?.[1] ?? 0);
}

// --- Giveaway list ---

function setUpGiveawayList() {
  const headings = document.querySelectorAll('.giveaway__heading');
  if (!headings.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        loadGameInfo(entry.target);
      }
    },
    { rootMargin: '400px 0px' }
  );

  const infoByHeading = new Map();

  headings.forEach((heading) => {
    const nameLink = heading.querySelector('.giveaway__heading__name');
    if (!nameLink) return;

    const url = `${nameLink.href}?autojoin=true`;
    heading.appendChild(
      createJoinButton(() => chrome.runtime.sendMessage({ event: 'giveaway:join:clicked', url }))
    );

    // Entered giveaways are hidden by the stylesheet, so skip fetching their info.
    if (heading.closest('.giveaway__row-inner-wrap')?.classList.contains('is-faded')) return;

    const steamLink = heading.querySelector('[href^="https://store.steampowered.com"]');
    if (!steamLink) return;

    const container = document.createElement('div');
    container.className = 'sgx sgx-info';
    container.setAttribute('aria-live', 'polite');
    container.appendChild(createBadge('', 'neutral')).classList.add('sgx-badge--loading');
    heading.insertAdjacentElement('afterend', container);

    infoByHeading.set(heading, { container, appUrl: steamLink.href });
    observer.observe(heading);
  });

  async function loadGameInfo(heading) {
    const { container, appUrl } = infoByHeading.get(heading);
    let info;
    try {
      info = await chrome.runtime.sendMessage({ event: 'steam:game-info', appUrl });
    } catch {
      info = { error: true };
    }
    renderGameInfo(container, info);
  }
}

// --- Giveaway page (auto join) ---

function waitFor(condition, timeoutMs) {
  return new Promise((resolve) => {
    if (condition()) return resolve(true);

    const observer = new MutationObserver(() => {
      if (condition()) done(true);
    });
    const timer = setTimeout(() => done(false), timeoutMs);

    function done(result) {
      observer.disconnect();
      clearTimeout(timer);
      resolve(result);
    }

    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
  });
}

async function autojoinGiveaway() {
  const sidebarText = document.querySelector('.sidebar')?.textContent ?? '';
  const joinButton = document.querySelector('.sidebar__entry-insert');

  if (/not enough points/i.test(sidebarText)) {
    chrome.runtime.sendMessage({
      event: 'giveaway:join:fail',
      reason: REASON_NOT_ENOUGH_POINTS,
      broadcast: true,
    });
    return;
  }

  if (!joinButton) {
    // Ended, deleted or restricted giveaway: keep the tab open and explain why.
    const reason = document.querySelector('.sidebar__error')?.textContent.trim();
    showToast("Couldn't join giveaway", reason || 'The join button is not available.', 'danger');
    return;
  }

  // Already entered: nothing to click, just close the tab.
  const alreadyEntered = joinButton.classList.contains('is-hidden');
  if (!alreadyEntered) {
    joinButton.click();
  }

  const joined = await waitFor(() => joinButton.classList.contains('is-hidden'), AUTOJOIN_TIMEOUT_MS);
  if (joined) {
    chrome.runtime.sendMessage({
      event: 'giveaway:join:success',
      cost: alreadyEntered ? 0 : readGiveawayCost(),
    });
  } else {
    showToast("Couldn't join giveaway", 'Steamgifts did not confirm the entry.', 'danger');
  }
}

// --- Init ---

setUpGiveawayList();

if (new URL(document.location).searchParams.get('autojoin')) {
  autojoinGiveaway();
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.event === 'points_spent') {
    spendPoints(message.cost);
  }

  if (message.event === 'not_enough_points_alert') {
    showToast(
      REASON_NOT_ENOUGH_POINTS,
      'Joining stopped. Collect more points and try again.',
      'warning'
    );
  }
});
