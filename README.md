# Actionable notifications template

When a helpdesk ticket is created in a 3rd party system, send an actionable notification in Slack that allows the user to claim the ticket or apply a label.

![image](https://user-images.githubusercontent.com/700173/27109139-d30e81ea-5055-11e7-92f9-d8ed32903cbd.png)

## Setup

#### Create a Slack app

1. Create an app at api.slack.com/apps
1. Navigate to the OAuth & Permissions page and add the following scopes:
    * `users:read`
    * `chat:write:bot`
1. Activate Incoming Webhooks from the Incoming Webhooks page
1. Click 'Add New Webhook to Team', install the app and select a channel

#### Run locally or [![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/slack-actionable-notification-blueprint)
1. Get the code
    * Either clone this repo and run `npm install`
    * Or visit https://glitch.com/edit/#!/remix/slack-actionable-notification-blueprint
1. Set the following environment variables to `.env` (see `.env.sample`):
    * `SLACK_TOKEN`: Your app's `xoxp-` token (available on the Install App page)
    * `PORT`: The port that you want to run the web server on
    * `SLACK_WEBHOOK`: The webhook URL that you copied off the Incoming Webhook page
    * `SLACK_VERIFICATION_TOKEN`: Your app's Verification Token (available on the Basic Information page)
1. If you're running the app locally:
    1. Start the app (`npm start`)
    1. In another window, start ngrok on the same port as your webserver (`ngrok http $PORT`)

#### Enable Interactive Messages
1. Go back to the app settings and click on Interactive Messages.
1. Set the Request URL to your ngrok URL + /interactive-message

#### Send a mock new ticket notification
1. Post the mock ticket JSON to the /incoming endpoint
    * ``curl -X POST -H 'Content-type: application/json' --data "`cat ./ticket.json`" <ngrok URL + /incoming>``
