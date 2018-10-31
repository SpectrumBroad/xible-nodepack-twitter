'use strict';

module.exports = (NODE) => {
  const twitterIn = NODE.getInputByName('twitter');

  const triggerOut = NODE.getOutputByName('trigger');
  const tweetOut = NODE.getOutputByName('tweet');
  const textOut = NODE.getOutputByName('text');
  const userNameOut = NODE.getOutputByName('username');

  tweetOut.on('trigger', async (conn, state) => {
    const thisState = state.get(NODE);
    return (thisState && thisState.tweet) || null;
  });

  textOut.on('trigger', async (conn, state) => {
    const thisState = state.get(NODE);
    return (thisState && thisState.tweet && thisState.tweet.text) || null;
  });

  userNameOut.on('trigger', async (conn, state) => {
    const thisState = state.get(NODE);
    return (thisState && thisState.tweet && thisState.tweet.user && thisState.tweet.user.screen_name) || null;
  });

  function setupStream(state, twitter, track, follow) {
    let rateLimitStatus;
    let rateLimitTrack = 0;

    twitter.stream('statuses/filter', {
      track: track || undefined,
      follow: follow || undefined
    }, (stream) => {
      stream.on('data', (data) => {
        state.set(NODE, {
          tweet: data
        });
        triggerOut.trigger(state);
      });

      // indicates that we're exceeding the rate limit set on streaming data
      stream.on('limit', (data) => {
        // this data is not in sync, so only apply highest limit
        if (data.track <= rateLimitTrack) {
          return;
        }
        rateLimitTrack = data.track;

        if (rateLimitStatus) {
          NODE.updateStatusById(rateLimitStatus, {
            color: 'orange',
            message: `ratelimit; missed ${rateLimitTrack} tweets`
          });
        } else {
          rateLimitStatus = NODE.addStatus({
            color: 'orange',
            message: `ratelimit; missed ${rateLimitTrack} tweets`
          });
        }
      });

      stream.on('error', (tw, tc) => {
        let message = `${tw} ${tc}`;
        if (
          (tw === 'http' || tw === 'https') &&
          (tc === 420 || tc === 429)
        ) {
          message = `to many requests: ${message}`;
        }

        rateLimitStatus = NODE.addStatus({
          color: 'red',
          message
        });
        console.error(tw, tc);
      });

      stream.on('end', () => {
        // console.log('end!');
      });

      stream.on('destroy', () => {
        // console.log('destroy!');
      });
    });
  }

  /**
   * Returns the user id's for a given list of screenNames.
   * @param {*} twitter An authorized twitter-ng instance.
   * @param {String} screenNames comma seperated list of screennames.
   * @returns {Number[]} An array of user id's.
   */
  async function getUserIdsFromScreenNames(twitter, screenNames) {
    return new Promise((resolve, reject) => {
      twitter.get('/users/lookup.json', { screen_name: screenNames }, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(data.map(user => user.id));
      });
    });
  }

  NODE.on('init', async (state) => {
    const twitters = await twitterIn.getValues(state);
    twitters.forEach(async (twitter) => {
      if (!twitter) {
        return;
      }

      // fetch the user ids from the given follow names
      if (!NODE.data.follow) {
        setupStream(state, twitter, NODE.data.track);
        return;
      }

      try {
        const followUserIds = await getUserIdsFromScreenNames(twitter, NODE.data.follow);
        setupStream(state, twitter, NODE.data.track, followUserIds.join(','));
      } catch (err) {
        NODE.error({
          err
        }, state);
      }
    });
  });
};
