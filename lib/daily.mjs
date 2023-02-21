#!/usr/bin/env /usr/local/bin/node
"use strict";
import { open, writeFile, readdir, rename } from "node:fs/promises";
import { parseArgs } from "node:util";
import path from "path";
import { format, subDays, differenceInDays, parse } from "date-fns";
const __filename = process.cwd();
const now = new Date();
const doneRegex = /^.+(✔|- \[x\]).+\n/gmu;
const dateRegex = /\d{2,4}-\d{2}-\d{2}/;
const fmtString = "yyyy-MM-dd";
function fmtDate(d) {
  return format(d, fmtString);
}
function parseDate(s) {
  return parse(s, fmtString, new Date());
}
const helpDocs = `
Copies todo items from previous daily file to today's new file.

Usage: daily [options]
  -a --archive    Archive files from previous weeks into '[dir]/Archive' dir
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
    archive: {
      type: "boolean",
      short: "a",
      default: false
    },
    help: {
      type: "boolean",
      short: "h",
      default: false
    }
  }
};
const {
  values: { archive, dir, overwrite, extension, help, days }
} = parseArgs(args);
let n = 100;
if (typeof days === "string") {
  n = Number.parseInt(days);
}
const directory = typeof dir === "string" ? dir : "../";
const archiveDir = path.resolve(`${directory}/Archive`);
const fileExtension = typeof extension === "string" ? extension : ".taskpaper";
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
  await writeFile(todayFile, newContents);
  if (archive) {
    const oldDate = subDays(new Date(), 7);
    console.log("Looking for files to archive older than ", oldDate);
    const archivable = await getArchivableFiles(oldDate);
    if (archivable && archivable.length) {
      await archiveFiles(archivable);
      console.log("Moving old files to ./Archive complete.");
    }
  }
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
async function archiveFiles(fileNames) {
  return Promise.all(
    fileNames.map((name) => {
      console.log("moving...", name);
      return rename(path.resolve(directory, name), path.resolve(archiveDir, name));
    })
  );
}
async function getArchivableFiles(olderThan) {
  function isOld(fileDate) {
    return fileDate < olderThan;
  }
  const allFiles = await readdir(path.resolve(directory));
  const taskFiles = allFiles.filter((name) => path.extname(name) === fileExtension);
  const oldFiles = taskFiles.filter((name) => {
    const file = path.basename(name, fileExtension);
    if (dateRegex.test(file)) {
      const fileDate = parseDate(file);
      return typeof fileDate === "object" && isOld(fileDate);
    } else {
      return false;
    }
  });
  console.log("Found files to archive:", oldFiles.length);
  return oldFiles;
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
