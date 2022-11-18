# What Is It?

The included `lib/daily.mjs` node script will copy the contents of the most recent `YYYY-MM-DD.taskpaper` file (from the parent directory by default) into a new file with today's date. 

Here's my template taskpaper file.

```taskpaper
Errands:

Today's Goal:

#######################################
FOCUS:

  Team:
    ✔ prep for 1:1 @done (2022-11-17)

  Architecture:

  Research:
    - can we install do a thing

#######################################
INBOXES:

  Team:

  Architecture:

  Research:

#######################################
# JOURNAL
#######################################
```

I based my template [on this tweet](https://twitter.com/NotePlanApp/status/1589700199429320704).

I use SublimeText with the package [PlainTasks](https://github.com/aziz/PlainTasks) to manage my todo lists. 

In VSCode you can use the extension [Todo+](https://marketplace.visualstudio.com/items?itemName=fabiospampinato.vscode-todo-plus) to accomplish most of the same things.


# Getting Started

```sh
npm install
npm run build
```

## Usage

```sh
npm start
```

or 

```sh
node lib/daily.mjs
```


## Dependencies

|   Project   | Version  |
|-------------|----------|
| nodejs.org  | ^18.12.1 |

Note: You can use [tea](https://github.com/teaxyz/cli) to easily run this with the correct version of node installed in it's env.
```sh
$ sh <(curl tea.xyz) .
```

