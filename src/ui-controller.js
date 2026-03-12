class ActionController {
  constructor({
    createButton,
    launchButton,
    statusElement,
    onCreate,
    onLaunch,
  }) {
    this.createButton = createButton;
    this.launchButton = launchButton;
    this.statusElement = statusElement;
    this.onCreate = onCreate;
    this.onLaunch = onLaunch;
    this.currentAbortController = null;
  }

  setBusy(busy) {
    this.createButton.disabled = busy;
    this.launchButton.disabled = busy;
  }

  setStatus(message, type = 'info') {
    this.statusElement.textContent = message;
    this.statusElement.dataset.type = type;
  }

  cancelCurrentAction() {
    this.currentAbortController?.abort();
  }

  async runAction(actionName) {
    if (this.currentAbortController) {
      this.setStatus('An operation is already in progress. Please wait.', 'warning');
      return;
    }

    this.currentAbortController = new AbortController();
    this.setBusy(true);
    this.setStatus(`${actionName} started...`, 'info');

    try {
      const handler = actionName === 'Create profiles' ? this.onCreate : this.onLaunch;
      const result = await handler(this.currentAbortController.signal);
      this.setStatus(result.message, result.summary.failed ? 'warning' : 'success');
    } catch (error) {
      this.setStatus(`Failed to ${actionName.toLowerCase()}: ${error.message}`, 'error');
    } finally {
      this.currentAbortController = null;
      this.setBusy(false);
    }
  }

  bind() {
    this.createButton.addEventListener('click', () => this.runAction('Create profiles'));
    this.launchButton.addEventListener('click', () => this.runAction('Launch browser'));
  }
}

module.exports = {
  ActionController,
};
