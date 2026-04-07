const { databases } = require('../config/appwrite');
const { ID } = require('node-appwrite');
const { spawnSync } = require('child_process');
const path = require('path');

exports.predictPrice = async (req, res) => {
  const { url } = req.body;
  console.log('=========================================');
  console.log('🚀 INCOMING PREDICTION REQUEST');
  console.log('🔗 URL:', url);
  console.log('👤 USER ID:', req.userId);
  console.log('=========================================');

  if (!url) {
    return res.status(400).json({ message: 'Missing product URL' });
  }

  try {
    // Call Python ML Script
    const pythonPath = process.env.PYTHON_PATH || 'python3'; 
    const scriptPath = path.join(__dirname, '../ml/predict.py');
    
    const result = spawnSync(pythonPath, [scriptPath, url], { 
        encoding: 'utf8',
        env: { ...process.env, SCRAPER_API_KEY: process.env.SCRAPER_API_KEY } 
    });
    
    if (result.error) {
        throw new Error(`Failed to start prediction script: ${result.error.message}`);
    }

    if (result.status !== 0) {
        throw new Error(`Prediction script failed: ${result.stderr}`);
    }

    let prediction;
    try {
        // Find the beginning of the JSON object in case there are warnings/noise
        const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in script output");
        prediction = JSON.parse(jsonMatch[0]);
    } catch (e) {
        throw new Error(`Failed to parse prediction results: ${result.stdout}`);
    }

    if (prediction.error) {
        throw new Error(prediction.error);
    }

    console.log('📈 Prediction Data Received for:', prediction.name);

    // Store in Appwrite Database
    try {
        const log = await databases.createDocument(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_SEARCH_LOG_COLLECTION_ID,
          ID.unique(),
          {
            userId: req.userId,
            query: prediction.name || "",
            url: url,
            predictionResult: JSON.stringify(prediction),
            searchedAt: new Date().toISOString()
          }
        );
        console.log('📝 Search log stored in Appwrite:', log.$id);
    } catch (dbErr) {
        console.error('❌ Appwrite DB Error:', dbErr);
        // We can still return the prediction even if logging fails, 
        // but let's see why it's failing.
    }

    res.status(200).json({
      message: 'Prediction successful',
      prediction: prediction
    });

  } catch (err) {
    console.error('Prediction Error:', err);
    res.status(500).json({ message: 'Error performing prediction', error: err.message });
  }
};
