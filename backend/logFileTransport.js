const build = require("pino-abstract-transport");
const { prettyFactory } = require("pino-pretty");
const roll = require("pino-roll");

// pino transport (runs in a worker thread): the same readable lines as the console,
// without colors, written to a daily-rotated file by pino-roll.
module.exports = async function ({ pretty, roll: rollOptions }) {
  const destination = await roll(rollOptions);
  const format = prettyFactory({ ...pretty, colorize: false });

  return build(
    async (source) => {
      for await (const entry of source) destination.write(format(entry));
    },
    {
      close: async () => {
        await new Promise((resolve) => destination.end(resolve));
      },
    },
  );
};
