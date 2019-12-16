import * as cp from 'child_process';
import * as util from 'util';
import * as mfs from 'm-fs';
const execAsync = util.promisify(cp.exec);

export function splitByLines(str: string): string[] {
  return str.trim().split(/\r?\n/);
}

export async function getCommitsFromRangeAsync(
  range: string,
): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`git rev-list --ancestry-path ${range}`);
    return splitByLines(stdout);
  } catch (err) {
    err.message = `Note that you must be under the repo directory in order for "--input-range" to work!\n${err.message}`;
    throw err;
  }
}

export async function getCommitsFromFileAsync(file: string): Promise<string[]> {
  const content = await mfs.readTextFileAsync(file);
  return splitByLines(content);
}

export interface RepoName {
  project: string;
  name: string;
}

export function parseRepoString(s: string): string | RepoName {
  if (s.includes(':')) {
    const parts = s.split(':');
    return {
      project: parts[0] || '',
      name: parts[1] || '',
    };
  }
  // s is a GUID.
  return s;
}
