const core = require('@actions/core');
const { context } = require('@actions/github');

const formatChannelName = channel => channel.replace(/[#@]/g, '');

const lookUpChannelId = async ({ slack, channel }) => {
  core.info(`Starting lookUpChannelId with params:
    ${slack}
    ${channel}`);

  let result;
  const formattedChannel = formatChannelName(channel);

  // Async iteration is similar to a simple for loop.
  // Use only the first two parameters to get an async iterator.
  for await (const page of slack.paginate('conversations.list', { types: 'public_channel, private_channel' })) {
    // You can inspect each page, find your result, and stop the loop with a `break` statement
    const match = page.channels.find(c => c.name === formattedChannel);
    if (match) {
      result = match.id;
      break;
    }
  }

  return result;
};

const buildSlackAttachments = ({ status, color, github, jobName, jobNumber }) => {
  core.info(`Starting buildSlackAttachments with params:
    ${status}
    ${color}
    ${github}
    ${jobName}
    ${jobNumber}`);

  const { payload, ref, workflow, eventName, actor } = github.context;

  core.info(`eventName: ${eventName}`);

  const { owner, repo } = context.repo;
  const event = eventName;
  const branch = event === 'pull_request' ? payload.pull_request.head.ref : ref.replace('refs/heads/', '');

  core.info(`branch: ${branch}`);
  const sha = event === 'pull_request' ? payload.pull_request.head.sha : github.context.sha;
  core.info(`sha: ${sha}`);

  const githubEventType =
    event === 'pull_request'
      ? {
          title: 'Pull Request',
          value: `<${payload.pull_request.html_url} | ${payload.pull_request.title}>`,
          short: true,
        }
      : {
          title: 'Branch',
          value: `<https://github.com/${owner}/${repo}/commit/${sha} | ${branch}>`,
          short: true,
        };

  return [
    {
      color,
      fields: [
        {
          title: 'Repo',
          value: `<https://github.com/${owner}/${repo} | ${repo}>`,
          short: true,
        },
        {
          title: 'User',
          value: `<https://github.com/${actor} | ${actor}>`,
          short: true,
        },
        {
          title: 'Action',
          value: `<https://github.com/${owner}/${repo}/actions/runs/${jobNumber} | ${workflow}>`,
          short: true,
        },
        {
          title: 'Status',
          value: status,
          short: true,
        },
        githubEventType,
        {
          title: 'Job',
          value: `${jobName}`,
          short: true,
        },
      ],
      footer_icon: 'https://octodex.github.com/images/jenktocat.jpg',
      // footer: `<https://github.com/${actor} | ${actor}>`,
      ts: Math.floor(Date.now() / 1000),
    },
  ];
};

module.exports = { lookUpChannelId, buildSlackAttachments };
