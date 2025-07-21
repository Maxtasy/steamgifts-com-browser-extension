const COLORS = {
  danger: 'oklch(0.7 0.13 30)',
  warning: 'oklch(0.7 0.13 100)',
  success: 'oklch(0.7 0.13 160)',
  info: 'oklch(0.7 0.13 260)',
};

const RATING_DATA = {
  ['Overwhelmingly Positive']: {
    textColor: COLORS.success,
  },
  ['Very Positive']: {
    textColor: COLORS.success,
  },
  ['Positive']: {
    textColor: COLORS.success,
  },
  ['Mostly Positive']: {
    textColor: COLORS.success,
  },
  ['Mixed']: {
    textColor: COLORS.warning,
  },
  ['Mostly Negative']: {
    textColor: COLORS.danger,
  },
  ['Very Negative']: {
    textColor: COLORS.danger,
  },
  else: {
    textColor: COLORS.info,
  },
};

const REASON_NOT_ENOUGH_POINTS = 'Not enough points';

function waitForConditionToBeTrue(condition, callback) {
  if (condition) {
    callback();
  } else {
    setTimeout(() => {
      waitForConditionToBeTrue(condition, callback);
    }, 100);
  }
}

function handleJoined(element) {
  const wrapperElement = element.closest('.giveaway__row-inner-wrap');

  wrapperElement.classList.add('is-faded');
}

(() => {
  // Main Page
  const giveawayHeadingElements = document.querySelectorAll('.giveaway__heading');

  giveawayHeadingElements.forEach(async (giveawayHeadingElement) => {
    const { href } = giveawayHeadingElement.querySelector('.giveaway__heading__name');

    const url = `${href}?autojoin=true`;

    const joinButtonElement = document.createElement('button');

    joinButtonElement.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ event: 'giveaway:join:clicked', url });
    });

    joinButtonElement.innerHTML = `
      <i
        class="giveaway__icon fa fa-fw fa-check"
        style="color: ${COLORS.success}; opacity: 1;"
        >
      </i>
    `;

    giveawayHeadingElement.appendChild(joinButtonElement);

    const additionalInfoElement = document.createElement('div');
    additionalInfoElement.classList.add('AdditionalInfoElement');

    giveawayHeadingElement.insertAdjacentElement('afterend', additionalInfoElement);

    const appUrl = giveawayHeadingElement.querySelector(
      '[href^="https://store.steampowered.com"]'
    ).href;

    const { ageRestricted, rating, achievements } = await chrome.runtime.sendMessage({
      event: 'steam:game-info',
      appUrl,
    });

    if (ageRestricted) {
      const ageRestrictedElement = document.createElement('span');

      ageRestrictedElement.style.color = '#d70000';

      ageRestrictedElement.innerHTML = 'Age restricted';

      additionalInfoElement.appendChild(ageRestrictedElement);
    }

    if (rating) {
      const ratingElement = document.createElement('span');

      ratingElement.style.color = RATING_DATA[`${rating}`]
        ? RATING_DATA[`${rating}`].textColor
        : RATING_DATA.else.textColor;

      ratingElement.innerHTML = `(${rating})`;

      additionalInfoElement.appendChild(ratingElement);
    }

    if (achievements) {
      const achievementsElement = document.createElement('span');

      achievementsElement.innerHTML = `(${achievements})`;

      additionalInfoElement.appendChild(achievementsElement);
    }

    additionalInfoElement.classList.add('AdditionalInfoElement--Loaded');
  });

  // Giveaway Page
  const params = new URL(document.location).searchParams;
  const autojoinGiveaway = params.get('autojoin');

  if (autojoinGiveaway) {
    const joinButtonElement = document.querySelector('.sidebar__entry-insert');

    if (!joinButtonElement) {
      chrome.runtime.sendMessage({
        event: 'giveaway:join:fail',
        reason: REASON_NOT_ENOUGH_POINTS,
        broadcast: true,
      });
      return;
    }

    joinButtonElement.click();

    waitForConditionToBeTrue(
      () => joinButtonElement.classList.contains('is-hidden'),
      () => {
        chrome.runtime.sendMessage({ event: 'giveaway:join:success' });
      }
    );
  }
})();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.event === 'not_enough_points_alert') {
    alert(REASON_NOT_ENOUGH_POINTS);
  }
});
