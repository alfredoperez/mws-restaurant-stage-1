const path = require('path');
const express = require('express');
const compression = require('compression');

// Simple no frills Express.js server that serves files from the public folder.
const app = express();
app.use(compression());
app.use(express.static(path.join(__dirname, 'build')));

app.listen(2222, () => {
    console.log('Listening on port 2222!');
});