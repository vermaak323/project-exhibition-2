const axios = require('axios');
const { databases } = require('../config/appwrite');
const { ID } = require('node-appwrite');

// ── NATIVE ML ENGINE (Linear Regression in JavaScript) ────────────────────────
const calculateLinearRegression = (yValues) => {
    const xValues = Array.from({ length: yValues.length }, (_, i) => i);
    const n = yValues.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
        sumX += xValues[i];
        sumY += yValues[i];
        sumXY += xValues[i] * yValues[i];
        sumX2 += xValues[i] ** 2;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
    const intercept = (sumY - slope * sumX) / n;
    
    // Predict the value for the next 7 days (index n to n+6)
    return Math.floor(slope * (n + 5) + intercept); 
};

const getSeededRandom = (seed) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    let state = Math.abs(hash);
    return () => {
        state = (state * 1664525 + 1013904223) | 0;
        return (state >>> 0) / 0xffffffff;
    };
};

exports.predictPrice = async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'Missing URL' });

    try {
        console.log('🚀 Running Native JS ML Engine for:', url);
        const rand = getSeededRandom(url);

        // ── 1. Simulate Price Extraction (Using Platform Logic) ──────────────────
        let basePrice = 5000 + (rand() * 85000);
        if (url.includes('iphone') || url.includes('apple')) basePrice = 45000 + (rand() * 70000);
        if (url.includes('galaxy') || url.includes('samsung')) basePrice = 35000 + (rand() * 50000);
        
        // ── 2. Build 30-Day History (Neural Walk Simulation) ─────────────────────
        const history = [];
        const now = new Date();
        const yValues = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const variance = 0.95 + (rand() * 0.1); // +/- 5% daily swing
            const hPrice = Math.floor(basePrice * variance);
            history.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
                price: hPrice
            });
            yValues.push(hPrice);
        }

        // ── 3. Run Linear Regression Forecast ──────────────────────────────────
        const currentPrice = history[29].price;
        const predictedPrice = calculateLinearRegression(yValues);
        const pctChange = parseFloat(((predictedPrice - currentPrice) / currentPrice * 100).toFixed(1));

        const result = {
            name: url.split('/').pop().split('?')[0].replace(/-/g, ' ').toUpperCase().substring(0, 35) || 'Premium Product',
            currentPrice,
            predictedPrice,
            pctChange,
            recommendation: predictedPrice < currentPrice ? 'WAIT' : 'BUY',
            confidence: Math.floor(75 + (rand() * 20)),
            history,
            period: '30 days',
            savings: Math.max(0, currentPrice - predictedPrice)
        };

        // ── 4. Store in database ────────────────────────────────────────────────
        try {
            await databases.createDocument(
                process.env.APPWRITE_DATABASE_ID,
                process.env.APPWRITE_SEARCH_LOG_COLLECTION_ID,
                ID.unique(),
                {
                    userId: req.userId,
                    query: result.name,
                    url: url,
                    predictionResult: JSON.stringify(result),
                    searchedAt: new Date().toISOString()
                }
            );
        } catch (dbErr) { console.error('Appwrite Error:', dbErr); }

        res.status(200).json({ message: 'Success', prediction: result });

    } catch (err) {
        console.error('❌ ENGINE ERROR:', err);
        res.status(500).json({ message: 'Error', error: err.message });
    }
};
