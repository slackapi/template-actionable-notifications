const axios = require('axios');
const template = require('./template');
const qs = require('querystring');
const users = require('./users');
const exampleTicket = require('../ticket.json');

const attributes = ['id', 'link', 'title', 'description'];
const fields = ['requester', 'status', 'agent', 'priority'];

const webhookNotify = (url, body) => {
  axios.post(url, body).then(result => console.log(result.data));
};

class Ticket {
  constructor(options) {
    this.fields = {};
    attributes.forEach((attr) => { this[attr] = options[attr]; });
    fields.forEach((field) => { this.fields[field] = options[field]; });
  }

  updateField(field, value) {
    if (fields.indexOf(field) >= 0) {
      switch (field) {
        case 'agent': return this.setAgent(value).then(result => result);
        case 'priority': return this.setPriority(value);
        default: return null;
      }
    } else {
      console.error('Field not part of fields');
      return null;
    }
  }

  setAgent(userId) {
    return new Promise((resolve, reject) => {
      users.find(userId).then((result) => {
        this.fields.agent = result.data.user.name;
        this.chatNotify(result.data.user.id, false).then(r => console.log(r));

        const message = `<${this.link}|${this.title}> updated! Agent ${this.fields.agent} is now assigned`;
        webhookNotify(process.env.SLACK_WEBHOOK, { text: message });

        resolve(this);
      }).catch((err) => { reject(err); });
    });
  }

  setPriority(priority) {
    this.fields.priority = priority;

    const message = `<${this.link}|${this.title}> updated! Priority is now ${this.fields.priority}`;
    webhookNotify(process.env.SLACK_WEBHOOK, { text: message });

    return Promise.resolve(this);
  }

  postToChannel(url = process.env.SLACK_WEBHOOK) {
    webhookNotify(url, template.fill(this));
  }

  chatNotify(slackUserId, isActionable) {
    const message = template.fill(this, isActionable);
    message.attachments = JSON.stringify(message.attachments);
    message.text = "You've been assigned the following ticket: ";

    const body = Object.assign({ token: process.env.SLACK_TOKEN, channel: slackUserId }, message);
    const promise = axios.post('https://slack.com/api/chat.postMessage', qs.stringify(body));
    return promise;
  }

  static find(id) {
    return new Ticket(exampleTicket);
  }
}

module.exports = Ticket;
