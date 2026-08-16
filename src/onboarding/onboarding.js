import { send } from '../shared/ui.js';

const form = document.getElementById('onboarding-form');
const status = document.getElementById('onboarding-status');

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

function alertSettings() {
  return {
    fiveMinutes: document.getElementById('onboarding-alert-five').checked,
    oneMinute: document.getElementById('onboarding-alert-one').checked,
    timeout: document.getElementById('onboarding-alert-timeout').checked
  };
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = document.getElementById('finish-onboarding');
  submit.disabled = true;
  setStatus('Saving your setup…');

  try {
    await send('SAVE_SETTINGS', { settings: { alerts: alertSettings() } });

    const domain = document.getElementById('first-limit-domain').value.trim();
    if (domain) {
      const value = Number(document.getElementById('first-limit-value').value);
      const unit = document.getElementById('first-limit-unit').value;
      const minutes = unit === 'hours' ? value * 60 : value;
      await send('SAVE_LIMIT', {
        limit: {
          domain,
          minutes,
          period: document.getElementById('first-limit-period').value,
          strict: false,
          enabled: true
        }
      });
    }

    setStatus('Ready. Opening your dashboard…');
    location.replace(chrome.runtime.getURL('src/dashboard/dashboard.html'));
  } catch (error) {
    setStatus(error.message || 'TimeLens could not save your setup.', true);
    submit.disabled = false;
  }
});
