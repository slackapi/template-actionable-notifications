# What's New? - Updates from the Previous Example

Now all the Blueprints examples have been updated with new Slack platform features. So what are the *diffs* in this updated example?

---
## Changes made in January 2020

### Bot scopes

*Major updates!: This requires to update your scopes in App Management!*

We have intruduced more granular OAuth permissions for the apps that uses a bot token. Now, this sample app requires the scopes, `incoming-webhook`, `chat:write`, `im:write`, where it used to require only `bot` scope.

To learn more about the change, please refer [Migration guide for classic Slack apps](https://api.slack.com/authentication/migration).

---

## Changes made in December 2019

## OAuth Token

Use bot token for this use case, rather than a user token. Your OAuth access token should begins with `-xoxb` instead of `-xoxp`.


## OAuth Scopes and Permission

We’ve made major improvements to the way scopes work for apps. 
The `bot` scope used to be very broad and permissive, but now you can request more specific and granular permissions for your app. 

This sample app previously needed the `incoming-webhook`, and `chat:write:bot` *user* scopes, 
but now you need the *bot* scopes-- `incoming-webhook`,`users:read` to access user info (user ID in this case), and `chat:write` scopes to read user info, 
and `chat:write` and `im:write` to post messages in channels and DM respectively. But no other actions can be made unless you give more permissions. 

We recommend selecting only the scopes your app needs. Requesting too many scopes can cause your app to be restricted by a team’s Admin or App Manager.

Please read [Scopes and permissions](https://api.slack.com/scopes) to figure out which scopes you need. 

## Block Kit

We introduced Block Kit UI framework that allows you to create messages with the components called blocks. 
If you have been creating messages with the legacy "attatchment", please consider switching to Block Kit! 

Read more at: [Block Kit](https://api.slack.com/block-kit)

---
## Changes made in October 2018

## Sigining Secret 

*This requires to update your code!*

Previously, you needed to verify a *verificatin token* to see if a request was coming from Slack, not from some malicious place by simply comparing a string with the legacy token with a token received with a payload. But now you must use more secure *sigining secrets*.

Basically, you need to compare the value of the `X-Slack-Signature`, the HMAC-SHA256 keyed hash of the raw request payload, with a hashed string containing your Slack signin secret code, combined with the version and `X-Slack-Request-Timestamp`. 

Learn more at [Verifying requests from Slack](https://api.slack.com/docs/verifying-requests-from-slack).


