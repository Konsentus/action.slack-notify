const core = require('@actions/core');
const github = require('@actions/github');
const { WebClient } = require('@slack/web-api');
const { buildSlackAttachments, lookUpChannelId } = require('./src/utils');

const run = async () => {
  try {
    const channel = core.getInput('channel');
    const step = core.getInput('step');
    const text = core.getInput('text', { required: true });
    const status = core.getInput('status', { required: true });
    const color = core.getInput('color', { required: true });
    const messageId = core.getInput('message_id');
    const token = process.env.SLACK_BOT_TOKEN;
    const slack = new WebClient(token);

    core.info(
      JSON.stringify({
        channel,
        step,
        text,
        status,
        color,
        messageId,
      })
    );

    if (!channel && !core.getInput('channel_id')) {
      core.setFailed(`You must provider either a 'channel' or a 'channel_id'.`);
      return;
    }

    const slackAttachments = buildSlackAttachments({ step, status, color, github });
    const channelId = core.getInput('channel_id') || (await lookUpChannelId({ slack, channel }));

    if (!channelId) {
      core.setFailed(`Slack channel ${channel} could not be found.`);
      return;
    }

    const apiMethod = Boolean(messageId) ? 'update' : 'postMessage';

    const slackMessageArgs = {
      channel: channelId,
      attachments: slackAttachments,
      text,
    };

    core.info(JSON.stringify(slackMessageArgs));

    if (messageId) {
      slackMessageArgs.ts = messageId;
    }

    const response = await slack.chat[apiMethod](slackMessageArgs);

    core.setOutput('message_id', response.ts);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
