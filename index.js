require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const dns = require('dns');
const mongoose = require('mongoose');
const { error } = require('console');

// Basic Configuration
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

// URL schema
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true },
});

const Url = mongoose.model('Url', urlSchema);


app.use(cors());
app.use(bodyParser.urlencoded({ extended: false })); // Use body-parser middleware

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// URL Shortening logic
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  // Validate URL
  const urlRegex = /^(http|https):\/\/[www.]?[a-zA-Z0-9\-.]+\.[a-zA-Z]{2,}(\/\S*)?$/;
  if (!urlRegex.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  // Use dns.lookup() to verify the URL
  const hostname = new URL(originalUrl).hostname;
  dns.lookup(hostname, (err, address, family) => {
    if (err) {
      console.error("dns.lookup error:", err); // Log dns.lookup errors
      return res.json({ error: 'invalid url'});
    } else {
      // Generate short URL
        Url.estimatedDocumentCount({}, (err, count) => {
          if (err) {
            console.error("estimatedDocumentCount error:", err); // Log errors
            return res.json({ error: 'database error' });
          }
          const shortUrl = count + 1;

          // Store URL mapping in MongoDB
          const newUrl = new url({ original_url: originalUrl, short_url: shortUrl });
          newUrl.save()
            .then((savedUrl) => {
              res.json({ original_url: savedUrl.original_url, short_url: savedUrl.short_url });
            })
            .catch((err) => {
              console.error("Error saving URL:", err); // Log save error
              res.status(500).json({ error: 'database error' });
            });
        });
      }
   });
});

// Redirect to original URL
app.get('api/shorturl/:shorturl', (req, res) => {
  const shortUrl = req.params.shorturl;

  // Find URL mapping in MongoDB
  Url.findOne({ short_url: shortUrl })
    .then((foundUrl) => {
      if (foundUrl) {
        res.redirect(foundUrl.original_url);
      } else {
        res.status(404).json({ error: 'short URL not found' });
      }
    })
    .catch((err) => {
      console.error("Error finding URL:", err); // Log findOne errors
      res.status(500).json({ error: 'database error' });
    });
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});