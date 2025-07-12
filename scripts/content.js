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

  giveawayHeadingElements.forEach(async (element) => {
    const { href } = element.querySelector('.giveaway__heading__name');

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

    element.appendChild(joinButtonElement);

    const ratingElement = document.createElement('span');

    ratingElement.style.marginLeft = '4px';

    ratingElement.innerHTML = `<div style="width: 80px; height: 14px; background-color: #636363; border-radius: 2px;"></div>`;

    element.appendChild(ratingElement);

    const appUrl = element.querySelector('[href^="https://store.steampowered.com"]').href;

    const { rating } = await chrome.runtime.sendMessage({ event: 'steam:rating', appUrl });

    ratingElement.innerHTML = `(${rating})`;

    if (
      ['Overwhelmingly Positive', 'Very Positive', 'Positive', 'Mostly Positive'].includes(rating)
    ) {
      ratingElement.style.color = '#00d700';
    } else {
      ratingElement.style.color = '#d70000';
    }
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
