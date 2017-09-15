'use strict';

require('dotenv').config();

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const level = require('level');
const Ticket = require('./ticket').Ticket;
const rewriteUrlForSlack = require('./util').rewriteUrlForSlack;
const debug = require('debug')('actionable-notifications:index');

const app = express();

/*
 * Parse application/x-www-form-urlencoded && application/json
 */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('<h2>The Actionable Notifications app is running</h2> <p>Follow the' +
  ' instructions in the README to configure the Slack App and your environment variables.</p>');
});

/*
 * Endpoint where a webhook from a 3rd-party system can post to.
 * Used to notify app of new helpdesk tickets in this case
 */
app.post('/incoming', (req, res) => {
  debug('an incoming ticket was received');
  Ticket.fromExternal(req.body)
    .then((ticket) => ticket.postToChannel())
    .then(() => {
      res.sendStatus(200);
    })
    .catch((error) => {
      debug(`an error occurred creating the ticket: ${error.message}`);
      res.status(400).send('The ticket was not created');
    });
});

/*
 * Endpoint to receive interactive message events from Slack.
 * Checks verification token and then makes necessary updates to
 * 3rd-party system based on the action taken in Slack.
 */
app.post('/interactive-message', (req, res) => {
  debug('an interactive message action was received');
  const payload = JSON.parse(req.body.payload);
  const token = payload.token;
  const actions = payload.actions;
  const callback_id = payload.callback_id;
  const response_url = rewriteUrlForSlack(payload.response_url);
  const user = payload.user;

  if (token === process.env.SLACK_VERIFICATION_TOKEN) {
    // Immediately respond to signal success, further updates will be done using `response_url`
    res.send('');

    Ticket.find(callback_id).then((ticket) => {
      debug('interactive message ticket found');
      const action = actions[0];
      const fieldName = action.name;
      // Handle either message menu action or message button (Claim)
      const fieldValue = action.selected_options ? action.selected_options[0].value : user.id;

      return ticket.updateField(fieldName, fieldValue).then(() => {
        debug('updating notification in channel');
        return ticket.postToChannel(response_url);
      });
    })
    // Error handling
    .catch(console.error);
  } else {
    debug('check verification token failed');
    res.sendStatus(404);
  }
});

/*
 * Augment Express app with functions to start and stop the HTTP server
 */
app.start = function (port, ticketStore) {
  port = port || process.env.PORT;
  ticketStore = ticketStore || level('./data/tickets', { valueEncoding: 'json' });

  Ticket.setStore(ticketStore);

  return new Promise((resolve, reject) => {
    app.server = http.createServer(app);
    function onError(error) {
      delete app.server;
      reject(error);
    }
    app.server.once('error', onError);
    app.server.listen(port, () => {
      app.server.removeListener('error', onError);
      console.log(`App listening on port ${port}!`);
      resolve();
    });
  });
};

app.stop = function () {
  return new Promise((resolve, reject) => {
    function onError(error) {
      reject(error);
    }
    app.server.once('error', onError);
    app.server.close((error) => {
      app.server.removeListener('error', onError);
      if (error) {
        return reject(error);
      }
      delete app.server;
      resolve();
    });
  });
};

/*
 * Export Express app
 */
module.exports.app = app;

/*
 * Start app immediately when run as main
 */
if (require.main === module) {
  app.start();
}
