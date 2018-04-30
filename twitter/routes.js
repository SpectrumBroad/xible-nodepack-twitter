'use strict';

const TwitterNg = require('twitter-ng');

const CONSUMER_KEY = 'BnQEOrezeCOwWAMOYGh5yVKIf';
const CONSUMER_SECRET = 'zKYMMxP3G4tbgTg0108j1Ye8soUd4krqJIcAOeQYNK33CzQezH';

module.exports = (NODE, ROUTER) => {
  let oAuthRequestToken;
  let oAuthRequestTokenSecret;

  ROUTER.get('/auth', (req, res) => {
    const tempTwitter = new TwitterNg({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET
    });

    tempTwitter.oauth.getOAuthRequestToken({
      oauth_callback: `${req.protocol}://${req.hostname}:${req.app.settings.port}/api/node-routes/${NODE._id}/auth/callback`
    }, (err, token, tokenSecret, results) => {
      if (err) {
        NODE.addStatus({
          color: 'red',
          message: err,
          timeout: 5000
        });
        console.error(err);
        res.status(500).end();
        return;
      }

      if (!results || results.oauth_callback_confirmed !== 'true') {
        NODE.addStatus({
          color: 'red',
          message: 'callback not confirmed',
          timeout: 5000
        });
        console.error('callback not confirmed');
        res.status(500).end();
        return;
      }

      oAuthRequestToken = token;
      oAuthRequestTokenSecret = tokenSecret;
      res.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${token}`);
    });
  });

  ROUTER.get('/auth/callback', (req, res) => {
    const tempTwitter = new TwitterNg({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET
    });

    tempTwitter.oauth.getOAuthAccessToken(
      oAuthRequestToken,
      oAuthRequestTokenSecret,
      req.query.oauth_verifier,
      (err, oAuthAccessToken, oAuthAccessTokenSecret, results) => {
        if (err) {
          NODE.addStatus({
            color: 'red',
            message: err,
            timeout: 5000
          });

          res.status(500).end();
          return;
        }

        // store the values in the vault
        NODE.vault.set({
          oAuthAccessToken,
          oAuthAccessTokenSecret,
          screenName: results.screen_name
        });

        // connect();

        res.sendFile('authSuccess.htm', {
          root: __dirname
        });
      }
    );
  });
};
