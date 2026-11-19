# Understory

Ask why a line of code is the way it is, without leaving the editor.

Understory reconstructs the answer from the line's history: the commits that touched it and, when it can reach them, the pull requests, issues and reviews behind those commits. Every claim in the answer cites its source, and you can open each one. When the history does not record a reason, Understory says so instead of guessing.

It runs the same engine as the web app at [understory.marianacastro.dev](https://understory.marianacastro.dev).

## Getting started

1. Open a folder that is a git repository.
2. Place the cursor on a line, right-click and choose **Understory: Why is this line?** It is also in the Command Palette.
3. The first answer shows the evidence only: the commits that shaped the line. For a written answer, run **Understory: Set Groq API Key** and paste a key from [console.groq.com](https://console.groq.com/keys). Groq has a free tier.

## Two ways to investigate

| | Why is this line? | Full Investigation (in editor) |
| --- | --- | --- |
| Where it runs | On your machine, against the repository's local history | On the hosted Understory service |
| What it needs | A Groq API key for the written answer. Without one, you get the evidence | A GitHub or GitLab remote. No key needed |
| What it reads | Local commits. With a GitHub token, also the pull requests, issues and reviews behind each commit | Commits, pull requests, issues and reviews, collected from the provider |
| From the answer | Open each cited source | Open each cited source, or investigate it in turn |

**Understory: Open Full Investigation on the Web** opens the same line in the web app.

## Private repositories

- **Why is this line?** works on any repository you have checked out. To include pull requests and issues from a private GitHub repository, run **Understory: Set GitHub Token** with a classic personal access token that has the `repo` scope.
- **Full Investigation** reads private GitHub repositories through the [Understory GitHub App](https://github.com/apps/understory-code). The app is read-only and never writes to your repositories. Install it on the repositories you choose and no token is needed. A GitHub token set in the extension also works, and is then sent to the hosted service with the request.
- **Self-hosted GitLab behind a firewall:** run Understory inside your network with Docker and point `understory.webUrl` at it. The steps are in the [repository README](https://github.com/maricastroc/understory#-private-gitlab-self-hosted).

## What leaves your machine

- **Why is this line?** reads git history locally. With a Groq key, the code around the line and the history collected for it are sent to Groq to write the answer. With a GitHub token, the extension also calls the GitHub API. Nothing is sent to the Understory service.
- **Full Investigation** sends the repository's remote URL and the file and line to the hosted service, along with your GitHub token if you set one. The service is shared and has a daily limit on written answers. When the limit is reached, you still get the full evidence.
- Keys and tokens are kept in VS Code's SecretStorage. Run the same command again with an empty value to remove one.

## Commands

| Command | What it does |
| --- | --- |
| Understory: Why is this line? | Investigates the line under the cursor from local history |
| Understory: Full Investigation (in editor) | Investigates it through the hosted service, with pull requests, issues and reviews |
| Understory: Open Full Investigation on the Web | Opens the line in the web app |
| Understory: Set Groq API Key | Stores or removes the Groq key |
| Understory: Set GitHub Token | Stores or removes the GitHub token |

## Settings

| Setting | Default | Use |
| --- | --- | --- |
| `understory.mode` | `local` | `backend` sends **Why is this line?** to your own Understory server instead of running it in the editor |
| `understory.backendUrl` | `http://localhost:3000` | The server used in `backend` mode |
| `understory.webUrl` | `https://understory.marianacastro.dev` | The service used by **Full Investigation** and **Open on the Web**. Point it at your own deployment if you run one |

## Source and issues

Understory is open source under the MIT license: [github.com/maricastroc/understory](https://github.com/maricastroc/understory). Report problems in its [issues](https://github.com/maricastroc/understory/issues).

To build or run the extension from source, see [DEVELOPMENT.md](https://github.com/maricastroc/understory/blob/main/apps/extension/DEVELOPMENT.md).
