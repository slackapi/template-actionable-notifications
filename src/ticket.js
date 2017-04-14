const users = require('./users');
const exampleTicket = require('../ticket.json');

const attributes = ['id', 'link', 'title', 'description'];
const fields = ['requester', 'status', 'agent', 'priority'];

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
        resolve(this);
      }).catch((err) => { reject(err); });
    });
  }

  setPriority(priority) {
    this.fields.priority = priority;
    return Promise.resolve(this);
  }

  static find(id) {
    return new Ticket(exampleTicket);
  }
}

module.exports = Ticket;
