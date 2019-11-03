#!/usr/bin/env node

import * as azdev from 'azure-devops-node-api';
import * as WorkItemTrackingInterfaces from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import * as mfs from 'm-fs';
const args = process.argv.slice(2);

function getArg(idx: number, name: string): string {
  if (idx >= args.length || !args[idx]) {
    throw new Error(`Missing required argument "${name}"`);
  }
  return args[idx];
}

const orgUrl = getArg(0, 'org');
const repo = getArg(1, 'repo');
const token = getArg(2, 'token');
// eslint-disable-next-line no-console
console.log(`🏁 Org: "${orgUrl}"\n🏚 Repo: "${repo}"`);
const authHandler = azdev.getPersonalAccessTokenHandler(token);
const connection = new azdev.WebApi(orgUrl, authHandler);
async function run() {
  // eslint-disable-next-line no-console
  console.log('💼 Reading input file...');
  const inputString = await mfs.readTextFileAsync('input.txt');
  const commits = inputString.trim().split(/\r?\n/);

  // eslint-disable-next-line no-console
  console.log('🌍 Connecting to services...');
  const git = await connection.getGitApi();
  const wi = await connection.getWorkItemTrackingApi();
  const workItemSet = new Set<number>();

  let commitsMarkdown = '';
  for (const cid of commits) {
    // eslint-disable-next-line no-console
    console.log(`🚙 Fetching commit ${cid}`);
    const commit = await git.getCommit(cid, repo);
    const comment = commit.comment || '';
    const commentLines = comment.split('\n');
    if (!commentLines.length) {
      throw new Error(`Unexpected single-line commit message "${comment}"`);
    }
    let lastLine = commentLines[commentLines.length - 1];
    // Remove the "Related work items:"
    lastLine = lastLine.substr('Related work items: '.length);
    // Split by ','
    const workItemIDStrings = lastLine.split(',');
    if (!workItemIDStrings.length) {
      throw new Error(`No work items found on commit"${comment}"`);
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

    commitsMarkdown += `- ${commit.author!.date!.toDateString()} ${
      commit.author!.name
    }: ${commentLines[0]} [${cid}](${commit._links!.web.href})\n`;
  }
  const workItemIDs = [...workItemSet];
  // eslint-disable-next-line no-console
  console.log(`🧾 Fetching work items ${workItemIDs}`);
  const wiReq: WorkItemTrackingInterfaces.WorkItemBatchGetRequest = {};
  wiReq.ids = workItemIDs;
  wiReq.$expand = WorkItemTrackingInterfaces.WorkItemExpand.Links;
  const workItems = await wi.getWorkItemsBatch(wiReq);

  let md = '';
  md += '### Work items\n\n';
  for (const item of workItems) {
    const map = item.fields || {};
    if (item.id) {
      md += `- [${map['System.Title']}](${item._links.html.href}): ${map['System.CreatedBy'].displayName}\n`;
    }
  }

  md += `\n\n### Commits\n\n${commitsMarkdown}\n`;

  await mfs.writeFileAsync('workItems.md', md);
  // eslint-disable-next-line no-console
  console.log('👏 Action succeeded!');
}

run();
