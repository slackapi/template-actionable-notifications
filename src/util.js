'use strict';

const url = require('url');

/*
 * Returns an environment variable configured base URL for the Slack API
 * Default: https://slack.com
 */
function getSlackBaseUrl() {
  const slackUrl = process.env.SLACK_URL;
  if (slackUrl) { return slackUrl; }
  const slackHostPrefix = process.env.SLACK_ENV ? `${process.env.SLACK_ENV}.` : '';
  return `https://${slackHostPrefix}slack.com`;
}

/*
 * Conditionally rewrites a Slack request URL based on configuration from environment variables
 */
function rewriteUrlForSlack(inputUrl) {
  let outputUrl = inputUrl;
  const slackUrl = process.env.SLACK_URL;
  if (slackUrl) {
    const parsedInputUrl = url.parse(inputUrl);
    const parsedSlackUrl = url.parse(slackUrl);
    const parsedOutputUrl = Object.assign({}, parsedInputUrl, {
      protocol: parsedSlackUrl.protocol,
      host: parsedSlackUrl.host,
      hostname: parsedSlackUrl.hostname,
      port: parsedSlackUrl.port,
    });
    delete parsedOutputUrl.href;
    outputUrl = url.format(parsedOutputUrl);
  }
  return outputUrl;
}

module.exports.getSlackBaseUrl = getSlackBaseUrl;
module.exports.rewriteUrlForSlack = rewriteUrlForSlack;
