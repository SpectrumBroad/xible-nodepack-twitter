'use strict';

module.exports = (NODE) => {
  const triggerIn = NODE.getInputByName('trigger');
  const twittersIn = NODE.getInputByName('twitters');

  const doneOut = NODE.getOutputByName('done');

  triggerIn.on('trigger', async (conn, state) => {
    const twitters = await twittersIn.getValues(state);

    await Promise.all(twitters.map((twitter) => (
      new Promise((resolve, reject) => (
        twitter.updateStatus(
          NODE.data.statusText,
          (err, data) => {
            if (err != null) {
              reject(err);
            }

            resolve();
          }
        )
      ))
    )));

    doneOut.trigger(state);
  });
};
