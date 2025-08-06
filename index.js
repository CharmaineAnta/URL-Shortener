require('dotenv').config();

console.log('Loaded MONGO_URI:', process.env.MONGO_URI);
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const mongoose = require('mongoose');
console.log('Mongo URI:', process.env.MONGO_URI);
const bodyParser = require('body-parser');

const app = express();
mongoose.set('strictQuery', true); // optional but good practice


// Basic Configuration
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(`${process.cwd()}/public`));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Mongoose Schema & Model
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true, unique: true },
});
const Url = mongoose.model('Url', urlSchema);

// Routes
app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Test endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

// POST URL to shorten
app.post('/api/shorturl', async (req, res) => {
  const originalUrl = req.body.url;

  // Basic URL format check
  const urlRegex = /^https?:\/\/(www\.)?[\w-]+\.[a-z]{2,}/i;
  if (!urlRegex.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    // DNS validation
    const hostname = new URL(originalUrl).hostname;
    dns.lookup(hostname, async (err) => {
      if (err) return res.json({ error: 'invalid url' });

      // Check if URL already exists
      let found = await Url.findOne({ original_url: originalUrl });
      if (found) {
        return res.json({
          original_url: found.original_url,
          short_url: found.short_url,
        });
      }

      // Generate new short URL
      const count = await Url.countDocuments({});
      const newUrl = new Url({
        original_url: originalUrl,
        short_url: count + 1,
      });

      await newUrl.save();

      res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url,
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'server error' });
  }
});

// GET Redirect from short URL
app.get('/api/shorturl/:short_url', async (req, res) => {
  const shortUrl = parseInt(req.params.short_url);

  try {
    const found = await Url.findOne({ short_url: shortUrl });
    if (found) {
      return res.redirect(found.original_url);
    } else {
      return res.status(404).json({ error: 'No short URL found for the given input' });
    }
  } catch (error) {
    res.status(500).json({ error: 'server error' });
  }
});

// Start Server
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});