'use strict';

const config = {
  types: [
    { type: 'feat', section: 'Features' },
    { type: 'fix', section: 'Bug Fixes' },
    { type: 'perf', section: 'Performance Improvements' },
    { type: 'refactor', section: 'Code Refactoring' },
    { type: 'docs', section: 'Documentation' },
    { type: 'style', section: 'Styles' },
    { type: 'test', section: 'Tests' },
    { type: 'chore', section: 'Chores', hidden: false },
  ],
  // By default, chore types are hidden. We need to override this
  preMajor: false,
  commitUrlFormat: '{{host}}/{{owner}}/{{repository}}/commit/{{hash}}',
  compareUrlFormat:
    '{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}',
  releaseCommitMessageFormat: 'chore(release): {{currentTag}}',
  // Add custom template
  writerOpts: {
    headerPartial:
      '## <small>{{version}} {{#if date}}({{date}}){{/if}}</small>\n\n',
    transform: function (commit, context) {
      // Skip release commits
      if (
        commit.subject &&
        (commit.subject.startsWith('release:') ||
          (commit.type === 'chore' && commit.subject.startsWith('release')))
      ) {
        return false;
      }

      return commit;
    },
  },
};

// We export a function that returns the configuration
module.exports = Promise.resolve(config);
