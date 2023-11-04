import { convertFixtureToJson } from '@codemod-utils/tests';

const inputProject = convertFixtureToJson('convert-tests/input');
const outputProject = convertFixtureToJson('convert-tests/output');

export { inputProject, outputProject };
