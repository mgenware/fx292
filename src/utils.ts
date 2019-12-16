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
  const { stdout } = await execAsync(`git rev-list --ancestry-path ${range}`);
  return splitByLines(stdout);
}

export async function getCommitsFromFileAsync(file: string): Promise<string[]> {
  const content = await mfs.readTextFileAsync(file);
  return splitByLines(content);
}
