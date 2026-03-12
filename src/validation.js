const fs = require('node:fs');
const { MAX_PROFILE_COUNT } = require('./constants');
const { ValidationError, PreflightError } = require('./errors');

function validateProfileInputs({ profileNames, maxProfiles = MAX_PROFILE_COUNT }) {
  if (!Array.isArray(profileNames)) {
    throw new ValidationError('profileNames must be an array.');
  }

  if (profileNames.length === 0) {
    throw new ValidationError('At least one profile is required.');
  }

  if (profileNames.length > maxProfiles) {
    throw new ValidationError(`Profile count exceeds upper bound (${maxProfiles}).`, {
      profileCount: profileNames.length,
      maxProfiles,
    });
  }

  const cleaned = profileNames.map((name, idx) => {
    if (typeof name !== 'string') {
      throw new ValidationError(`Profile at index ${idx} must be a string.`);
    }

    const trimmed = name.trim();
    if (!trimmed) {
      throw new ValidationError(`Profile at index ${idx} cannot be empty.`);
    }

    if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
      throw new ValidationError(`Profile '${trimmed}' contains unsupported path characters.`);
    }
    return trimmed;
  });

  return [...new Set(cleaned)];
}

function ensureWritableDirectory(directoryPath) {
  try {
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.accessSync(directoryPath, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    throw new PreflightError(`Directory is not accessible/writable: ${directoryPath}`, {
      directoryPath,
      cause: error.message,
    });
  }

  return true;
}

module.exports = {
  validateProfileInputs,
  ensureWritableDirectory,
};
