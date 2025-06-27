const express = require('express');
const fetch = require('node-fetch'); // ต้องติดตั้ง: npm install node-fetch
const cors = require('cors'); // ต้องติดตั้ง: npm install cors

const app = express();
const port = 3000;

app.use(cors()); // เปิดใช้งาน CORS สำหรับทุกโดเมน (สำหรับการทดสอบ)

app.get('/fetch-og-image', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'WhatsApp/2.24.8.76A Javascript'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();

        const ogImageMatch = text.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i);

        if (ogImageMatch && ogImageMatch[1]) {
            res.json({ imageUrl: ogImageMatch[1] });
        } else {
            res.status(404).json({ error: 'OG:Image not found' });
        }

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: `Failed to fetch OG image: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});
