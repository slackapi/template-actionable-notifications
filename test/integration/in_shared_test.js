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
describe('app installed in a shared channel', function () {
  beforeEach(function (done) {
    process.env.SLACK_TOKEN = 'xoxp-FAKETOKEN';
    process.env.SLACK_WEBHOOK = 'https://hooks.slack.com/services/T73MR4H8W/B76D9498E/FAKEWEBHOOK';
    process.env.SLACK_VERIFICATION_TOKEN = 'FAKEVERIFICATIONTOKEN';
    level(testTicketStoreLocation, { valueEncoding: 'json' }, (error, db) => {
      if (error) return done(error);
      this.ticketStore = db;
      app.start(appPort, db)
        .then(() => done())
        .catch(done)
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
       'channel when an external user claims a ticket from an interactive message', function () {
      const userWhoPressedClaimButton = 'aoberoi_sc_ankur_exte';
      const messageUpdateUrl = '/actions/T73MR4H8W/243622838500/FAKEACTION';
      const dmUrl = '/api/chat.postMessage'
      const notificationsUrl = url.parse(process.env.SLACK_WEBHOOK).path;
      return startReplayForScenario('user_claims_ticket_in_shared')
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
          assert.equal(field.value, userWhoPressedClaimButton, 'interactive message updated');

          // verify the assignee was DMed
          const dm = history.interactions.find(interaction => interaction.request.url === dmUrl);
          const dmContents = qs.parse(dm.request.body);
          assert.equal(dmContents.text, 'You\'ve been assigned the following ticket: ');
          const attachments = JSON.parse(dmContents.attachments);
          assert.equal(attachments.length, 1);

          // verify notification channel was updated
          const notification = history.interactions.find(interaction => interaction.request.url === notificationsUrl);
          const notificationContents = JSON.parse(notification.request.body);
          assert.notEqual(notificationContents.text.indexOf(`Agent ${userWhoPressedClaimButton} is now assigned`), -1);
        });
    });

    it('should save the ticket, update the interactive message, DM the new assignee, and update the notification '+
       'channel when a user assigns a ticket from an interactive message', function () {
      const userWhoIsAssigned = 'aoberoi_sc_bob_extern';
      const messageUpdateUrl = '/actions/T73MR4H8W/243812058389/FAKEACTION';
      const dmUrl = '/api/chat.postMessage'
      const notificationsUrl = url.parse(process.env.SLACK_WEBHOOK).path;
      return startReplayForScenario('user_assigns_ticket_in_shared')
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
          assert.equal(field.value, userWhoIsAssigned, 'interactive message updated');

          // verify the assignee was DMed
          const dm = history.interactions.find(interaction => interaction.request.url === dmUrl);
          const dmContents = qs.parse(dm.request.body);
          assert.equal(dmContents.text, 'You\'ve been assigned the following ticket: ');
          const attachments = JSON.parse(dmContents.attachments);
          assert.equal(attachments.length, 1);

          // verify notification channel was updated
          const notification = history.interactions.find(interaction => interaction.request.url === notificationsUrl);
          const notificationContents = JSON.parse(notification.request.body);
          assert.notEqual(notificationContents.text.indexOf(`Agent ${userWhoIsAssigned} is now assigned`), -1);
        });
    });

    it('should save the ticket, update the interactive message, DM the new assignee, and update the notification '+
      'channel when an external user assigns a ticket to an external user from an interactive message', function () {
      const userWhoIsAssigned = 'aoberoi_sc_bob_extern';
      const messageUpdateUrl = '/actions/T73MR4H8W/243007753920/FAKEACTION';
      const dmUrl = '/api/chat.postMessage'
      const notificationsUrl = url.parse(process.env.SLACK_WEBHOOK).path;
      return startReplayForScenario('external_user_assigns_ticket_in_shared')
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
          assert.equal(field.value, userWhoIsAssigned, 'interactive message updated');

          // verify the assignee was DMed
          const dm = history.interactions.find(interaction => interaction.request.url === dmUrl);
          const dmContents = qs.parse(dm.request.body);
          assert.equal(dmContents.text, 'You\'ve been assigned the following ticket: ');
          const attachments = JSON.parse(dmContents.attachments);
          assert.equal(attachments.length, 1);

          // verify notification channel was updated
          const notification = history.interactions.find(interaction => interaction.request.url === notificationsUrl);
          const notificationContents = JSON.parse(notification.request.body);
          assert.notEqual(notificationContents.text.indexOf(`Agent ${userWhoIsAssigned} is now assigned`), -1);
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
