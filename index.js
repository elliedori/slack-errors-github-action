const core = require('@actions/core');
const fs = require('fs');
const https = require('https');
const glob = require("glob");

const slackWebhookUrl = core.getInput('slack-webhook-url');
const branchName = core.getInput('branch-name');
const commitSha = core.getInput('commit-sha');
const commitOwner = core.getInput('commit-owner');
const repoName = core.getInput('repo-name');
const runId = core.getInput('run-id');

function prepareErrorOutput() {
  return new Promise((resolve, reject) => {
    glob("job-*.txt", {nonull: true}, function (err, files) {
      if (err) { reject("Unable to parse files") }

      // If there is only one matching file, it is the 'initiate-error-tracking' file
      // No other matching files indicates the build ran without issue
      if (files.length === 1) { resolve("")}

      fullErrors = ""
      for (let i=0; i<files.length; i++) {
        try {
          fullErrors += fs.readFileSync(files[i], 'utf8')
        } catch (err) {
          reject("Failed to read", err)
        }
      }
      resolve(fullErrors);
    })
  })
}

function errorNotification (errors) {
  return {"blocks":[
    {
        "type":"header",
        "text":{
          "type":"plain_text",
          "text":`CI build failed for commit ${commitSha.substring(0,9)} on ${branchName.replace("refs/heads/", "")}`
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
          "text":`\n ${errors}`
        }
    }
  ]}
};

async function makePostRequest(webhookUrl, messageBody) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    const req = https.request(webhookUrl, options, res => {
      let response = '';
      res.on('data', d => {
        response += d;
      });
      res.on('end', () => {
        resolve(response);
      });
    });

    req.on('error', err => {
      reject(err)
    })

    req.write(JSON.stringify(messageBody));
    req.end();
  });
};

async function sendSlackNotification(message) {
  try {
    await makePostRequest(slackWebhookUrl, message);
    console.log("Errors successfully reported to Slack")
  } catch (e) {
    console.error('There was a error with the request', e);
  }
};

async function prepareAndSendNotification() {
  const errors = await prepareErrorOutput()

  if (errors === "") {
    console.log("Slack message not sent, no errors to report")
  } else {
    const slackMessage = errorNotification(errors)
    await sendSlackNotification(slackMessage);
  }
}

try {
  prepareAndSendNotification();
} catch (err) {
  core.setFailed(err.message);
}
