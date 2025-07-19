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
        style="color: #00d700; opacity: 1;"
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

      if (
        ['Overwhelmingly Positive', 'Very Positive', 'Positive', 'Mostly Positive'].includes(rating)
      ) {
        ratingElement.style.color = '#00d700';
      } else {
        ratingElement.style.color = '#d70000';
      }

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

    if (!joinButtonElement) return;

    joinButtonElement.click();

    waitForConditionToBeTrue(
      () => joinButtonElement.classList.contains('is-hidden'),
      () => {
        chrome.runtime.sendMessage({ event: 'giveaway:join:success' });
      }
    );
  }
})();
