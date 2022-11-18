"use strict";
import { open, writeFile } from "fs/promises";
import path from "path";
import { format, subDays, differenceInDays } from "date-fns";
const __filename = process.cwd();
const now = new Date();
const n = 100;
const directory = "../";
const fileExtension = ".taskpaper";
function fmtDate(d) {
  return format(d, "yyyy-MM-dd");
}
const doneRegex = /^.+(✔).+$/gmu;
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
openLastFile().catch((error) => {
  console.error(error);
  process.exit(1);
}).then(() => {
  console.log("Finished");
  process.exit(0);
});
//# sourceMappingURL=daily.mjs.map
