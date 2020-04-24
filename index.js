const core = require('@actions/core');
const github = require('@actions/github');
const { WebClient } = require('@slack/web-api');
const { buildSlackAttachments, formatChannelName } = require('./src/utils');

const run = async () => {
  try {
    const channel = core.getInput('channel');
    const step = core.getInput('step');
    const message = core.getInput('message', { required: true });
    const status = core.getInput('status', { required: true });
    const color = core.getInput('color', { required: true });
    const messageId = core.getInput('message_id');
    const token = process.env.SLACK_BOT_TOKEN;
    const slack = new WebClient(token);

    if (!channel && !core.getInput('channel_id')) {
      core.setFailed(`You must provider either a 'channel' or a 'channel_id'.`);
      return;
    }

    const slackAttachments = buildSlackAttachments({ step, status, color, github, title, message });
    const channelId = core.getInput('channel_id') || (await lookUpChannelId({ slack, channel }));

    if (!channelId) {
      core.setFailed(`Slack channel ${channel} could not be found.`);
      return;
    }

    const apiMethod = Boolean(messageId) ? 'update' : 'postMessage';

    const slackMessageArgs = {
      channel: channelId,
      slackAttachments,
    };

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

const lookUpChannelId = async ({ slack, channel }) => {
  let result;
  const formattedChannel = formatChannelName(channel);

  // Async iteration is similar to a simple for loop.
  // Use only the first two parameters to get an async iterator.
  for await (const page of slack.paginate('conversations.list', { types: 'public_channel, private_channel' })) {
    core.setDebug(page);
    // You can inspect each page, find your result, and stop the loop with a `break` statement
    const match = page.channels.find((c) => c.name === formattedChannel);
    if (match) {
      result = match.id;
      break;
    }
  }

  return result;
};
