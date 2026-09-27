Commit and push the current work: $ARGUMENTS

1. Run `npm run check`. Stop and fix problems if it fails.
2. Show `git status` and a short summary of the diff.
3. Stage the relevant files (never .env files or build output).
4. Commit with a conventional message (feat/fix/chore/docs + scope). Use $ARGUMENTS as the description if given.
5. Push to the current branch with `git push` (set upstream if needed). Never force-push.
6. If the branch is `main`, remind me that Netlify will deploy the website automatically.
