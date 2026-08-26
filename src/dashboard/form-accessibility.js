const fields = [
  { fieldId: 'limit-domain', errorId: 'limit-domain-error', isValid: (field) => Boolean(field.value.trim()) },
  { fieldId: 'limit-value', errorId: 'limit-value-error', isValid: (field) => Number.isFinite(Number(field.value)) && Number(field.value) > 0 }
];

function updateFieldState({ fieldId, errorId, isValid }) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.setAttribute('aria-describedby', errorId);
  if (isValid(field)) field.removeAttribute('aria-invalid');
  else field.setAttribute('aria-invalid', 'true');
}

function initializeLimitValidationAccessibility() {
  const form = document.getElementById('limit-form');
  if (!form) return;

  for (const config of fields) {
    const field = document.getElementById(config.fieldId);
    field?.setAttribute('aria-describedby', config.errorId);
    field?.addEventListener('input', () => {
      if (config.isValid(field)) field.removeAttribute('aria-invalid');
    });
  }

  form.addEventListener('submit', () => {
    for (const config of fields) updateFieldState(config);
  });
}

initializeLimitValidationAccessibility();
