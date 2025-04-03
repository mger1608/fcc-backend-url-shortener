require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const dns = require('dns');
const mongoose = require('mongoose');

// Basic Configuration
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// URL schema
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true },
});

// URL model
const Url = mongoose.model('Url', urlSchema);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// URL Shortening logic
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  // Validate URL format
  const urlRegex = /^(http|https):\/\/[www.]?[a-zA-Z0-9\-.]+\.[a-zA-Z]{2,}(\/\S*)?$/;
  if (!urlRegex.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  // Use dns.lookup() to verify the URL
  const hostname = new URL(originalUrl).hostname;
  dns.lookup(hostname, (err, address, family) => {
    if (err) {
      console.error('dns.lookup error:', err);
      return res.json({ error: 'invalid url' });
    }

    Url.estimatedDocumentCount({})
      .then(count => {
        const shortUrl = count + 1;
        const newUrl = new Url({ original_url: originalUrl, short_url: shortUrl });
        return newUrl.save();
      })
      .then(savedUrl => {
        console.log('URL saved:', savedUrl);
        res.json({ original_url: savedUrl.original_url, short_url: savedUrl.short_url });
      })
      .catch(err => {
        console.error('Error saving URL:', err);
        res.status(500).json({ error: 'database error' });
      });
  });
});

// Redirect to original URL
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = req.params.short_url;

  Url.findOne({ short_url: shortUrl })
    .then(foundUrl => {
      if (foundUrl) {
        console.log('Redirecting to:', foundUrl.original_url);
        res.redirect(foundUrl.original_url);
      } else {
        console.log('Short URL not found:', shortUrl);
        res.status(404).json({ error: 'short URL not found' });
      }
    })
    .catch(err => {
      console.error('Error finding URL:', err);
      res.status(500).json({ error: 'database error' });
    });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
