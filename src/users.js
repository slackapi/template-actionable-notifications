const qs = require('querystring');
const axios = require('axios');
const slackBaseUrl = require('./util').getSlackBaseUrl();

const find = (slackUserId) => {
  const body = { token: process.env.SLACK_TOKEN, user: slackUserId };
  return axios.post(`${ slackBaseUrl }/api/users.info`, qs.stringify(body));
};

module.exports = { find };
