const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors')
require('dotenv').config();;
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3070;
const MONGODB_URL = process.env.URL;

// Mongoose Schema
const AccessTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const AccessToken = mongoose.model('AccessToken', AccessTokenSchema);

// Middleware
app.use(bodyParser.json());
app.use(express.json());
app.use(cors());
// MongoDB Connection
mongoose.connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// POST Route to Create Access Token
app.post('/accesstoken', async (req, res) => {
    try {
        const { token } = req.body;
        const newAccessToken = new AccessToken({ token });
        await newAccessToken.save();
        res.status(201).json(newAccessToken);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// GET Route to Retrieve Access Token
app.get('/accesstoken', async (req, res) => {
    try {
        const tokens = await AccessToken.find();
        res.json(tokens);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


async function refreshSpotifyToken() {
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.SPOTIFY_CLIENT_ID,
                client_secret: process.env.SPOTIFY_CLIENT_SECRET
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        // Remove existing token and create new one
        await AccessToken.deleteMany({});
        const newToken = new AccessToken({ token: response.data.access_token });
        await newToken.save();

        console.log('Spotify token refreshed successfully');
        return response.data.access_token;
    } catch (error) {
        console.error('Error refreshing Spotify token:', error);
        throw error;
    }
}

// Cron job to refresh token every 58 minutes
cron.schedule('*/58 * * * *', () => {
    refreshSpotifyToken();
})

// refreshSpotifyToken();


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});