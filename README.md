# fx292

Extract Azure DevOps work item information from commits, useful for making a CHANGELOG between two commits.

## Usage

Go to a directory and put commit hashes into a `input.txt`:

```
hash1
hash2
hash3
```

- Run `npx fx292 <org URL> <repo ID> <access token>` to start crawling data
- Ouput is saved to `workItem.md` in Markdown format if everything goes well
