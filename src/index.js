'use strict';

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const signature = require('./verifySignature');
const Ticket = require('./ticket').Ticket;
const debug = require('debug')('actionable-notifications:index');

const app = express();

/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));


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
      console.log(error)
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
  if (!signature.isVerified(req)) return res.status(404).send();

  // Immediately respond to signal success, further updates will be done using `response_url`
  res.send('');

  const payload = JSON.parse(req.body.payload);
  const { actions, response_url, user } = payload;

  const action = actions[0];
  const action_id = action.action_id;
  const action_array = action_id.split('.');
  const ticket_id = action_array[1];

  let fieldName = action_array[0];

  Ticket.find(ticket_id).then((ticket) => {
    debug('interactive message ticket found');

    let fieldValue = '';

    switch (fieldName) {
      case 'claim':
        fieldName = 'agent';
        fieldValue = user.id;
        break;
      case 'agent':
        fieldValue = action.selected_user;
        break;
      case 'priority':
        fieldValue = action.selected_option.value;
        break;
      default:
        debug('Unknown field name!');
        return;
    }

    return ticket.updateField(fieldName, fieldValue).then(() => {
      debug('updating notification in channel');
      return ticket.postToChannel(response_url);
    });
  })
    // Error handling
    .catch(console.error);

});

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});
