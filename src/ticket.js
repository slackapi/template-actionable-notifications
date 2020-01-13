'use strict';

const axios = require('axios');
const db = require('node-json-db');
const template = require('./template');
const qs = require('querystring');
const debug = require('debug')('actionable-notifications:ticket');

const attributes = ['id', 'link', 'title', 'description'];
const fields = ['requester', 'status', 'agent', 'priority'];

// Initialize ticket store
const store = new db.JsonDB('tickets', true, false);

class Ticket {

  constructor(properties) {
    debug('constructor');
    for (var prop in properties) {
      if (properties.hasOwnProperty(prop)) {
        this[prop] = properties[prop];
      }
    }
  }

  updateField (field, value) {
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

  setAgent (userId) {
    debug('setting agent');
    const agentNotification = this.chatNotify(userId, false);

    const message = `<${this.link}|${this.title}> updated! Agent <@${userId}> is now assigned`;
    const channelNotification = axios.post(process.env.SLACK_WEBHOOK, { text: message });

    return Promise.all([agentNotification, channelNotification]);
  }

  setPriority (priority) {
    debug('setting priority');
    this.fields.priority = priority;

    const message = `<${this.link}|${this.title}> updated! Priority is now ${this.fields.priority}`;
    return axios.post(process.env.SLACK_WEBHOOK, { text: message });
  }

  postToChannel (url) {
    debug('posting to channel');
    return axios.post(url || process.env.SLACK_WEBHOOK, { text: 'You have a new ticket', blocks: template.fill(this), replace_original: true });
  }

  chatNotify (slackUserId, isActionable) {
    debug('notifying in chat');
    var message = template.fill(this, isActionable);
    message.unshift(
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: 'You\'ve been assigned a ticket'
        }
      },
      {
        type: 'divider'
      }
    );
    axios.post('https://slack.com/api/im.open', qs.stringify({
      token: process.env.SLACK_TOKEN,
      user: slackUserId
    })).then(result => {
      if (result.data.ok) {
        const body = { token: process.env.SLACK_TOKEN, channel: result.data.channel.id, blocks: JSON.stringify(message), text: 'You have a new ticket' };
        return axios.post('https://slack.com/api/chat.postMessage', qs.stringify(body));
      }
    })

  }

  save () {
    debug(`saving id: ${this.id}`);
    const properties = attributes.reduce((props, attr) => {
      props[attr] = this[attr];
      return props;
    }, { fields: this.fields });

    return new Promise((resolve, reject) => {
      store.push(`/${this.id}`, properties);
      resolve(this);
    });
  }

  static fromExternal (ticketJson) {
    debug('creating from external JSON');
    const properties = { fields: {} };
    attributes.forEach((attr) => { properties[attr] = ticketJson[attr]; });
    fields.forEach((field) => { properties.fields[field] = ticketJson[field]; });
    const ticket = new Ticket(properties);
    return ticket.save();
  }

  static find (id) {
    debug(`fetching id: ${id}`);
    return new Promise((resolve, reject) => {
      let properties = store.getData(`/${id}`);
      resolve(new Ticket(properties));
    });
  }
}

module.exports.Ticket = Ticket;
