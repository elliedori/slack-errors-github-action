const core = require('@actions/core');
const github = require('@actions/github');
const https = require('https');

try {
  const slackWebhookUrl = core.getInput('slack-webhook-url');

  // cat all error files in environment
  // build Slack message
  // send Slack message

  const userAccountNotification = {
    "blocks":[
      {
          "type":"header",
          "text":{
            "type":"plain_text",
            "text":"CI build failed for commit 123"
          }
      },
      {
          "type":"section",
          "text":{
            "type":"mrkdwn",
            "text":"— _Author: sampleuser"
          }
      },
      {
          "type":"section",
          "text":{
            "type":"mrkdwn",
            "text":"\n <results go here>"
          }
      }
    ]
  };

  function sendSlackMessage (webhookURL, messageBody) {
    try {
      messageBody = JSON.stringify(messageBody);
    } catch (e) {
      throw new Error('Failed to stringify messageBody', e);
    }
  
    return new Promise((resolve, reject) => {
      const requestOptions = {
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        }
      };
  
      const req = https.request(webhookURL, requestOptions, (res) => {
        let response = '';
  
        res.on('data', (d) => {
          response += d;
        });
        // response finished, resolve the promise with data
        res.on('end', () => {
          resolve(response);
        })
      });
  
      req.on('error', (e) => {
        reject(e);
      });
  
      req.write(messageBody);
      req.end();
    });
  }
  
  (async function () {
    if (!slackWebhookUrl) {
      console.error('Please supply a Slack webhool URL');
    }
  
    console.log('Sending slack message');
    try {
      const slackResponse = await sendSlackMessage(slackWebhookUrl, buildMessage);
      console.log('Message response', slackResponse);
    } catch (e) {
      console.error('There was a error with the request', e);
    }
  })();

  // const payload = JSON.stringify(github.context.payload, undefined, 2)
  // console.log(`The event payload: ${payload}`);
} catch (err) {
  core.setFailed(err.message);
}
