const core = require('@actions/core');
const github = require('@actions/github');
const https = require('https');
const glob = require("glob");

try {
  const slackWebhookUrl = core.getInput('slack-webhook-url');
  const branchName = core.getInput('branch-name');
  const commitSha = core.getInput('commit-sha');
  const commitOwner = core.getInput('commit-owner');
  const repoName = core.getInput('repo-name');
  const runId = core.getInput('run-id');

  // cat all error files in environment
  // build Slack message
  // send Slack message

  const userAccountNotification = {
    "blocks":[
      {
          "type":"header",
          "text":{
            "type":"plain_text",
            "text":`CI build failed for commit ${commitSha} on ${branchName}`
          }
      },
      {
          "type":"section",
          "text":{
            "type":"mrkdwn",
            "text":`— _Author: ${commitOwner}_  <https://github.com/${repoName}/actions/runs/${runId}|View build>`
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

  const errorOutput = ""

  const errorFiles = glob("job-*.txt", function (er, files) {
    if (er) { throw new Error("Unable to parse files") }
    return files;
  })

  console.log("error files are: ", errorFiles)

  for (var file in errorFiles) {
    errorOutput += fs.readFileSync(file, 'utf8');
  }

  console.log("Final error output is: ", errorOutput);

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
      const slackResponse = await sendSlackMessage(slackWebhookUrl, userAccountNotification);
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
