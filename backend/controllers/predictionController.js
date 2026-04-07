const axios = require('axios');
const { databases } = require('../config/appwrite');
const { ID } = require('node-appwrite');

exports.predictPrice = async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'Missing URL' });

    try {
        console.log('🚀 Calling ML Microservice...');
        
        // Use the ML Service URL from environment variables, 
        // with a fallback to localhost for development.
        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, { 
            url 
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000 // ML can take time due to scraping
        });

        const prediction = mlResponse.data;
        console.log('✅ ML Service Success for:', prediction.name);

        // 📝 Store in Appwrite Database
        try {
            await databases.createDocument(
                process.env.APPWRITE_DATABASE_ID,
                process.env.APPWRITE_SEARCH_LOG_COLLECTION_ID,
                ID.unique(),
                {
                    userId: req.userId,
                    query: prediction.name || 'Product',
                    url: url,
                    predictionResult: JSON.stringify(prediction),
                    searchedAt: new Date().toISOString()
                }
            );
        } catch (dbErr) {
            console.error('❌ Appwrite DB Error:', dbErr);
        }

        res.status(200).json({
            message: 'Prediction successful',
            prediction: prediction
        });

    } catch (err) {
        console.error('❌ ML SERVICE ERROR:', err.message);
        res.status(500).json({ 
            message: 'Error connecting to ML Service', 
            error: err.message,
            suggestion: "Check if ML Microservice is online on Railway." 
        });
    }
};
