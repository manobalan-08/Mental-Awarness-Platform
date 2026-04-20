const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/mood',    require('./routes/mood'));
app.use('/api/behavior',require('./routes/behavior'));
app.use('/api/insights',require('./routes/insights'));
app.use('/api/chat',    require('./routes/chat'));
app.use('/api/feedback',require('./routes/feedback'));
app.use('/api/journal', require('./routes/journal'));
app.use('/api/habits',  require('./routes/habits'));
app.use('/api/plans',   require('./routes/plans'));
app.use('/api/experts', require('./routes/experts'));
app.use('/api/games',   require('./routes/games'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = 5000;
app.listen(PORT, () => console.log(`MindFlow server running on http://localhost:${PORT}`));
