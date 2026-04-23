const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function getLogFileName(prefix) {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${prefix}-${yyyy}-${mm}-${dd}.log`;
}


function runAndLog(command, prefix) {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
  const logFile = path.join(logsDir, getLogFileName(prefix));
  const child = exec(command);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  child.stdout.on('data', data => {
    process.stdout.write(data);
    logStream.write(data);
  });
  child.stderr.on('data', data => {
    process.stderr.write(data);
    logStream.write(data);
  });
  child.on('close', code => {
    logStream.write(`\nProcess exited with code ${code}\n`);
    logStream.end();
  });
}

// Usage:
// node log-runner.js start
// node log-runner.js expo

const arg = process.argv[2];
if (arg === 'start') {
  runAndLog('npm start', 'npm-start');
} else if (arg === 'expo') {
  runAndLog('npx expo start', 'expo-start');
} else {
  console.log('Usage: node log-runner.js [start|expo]');
}
