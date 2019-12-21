#!/usr/bin/env node

import * as azdev from 'azure-devops-node-api';
import * as WorkItemTrackingInterfaces from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import * as mfs from 'm-fs';
import * as parseArgs from 'meow';
import * as nodepath from 'path';
import * as utils from './utils';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');

const RELATED_WORK_ITEMS = 'Related work items: ';
const CMD = `npx ${pkg.name}@${parseInt(pkg.version.split('.')[0])}`;

const cli = parseArgs(
  `
    Usage
      $ ${CMD} <org url> <repo id> <access token> [options]

    <org url>: Your organization URL, e.g. https://dev.azure.com/mycompany.
    <repo id>: Your repo ID, can be either of the following forms:
        Repo GUID, e.g. 56d5b23e-a231-4e6c-b834-ae1526ac41d5.
        Project name + repo name, e.g. "project:repo".
    <access token>: Your personal access token (can grab one from Azure DevOps - User settings - Security - Personal Access Tokens).
 
    Options
      --input-file     Commits file path (one commit hash per line).
      --input-range    Commit range, "abcabcabc..abcabcabc" (You must be under the repo directory in order for this to work).
      --out-file       If specified, writes the output to the file.
 
    Examples
      $ ${CMD} https://dev.azure.com/mycompany project:repo <my_access_token> --input-range abcabcabc..abcabcabc --out-file CHANGELOG.md
      $ ${CMD} https://dev.azure.com/mycompany <repo GUID> <my_access_token> --input-file commits.txt --out-file CHANGELOG.md
`,
  {
    flags: {
      inputFile: {
        type: 'string',
      },
      inputRange: {
        type: 'string',
      },
      outFile: {
        type: 'string',
      },
    },
  },
);

function printNoWorkItemFoundForCommit(id: string) {
  console.log(`⛔️ No work item attached to commit ${id}`);
}

(async () => {
  const { flags } = cli;
  if (!flags.inputFile && !flags.inputRange) {
    throw new Error(`No input specified. Please use "${CMD} --help" for help.`);
  }

  console.log(`>>> ${CMD} ${pkg.version}`);
  const orgUrl = cli.input[0];
  const repo = utils.parseRepoString(cli.input[1]);
  const token = cli.input[2];
  if (!orgUrl || !repo || !token) {
    throw new Error(
      `Missing required arguments. Please use "${CMD} --help" for help.`,
    );
  }

  console.log(`Org: "${orgUrl}"\nRepo: "${repo}"`);
  const authHandler = azdev.getPersonalAccessTokenHandler(token);
  const connection = new azdev.WebApi(orgUrl, authHandler);

  console.log('Reading input...');
  let commits: string[];
  if (flags.inputRange) {
    const { inputRange } = flags;
    console.log(`Getting commits from range "${inputRange}"`);
    commits = await utils.getCommitsFromRangeAsync(inputRange);
  } else if (flags.inputFile) {
    const absFile = nodepath.resolve(flags.inputFile);
    console.log(`Getting commits from file "${absFile}"`);
    commits = await utils.getCommitsFromFileAsync(absFile);
  } else {
    throw new Error(`No input specified. Please use "${CMD} --help" for help.`);
  }
  console.log(`Got ${commits.length} commit(s)`);

  console.log('🌍 Connecting to services...');
  const git = await connection.getGitApi();
  const wi = await connection.getWorkItemTrackingApi();
  const workItemSet = new Set<number>();

  let commitsMarkdown = '';
  let commitNo = 1;
  for (const cid of commits) {
    const shortCid = cid.substring(0, 8);
    console.log(
      `🚙 Fetching commit ${shortCid} (${commitNo++}/${commits.length})`,
    );
    const commit =
      typeof repo === 'string'
        ? await git.getCommit(cid, repo)
        : await git.getCommit(cid, repo.name, repo.project);
    const comment = commit.comment || '';
    const commentLines = comment.split('\n');
    if (!commentLines.length) {
      throw new Error(`Unexpected single-line commit message "${comment}"`);
    }
    let lastLine = commentLines[commentLines.length - 1];
    if (!lastLine || !lastLine.startsWith(RELATED_WORK_ITEMS)) {
      printNoWorkItemFoundForCommit(shortCid);
      continue;
    }
    // Remove the "Related work items:"
    lastLine = lastLine.substr(RELATED_WORK_ITEMS.length);
    // Split by ','
    const workItemIDStrings = lastLine.split(',');
    if (!workItemIDStrings.length) {
      printNoWorkItemFoundForCommit(shortCid);
      continue;
    }
    // Remove the starting # for each work item
    const workItemIDs = workItemIDStrings.map(s =>
      parseInt(s.trim().substr(1), 10),
    );
    for (const wid of workItemIDs) {
      if (workItemSet.has(wid)) {
        continue;
      }
      workItemSet.add(wid);
    }

    const authorInfo = commit.author || {};
    const linksInfo = commit._links || {};
    const authorDate = authorInfo.date
      ? authorInfo.date.toLocaleString(undefined, {
          month: '2-digit',
          day: '2-digit',
        })
      : '';
    commitsMarkdown += `- ${authorDate} - ${commentLines[0]} [${shortCid}](${linksInfo.web.href}) - ${authorInfo.name}\n`;
  }
  const workItemIDs = [...workItemSet];
  console.log(`🚒 Fetching work items ${workItemIDs}`);
  const wiReq: WorkItemTrackingInterfaces.WorkItemBatchGetRequest = {};
  wiReq.ids = workItemIDs;
  wiReq.$expand = WorkItemTrackingInterfaces.WorkItemExpand.Links;
  const workItems = await wi.getWorkItemsBatch(wiReq);

  let md = '';
  md += '### Work items\n\n';
  for (const item of workItems) {
    const map = item.fields || {};
    if (item.id) {
      md += `- [${map['System.Title']}](${item._links.html.href}) - ${map['System.CreatedBy'].displayName}\n`;
    }
  }

  md += `\n\n### Commits\n\n${commitsMarkdown}\n`;

  if (flags.outFile) {
    await mfs.writeFileAsync(flags.outFile, md);
  } else {
    // Output the result to console if outFile is not specified.
    console.log(md);
  }
  console.log('👏 Action succeeded!');
})();
