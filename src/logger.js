const fs = require('node:fs');
const path = require('node:path');

function createErrorLogger({ logFilePath = path.join(process.cwd(), 'logs', 'operations-error.log') } = {}) {
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true });

  return {
    log(error, context = {}) {
      const entry = {
        ts: new Date().toISOString(),
        message: error?.message || String(error),
        stack: error?.stack,
        context,
      };
      fs.appendFileSync(logFilePath, `${JSON.stringify(entry)}\n`, 'utf8');
      return entry;
    },
    logFilePath,
  };
}

module.exports = {
  createErrorLogger,
};
