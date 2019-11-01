# fx292

Extract Azure DevOps work item information from commits, useful for making a CHANGELOG between two commits.

## Usage

- Clone this repo
- Go to project root directory
- Run `yarn` to install dependencies
- Put commit hashes into `./input.txt`
- Run `node dev` to compile TypeScript source files
- Run `node dist/main.js <org URL> <repo ID> <access token>` to start crawling data
- Ouput is saved to `workItem.md` in Markdown format if everything goes well
