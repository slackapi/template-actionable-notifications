'use strict';

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const Ticket = require('./ticket').Ticket;
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
  const response_url = payload.response_url;
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

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}!`);
});
