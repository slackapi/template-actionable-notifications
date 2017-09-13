'use strict';

const axios = require('axios');
const template = require('./template');
const qs = require('querystring');
const users = require('./users');
const exampleTicket = require('../ticket.json');
const debug = require('debug')('actionable-notifications:ticket');

const attributes = ['id', 'link', 'title', 'description'];
const fields = ['requester', 'status', 'agent', 'priority'];

class Ticket {
  constructor(options) {
    this.fields = {};
    attributes.forEach((attr) => { this[attr] = options[attr]; });
    fields.forEach((field) => { this.fields[field] = options[field]; });
  }

  updateField(field, value) {
    if (field === 'agent') {
      return this.setAgent(value);
    } else if (field === 'priority') {
      return this.setPriority(value);
    } else {
      return Promise.reject(new Error('This field is not a ticket field'));
    }
  }

  setAgent(userId) {
    debug('setting agent');
    return users.find(userId).then((result) => {
      this.fields.agent = result.data.user.name;
      const agentNotification = this.chatNotify(result.data.user.id, false);

      const message = `<${this.link}|${this.title}> updated! Agent ${this.fields.agent} is now assigned`;
      const channelNotification = axios.post(process.env.SLACK_WEBHOOK, { text: message });

      return Promise.all([agentNotification, channelNotification]);
    });
  }

  setPriority(priority) {
    debug('setting priority');
    this.fields.priority = priority;

    const message = `<${this.link}|${this.title}> updated! Priority is now ${this.fields.priority}`;
    return axios.post(process.env.SLACK_WEBHOOK, { text: message });
  }

  postToChannel(url) {
    debug('posting to channel');
    return axios.post(url || process.env.SLACK_WEBHOOK, template.fill(this));
  }

  chatNotify(slackUserId, isActionable) {
    debug('notifying in chat');
    const message = template.fill(this, isActionable);
    message.attachments = JSON.stringify(message.attachments);
    message.text = "You've been assigned the following ticket: ";

    const body = Object.assign({ token: process.env.SLACK_TOKEN, channel: slackUserId }, message);
    return axios.post('https://slack.com/api/chat.postMessage', qs.stringify(body));
  }

  /*
   * Fetch a Ticket from a data store.
   * NOTE: This method is currently stubbed out for simplicity, there is no backing store.
   */
  static find(id) {
    return new Ticket(exampleTicket);
  }
}

module.exports.Ticket = Ticket;
