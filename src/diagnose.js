const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');

dotenv.config();

async function listSupportedModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await axios.get(url);
        let output = "AVAILABLE MODELS:\n";
        response.data.models.forEach(m => {
            output += m.name + "\n";
        });
        fs.writeFileSync('models.txt', output);
        console.log("Done. Check models.txt");
    } catch (err) {
        fs.writeFileSync('models.txt', "Error: " + err.message);
    }
}

listSupportedModels();
