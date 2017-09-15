require('dotenv').config();
const path = require('path');
const cp = require('child_process');

const mode = process.argv[2] ? process.argv[2] : 'replay';

cp.spawn(`steno ${mode} http://localhost:${process.env.PORT}`, {
  shell: true,
  stdio: 'inherit',
  cwd: path.join(__dirname, 'integration'),
});
