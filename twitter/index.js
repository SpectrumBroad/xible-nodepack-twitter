'use strict';

const TwitterNg = require('twitter-ng');

const CONSUMER_KEY = 'BnQEOrezeCOwWAMOYGh5yVKIf';
const CONSUMER_SECRET = 'zKYMMxP3G4tbgTg0108j1Ye8soUd4krqJIcAOeQYNK33CzQezH';

module.exports = (NODE) => {
  let twitter;

  function connect() {
    twitter = new TwitterNg({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
      access_token_key: NODE.data.oAuthAccessToken,
      access_token_secret: NODE.data.oAuthAccessTokenSecret
    });

    NODE.removeAllStatuses();

    twitter.verifyCredentials((err, data) => {
      if (err) {
        let errData;
        let errMessage;
        if (err.data) {
          errData = JSON.parse(err.data);
          errMessage = errData && errData.errors && errData.errors.length && errData.errors[0].message;

          if (errMessage) {
            NODE.setTracker({
              color: 'red',
              message: errMessage
            });
          }
        }

        NODE.addStatus({
          color: 'red',
          message: 'disconnected'
        });
        return;
      }

      NODE.addStatus({
        color: 'green',
        message: `connected as "${NODE.data.screenName}"`
      });
    });
  }

  // return reference glow
  const twitterOut = NODE.getOutputByName('twitter');
  twitterOut.on('trigger', (conn, state, callback) => {
    if (!twitter) {
      NODE.once('init', () => callback(twitter));
      return;
    }

    callback(twitter);
  });

  NODE.on('init', () => {
    // if we have the oAuth keys, setup twitter right away
    if (NODE.data.oAuthAccessToken && NODE.data.oAuthAccessTokenSecret) {
      connect();
    } else {
      NODE.addStatus({
        color: 'orange',
        message: 'require authentication'
      });
    }
  });
};
