'use strict';

require('dotenv').config();

// Configure app to send all its requests to slack via steno's outgoing request interface
process.env.SLACK_URL = 'http://localhost:3000';

const assert = require('assert');
const qs = require('querystring');
const url = require('url');
const axios = require('axios');
const app = require('../../src/index').app;
const level = require('level');
const leveldown = require('leveldown');

/*
 * Test suite
 */
describe('app', function () {
  beforeEach(function (done) {
    process.env.SLACK_TOKEN = 'xoxp-FAKETOKEN';
    process.env.SLACK_WEBHOOK = 'https://hooks.slack.com/services/T73MR4H8W/B73TY596K/FAKEWEBHOOK';
    process.env.SLACK_VERIFICATION_TOKEN = 'FAKEVERIFICATIONTOKEN';
    level(testTicketStoreLocation, { valueEncoding: 'json' }, (error, db) => {
      if (error) return done(error);
      this.ticketStore = db;
      app.start(appPort, db)
        .then(() => done())
        .catch(done)
    });
  });

  it('should post a Slack notification to the channel when a new incoming ticket is created', function () {
    const newTicket = {
      id: '1234',
      link: 'https://somehelpdesk.localhost',
      title: 'Test ticket',
      description: 'Oh no! Something went wrong and now everything is on fire :fire:',
      requester: 'Bob',
      status: 'Open',
      agent: 'Jane',
      priority: 'High',
    };
    return startReplayForScenario('new_incoming_ticket')
      .then(() => sendIncomingTicket(newTicket))
      .then(waitOneSecond)
      .then(() => new Promise((resolve, reject) => {
        // Verify the ticket was stored
        this.ticketStore.get(newTicket.id, (error) => {
          if (error) { return reject(error); } resolve();
        });
      }))
      .then(stopReplay)
      .then((history) => {
        // Assert on metadata of the interaction to ensure completion of the replay
        assert.equal(history.meta.unmatchedCount.incoming, 0);
        assert.equal(history.meta.unmatchedCount.outgoing, 0);

        // Feel free to be as specific...
        assert.equal(history.interactions.length, 1, 'number of interactions');
        const requestBody = JSON.parse(history.interactions[0].request.body);
        assert.equal(requestBody.attachments.length, 1, 'number of attachments in request body');
        const attachment = requestBody.attachments[0];
        assert.equal(attachment.title, newTicket.title, 'attachment title');
        assert.equal(attachment.title_link, newTicket.link, 'attachment title link');
        assert.equal(attachment.text, newTicket.description, 'attachment text');
        assert.equal(attachment.callback_id, newTicket.id, 'attachment callback id');

        // ... or generic as makes sense for your app.
        assert.equal(attachment.fields.length, 4, 'attachment number of fields');
        assert.equal(attachment.actions.length, 3, 'attachment number of actions');
      });
  });

  describe('after a new incoming ticket is created', function () {
    beforeEach(function() {
      this.ticket = {
        id: '1234',
        link: 'https://somehelpdesk.localhost',
        title: 'Test ticket',
        description: 'Oh no! Something went wrong and now everything is on fire :fire:',
        requester: 'Bob',
        status: 'Open',
        agent: 'Jane',
        priority: 'High',
      };
      return sendIncomingTicket(this.ticket)
        .catch((error) => {
          // We expect a 400 error because ticket.postToChannel() will fail, but the ticket should still be saved
          if (!error.response || error.response.status !== 400) {
            throw error;
          }
        });
    });

    it('should save the ticket, update the interactive message, DM the new assignee, and update the notification ' +
       'channel when a user claims a ticket from an interactive message', function () {
      const userWhoPressedClaimButton = 'U73TN96RM';
      const messageUpdateUrl = '/actions/T73MR4H8W/242143869092/FAKEACTION';
      const dmUrl = '/api/chat.postMessage'
      const notificationsUrl = url.parse(process.env.SLACK_WEBHOOK).path;
      return startReplayForScenario('user_claims_ticket')
        .then(waitOneSecond)
        .then(() => new Promise((resolve, reject) => {
          // verify the ticket was saved
          this.ticketStore.get(this.ticket.id, (error, ticket) => {
            if (error) { return reject(error); }
            if (ticket.fields.agent === userWhoPressedClaimButton) {
              resolve();
            } else {
              reject('The user who pressed the claim button was not assigned');
            }
          });
        }))
        .then(stopReplay)
        .then((history) => {
          assert.equal(history.meta.unmatchedCount.incoming, 0);
          assert.equal(history.meta.unmatchedCount.outgoing, 0);

          // verify the interactive message was updated
          const update = history.interactions.find(interaction => interaction.request.url === messageUpdateUrl);
          const updateContents = JSON.parse(update.request.body);
          const attachment = updateContents.attachments[0];
          const field = attachment.fields.find(field => field.title === 'Agent');
          assert.equal(field.value, `<@${userWhoPressedClaimButton}>`, 'interactive message updated');

          // verify the assignee was DMed
          const dm = history.interactions.find(interaction => interaction.request.url === dmUrl);
          const dmContents = qs.parse(dm.request.body);
          assert.equal(dmContents.text, 'You\'ve been assigned the following ticket: ');
          const attachments = JSON.parse(dmContents.attachments);
          assert.equal(attachments.length, 1);

          // verify notification channel was updated
          const notification = history.interactions.find(interaction => interaction.request.url === notificationsUrl);
          const notificationContents = JSON.parse(notification.request.body);
          assert.notEqual(notificationContents.text.indexOf(`Agent <@${userWhoPressedClaimButton}> is now assigned`), -1);
        });
    });

    it('should save the ticket, update the interactive message, DM the new assignee, and update the notification '+
       'channel when a user assigns a ticket from an interactive message', function () {
      const userWhoIsAssigned = 'USLACKBOT';
      const messageUpdateUrl = '/actions/T73MR4H8W/242760108100/FAKEACTION';
      const dmUrl = '/api/chat.postMessage'
      const notificationsUrl = url.parse(process.env.SLACK_WEBHOOK).path;
      return startReplayForScenario('user_assigns_ticket')
        .then(waitOneSecond)
        .then(() => new Promise((resolve, reject) => {
          // verify the ticket was saved
          this.ticketStore.get(this.ticket.id, (error, ticket) => {
            if (error) { return reject(error); }
            if (ticket.fields.agent === userWhoIsAssigned) {
              resolve();
            } else {
              reject('The user who was selected was not assigned');
            }
          });
        }))
        .then(stopReplay)
        .then((history) => {
          assert.equal(history.meta.unmatchedCount.incoming, 0);
          assert.equal(history.meta.unmatchedCount.outgoing, 0);

          // verify the interactive message was updated
          const update = history.interactions.find(interaction => interaction.request.url === messageUpdateUrl);
          const updateContents = JSON.parse(update.request.body);
          const attachment = updateContents.attachments[0];
          const field = attachment.fields.find(field => field.title === 'Agent');
          assert.equal(field.value, `<@${userWhoIsAssigned}>`, 'interactive message updated');

          // verify the assignee was DMed
          const dm = history.interactions.find(interaction => interaction.request.url === dmUrl);
          const dmContents = qs.parse(dm.request.body);
          assert.equal(dmContents.text, 'You\'ve been assigned the following ticket: ');
          const attachments = JSON.parse(dmContents.attachments);
          assert.equal(attachments.length, 1);

          // verify notification channel was updated
          const notification = history.interactions.find(interaction => interaction.request.url === notificationsUrl);
          const notificationContents = JSON.parse(notification.request.body);
          assert.notEqual(notificationContents.text.indexOf(`Agent <@${userWhoIsAssigned}> is now assigned`), -1);
        });
    });

    it('should save the ticket, update the interactive message, and update the notification channel when a user ' +
       'changes a ticket\'s priority from an interactive message', function () {
      const newPriority = 'Low';
      const messageUpdateUrl = '/actions/T73MR4H8W/242851266277/FAKEACTION';
      const dmUrl = '/api/chat.postMessage'
      const notificationsUrl = url.parse(process.env.SLACK_WEBHOOK).path;
      return startReplayForScenario('user_changes_ticket_priority')
        .then(waitOneSecond)
        .then(() => new Promise((resolve, reject) => {
          // verify the ticket was saved
          this.ticketStore.get(this.ticket.id, (error, ticket) => {
            if (error) { return reject(error); }
            if (ticket.fields.priority === newPriority) {
              resolve();
            } else {
              reject('The priority which was selected was not assigned');
            }
          });
        }))
        .then(stopReplay)
        .then((history) => {
          assert.equal(history.meta.unmatchedCount.incoming, 0);
          assert.equal(history.meta.unmatchedCount.outgoing, 0);

          // verify the interactive message was updated
          const update = history.interactions.find(interaction => interaction.request.url === messageUpdateUrl);
          const updateContents = JSON.parse(update.request.body);
          const attachment = updateContents.attachments[0];
          const field = attachment.fields.find(field => field.title === 'Priority');
          assert.equal(field.value, newPriority, 'interactive message updated');

          // verify notification channel was updated
          const notification = history.interactions.find(interaction => interaction.request.url === notificationsUrl);
          const notificationContents = JSON.parse(notification.request.body);
          assert.notEqual(notificationContents.text.indexOf(`Priority is now ${newPriority}`), -1);
        });
    });
  });

  afterEach(function (done) {
    app.stop()
      .then(() => {
        this.ticketStore.close((error) => {
          if (error) return done(error);
          leveldown.destroy(testTicketStoreLocation, done);
        })
      })
      .catch(done);
  });
});

/*
 * Steno helpers
 */
const stenoControlPort = 4000;

function startReplayForScenario(scenario) {
  return axios.post(`http://localhost:${stenoControlPort}/start`, {
    name: scenario
  });
}

function stopReplay() {
  return axios.post(`http://localhost:${stenoControlPort}/stop`)
    .then((response) => response.data);
}

function waitOneSecond() {
  return new Promise((r) => setTimeout(r, 1000));
}

/*
 * App helpers
 */
const appPort = process.env.PORT || 5000;

function sendIncomingTicket(ticket) {
  return axios.post(`http://localhost:${appPort}/incoming`, ticket);
}

const testTicketStoreLocation = './test/integration/data/tickets';
