import { FileHandle, open, writeFile } from "fs/promises";
import path from "path";
import { format, subDays, differenceInDays } from "date-fns";

const __filename = process.cwd();
const now = new Date();
const n = 100;
const directory = "../";
const fileExtension = ".taskpaper";
function fmtDate(d: Date) {
	return format(d, "yyyy-MM-dd");
}
const doneRegex = /^.+(✔).+$/gmu;

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
		`${directory}${fmtDate(now)}${fileExtension}`,
	);
	console.log("Writing new file:", todayFile);
	return writeFile(todayFile, newContents);
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
		subtraction: number = 1,
	): Promise<void> {
		const newDate = subDays(date, subtraction);

		const filePath = path.resolve(
			__filename,
			`${directory}${fmtDate(newDate)}${fileExtension}`,
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
					`Looked back ${n} days without finding a daily ${fileExtension} file in ${directory}, giving up.`,
				);
			}
			return getPreviousPath(newDate);
		}
	}

	return getPreviousPath(now);
}

openLastFile()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.then(() => {
		console.log("Finished");
		process.exit(0);
	});
