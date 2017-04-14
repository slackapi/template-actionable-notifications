require('dotenv').config();

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const template = require('./template');
const Ticket = require('./ticket');
const mockTicket = require('../ticket.json');

const app = express();

/*
 * Parse application/x-www-form-urlencoded && application/json
 */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const sendNotification = (body, url = process.env.SLACK_WEBHOOK) => {
  axios.post(url, body).then(result => console.log(result.data));
};

/*
 * Endpoint where a webhook from a 3rd-party system can post to.
 * Used to notify app of new helpdesk tickets in this case
 */
app.post('/incoming', (req, res) => {
  const ticket = new Ticket(mockTicket);
  sendNotification(template.fill(ticket));
  res.sendStatus(200);
});

/*
 * Endpoint to receive interactive message events from Slack.
 * Checks verification token and then makes necessary updates to
 * 3rd-party system based on the action taken in Slack.
 */
app.post('/interactive-message', (req, res) => {
  const { token, actions, callback_id, response_url } = JSON.parse(req.body.payload);

  if (token !== process.env.SLACK_VERIFICATION_TOKEN) {
    res.sendStatus(500);
  } else {
    res.send('');
    const ticket = Ticket.find(callback_id);
    const action = actions[0];

    if (ticket) {
      const selected = action.selected_options[0].value;
      ticket.updateField(action.name, selected).then((result) => {
        const message = `<${ticket.link}|${ticket.title}> ${action.name} updated!`;
        sendNotification(template.fill(result), response_url);
        sendNotification({ text: message });
      });
    }
  }
});

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}!`);
});
