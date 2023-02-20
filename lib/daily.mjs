#!/usr/bin/env /usr/local/bin/node
"use strict";
import { open, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import path from "path";
import { format, subDays, differenceInDays } from "date-fns";
const __filename = process.cwd();
const now = new Date();
const doneRegex = /^.+(✔|- \[x\]).+\n/gmu;
function fmtDate(d) {
  return format(d, "yyyy-MM-dd");
}
const helpDocs = `
Copies todo items from previous daily file to today's new file.

Usage: daily [options]

	-d --dir				Directory for your daily files (default is '../').
	-o --overwrite  Should it overwrite the today file if it already exists?
	-e --ext				File extension (default is '.taskpaper').
	-n --days				Days back to search for previous daily file (default 100).
	-h --help				Prints this help.
`;
const args = {
  options: {
    dir: {
      type: "string",
      short: "d",
      default: "../"
    },
    overwrite: {
      type: "boolean",
      short: "o",
      default: false
    },
    extension: {
      type: "string",
      short: "e",
      default: ".taskpaper"
    },
    days: {
      type: "string",
      short: "n",
      default: "100"
    },
    help: {
      type: "boolean",
      short: "h",
      default: false
    }
  }
};
const {
  values: { dir, overwrite, extension, help, days }
} = parseArgs(args);
let n = 100;
if (typeof days === "string") {
  n = Number.parseInt(days);
}
const directory = dir || "../";
const fileExtension = extension || ".taskpaper";
async function copyToNewFile(file) {
  const { buffer } = await file.read();
  console.log("Copied previous file...");
  const contents = buffer.toString();
  console.log(contents.length);
  let newContents = contents.replace(doneRegex, "");
  const journalIndex = newContents.indexOf("# JOURNAL");
  if (journalIndex > 0) {
    newContents = newContents.substring(0, journalIndex + 9);
    newContents = `${newContents}\r
#######################################`;
  }
  console.log(newContents.length);
  const todayFile = path.resolve(
    __filename,
    `${directory}${fmtDate(now)}${fileExtension}`
  );
  if (!overwrite) {
    let existingFile;
    try {
      existingFile = await open(todayFile);
    } catch {
    }
    if (existingFile) {
      throw new Error("File exists, and overwrite option was not set.");
    }
  }
  console.log("Writing new file:", todayFile);
  return writeFile(todayFile, newContents);
}
async function openLastFile() {
  async function getPreviousPath(date, subtraction = 1) {
    const newDate = subDays(date, subtraction);
    const filePath = path.resolve(
      __filename,
      `${directory}${fmtDate(newDate)}${fileExtension}`
    );
    console.log("Looking for most recent file...");
    try {
      const file = await open(filePath);
      console.log("Found file and opening:", filePath);
      return copyToNewFile(file);
    } catch (reason) {
      console.log("Unable to open file: ", filePath);
      if (differenceInDays(now, newDate) > n) {
        throw new Error(
          `Looked back ${n} days without finding a daily ${fileExtension} file in ${directory}, giving up.`
        );
      }
      return getPreviousPath(newDate);
    }
  }
  return getPreviousPath(now);
}
if (help) {
  console.log(helpDocs);
} else {
  openLastFile().catch((error) => {
    console.error(error);
    process.exit(1);
  }).then(() => {
    console.log("Finished");
    process.exit(0);
  });
}
//# sourceMappingURL=daily.mjs.map
