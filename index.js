require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dns = require('dns');
const { promisify } = require('util');
const lookup = promisify(dns.lookup);

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- Middleware ---------- */
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use('/public', express.static(`${process.cwd()}/public`));

/* ---------- MongoDB ---------- */
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ Connected to MongoDB");
}).catch((err) => {
  console.error("❌ MongoDB connection error:", err.message);
});

const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true }
});
const Url = mongoose.model('Url', urlSchema);

/* ---------- Helpers ---------- */
function isValidHttpUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/* ---------- Routes ---------- */
app.get('/', (req, res) => {
  res.sendFile(`${process.cwd()}/views/index.html`);
});

app.post('/api/shorturl', async (req, res) => {
  const { url } = req.body;
  if (!isValidHttpUrl(url)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    const { hostname } = new URL(url);
    await lookup(hostname);

    let doc = await Url.findOne({ original_url: url });
    if (!doc) {
      doc = await Url.create({ original_url: url });
    }

    res.json({ original_url: doc.original_url, short_url: doc._id });
  } catch {
    res.json({ error: 'invalid url' });
  }
});

app.get('/api/shorturl/:short_url', async (req, res) => {
  const { short_url } = req.params;
  try {
    const doc = await Url.findById(short_url);
    if (!doc) return res.json({ error: 'invalid url' });

    res.redirect(doc.original_url);
  } catch {
    res.json({ error: 'invalid url' });
  }
});

/* ---------- Start Server ---------- */
app.listen(PORT, () => {
  console.log(`🚀 Listening on port ${PORT}`);
});
