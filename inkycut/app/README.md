# <YOUR_APP_NAME>

Built with [Wasp](https://wasp.sh), based on the [Open Saas](https://opensaas.sh) template.

## Development

### Running locally
 - Make sure you have the [Wasp CLI](https://wasp.sh/docs/cli) installed and PATH is set up correctly (`export PATH=$PATH:$HOME/.local/bin`)
 - Make sure you have the `.env.client` and `.env.server` files with correct dev values in the root of the project.
 - Run the database with `wasp start db` and leave it running (Or you will CREATE DATABASE inkycut; in postgres).
 - Run `wasp start` and leave it running.
 - [OPTIONAL]: If this is the first time starting the app, or you've just made changes to your entities/prisma schema, also run `wasp db migrate-dev`.

