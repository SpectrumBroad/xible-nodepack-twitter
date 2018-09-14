'use strict';

const TwitterNg = require('twitter-ng');

module.exports = (NODE) => {
  let twitter;

  function connect() {
    twitter = new TwitterNg({
      consumer_key: NODE.data.consumerKey,
      consumer_secret: NODE.data.consumerSecret,
      access_token_key: NODE.data.accessToken,
      access_token_secret: NODE.data.accessTokenSecret
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
        message: `connected as "${data.screen_name}"`
      });
    });
  }

  // return reference glow
  const twitterOut = NODE.getOutputByName('twitter');
  twitterOut.on('trigger', async (conn, state) => {
    if (twitter) {
      return twitter;
    }

    return new Promise((resolve) => {
      NODE.once('init', () => resolve(twitter));
    });
  });

  NODE.on('init', () => {
    // if we have the oAuth keys, setup twitter right away
    if (
      NODE.data.consumerKey && NODE.data.consumerSecret &&
      NODE.data.accessToken && NODE.data.accessTokenSecret
    ) {
      connect();
    } else {
      NODE.addStatus({
        color: 'orange',
        message: 'require authentication'
      });
    }
  });
};
