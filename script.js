const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const { resolve } = require('path');
const app = express();
const prompt = require('prompt-sync')();

let host = 'api.cognitive.microsoft.com';
let path = '/bing/v7.0/spellcheck';
let key = '29a1a0c9c18c4522bc0a0fa2158cccfa';

let mkt = 'en-US';
let mode = 'proof';
let output = '';
let text = '';
let query_string = '?mkt=' + mkt + '&mode=' + mode;

let tokens;

let makeRequest = () => {
  return new Promise((resolve, reject) => {
    let request_params = {
      method: 'POST',
      hostname: host,
      path: path + query_string,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': text.length + 5,
        'Ocp-Apim-Subscription-Key': key,
      },
    };

    let response_handler = function (response) {
      let body = '';
      response.on('data', function (d) {
        body += d;
      });

      response.on('end', function () {
        let body_ = JSON.parse(body);
        let flaggedTokens = body_['flaggedTokens']; // queue of incorrect words

        // constructs return string
        for (let i = 0; i < tokens.length; i++) {
          if (
            flaggedTokens !== undefined &&
            flaggedTokens.length !== 0 &&
            flaggedTokens[0].token === tokens[i]
          )
            // extracts current corrected word out of list
            output += flaggedTokens.shift().suggestions[0].suggestion + ' ';
          else output += tokens[i] + ' ';
        }

        console.log(`Auto-correct: ${output}`);
        resolve(output);
      });
      response.on('error', function (e) {
        console.log('Error: ' + e.message);
      });
    };

    tokens = text.split(' ');
    let httpsRequest = https.request(request_params, response_handler);
    httpsRequest.write('text=' + text);
    let out = httpsRequest.end();
  });
};

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));

/****/
/* Add real-time autocorrect funtionality */
/****/

app.post('/server', (req, res) => {
  output = ''; // reset output
  text = req.body.text;

  makeRequest().then((response) => {
    res.json({ original: text, correctedText: response });
  });
});

app.listen(3000, () => console.log('listening at 3000...'));
