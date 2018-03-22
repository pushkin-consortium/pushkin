const fs = require('fs');
const quizName = process.argv[2];
const quizesDir = fs.readdirSync(__dirname + '/seeds');
const inquirer = require('inquirer');
const chalk = require('chalk');
const quizFolder = quizesDir.filter(currentFolder => {
  return currentFolder === quizName;
});
if (quizFolder) {
  inquirer
    .prompt([
      {
        type: 'confirm',
        name: 'inDocker',
        message: 'Are you in pushkin-db docker?'
      }
    ])
    .then(answer => {
      if (answer.inDocker) {
        inquirer
          .prompt([
            {
              type: 'confirm',
              name: 'ranMigration',
              message: 'Have you ran your migrations?'
            }
          ])
          .then(answer => {
            if (answer.ranMigration) {
              inquirer
                .prompt([
                  {
                    type: 'confirm',
                    name: 'properSeeds',
                    message: 'Have you properly filled out your seed CSV files?'
                  }
                ])
                .then(answer => {
                  if (answer.properSeeds) {
                    const runSeed = require(`./seeds/${quizFolder}/index`);
                    runSeed();
                  } else {
                    console.log(
                      chalk.red(
                        'Please insure that you have correct CSV files before running this command. For more info go to ' +
                          chalk.blue('https://github.com/l3atbc/pushkin-db')
                      )
                    );
                    process.exit();
                  }
                });
            } else {
              console.log(
                chalk.red(
                  'please run your migrations before running this command'
                )
              );
              process.exit();
            }
          });
      } else {
        console.log(
          chalk.red(
            'please run this command in your pushkin-db docker container'
          )
        );
        process.exit();
      }
    });
} else {
  console.log(chalk.red('quiz not found'));
}
