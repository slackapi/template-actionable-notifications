# Actionable notifications template

When a helpdesk ticket is created in a 3rd party system, send an actionable notification in Slack that allows the user to claim the ticket or apply a label.

![image](https://user-images.githubusercontent.com/700173/27057774-75973260-4f82-11e7-9e03-9b03e4f6fe41.png)

## Setup

#### Create a Slack app

1. Create an app at api.slack.com/apps
1. Navigate to the OAuth & Permissions page and add the following scopes:
    * `users:read`
    * `chat:write:bot`
1. Activate Incoming Webhooks from the Incoming Webhooks page
1. Click 'Add New Webhook to Team', install the app and select a channel

#### Clone and run this repo
1. Clone this repo and run `npm install`
1. Set the following environment variables to `.env` (see `.env.sample`):
    * `SLACK_TOKEN`: Your app's `xoxp-` token (available on the Install App page)
    * `PORT`: The port that you want to run the web server on
    * `SLACK_WEBHOOK`: The webhook URL that you copied off the Incoming Webhook page
    * `SLACK_VERIFICATION_TOKEN`: Your app's Verification Token (available on the Basic Information page)
1. Start the app (`npm start`)
1. In another windown, start ngrok on the same port as your webserver (`ngrok http $PORT`)

#### Enable Interactive Messages
1. Go back to the app settings and click on Interactive Messages.
1. Set the Request URL to your ngrok URL + /interactive-message

#### Send a mock new ticket notification
1. Post the mock ticket JSON to the /incoming endpoint
    * ``curl -X POST -H 'Content-type: application/json' --data "`cat ./ticket.json`" <ngrok URL + /incoming>``
