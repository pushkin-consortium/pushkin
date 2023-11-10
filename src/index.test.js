import { handleInstall } from './index.js';
import { execSync } from 'child_process';

jest.mock('child_process', () => ({
    execSync: jest.fn(),
}));

describe('handleInstall', () => {
    it('should call execSync with the correct arguments', () => {
        const packageManager = 'npm';

        handleInstall(packageManager);

        expect(execSync).toHaveBeenCalledWith(`${packageManager} install`, { stdio: 'inherit' });
    });
});