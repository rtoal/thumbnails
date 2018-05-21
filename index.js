// This command line app takes a filename as its sole argument and produces
// a 200x200 thumbnail in the file output.jpg.

// Make sure to brew install graphicsmagick.

var gm = require('gm');

if (process.argv.length !== 3) {
  console.error('Need exactly one command line argument');
  process.exit(1);
}

gm(process.argv[2])
  .background("white")
  .flatten()
  .resize(200, 200)
  .write('output.jpg', (err, res) => {
    if (err) console.log(err);
  });
