var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// 引入資料庫
const db = require('./db');

// 測試資料庫連線
db.serialize(() => {
    db.get('SELECT 1', (err) => {
        if (err) {
            console.error('資料庫連線測試失敗:', err.message, err.stack);
            process.exit(1);
        } else {
            console.log('資料庫連線測試成功');
        }
    });
});

const cors = require('cors');
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:8080'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// 查詢所有銅價資料
app.get('/api/price', (req, res) => {
    db.all('SELECT * FROM copper_price ORDER BY year DESC', (err, rows) => {
        if (err) {
            console.error('查詢 copper_price 失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫查詢失敗', details: err.message });
        }
        console.log('查詢 copper_price 成功，返回資料筆數:', rows.length);
        res.json(rows);
    });
});

// 透過年份查詢一筆銅價資料（GET）
app.get('/api', (req, res) => {
    const year = parseInt(req.query.year, 10);
    if (isNaN(year)) {
        return res.status(400).json({ error: '請提供正確的 year 參數' });
    }
    db.get('SELECT * FROM copper_price WHERE year = ?', [year], (err, row) => {
        if (err) {
            console.error('查詢 copper_price 失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫查詢失敗', details: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: '查無資料' });
        }
        res.json(row);
    });
});

// 透過年份查詢一筆銅價資料（POST）
app.post('/api', (req, res) => {
    const year = parseInt(req.body.year, 10);
    if (isNaN(year)) {
        return res.status(400).json({ error: '請提供正確的 year 參數' });
    }
    db.get('SELECT * FROM copper_price WHERE year = ?', [year], (err, row) => {
        if (err) {
            console.error('查詢 copper_price 失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫查詢失敗', details: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: '查無資料' });
        }
        res.json(row);
    });
});

// 新增銅價資料（GET）
app.get('/api/insert', (req, res) => {
    const { year, average_price, highest_price, lowest_price, annual_range } = req.query;
    if (!year || !average_price || !highest_price || !lowest_price || !annual_range) {
        return res.status(400).json({ error: '請提供 year, average_price, highest_price, lowest_price, annual_range 參數' });
    }
    const sql = `INSERT INTO copper_price (year, average_price, highest_price, lowest_price, annual_range) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [year, average_price, highest_price, lowest_price, annual_range], function(err) {
        if (err) {
            console.error('新增資料失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫新增失敗', details: err.message });
        }
        console.log('新增資料成功，ID:', this.lastID);
        res.json({ success: true, id: this.lastID });
    });
});

// 新增銅價資料（POST）
app.post('/api/insert', (req, res) => {
    const { year, average_price, highest_price, lowest_price, annual_range } = req.body;
    if (!year || !average_price || !highest_price || !lowest_price || !annual_range) {
        return res.status(400).send('請提供 year, average_price, highest_price, lowest_price, annual_range 參數');
    }
    const sql = `INSERT INTO copper_price (year, average_price, highest_price, lowest_price, annual_range) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [year, average_price, highest_price, lowest_price, annual_range], function(err) {
        if (err) {
            console.error('新增資料失敗:', err.message, err.stack);
            return res.status(500).send('資料庫新增失敗');
        }
        console.log('新增資料成功');
        res.send('資料新增成功');
    });
});

// 查詢某年份範圍的銅價資料
app.get('/api/range', (req, res) => {
    const startYear = parseInt(req.query.startYear, 10);
    const endYear = parseInt(req.query.endYear, 10);
    if (isNaN(startYear) || isNaN(endYear)) {
        return res.status(400).json({ error: '請提供正確的 startYear 和 endYear 參數' });
    }
    if (startYear > endYear) {
        return res.status(400).json({ error: 'startYear 必須小於或等於 endYear' });
    }
    db.all('SELECT * FROM copper_price WHERE year >= ? AND year <= ? ORDER BY year DESC', [startYear, endYear], (err, rows) => {
        if (err) {
            console.error('查詢 copper_price 範圍失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫查詢失敗', details: err.message });
        }
        console.log('查詢範圍成功，返回資料筆數:', rows.length);
        if (rows.length === 0) {
            return res.status(404).json({ error: '查無資料' });
        }
        res.json(rows);
    });
});

module.exports = app;
