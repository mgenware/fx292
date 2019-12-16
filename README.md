# fx292

Extract Azure DevOps work item information from commits, useful for making a CHANGELOG between two commits.

## Usage

```
$ npx fx292@2 <org url> <repo id> <access token> [options]

  <org url>: Your organization URL, e.g. https://dev.azure.com/mycompany.
  <repo id>: Your repo ID, can be either of the following forms:
      Repo GUID, e.g. 56d5b23e-a231-4e6c-b834-ae1526ac41d5.
      Project name + repo name, e.g. "project:repo".
  <access token>: Your personal access token (can grab one from Azure DevOps - User settings - Security - Personal Access Tokens).

  Options
    --input-file     Commits file path (one commit hash per line).
    --input-range    Commit range, "abcabcabc..abcabcabc".
    --out-file       If specified, writes the output to the file.

  Examples
    $ npx fx292@2 https://dev.azure.com/mycompany project:repo <my_access_token> --input-range abcabcabc..abcabcabc --out-file CHANGELOG.md
    $ npx fx292@2 https://dev.azure.com/mycompany <repo GUID> <my_access_token> --input-file commits.txt --out-file CHANGELOG.md
```
