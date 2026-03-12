class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class PreflightError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'PreflightError';
    this.details = details;
  }
}

module.exports = {
  ValidationError,
  PreflightError,
};
