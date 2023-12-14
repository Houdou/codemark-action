'use strict';

const fs = require('fs');
const path = require('path');

const core = require('@actions/core');

function scanDirectory({directory, pattern, includes, excludes}) {
    const matches = [];

    const files = fs.readdirSync(directory);
    for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            const inner_matches = scanDirectory({
                directory: filePath,
                pattern,
                includes,
                excludes
            });
            inner_matches.forEach(match => matches.push(match));
        } else if (stat.isFile()) {
            if (includes && includes.test(file) && (!excludes || excludes && !excludes.test(file))) {
                const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
                lines.forEach((line, index) => {
                    const match = line.match(pattern);
                    if (match) {
                        matches.push({
                            filePath,
                            line,
                            matches: matches.splice(1, 3)
                        });
                    }
                });
            }
        }
    }

    return matches;
}

try {
    const directory = core.getInput('directory');
    const pattern = core.getInput('pattern');
    const REGEX_PATTERN = new RegExp(pattern);

    const includes = core.getInput('includes');
    const INCLUDE_PATTERN = includes && new RegExp(includes);

    const excludes = core.getInput('excludes');
    const EXCLUDE_PATTERN = excludes && new RegExp(excludes);

    const matches = scanDirectory({
        directory,
        pattern: REGEX_PATTERN,
        includes: INCLUDE_PATTERN,
        excludes: EXCLUDE_PATTERN
    });

    if (matches.length > 0) {
        core.info(`Found ${matches.length} code marks`)
    } else {
        core.info(`No code marks found`);
    }

    core.setOutput('matches', matches);
} catch (error) {
    core.setFailed(error.message);
}