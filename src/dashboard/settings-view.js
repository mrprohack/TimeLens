import { send, setText } from '../shared/ui.js';

function formatBytes(bytes = 0) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 ** 2)).toFixed(1)} MB`;
}

export function renderSettingsView(snapshot) {
  document.getElementById('idle-seconds').value = String(snapshot.settings.idleSeconds);
  document.getElementById('retention-days').value = String(snapshot.settings.retentionDays);
  document.getElementById('alert-five').checked = snapshot.settings.alerts?.fiveMinutes !== false;
  document.getElementById('alert-one').checked = snapshot.settings.alerts?.oneMinute !== false;
  document.getElementById('alert-timeout').checked = snapshot.settings.alerts?.timeout !== false;

  const health = snapshot.health || {};
  setText('health-status', health.status === 'healthy' ? 'Healthy' : 'Needs attention');
  setText('storage-usage', formatBytes(health.storageBytesApprox));
  setText('diagnostic-count', String(health.diagnosticCount || 0));
  setText('health-detail', health.lastDiagnostic ? `${health.lastDiagnostic.code}: ${health.lastDiagnostic.message}` : 'No runtime problems recorded.');
  document.getElementById('clear-diagnostics').disabled = !health.diagnosticCount;
}

export function wireSettingsView(actions = {}) {
  document.getElementById('save-settings')?.addEventListener('click', async () => {
    try {
      await send('SAVE_SETTINGS', {
        settings: {
          idleSeconds: Number(document.getElementById('idle-seconds').value),
          retentionDays: Number(document.getElementById('retention-days').value),
          alerts: {
            fiveMinutes: document.getElementById('alert-five').checked,
            oneMinute: document.getElementById('alert-one').checked,
            timeout: document.getElementById('alert-timeout').checked
          }
        }
      });
      actions.showToast?.('Preferences saved.');
      await actions.refresh?.();
    } catch (error) { actions.showToast?.(error.message, true); }
  });

  document.getElementById('export-data')?.addEventListener('click', async () => {
    try {
      const data = await send('EXPORT_DATA');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timelens-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      actions.showToast?.('Export downloaded.');
    } catch (error) { actions.showToast?.(error.message, true); }
  });

  document.getElementById('import-data')?.addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('import-file')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!confirm('Restore this TimeLens backup? Your current data will first be preserved as a local backup.')) return;
      await send('IMPORT_DATA', { data: parsed });
      actions.showToast?.('Restore complete. Previous data was kept as a local backup.');
      await actions.refresh?.();
    } catch (error) {
      actions.showToast?.(error instanceof SyntaxError ? 'That file is not valid JSON.' : error.message, true);
    }
  });

  document.getElementById('clear-diagnostics')?.addEventListener('click', async () => {
    try {
      await send('CLEAR_DIAGNOSTICS');
      actions.showToast?.('Diagnostics cleared.');
      await actions.refresh?.();
    } catch (error) { actions.showToast?.(error.message, true); }
  });

  document.getElementById('clear-data')?.addEventListener('click', async () => {
    if (!confirm('Clear all TimeLens usage history? Your limits and preferences will stay.')) return;
    try {
      await send('CLEAR_DATA');
      actions.showToast?.('Usage history cleared.');
      await actions.refresh?.();
    } catch (error) { actions.showToast?.(error.message, true); }
  });
}
