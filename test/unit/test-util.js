const assert = require('assert');
const util = require('../../src/util');
const getSlackBaseUrl = util.getSlackBaseUrl;
const rewriteUrlForSlack = util.rewriteUrlForSlack;

describe('getSlackBaseUrl()', function () {
  it('should return the default URL', function () {
    assert.equal(getSlackBaseUrl(), 'https://slack.com');
  });

  describe('when a SLACK_URL is set', function () {
    beforeEach(function () {
      this.slackUrl = 'http://localhost:5000';
      process.env.SLACK_URL = this.slackUrl;
    });

    it('should return the SLACK_URL', function () {
      assert.equal(getSlackBaseUrl(), this.slackUrl);
    });

    it('shouldn\'t matter if the SLACK_ENV is set', function () {
      process.env.SLACK_ENV = 'anything';
      assert.equal(getSlackBaseUrl(), this.slackUrl);
      delete process.env.SLACK_ENV;
    });

    afterEach(function () {
      delete process.env.SLACK_URL;
    });
  });

  describe('when a SLACK_ENV is set', function () {
    it('should insert the host prefix', function () {
      process.env.SLACK_ENV = 'anything';
      assert.equal(getSlackBaseUrl(), 'https://anything.slack.com');
      delete process.env.SLACK_ENV;
    });
  });
});

describe('rewriteUrlForSlack()', function () {
  before(function () {
    this.inputUrl = 'https://hooks.slack.com/actions/xxxxx';
  });

  it('should return the input URL when no SLACK_URL is set', function () {
    assert.equal(rewriteUrlForSlack(this.inputUrl), this.inputUrl);
  });

  describe('when a SLACK_URL is set', function () {
    it('should rewrite the protocol', function () {
      process.env.SLACK_URL = 'http://hooks.slack.com';
      assert.equal(rewriteUrlForSlack(this.inputUrl), 'http://hooks.slack.com/actions/xxxxx');
      delete process.env.SLACK_URL;
    });

    it('should rewrite the host', function () {
      process.env.SLACK_URL = 'https://localhost';
      assert.equal(rewriteUrlForSlack(this.inputUrl), 'https://localhost/actions/xxxxx');
      delete process.env.SLACK_URL;
    });

    it('should rewrite the port', function () {
      process.env.SLACK_URL = 'https://hooks.slack.com:2020';
      assert.equal(rewriteUrlForSlack(this.inputUrl), 'https://hooks.slack.com:2020/actions/xxxxx');
      delete process.env.SLACK_URL;
    });

    it('should rewrite the protocol, host, and port', function () {
      process.env.SLACK_URL = 'http://localhost:5000';
      assert.equal(rewriteUrlForSlack(this.inputUrl), 'http://localhost:5000/actions/xxxxx');
      delete process.env.SLACK_URL;
    });
  });
});
