const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const ExpressError = require('./utils/ExpressError');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const swaggerUi = require('swagger-ui-express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Kết nối MongoDB
const dbURL = process.env.DB_URL;
mongoose.connect(dbURL);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => console.log('Connected to database'));

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser(process.env.SECRET));
app.use(express.json());

// Import routes
const user = require('./routes/userRoutes');
const follow = require('./routes/followRoutes');
const history = require('./routes/historyRoutes');
const removeOldHistoryCron = require('./utils/cronJob');

app.use('/user', user);
app.use('/follow', follow);
app.use('/history', history);

// Swagger setup
const swaggerPath = path.join(__dirname, 'swagger_output.json');
if (fs.existsSync(swaggerPath)) {
    const swaggerFile = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
} else {
    console.error('⚠️  swagger_output.json not found!');
}

// Cron job dọn dẹp lịch sử hàng ngày
cron.schedule('0 20 * * *', () => {
    console.log('Running history cleanup every day...');
    removeOldHistoryCron();
});

// Xử lý route không tồn tại
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
});

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
    const { statusCode = 500, message = 'Something went wrong' } = err;
    res.status(statusCode).json({ message });
});

// Chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger API Docs: http://localhost:${PORT}/api-docs`);
});

module.exports = app;
