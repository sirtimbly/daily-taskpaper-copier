#!/usr/bin/env /usr/local/bin/node

import { FileHandle, open, writeFile, readdir, rename} from "node:fs/promises";
import { parseArgs, ParseArgsConfig } from "node:util";
import path from "path";
import { format, subDays, differenceInDays, parse } from "date-fns";

const __filename = process.cwd();
const now = new Date();

const doneRegex = /^.+(✔|- \[x\]).+\n/gmu;

const dateRegex = /\d{2,4}-\d{2}-\d{2}/;

const fmtString = "yyyy-MM-dd";
function fmtDate(d: Date) {
  return format(d, fmtString);
}

function parseDate(s: string) {
  return parse(s, fmtString, new Date())
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


const args: ParseArgsConfig = {
  options: {
    dir: {
      type: "string",
      short: "d",
      default: "../",
    },
    overwrite: {
      type: "boolean",
      short: "o",
      default: false,
    },
    extension: {
      type: "string",
      short: "e",
      default: ".taskpaper",
    },
    days: {
      type: "string",
      short: "n",
      default: "100",
    },
    archive: {
      type: "boolean",
      short: "a",
      default: false,
    },
    help: {
      type: "boolean",
      short: "h",
      default: false,
    },
  },
};
const {
  values: { archive, dir, overwrite, extension, help, days },
} = parseArgs(args);
let n = 100;
if (typeof days === "string") {
  n = Number.parseInt(days);
}
const directory = typeof dir === "string" ? dir : "../";
const archiveDir = path.resolve(`${directory}/Archive`)
const fileExtension = typeof extension === "string" ? extension : ".taskpaper";

/**
 * Copies contents from given file, cleans the text, and writes to file with
 * todays date in the filename.
 * @param  {FileHandle} file [the existing file to read from]
 * @return {Promise}      Resolves when new file is written
 */
async function copyToNewFile(file: FileHandle): Promise<any> {
  const { buffer } = await file.read();
  console.log("Copied previous file...");
  const contents = buffer.toString();
  console.log(contents.length);
  let newContents = contents.replace(doneRegex, "");
  const journalIndex = newContents.indexOf("# JOURNAL");
  if (journalIndex > 0) {
    newContents = newContents.substring(0, journalIndex + 9);
    newContents = `${newContents}\r\n#######################################`;
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
      //continue
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
      await archiveFiles(archivable)
      console.log("Moving old files to ./Archive complete.")
    }

  }
}

/**
 * Attempts to open the daily file from yesterday and recursively looks
 * back 1 day at a time until it finds a file.
 * @return {[Promise]} [Resolves when it finds and writes a file or rejects
 * if no file is found for the last 'n' days.]
 */
async function openLastFile() {
  /**
   * Recursive function that gets date - x days and attempts to open it
   * @param  {Date} date        		The date to start with
   * @param  {Number} subtraction 	Number of days to subtract from date, defaults to 1
   * @return {Promise}     					A promise that resolves when find and copy
   * succeeds or rejects when no file can be found
   */
  async function getPreviousPath(
    date: Date,
    subtraction: number = 1
  ): Promise<void> {
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

async function archiveFiles(fileNames: string[]) {
  return Promise.all(
    fileNames.map((name) => {
      console.log("moving...", name)
      return rename(path.resolve(directory, name), path.resolve(archiveDir, name))
    })
  )
}

async function getArchivableFiles(olderThan: Date): Promise<string[] | undefined> {
  function isOld(fileDate: Date) {
    return fileDate < olderThan;
  }
  const allFiles = await readdir(path.resolve(directory));
  const taskFiles = allFiles.filter((name: string) => path.extname(name) === fileExtension)
  const oldFiles = taskFiles.filter((name: string) => {
    const file = path.basename(name, fileExtension);
    // console.log("old file", file);
    if (dateRegex.test(file)) {
      // console.log("regex matched");
      const fileDate = parseDate(file);
      // console.log('parsedate result', fileDate);
      return typeof fileDate === "object" && isOld(fileDate);
    } else {
      // console.log("regex not matched!", file);
      return false;
    }
  })
  console.log("Found files to archive:", oldFiles.length);
  return oldFiles;
}

if (help) {
  console.log(helpDocs);
} else {
  openLastFile()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .then(() => {
      console.log("Finished");
      process.exit(0);
    });
}
