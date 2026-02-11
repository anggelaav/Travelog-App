export function showFormattedDate(date, locale = 'id-ID', options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };
  
  return new Date(date).toLocaleDateString(locale, defaultOptions);
}

export function sleep(time = 1000) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function transitionHelper({ updateDOM }) {
  if (document.startViewTransition) {
    return document.startViewTransition(updateDOM);
  } else {
    const updateCallbackDone = Promise.resolve(updateDOM()).then(() => undefined);
    return {
      ready: Promise.reject(Error('View transitions unsupported')),
      updateCallbackDone,
      finished: updateCallbackDone,
    };
  }
}

export function setupSkipToContent(skipLinkButton, mainContent) {
  skipLinkButton.addEventListener('click', (e) => {
    e.preventDefault();
    mainContent.focus();
  });
}