import chalk from "chalk";
import { MultiBar, Presets } from "cli-progress";

export const barCreator = new MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: `${chalk.blueBright(
        "{bar} {filename}"
      )} | {value}/{total} Mb${chalk.blue('|')}{speed} Mb/s${chalk.blue('|')}ETA: {eta}s`,
      barsize: 20,
    },
    Presets.shades_classic
  );
  