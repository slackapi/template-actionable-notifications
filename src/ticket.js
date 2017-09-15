'use strict';

const axios = require('axios');
const level = require('level');
const template = require('./template');
const qs = require('querystring');
const users = require('./users');
const exampleTicket = require('../ticket.json');
const debug = require('debug')('actionable-notifications:ticket');

const attributes = ['id', 'link', 'title', 'description'];
const fields = ['requester', 'status', 'agent', 'priority'];

// Initialize ticket store
const store = level('./data/tickets', { valueEncoding: 'json' });

class Ticket {

  constructor(properties) {
    debug('constructor');
    for (var prop in properties) {
      if (properties.hasOwnProperty(prop)) {
        this[prop] = properties[prop];
      }
    }
  }

  updateField(field, value) {
    let update;
    if (field === 'agent') {
      update = this.setAgent(value);
    } else if (field === 'priority') {
      update = this.setPriority(value);
    } else {
      update = Promise.reject(new Error('This field is not a ticket field'));
    }
    return update.then(() => this.save());
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

  save() {
    debug(`saving id: ${this.id}`);
    const properties = attributes.reduce((props, attr) => {
      props[attr] = this[attr];
      return props;
    }, { fields: this.fields });
    return new Promise((resolve, reject) => {
      store.put(this.id, properties, (error) => {
        if (error) { return reject(error); }
        resolve(this);
      });
    });
  }

  static fromExternal(ticketJson) {
    debug('creating from external JSON');
    const properties = { fields: {} };
    attributes.forEach((attr) => { properties[attr] = ticketJson[attr]; });
    fields.forEach((field) => { properties.fields[field] = ticketJson[field]; });
    const ticket = new Ticket(properties);
    return ticket.save();
  }

  static find(id) {
    debug(`fetching id: ${id}`)
    return new Promise((resolve, reject) => {
      store.get(id, (error, properties) => {
        if (error) { return reject(error); }
        resolve(new Ticket(properties));
      });
    });
  }
}

module.exports.Ticket = Ticket;
