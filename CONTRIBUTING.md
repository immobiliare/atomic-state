# Contributing to StateAtom

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device.
2. Create a new branch `git checkout -b MY_BRANCH_NAME`
3. Install yarn: `npm install -g yarn` or use [volta](https://volta.sh/)
4. Install the dependencies: `yarn`
5. Run `yarn dev` to build and watch for code changes

## To run tests

Simply run `yarn test`

## Running your own app with locally compiled version of StateAtom

1. In your app's `package.json`, add:

    ```json
    "resolutions": {
        "@immobiliarelabs/state-atom": "file:<local-path-to-cloned-repo>",
    }
    ```

2. In your app's root directory run

    ```sh
    yarn install
    ```

    to re-install all of the dependencies.

    Note that StateAtom will be copied from the locally compiled version as opposed to from being downloaded from the NPM registry.

3. Run your application as you normally would.

4. To update your app's dependencies, after you've made changes to your local repository. In your app's root directory, run:

    ```sh
    yarn install
    ```

## Contributors

-   [`@gdorsi`](https://github.com/gdorsi)
